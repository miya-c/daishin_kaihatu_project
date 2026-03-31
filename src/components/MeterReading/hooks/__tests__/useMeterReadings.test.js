import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMeterReadings } from '../useMeterReadings';

const MOCK_GAS_URL = 'https://example.com/gas';
const MOCK_PROPERTY_ID = 'prop-001';
const MOCK_ROOM_ID = 'room-101';

const MOCK_STRUCTURED_RESPONSE = {
  success: true,
  data: {
    propertyName: 'テスト物件',
    roomName: '101号室',
    readings: [
      {
        date: '2025/06/15',
        currentReading: 150,
        previousReading: 100,
        previousPreviousReading: 80,
        threeTimesPreviousReading: 60,
        usage: 50,
        warningFlag: '正常',
      },
    ],
  },
};

const MOCK_JP_KEY_RESPONSE = {
  success: true,
  data: [
    {
      物件名: 'テスト物件JP',
      部屋名: '201号室',
      今回の指示数: 200,
      前回指示数: 150,
      前々回指示数: 120,
      前々々回指示数: 90,
      今回使用量: 50,
      警告フラグ: '正常',
    },
  ],
};

function createMockFetchResponse(data, options = {}) {
  return Promise.resolve({
    ok: options.ok !== false,
    status: options.status || 200,
    json: () => Promise.resolve(data),
  });
}

function mockLocationSearch(search) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      href: window.location.href,
      search,
      pathname: window.location.pathname,
      origin: window.location.origin,
      assign: vi.fn(),
      reload: vi.fn(),
    },
  });
  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'location', originalDescriptor);
    }
  };
}

describe('useMeterReadings', () => {
  let restoreLocation;

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (restoreLocation) restoreLocation();
  });

  it('sets error when gasWebAppUrl is missing from sessionStorage', async () => {
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('URLが設定されていません');
      expect(result.current.loading).toBe(false);
    });
  });

  it('loads gasWebAppUrl from sessionStorage', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(createMockFetchResponse(MOCK_STRUCTURED_RESPONSE))
    );
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    // Verify gasWebAppUrl was read and data loaded
    await waitFor(() => {
      expect(result.current.propertyName).toBe('テスト物件');
    });
  });

  it('sets error when URL params are missing roomId', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    restoreLocation = mockLocationSearch('?propertyId=P1');

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('不足');
      expect(result.current.loading).toBe(false);
    });
  });

  it('loads structured response with propertyName and roomName', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(createMockFetchResponse(MOCK_STRUCTURED_RESPONSE))
    );
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.propertyName).toBe('テスト物件');
      expect(result.current.roomName).toBe('101号室');
      expect(result.current.propertyId).toBe(MOCK_PROPERTY_ID);
      expect(result.current.roomId).toBe(MOCK_ROOM_ID);
    });
  });

  it('loads Japanese-key array response', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(createMockFetchResponse(MOCK_JP_KEY_RESPONSE)));
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.propertyName).toBe('テスト物件JP');
      expect(result.current.roomName).toBe('201号室');
    });
  });

  it('maps readings with correct field structure', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(createMockFetchResponse(MOCK_STRUCTURED_RESPONSE))
    );
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.meterReadings.length).toBe(1);
      const reading = result.current.meterReadings[0];
      expect(reading).toHaveProperty('id');
      expect(reading).toHaveProperty('date');
      expect(reading).toHaveProperty('currentReading');
      expect(reading).toHaveProperty('previousReading');
      expect(reading).toHaveProperty('previousPreviousReading');
      expect(reading).toHaveProperty('threeTimesPrevious');
      expect(reading).toHaveProperty('warningFlag');
      expect(reading).toHaveProperty('standardDeviation');
      expect(reading).toHaveProperty('usage');
    });
  });

  it('recalculates warningFlag when current and previous readings exist', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(createMockFetchResponse(MOCK_STRUCTURED_RESPONSE))
    );
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.meterReadings.length).toBe(1);
      expect(result.current.meterReadings[0].warningFlag).toBeDefined();
      expect(result.current.meterReadings[0].standardDeviation).toBeDefined();
    });
  });

  it('sets meterReadings to empty array when readings is empty', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        createMockFetchResponse({
          success: true,
          data: { propertyName: 'P', roomName: 'R', readings: [] },
        })
      )
    );
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.meterReadings).toEqual([]);
    });
  });

  it('retries on 503 and eventually succeeds', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) });
        }
        return createMockFetchResponse(MOCK_STRUCTURED_RESPONSE);
      })
    );

    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    // Advance through retry delays (1s, 2s exponential backoff)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(callCount).toBeGreaterThanOrEqual(3);
    expect(result.current.meterReadings.length).toBe(1);

    vi.useRealTimers();
  });

  it('sets error after max retries on persistent 503', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: () => Promise.resolve({}) })
    );

    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(result.current.error).toContain('一時的に利用できません');

    vi.useRealTimers();
  });

  it('handles network error with user-friendly message', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(
      () => {
        expect(result.current.error).toContain('ネットワーク接続');
      },
      { timeout: 10000 }
    );
  });

  it('mapNavigationReadingsData maps both Japanese and English keys', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        createMockFetchResponse({
          success: true,
          data: { propertyName: 'P', roomName: 'R', readings: [] },
        })
      )
    );
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    // Wait for data to be loaded (check propertyName instead of loading)
    await waitFor(() => {
      expect(result.current.propertyName).toBe('P');
    });

    const jpReadings = [
      {
        検針日時: '2025/06/01',
        今回指示数: 100,
        前回指示数: 80,
        前々回指示数: 60,
        前々々回指示数: 40,
        今回使用量: 20,
        警告フラグ: '要確認',
        標準偏差値: '1.5',
      },
    ];

    const mapped = result.current.mapNavigationReadingsData('room-1', jpReadings);

    expect(mapped.length).toBe(1);
    expect(mapped[0].date).toBe('2025/06/01');
    expect(mapped[0].currentReading).toBe('100');
    expect(mapped[0].warningFlag).toBe('要確認');
    expect(mapped[0].standardDeviation).toBe('1.5');
  });

  it('loadMeterReadings handles API success=false response', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(createMockFetchResponse({ success: false, error: 'データなし' }))
    );
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('検針データの読み込みに失敗');
    });
  });

  it('loadMeterReadings handles response with missing data field', async () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(createMockFetchResponse({ success: true })));
    restoreLocation = mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`);

    const { result } = renderHook(() => useMeterReadings());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('検針データの読み込みに失敗');
    });
  });

  // === Phase T: loadRoomDataForSPA and popstate tests ===

  describe('loadRoomDataForSPA', () => {
    it('loads room data successfully', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      let fetchCallCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          fetchCallCount++;
          if (fetchCallCount === 1) {
            return createMockFetchResponse(MOCK_STRUCTURED_RESPONSE);
          }
          return createMockFetchResponse({
            success: true,
            data: {
              propertyName: '物件B',
              roomName: '201号室',
              readings: [
                {
                  date: '2025/07/01',
                  currentReading: 200,
                  previousReading: 150,
                  usage: 50,
                  warningFlag: '正常',
                },
              ],
            },
          });
        })
      );
      restoreLocation = mockLocationSearch(
        `?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`
      );

      const { result } = renderHook(() => useMeterReadings());

      await waitFor(() => {
        expect(result.current.propertyName).toBe('テスト物件');
      });

      await act(async () => {
        await result.current.loadRoomDataForSPA('prop-002', 'room-201');
      });

      expect(result.current.propertyName).toBe('物件B');
      expect(result.current.roomName).toBe('201号室');
      expect(result.current.meterReadings.length).toBe(1);
    });

    it('sets empty meterReadings when response has no readings', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      let fetchCallCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          fetchCallCount++;
          if (fetchCallCount === 1) {
            return createMockFetchResponse(MOCK_STRUCTURED_RESPONSE);
          }
          return createMockFetchResponse({
            success: true,
            data: { propertyName: 'P2', roomName: 'R2', readings: [] },
          });
        })
      );
      restoreLocation = mockLocationSearch(
        `?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`
      );

      const { result } = renderHook(() => useMeterReadings());

      await waitFor(() => {
        expect(result.current.propertyName).toBe('テスト物件');
      });

      await act(async () => {
        await result.current.loadRoomDataForSPA('prop-002', 'room-201');
      });

      expect(result.current.propertyName).toBe('P2');
      expect(result.current.roomName).toBe('R2');
      expect(result.current.meterReadings).toEqual([]);
    });

    it('reloads page on API error', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      restoreLocation = mockLocationSearch(
        `?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`
      );

      // Override reload after mockLocationSearch sets window.location
      const mockReload = vi.fn();
      window.location.reload = mockReload;

      let fetchCallCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          fetchCallCount++;
          if (fetchCallCount === 1) {
            return createMockFetchResponse(MOCK_STRUCTURED_RESPONSE);
          }
          return createMockFetchResponse({}, { ok: false, status: 500 });
        })
      );

      const { result } = renderHook(() => useMeterReadings());

      await waitFor(() => {
        expect(result.current.propertyName).toBe('テスト物件');
      });

      await act(async () => {
        await result.current.loadRoomDataForSPA('prop-002', 'room-201');
      });

      expect(mockReload).toHaveBeenCalled();
    });

    it('reloads page when API returns success=false', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      restoreLocation = mockLocationSearch(
        `?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`
      );

      const mockReload = vi.fn();
      window.location.reload = mockReload;

      let fetchCallCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          fetchCallCount++;
          if (fetchCallCount === 1) {
            return createMockFetchResponse(MOCK_STRUCTURED_RESPONSE);
          }
          return createMockFetchResponse({ success: false, error: 'fail' });
        })
      );

      const { result } = renderHook(() => useMeterReadings());

      await waitFor(() => {
        expect(result.current.propertyName).toBe('テスト物件');
      });

      await act(async () => {
        await result.current.loadRoomDataForSPA('prop-002', 'room-201');
      });

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('popstate event handling', () => {
    it('calls loadRoomDataForSPA on popstate with valid state', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      let fetchCallCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          fetchCallCount++;
          if (fetchCallCount === 1) {
            return createMockFetchResponse(MOCK_STRUCTURED_RESPONSE);
          }
          return createMockFetchResponse({
            success: true,
            data: { propertyName: '物件B', roomName: '201号室', readings: [] },
          });
        })
      );
      restoreLocation = mockLocationSearch(
        `?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`
      );

      const { result } = renderHook(() => useMeterReadings());

      await waitFor(() => {
        expect(result.current.propertyName).toBe('テスト物件');
      });

      await act(async () => {
        window.dispatchEvent(
          new PopStateEvent('popstate', {
            state: { propertyId: 'prop-002', roomId: 'room-201' },
          })
        );
      });

      expect(result.current.propertyName).toBe('物件B');
    });

    it('reloads page on popstate without state', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse(MOCK_STRUCTURED_RESPONSE))
      );
      restoreLocation = mockLocationSearch(
        `?propertyId=${MOCK_PROPERTY_ID}&roomId=${MOCK_ROOM_ID}`
      );

      const mockReload = vi.fn();
      window.location.reload = mockReload;

      renderHook(() => useMeterReadings());

      await waitFor(() => {
        // Initial load completes - just verify the hook renders
      });

      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
      });

      expect(mockReload).toHaveBeenCalled();
    });
  });
});
