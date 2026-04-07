const STORAGE_KEY = 'offline_readings_queue';

let isSyncing = false;

export interface QueueEntry {
  id: string;
  timestamp: number;
  action: 'updateMeterReadings' | 'completeInspection';
  propertyId: string;
  roomId: string;
  readings?: Record<string, unknown>[];
  completionDate?: string;
}

export interface QueueStatus {
  pendingCount: number;
  oldestTimestamp: number | null;
  entries: QueueEntry[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function readQueue(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueueEntry[];
  } catch {
    return [];
  }
}

function writeQueue(entries: QueueEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable — best effort
  }
}

export function saveToQueue(entry: Omit<QueueEntry, 'id' | 'timestamp'>): QueueEntry {
  const full: QueueEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
  };
  const queue = readQueue();
  queue.push(full);
  writeQueue(queue);
  registerSync();
  return full;
}

export async function processQueue(
  sender?: (entry: QueueEntry) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  if (isSyncing) return { processed: 0, failed: 0 };
  const queue = readQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  isSyncing = true;
  try {
    let result: { processed: number; failed: number };
    if (!sender) {
      result = await processQueueBatch(queue);
    } else {
      result = await processQueueWithSender(queue, sender);
    }

    const remaining = readQueue();
    if (remaining.length > 0 && !isSyncing) {
      const retried = await processQueue(sender);
      return {
        processed: result.processed + retried.processed,
        failed: result.failed + retried.failed,
      };
    }
    return result;
  } finally {
    isSyncing = false;
  }
}

async function processQueueWithSender(
  queue: QueueEntry[],
  sender: (entry: QueueEntry) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  const remaining: QueueEntry[] = [];

  for (const entry of queue) {
    try {
      const ok = await sender(entry);
      if (ok) {
        processed++;
      } else {
        failed++;
        remaining.push(entry);
      }
    } catch {
      failed++;
      remaining.push(entry);
    }
  }

  writeQueue(remaining);
  return { processed, failed };
}

async function processQueueBatch(
  queue: QueueEntry[]
): Promise<{ processed: number; failed: number }> {
  const batchData = queue.map((entry) => {
    if (entry.action === 'updateMeterReadings') {
      return {
        action: 'updateMeterReadings',
        propertyId: entry.propertyId,
        roomId: entry.roomId,
        readings: entry.readings ?? [],
      };
    }
    return {
      action: 'completeInspection',
      propertyId: entry.propertyId,
      roomId: entry.roomId,
      completionDate: entry.completionDate,
    };
  });

  try {
    const { gasFetch } = await import('./gasClient');
    const result = (await gasFetch(
      'batchUpdateReadings',
      { batchData: JSON.stringify(batchData) },
      'POST'
    )) as Record<string, unknown>;

    if (result.success) {
      writeQueue([]);
      return {
        processed: (result.processed as number) ?? queue.length,
        failed: (result.failed as number) ?? 0,
      };
    }

    const failedCount = (result.failed as number) ?? queue.length;
    if (failedCount === queue.length) {
      return { processed: 0, failed: failedCount };
    }

    const results = Array.isArray(result.results) ? result.results : [];
    const remaining: QueueEntry[] = [];
    results.forEach((r: Record<string, unknown>, i: number) => {
      if (!r.success && queue[i]) {
        remaining.push(queue[i]);
      }
    });
    writeQueue(remaining);
    return {
      processed: (result.processed as number) ?? queue.length - remaining.length,
      failed: remaining.length,
    };
  } catch {
    return processQueueFallback(queue);
  }
}

async function processQueueFallback(
  queue: QueueEntry[]
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  const remaining: QueueEntry[] = [];

  for (const entry of queue) {
    try {
      const ok = await defaultSender(entry);
      if (ok) {
        processed++;
      } else {
        failed++;
        remaining.push(entry);
      }
    } catch {
      failed++;
      remaining.push(entry);
    }
  }

  writeQueue(remaining);
  return { processed, failed };
}

/**
 * デフォルト送信関数 — gasClient の API を呼び出す
 */
async function defaultSender(entry: QueueEntry): Promise<boolean> {
  const { gasFetch } = await import('./gasClient');
  try {
    if (entry.action === 'updateMeterReadings' && entry.readings) {
      await gasFetch(
        'updateMeterReadings',
        {
          propertyId: entry.propertyId,
          roomId: entry.roomId,
          readings: JSON.stringify(entry.readings),
        },
        'POST'
      );
    } else if (entry.action === 'completeInspection' && entry.completionDate) {
      await gasFetch('completeInspection', {
        propertyId: entry.propertyId,
        completionDate: entry.completionDate,
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * キューの状態を取得
 */
export function getQueueStatus(): QueueStatus {
  const entries = readQueue();
  return {
    pendingCount: entries.length,
    oldestTimestamp: entries.length > 0 ? (entries[0]?.timestamp ?? null) : null,
    entries,
  };
}

/**
 * キューを全件削除
 */
export function clearQueue(): void {
  writeQueue([]);
}

/**
 * 指定IDのエントリを削除
 */
export function removeEntry(id: string): void {
  const queue = readQueue().filter((e) => e.id !== id);
  writeQueue(queue);
}

/**
 * オンライン復帰時のリスナー登録
 */
export function isCurrentlySyncing(): boolean {
  return isSyncing;
}

export function registerOnlineListener(
  onSync?: (result: { processed: number; failed: number }) => void
): () => void {
  const handler = async () => {
    const status = getQueueStatus();
    if (status.pendingCount === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const result = await processQueue();
    onSync?.(result);
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

export function registerSync(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => {
      if ('sync' in registration) {
        (registration as unknown as { sync: { register: (tag: string) => void } }).sync.register(
          'offline-sync'
        );
      }
    })
    .catch(() => {});
}

export function registerServiceWorkerMessageListener(onProcess: () => Promise<void>): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'PROCESS_OFFLINE_QUEUE') {
      onProcess();
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
