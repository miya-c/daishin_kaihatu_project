import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoomNavigation } from '../useRoomNavigation.svelte';

vi.mock('../../../../utils/gasClient', () => ({
  gasFetch: vi.fn().mockRejectedValue(new Error('Network error')),
}));

const QUEUE_KEY = 'offline_readings_queue';

describe('createRoomNavigation', () => {
  let mockToast;
  let localStore;

  beforeEach(() => {
    vi.useFakeTimers();
    mockToast = vi.fn();
    localStore = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key) => localStore[key] ?? null),
      setItem: vi.fn((key, value) => {
        localStore[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete localStore[key];
      }),
      clear: vi.fn(() => Object.keys(localStore).forEach((k) => delete localStore[k])),
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => localStore[key] ?? null),
      setItem: vi.fn((key, value) => {
        localStore[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete localStore[key];
      }),
      clear: vi.fn(() => Object.keys(localStore).forEach((k) => delete localStore[k])),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createNav(roomId = 'room1') {
    return createRoomNavigation({
      propertyId: 'prop1',
      roomId,
      gasWebAppUrl: 'https://script.google.com/test',
      displayToast: mockToast,
    });
  }

  describe('getRoomNavigation', () => {
    it('returns empty navigation when no selectedRooms in sessionStorage', () => {
      const nav = createNav();
      const result = nav.getRoomNavigation();
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(false);
      expect(result.previousRoom).toBeNull();
      expect(result.nextRoom).toBeNull();
    });

    it('returns empty navigation when roomId is empty', () => {
      const nav = createNav('');
      sessionStorage.getItem.mockReturnValue(JSON.stringify([{ id: 'room1' }, { id: 'room2' }]));
      const result = nav.getRoomNavigation();
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(false);
    });

    it('returns previous/next for middle room', () => {
      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'selectedRooms') {
          return JSON.stringify([{ id: 'room1' }, { id: 'room2' }, { id: 'room3' }]);
        }
        return null;
      });

      const nav = createNav('room2');
      const result = nav.getRoomNavigation();
      expect(result.hasPrevious).toBe(true);
      expect(result.hasNext).toBe(true);
      expect(result.previousRoom.id).toBe('room1');
      expect(result.nextRoom.id).toBe('room3');
    });

    it('returns no previous for first room', () => {
      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'selectedRooms') {
          return JSON.stringify([{ id: 'room1' }, { id: 'room2' }]);
        }
        return null;
      });

      const nav = createNav('room1');
      const result = nav.getRoomNavigation();
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(true);
    });

    it('returns no next for last room', () => {
      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'selectedRooms') {
          return JSON.stringify([{ id: 'room1' }, { id: 'room2' }]);
        }
        return null;
      });

      const nav = createNav('room2');
      const result = nav.getRoomNavigation();
      expect(result.hasPrevious).toBe(true);
      expect(result.hasNext).toBe(false);
    });

    it('skips isNotNeeded rooms', () => {
      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'selectedRooms') {
          return JSON.stringify([
            { id: 'room1' },
            { id: 'room2', isNotNeeded: true, roomStatus: 'skip' },
            { id: 'room3' },
          ]);
        }
        return null;
      });

      const nav = createNav('room3');
      const result = nav.getRoomNavigation();
      expect(result.hasPrevious).toBe(true);
      expect(result.previousRoom.id).toBe('room1');
    });

    it('handles invalid JSON in sessionStorage', () => {
      sessionStorage.getItem.mockReturnValue('not-json');
      const nav = createNav('room1');
      const result = nav.getRoomNavigation();
      expect(result.hasPrevious).toBe(false);
      expect(result.hasNext).toBe(false);
    });
  });

  describe('handlePreviousRoom', () => {
    it('shows toast when no previous room', () => {
      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'selectedRooms') return JSON.stringify([{ id: 'room1' }]);
        return null;
      });

      const nav = createNav('room1');
      nav.handlePreviousRoom(() => []);
      expect(mockToast).toHaveBeenCalledWith('前の部屋がありません。');
    });
  });

  describe('handleNextRoom', () => {
    it('shows toast when no next room', () => {
      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'selectedRooms') return JSON.stringify([{ id: 'room1' }]);
        return null;
      });

      const nav = createNav('room1');
      nav.handleNextRoom(() => []);
      expect(mockToast).toHaveBeenCalledWith('次の部屋がありません。');
    });
  });

  describe('destroy', () => {
    it('does not throw on destroy', () => {
      const nav = createNav();
      expect(() => nav.destroy()).not.toThrow();
    });
  });

  describe('updating state', () => {
    it('can be set and read', () => {
      const nav = createNav();
      expect(nav.updating).toBe(false);
      nav.updating = true;
      expect(nav.updating).toBe(true);
    });
  });

  describe('saveReadings — offline', () => {
    it('saves to offline queue and returns true', async () => {
      const nav = createNav();
      const readings = [{ date: '2025-01-01', currentReading: '100' }];
      const result = await nav.saveReadings(readings);

      expect(result).toBe(true);
      expect(mockToast).toHaveBeenCalled();
      expect(mockToast.mock.calls[0][0]).toContain('保存しました');

      const queueRaw = localStore[QUEUE_KEY];
      expect(queueRaw).toBeTruthy();
      const queue = JSON.parse(queueRaw);
      expect(queue).toHaveLength(1);
      expect(queue[0].action).toBe('updateMeterReadings');
    });

    it('updates session cache for saved room', async () => {
      sessionStorage.getItem.mockImplementation((key) => {
        if (key === 'selectedRooms') return JSON.stringify([{ id: 'room1' }]);
        return null;
      });

      const nav = createNav();
      const readings = [{ date: '2025-01-01', currentReading: '100' }];
      await nav.saveReadings(readings);

      expect(sessionStorage.setItem).toHaveBeenCalled();
    });

    it('returns false for empty readings offline', async () => {
      const nav = createNav();
      const result = await nav.saveReadings([]);
      expect(result).toBe(false);
    });
  });
});
