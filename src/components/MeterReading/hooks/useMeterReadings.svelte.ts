import { mapReadingFromApi } from '../utils/readingMapper';
import { validateId } from '../../../utils/validateParams';
import { NOT_AVAILABLE, ROOM_NAME_UNKNOWN } from '../../../constants/messages';

import type { MeterReading } from '../../../types';

const OFFLINE_CACHE_PREFIX = 'offline_reading_';

function saveReadingToOfflineCache(
  propId: string,
  rId: string,
  data: { propertyName: string; roomName: string; readings: MeterReading[] }
): void {
  try {
    localStorage.setItem(
      `${OFFLINE_CACHE_PREFIX}${propId}_${rId}`,
      JSON.stringify({ ...data, cachedAt: Date.now() })
    );
  } catch {
    // localStorage unavailable or full — best effort
  }
}

function getReadingFromOfflineCache(
  propId: string,
  rId: string
): { propertyName: string; roomName: string; readings: MeterReading[] } | null {
  try {
    const raw = localStorage.getItem(`${OFFLINE_CACHE_PREFIX}${propId}_${rId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Prefetch cache ──
interface PrefetchEntry {
  meterReadings: MeterReading[];
  propertyName: string;
  roomName: string;
  timestamp: number;
}

const PREFETCH_TTL = 5 * 60 * 1000; // 5 minutes

export function createMeterReadings() {
  let loading = $state(true);
  let error = $state<string | null>(null);
  let propertyId = $state('');
  let propertyName = $state('');
  let roomId = $state('');
  let roomName = $state('');
  let meterReadings = $state<MeterReading[]>([]);
  let gasWebAppUrl = $state('');
  let abortController: AbortController | null = null;

  // Prefetch state
  const prefetchMap = new Map<string, PrefetchEntry>();
  const prefetchAbortMap = new Map<string, AbortController>();

  function getPrefetchKey(pId: string, rId: string): string {
    return `${pId}:${rId}`;
  }

  // Scroll to top on mount
  $effect(() => {
    window.scrollTo(0, 0);
  });

  // Load gasWebAppUrl from sessionStorage (runs once at creation time)
  {
    let urlFromSession: string | null = null;
    try {
      urlFromSession = sessionStorage.getItem('gasWebAppUrl');
    } catch {
      // sessionStorage unavailable (e.g. private browsing)
    }
    if (!urlFromSession) {
      error = 'アプリのURLが設定されていません。物件選択画面から再度アクセスしてください。';
      loading = false;
    } else {
      gasWebAppUrl = urlFromSession;
    }
  }

  /** Fetch and parse API response — shared by loadMeterReadings and prefetchRoom */
  async function fetchAndParseReadings(
    propId: string,
    rId: string,
    signal?: AbortSignal
  ): Promise<{ pName: string; rName: string; resultReadings: MeterReading[] } | null> {
    const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
    if (!currentGasUrl) return null;

    const fetchUrl = `${currentGasUrl}?action=getMeterReadings&propertyId=${propId}&roomId=${rId}`;
    const response = await fetch(fetchUrl, { signal });

    if (!response.ok) return null;

    const responseObject = await response.json();
    if (!responseObject.success) return null;

    const data = responseObject.data;
    if (!data) return null;

    let pName: string, rName: string, readings: Record<string, unknown>[];
    if (
      Object.prototype.hasOwnProperty.call(data, 'propertyName') &&
      Object.prototype.hasOwnProperty.call(data, 'roomName') &&
      Object.prototype.hasOwnProperty.call(data, 'readings')
    ) {
      pName = data.propertyName || NOT_AVAILABLE;
      rName = data.roomName || ROOM_NAME_UNKNOWN;
      readings = data.readings || [];
    } else if (Array.isArray(data)) {
      if (data.length > 0 && data[0]) {
        pName = data[0]['物件名'] || data[0].propertyName || NOT_AVAILABLE;
        rName = data[0]['部屋名'] || data[0].roomName || ROOM_NAME_UNKNOWN;
      } else {
        pName = NOT_AVAILABLE;
        rName = ROOM_NAME_UNKNOWN;
      }
      readings = data;
    } else {
      return null;
    }

    const resultReadings =
      Array.isArray(readings) && readings.length > 0
        ? readings.map((rawReading: Record<string, unknown>, index: number) =>
            mapReadingFromApi(rawReading, index, { calculateWarnings: true })
          )
        : [];

    saveReadingToOfflineCache(propId, rId, {
      propertyName: pName,
      roomName: rName,
      readings: resultReadings,
    });

    return { pName, rName, resultReadings };
  }

  async function loadMeterReadings(
    propId: string,
    rId: string,
    maxRetries: number = 3,
    silent: boolean = false
  ): Promise<MeterReading[] | null> {
    const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
    if (!currentGasUrl) {
      error = 'gasWebAppURLが設定されていません。物件選択画面から再度アクセスしてください。';
      if (!silent) loading = false;
      return null;
    }

    // Check prefetch cache first
    const cacheKey = getPrefetchKey(propId, rId);
    const cached = prefetchMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PREFETCH_TTL) {
      propertyId = propId || NOT_AVAILABLE;
      propertyName = cached.propertyName;
      roomId = rId || NOT_AVAILABLE;
      roomName = cached.roomName;
      meterReadings = cached.meterReadings;
      if (!silent) loading = false;
      return cached.meterReadings;
    }

    if (!silent) {
      loading = true;
    }

    // Cancel any in-flight request
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    abortController = controller;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const parsed = await fetchAndParseReadings(propId, rId, controller.signal);

        if (parsed === null) {
          if (attempt < maxRetries) {
            const delayMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
          throw new Error('検針データの取得に失敗しました');
        }

        propertyId = propId || NOT_AVAILABLE;
        propertyName = parsed.pName;
        roomId = rId || NOT_AVAILABLE;
        roomName = parsed.rName;
        meterReadings = parsed.resultReadings;

        if (!silent) loading = false;
        return parsed.resultReadings;
      } catch (err: unknown) {
        if (controller.signal.aborted) return null;
        if (attempt === maxRetries) {
          const offlineData = getReadingFromOfflineCache(propId, rId);
          if (offlineData) {
            propertyId = propId || NOT_AVAILABLE;
            propertyName = offlineData.propertyName;
            roomId = rId || NOT_AVAILABLE;
            roomName = offlineData.roomName;
            meterReadings = offlineData.readings;
            error = null;
            if (!silent) loading = false;
            return offlineData.readings;
          }
          const message = err instanceof Error ? err.message : String(err);
          let userMessage = '検針データの読み込みに失敗しました。';
          if (message.includes('503')) {
            userMessage =
              'サーバーが一時的に利用できません。しばらく待ってから再度お試しください。';
          } else if (message.includes('network') || message.includes('fetch')) {
            userMessage =
              'ネットワーク接続に問題があります。インターネット接続を確認してください。';
          }
          error = userMessage + '\n\n問題が継続する場合は、管理者にお問い合わせください。';
          if (!silent) loading = false;
          return null;
        }
      }
    }
    return null;
  }

  /** Prefetch room data in the background without affecting UI state */
  function prefetchRoom(propId: string, rId: string): void {
    const cacheKey = getPrefetchKey(propId, rId);
    const cached = prefetchMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PREFETCH_TTL) return;

    // Abort previous prefetch for this specific room only
    const prevController = prefetchAbortMap.get(cacheKey);
    if (prevController) {
      prevController.abort();
    }
    const controller = new AbortController();
    prefetchAbortMap.set(cacheKey, controller);

    fetchAndParseReadings(propId, rId, controller.signal)
      .then((parsed) => {
        if (parsed && !controller.signal.aborted) {
          prefetchMap.set(cacheKey, {
            meterReadings: parsed.resultReadings,
            propertyName: parsed.pName,
            roomName: parsed.rName,
            timestamp: Date.now(),
          });
        }
      })
      .catch(() => {
        // Prefetch failure is non-critical
      });
  }

  /** Invalidate prefetch cache for a specific room (call after save) */
  function invalidatePrefetch(propId: string, rId: string): void {
    prefetchMap.delete(getPrefetchKey(propId, rId));
  }

  // Initial data load when gasWebAppUrl is set
  $effect(() => {
    if (!gasWebAppUrl) return;

    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('propertyId');
    const rId = urlParams.get('roomId');

    if (!propId || !rId) {
      error = '物件情報または部屋情報が不足しているため、検針データを取得できません。';
      loading = false;
      return;
    }

    const propValidation = validateId(propId, '物件ID');
    if (!propValidation.valid) {
      error = propValidation.error ?? '物件IDが無効です';
      loading = false;
      return;
    }

    const roomValidation = validateId(rId, '部屋ID');
    if (!roomValidation.valid) {
      error = roomValidation.error ?? '部屋IDが無効です';
      loading = false;
      return;
    }

    loadMeterReadings(propId, rId);
  });

  // Abort in-flight requests on cleanup
  $effect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
      for (const ctrl of prefetchAbortMap.values()) {
        ctrl.abort();
      }
      prefetchAbortMap.clear();
      prefetchMap.clear();
    };
  });

  return {
    get loading() {
      return loading;
    },
    set loading(val: boolean) {
      loading = val;
    },
    get error() {
      return error;
    },
    set error(val: string | null) {
      error = val;
    },
    get propertyId() {
      return propertyId;
    },
    get propertyName() {
      return propertyName;
    },
    set propertyName(val: string) {
      propertyName = val;
    },
    get roomId() {
      return roomId;
    },
    set roomId(val: string) {
      roomId = val;
    },
    get roomName() {
      return roomName;
    },
    set roomName(val: string) {
      roomName = val;
    },
    get meterReadings() {
      return meterReadings;
    },
    set meterReadings(val: MeterReading[]) {
      meterReadings = val;
    },
    get gasWebAppUrl() {
      return gasWebAppUrl;
    },
    loadMeterReadings,
    prefetchRoom,
    invalidatePrefetch,
  };
}
