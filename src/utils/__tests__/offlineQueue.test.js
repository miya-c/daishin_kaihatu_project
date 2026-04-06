import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const STORAGE_KEY = 'offline_readings_queue';

describe('offlineQueue', () => {
  let store;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => Object.keys(store).forEach((k) => delete store[k])),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function getModule() {
    return await import('../offlineQueue');
  }

  describe('saveToQueue', () => {
    it('adds entry to queue with id and timestamp', async () => {
      const { saveToQueue } = await getModule();
      const entry = saveToQueue({
        action: 'updateMeterReadings',
        propertyId: 'prop1',
        roomId: 'room1',
        readings: [{ date: '2025-01-01', currentReading: '100' }],
      });

      expect(entry.id).toBeTruthy();
      expect(entry.timestamp).toBeTypeOf('number');
      expect(entry.action).toBe('updateMeterReadings');
      expect(entry.propertyId).toBe('prop1');

      const stored = JSON.parse(store[STORAGE_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(entry.id);
    });

    it('appends to existing queue entries', async () => {
      const { saveToQueue } = await getModule();
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p1', roomId: 'r1' });
      saveToQueue({
        action: 'completeInspection',
        propertyId: 'p2',
        roomId: 'r2',
        completionDate: '2025-01-01',
      });

      const stored = JSON.parse(store[STORAGE_KEY]);
      expect(stored).toHaveLength(2);
      expect(stored[0].action).toBe('updateMeterReadings');
      expect(stored[1].action).toBe('completeInspection');
    });
  });

  describe('getQueueStatus', () => {
    it('returns empty status when no entries', async () => {
      const { getQueueStatus } = await getModule();
      const status = getQueueStatus();
      expect(status.pendingCount).toBe(0);
      expect(status.oldestTimestamp).toBeNull();
      expect(status.entries).toEqual([]);
    });

    it('returns correct count and oldest timestamp', async () => {
      const { saveToQueue, getQueueStatus } = await getModule();
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p1', roomId: 'r1' });
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p2', roomId: 'r2' });

      const status = getQueueStatus();
      expect(status.pendingCount).toBe(2);
      expect(status.oldestTimestamp).toBeTypeOf('number');
    });
  });

  describe('clearQueue', () => {
    it('removes all entries', async () => {
      const { saveToQueue, clearQueue, getQueueStatus } = await getModule();
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p1', roomId: 'r1' });
      expect(getQueueStatus().pendingCount).toBe(1);

      clearQueue();
      expect(getQueueStatus().pendingCount).toBe(0);
    });
  });

  describe('removeEntry', () => {
    it('removes specific entry by id', async () => {
      const { saveToQueue, removeEntry, getQueueStatus } = await getModule();
      const entry1 = saveToQueue({ action: 'updateMeterReadings', propertyId: 'p1', roomId: 'r1' });
      const entry2 = saveToQueue({ action: 'updateMeterReadings', propertyId: 'p2', roomId: 'r2' });

      removeEntry(entry1.id);
      const status = getQueueStatus();
      expect(status.pendingCount).toBe(1);
      expect(status.entries[0].id).toBe(entry2.id);
    });

    it('does nothing for non-existent id', async () => {
      const { saveToQueue, removeEntry, getQueueStatus } = await getModule();
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p1', roomId: 'r1' });
      removeEntry('nonexistent');
      expect(getQueueStatus().pendingCount).toBe(1);
    });
  });

  describe('processQueue', () => {
    it('returns 0/0 for empty queue', async () => {
      const { processQueue } = await getModule();
      const result = await processQueue();
      expect(result).toEqual({ processed: 0, failed: 0 });
    });

    it('processes entries via custom sender', async () => {
      const { saveToQueue, processQueue, getQueueStatus } = await getModule();
      saveToQueue({
        action: 'updateMeterReadings',
        propertyId: 'p1',
        roomId: 'r1',
        readings: [{ date: '2025-01-01' }],
      });
      saveToQueue({
        action: 'completeInspection',
        propertyId: 'p2',
        roomId: 'r2',
        completionDate: '2025-01-01',
      });

      const sender = vi.fn().mockResolvedValue(true);
      const result = await processQueue(sender);

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(sender).toHaveBeenCalledTimes(2);
      expect(getQueueStatus().pendingCount).toBe(0);
    });

    it('keeps failed entries in queue', async () => {
      const { saveToQueue, processQueue, getQueueStatus } = await getModule();
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p1', roomId: 'r1', readings: [] });
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p2', roomId: 'r2', readings: [] });

      const sender = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await processQueue(sender);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(getQueueStatus().pendingCount).toBe(1);
    });

    it('keeps entries when sender throws', async () => {
      const { saveToQueue, processQueue, getQueueStatus } = await getModule();
      saveToQueue({ action: 'updateMeterReadings', propertyId: 'p1', roomId: 'r1', readings: [] });

      const sender = vi.fn().mockRejectedValue(new Error('network'));
      const result = await processQueue(sender);

      expect(result.failed).toBe(1);
      expect(getQueueStatus().pendingCount).toBe(1);
    });
  });

  describe('registerOnlineListener', () => {
    it('returns cleanup function that removes listener', async () => {
      const { registerOnlineListener } = await getModule();
      const onSync = vi.fn();
      const cleanup = registerOnlineListener(onSync);

      cleanup();
      window.dispatchEvent(new Event('online'));
      expect(onSync).not.toHaveBeenCalled();
    });
  });

  describe('registerSync', () => {
    it('does not throw when serviceWorker is unavailable', async () => {
      const { registerSync } = await getModule();
      expect(() => registerSync()).not.toThrow();
    });
  });
});
