import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReadingUpdate } from '../useReadingUpdate';

const MOCK_GAS_URL = 'https://example.com/gas';
const MOCK_PROPERTY_ID = 'prop-001';
const MOCK_ROOM_ID = 'room-101';

function createMockFetchResponse(data, options = {}) {
  return Promise.resolve({
    ok: options.ok !== false,
    status: options.status || 200,
    json: () => Promise.resolve(data),
  });
}

function createDefaultProps(overrides = {}) {
  return {
    propertyId: MOCK_PROPERTY_ID,
    roomId: MOCK_ROOM_ID,
    gasWebAppUrl: MOCK_GAS_URL,
    meterReadings: [
      {
        date: '2025/06/15',
        currentReading: 150,
        previousReading: 100,
        warningFlag: '正常',
      },
    ],
    setMeterReadings: vi.fn(),
    displayToast: vi.fn(),
    setUpdating: vi.fn(),
    ...overrides,
  };
}

describe('useReadingUpdate', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty inputErrors and usageStates', () => {
    const { result } = renderHook(() => useReadingUpdate(createDefaultProps()));

    expect(result.current.inputErrors).toEqual({});
    expect(result.current.usageStates).toEqual({});
  });

  it('setInputErrors updates error state', () => {
    const { result } = renderHook(() => useReadingUpdate(createDefaultProps()));

    act(() => {
      result.current.setInputErrors({ '2025/06/15': 'エラー' });
    });

    expect(result.current.inputErrors).toEqual({ '2025/06/15': 'エラー' });
  });

  it('setUsageStates updates usage state', () => {
    const { result } = renderHook(() => useReadingUpdate(createDefaultProps()));

    act(() => {
      result.current.setUsageStates({ '2025/06/15': '50' });
    });

    expect(result.current.usageStates).toEqual({ '2025/06/15': '50' });
  });

  it('handleUpdateReadings shows error when propertyId is missing', async () => {
    const displayToast = vi.fn();
    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ propertyId: '', displayToast }))
    );

    await act(async () => {
      await result.current.handleUpdateReadings({});
    });

    expect(displayToast).toHaveBeenCalledWith('物件IDまたは部屋IDが取得できませんでした。');
  });

  it('handleUpdateReadings shows error when roomId is missing', async () => {
    const displayToast = vi.fn();
    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ roomId: '', displayToast }))
    );

    await act(async () => {
      await result.current.handleUpdateReadings({});
    });

    expect(displayToast).toHaveBeenCalledWith('物件IDまたは部屋IDが取得できませんでした。');
  });

  it('validates first-time reading with empty value', async () => {
    const displayToast = vi.fn();
    const meterReadings = [
      { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
    ];

    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ meterReadings, displayToast }))
    );

    await act(async () => {
      await result.current.handleUpdateReadings({ '2025/06/15': '' });
    });

    // Should set error for the date and show validation toast
    expect(result.current.inputErrors['2025/06/15']).toContain('初回検針');
    expect(displayToast).toHaveBeenCalledWith(
      '入力値に誤りがあります。各項目のエラーを確認してください。'
    );
  });

  it('validates negative numeric input', async () => {
    const displayToast = vi.fn();
    const meterReadings = [
      { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
    ];

    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ meterReadings, displayToast }))
    );

    await act(async () => {
      await result.current.handleUpdateReadings({ '2025/06/15': '-5' });
    });

    expect(result.current.inputErrors['2025/06/15']).toContain('0以上');
  });

  it('shows toast when no changes detected', async () => {
    const displayToast = vi.fn();
    const { result } = renderHook(() => useReadingUpdate(createDefaultProps({ displayToast })));

    // readingValues matches original → no changes
    await act(async () => {
      await result.current.handleUpdateReadings({ '2025/06/15': '150' });
    });

    expect(displayToast).toHaveBeenCalledWith('更新するデータがありません。');
  });

  it('successfully updates readings', async () => {
    const displayToast = vi.fn();
    const setUpdating = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(createMockFetchResponse({ success: true })));

    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ displayToast, setUpdating }))
    );

    await act(async () => {
      const res = await result.current.handleUpdateReadings({ '2025/06/15': '200' });
      expect(res).toBe(true);
    });

    expect(displayToast).toHaveBeenCalledWith('検針データが正常に更新されました');
    expect(setUpdating).toHaveBeenCalledWith(true);
    expect(setUpdating).toHaveBeenCalledWith(false);
  });

  it('handles API failure response', async () => {
    const displayToast = vi.fn();
    const setUpdating = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(createMockFetchResponse({ success: false, error: 'Server error' }))
    );

    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ displayToast, setUpdating }))
    );

    await act(async () => {
      const res = await result.current.handleUpdateReadings({ '2025/06/15': '200' });
      expect(res).toBe(false);
    });

    expect(displayToast).toHaveBeenCalledWith(expect.stringContaining('更新エラー'));
    expect(setUpdating).toHaveBeenCalledWith(false);
  });

  it('handles network error', async () => {
    const displayToast = vi.fn();
    const setUpdating = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ displayToast, setUpdating }))
    );

    await act(async () => {
      const res = await result.current.handleUpdateReadings({ '2025/06/15': '200' });
      expect(res).toBe(false);
    });

    expect(displayToast).toHaveBeenCalledWith(expect.stringContaining('更新エラー'));
    expect(setUpdating).toHaveBeenCalledWith(false);
  });

  it('handles non-ok HTTP response', async () => {
    const displayToast = vi.fn();
    const setUpdating = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(createMockFetchResponse({}, { ok: false, status: 500 }))
    );

    const { result } = renderHook(() =>
      useReadingUpdate(createDefaultProps({ displayToast, setUpdating }))
    );

    await act(async () => {
      const res = await result.current.handleUpdateReadings({ '2025/06/15': '200' });
      expect(res).toBe(false);
    });

    expect(displayToast).toHaveBeenCalledWith(expect.stringContaining('更新エラー'));
    expect(setUpdating).toHaveBeenCalledWith(false);
  });
});
