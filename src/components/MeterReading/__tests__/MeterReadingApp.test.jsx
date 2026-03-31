import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import MeterReadingApp from '../MeterReadingApp';

// Mock hooks
vi.mock('../hooks/useMeterReadings', () => ({
  useMeterReadings: vi.fn(),
}));
vi.mock('../hooks/useRoomNavigation', () => ({
  useRoomNavigation: vi.fn(),
}));
vi.mock('../hooks/useReadingUpdate', () => ({
  useReadingUpdate: vi.fn(),
}));

import { useMeterReadings } from '../hooks/useMeterReadings';
import { useRoomNavigation } from '../hooks/useRoomNavigation';
import { useReadingUpdate } from '../hooks/useReadingUpdate';

const MOCK_METER_READINGS = [
  {
    date: '2025/06/15',
    currentReading: 150,
    previousReading: 100,
    previousPreviousReading: 80,
    threeTimesPrevious: 60,
    usage: 50,
    warningFlag: '正常',
    standardDeviation: '',
  },
  {
    date: '2025/05/15',
    currentReading: 100,
    previousReading: 80,
    previousPreviousReading: 60,
    threeTimesPrevious: 40,
    usage: 20,
    warningFlag: '要確認',
    standardDeviation: '2.5',
  },
];

function setupMocks(overrides = {}) {
  const meterReadingsDefaults = {
    loading: false,
    error: null,
    propertyId: 'prop-001',
    propertyName: 'テスト物件',
    roomId: 'room-101',
    roomName: '101号室',
    meterReadings: MOCK_METER_READINGS,
    setMeterReadings: vi.fn(),
    setError: vi.fn(),
    setLoading: vi.fn(),
    loadMeterReadings: vi.fn(),
    ...overrides.meterReadings,
  };
  const navigationDefaults = {
    updating: false,
    isNavigating: false,
    navigationMessage: '',
    setUpdating: vi.fn(),
    setIsNavigating: vi.fn(),
    getRoomNavigation: vi.fn(() => ({
      hasPrevious: true,
      hasNext: true,
      previousRoom: { id: 'room-100' },
      nextRoom: { id: 'room-102' },
    })),
    handlePreviousRoom: vi.fn(),
    handleNextRoom: vi.fn(),
    handleBackButton: vi.fn(),
    updateSessionStorageCache: vi.fn(),
    saveReadings: vi.fn(),
    ...overrides.navigation,
  };
  const updateDefaults = {
    inputErrors: {},
    setInputErrors: vi.fn(),
    usageStates: {},
    setUsageStates: vi.fn(),
    handleUpdateReadings: vi.fn(),
    ...overrides.update,
  };
  useMeterReadings.mockReturnValue({ ...meterReadingsDefaults, ...overrides.meterReadings });
  useRoomNavigation.mockReturnValue({ ...navigationDefaults, ...overrides.navigation });
  useReadingUpdate.mockReturnValue({ ...updateDefaults, ...overrides.update });

  return { meterReadingsDefaults, navigationDefaults, updateDefaults };
}

describe('MeterReadingApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state', () => {
    setupMocks({ meterReadings: { loading: true } });
    render(<MeterReadingApp />);
    expect(screen.getByText('検針データを読み込んでいます...')).toBeInTheDocument();
    expect(screen.getByText('検針情報')).toBeInTheDocument();
  });

  it('shows error state', () => {
    setupMocks({
      meterReadings: {
        loading: false,
        error: 'データの取得に失敗しました',
      },
    });
    render(<MeterReadingApp />);
    expect(screen.getByText('エラー')).toBeInTheDocument();
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
  });

  it('shows property name and room name', () => {
    setupMocks({
      meterReadings: { meterReadings: MOCK_METER_READINGS },
    });
    render(<MeterReadingApp />);
    expect(screen.getByText('テスト物件')).toBeInTheDocument();
    expect(screen.getByText('部屋: 101号室')).toBeInTheDocument();
  });

  it('shows table with reading rows when previous readings exist', () => {
    setupMocks({
      meterReadings: { meterReadings: MOCK_METER_READINGS },
    });
    render(<MeterReadingApp />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBe(2);
    expect(screen.getByText('50㎥')).toBeInTheDocument();
    expect(screen.getByText('20㎥')).toBeInTheDocument();
  });

  it('shows status badges for readings', () => {
    setupMocks({
      meterReadings: { meterReadings: MOCK_METER_READINGS },
    });
    render(<MeterReadingApp />);
    expect(screen.getByText('正常')).toBeInTheDocument();
    expect(screen.getByText('要確認')).toBeInTheDocument();
  });

  it('shows initial reading form when no previous readings exist', () => {
    setupMocks({
      meterReadings: {
        meterReadings: [
          { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
        ],
      },
    });
    render(<MeterReadingApp />);
    expect(screen.getByText('初回検針')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('指示数入力')).toBeInTheDocument();
  });

  it('shows initial reading note about usage', () => {
    setupMocks({
      meterReadings: {
        meterReadings: [
          { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
        ],
      },
    });
    render(<MeterReadingApp />);
    expect(screen.getByText(/初回検針では、指示数がそのまま使用量になります/)).toBeInTheDocument();
  });

  it('shows FAB save button', () => {
    setupMocks({
      meterReadings: { meterReadings: MOCK_METER_READINGS },
    });
    render(<MeterReadingApp />);
    const fab = screen.getByTitle('指示数を更新');
    expect(fab).toBeInTheDocument();
  });

  it('disables FAB when updating', () => {
    setupMocks({
      meterReadings: { meterReadings: MOCK_METER_READINGS },
      navigation: { updating: true },
    });
    render(<MeterReadingApp />);
    const fab = screen.getByTitle('指示数を更新');
    expect(fab).toBeDisabled();
  });

  it('shows loading overlay during navigation', () => {
    setupMocks({
      meterReadings: { meterReadings: MOCK_METER_READINGS },
      navigation: { isNavigating: true, navigationMessage: '画面を切り替えています...' },
    });
    render(<MeterReadingApp />);
    expect(screen.getByText('画面を切り替えています...')).toBeInTheDocument();
  });

  // === Phase R: Coverage deepening tests ===

  describe('input interactions', () => {
    it('updates reading input value on user input', async () => {
      const user = userEvent.setup();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '200');

      expect(inputs[0]).toHaveValue(200);
    });

    it('calls setInputErrors for negative value input', async () => {
      const mockSetInputErrors = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        update: { setInputErrors: mockSetInputErrors },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '-5' } });

      expect(mockSetInputErrors).toHaveBeenCalled();
      const lastCall = mockSetInputErrors.mock.calls[mockSetInputErrors.mock.calls.length - 1];
      const updaterFn = lastCall[0];
      const result = updaterFn({});
      expect(result['2025/06/15']).toContain('0以上');
    });

    it('calls setUsageStates with dash for negative input', async () => {
      const mockSetUsageStates = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        update: { setUsageStates: mockSetUsageStates },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '-5' } });

      expect(mockSetUsageStates).toHaveBeenCalled();
      const lastCall = mockSetUsageStates.mock.calls[mockSetUsageStates.mock.calls.length - 1];
      const updaterFn = lastCall[0];
      const result = updaterFn({});
      expect(result['2025/06/15']).toBe('-');
    });

    it('clears error when input is emptied', async () => {
      const mockSetInputErrors = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        update: { setInputErrors: mockSetInputErrors },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '' } });

      expect(mockSetInputErrors).toHaveBeenCalled();
      const lastCall = mockSetInputErrors.mock.calls[mockSetInputErrors.mock.calls.length - 1];
      const updaterFn = lastCall[0];
      const result = updaterFn({});
      expect(result['2025/06/15']).toBe('');
    });
  });

  describe('initial reading form interactions', () => {
    it('updates initial reading input on user input', async () => {
      const user = userEvent.setup();
      setupMocks({
        meterReadings: {
          meterReadings: [
            { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
          ],
        },
      });
      render(<MeterReadingApp />);

      const input = screen.getByPlaceholderText('指示数入力');
      await user.type(input, '100');
      expect(input).toHaveValue(100);
    });

    it('calls setInputErrors for negative initial reading input', () => {
      const mockSetInputErrors = vi.fn();
      setupMocks({
        meterReadings: {
          meterReadings: [
            { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
          ],
        },
        update: { setInputErrors: mockSetInputErrors },
      });
      render(<MeterReadingApp />);

      const input = screen.getByPlaceholderText('指示数入力');
      fireEvent.change(input, { target: { value: '-5' } });

      expect(mockSetInputErrors).toHaveBeenCalled();
      const lastCall = mockSetInputErrors.mock.calls[mockSetInputErrors.mock.calls.length - 1];
      const updaterFn = lastCall[0];
      const result = updaterFn({});
      expect(result['']).toContain('0以上');
    });

    it('shows initial reading error from inputErrors', () => {
      setupMocks({
        meterReadings: {
          meterReadings: [
            { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
          ],
        },
        update: { inputErrors: { '': '初回検針では指示数の入力が必須です。' } },
      });
      render(<MeterReadingApp />);

      expect(screen.getByText('初回検針では指示数の入力が必須です。')).toBeInTheDocument();
    });

    it('shows initial reading usage display from usageStates', () => {
      setupMocks({
        meterReadings: {
          meterReadings: [
            { date: '2025/06/15', currentReading: '', previousReading: '', warningFlag: '正常' },
          ],
        },
        update: { usageStates: { '': '100' } },
      });
      render(<MeterReadingApp />);

      expect(screen.getByText('100㎥')).toBeInTheDocument();
    });
  });

  describe('FAB button / handleUpdateReadings', () => {
    it('shows toast when FAB clicked with no changes', async () => {
      const user = userEvent.setup();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
      });
      render(<MeterReadingApp />);

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(screen.getByText('更新するデータがありません。')).toBeInTheDocument();
      });
    });

    it('calls fetch when FAB clicked after editing a reading', async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      setupMocks({
        meterReadings: {
          meterReadings: MOCK_METER_READINGS,
          gasWebAppUrl: 'https://example.com/gas',
        },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '200');

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(mockFetch.mock.calls[0][0]).toContain('updateMeterReadings');
      });
    });

    it('shows error toast when fetch fails after FAB click', async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        })
      );

      setupMocks({
        meterReadings: {
          meterReadings: MOCK_METER_READINGS,
          gasWebAppUrl: 'https://example.com/gas',
        },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '200');

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(screen.getByText(/更新エラー/)).toBeInTheDocument();
      });
    });

    it('shows validation error toast for empty required readings', async () => {
      const user = userEvent.setup();
      setupMocks({
        meterReadings: {
          meterReadings: [
            {
              date: '2025/06/15',
              currentReading: '',
              previousReading: 100,
              previousPreviousReading: 80,
              threeTimesPrevious: 60,
              usage: '',
              warningFlag: '判定不可',
              standardDeviation: '',
            },
          ],
          gasWebAppUrl: 'https://example.com/gas',
        },
      });
      render(<MeterReadingApp />);

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(screen.getByText(/入力値に誤りがあります/)).toBeInTheDocument();
      });
    });
  });

  describe('display edge cases', () => {
    it('shows fallback text for empty property and room name', () => {
      setupMocks({
        meterReadings: {
          meterReadings: MOCK_METER_READINGS,
          propertyName: '',
          roomName: '',
        },
      });
      render(<MeterReadingApp />);

      expect(screen.getByText('物件名未設定')).toBeInTheDocument();
      expect(screen.getByText('部屋: 部屋名未設定')).toBeInTheDocument();
    });

    it('renders previous readings text with diff', () => {
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
      });
      render(<MeterReadingApp />);

      expect(screen.getByText('前回: 100 [+20]')).toBeInTheDocument();
      expect(screen.getByText('前々回: 80 [+20]')).toBeInTheDocument();
      expect(screen.getByText('前々々回: 60')).toBeInTheDocument();
    });

    it('renders status badge without σ when not available', () => {
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
      });
      render(<MeterReadingApp />);

      // Status badges should show just the status text (正常, 要確認)
      const badges = screen.getAllByText(/正常|要確認/);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });

    it('calls handleBackButton when back button clicked', async () => {
      const user = userEvent.setup();
      const mockHandleBackButton = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        navigation: { handleBackButton: mockHandleBackButton },
      });
      render(<MeterReadingApp />);

      const backButton = screen.getByLabelText('戻る');
      await user.click(backButton);

      expect(mockHandleBackButton).toHaveBeenCalledWith('prop-001', 'room-101');
    });

    it('calls handleBackButton when back button clicked in loading state', async () => {
      const user = userEvent.setup();
      const mockHandleBackButton = vi.fn();
      setupMocks({
        meterReadings: { loading: true },
        navigation: { handleBackButton: mockHandleBackButton },
      });
      render(<MeterReadingApp />);

      const backButton = screen.getByLabelText('戻る');
      await user.click(backButton);

      expect(mockHandleBackButton).toHaveBeenCalledWith('prop-001', 'room-101');
    });

    it('calls handleBackButton when back button clicked in error state', async () => {
      const user = userEvent.setup();
      const mockHandleBackButton = vi.fn();
      setupMocks({
        meterReadings: { loading: false, error: 'テストエラー' },
        navigation: { handleBackButton: mockHandleBackButton },
      });
      render(<MeterReadingApp />);

      const backButton = screen.getByLabelText('戻る');
      await user.click(backButton);

      expect(mockHandleBackButton).toHaveBeenCalledWith('prop-001', 'room-101');
    });

    it('calls handlePreviousRoom when header prev button clicked', async () => {
      const user = userEvent.setup();
      const mockHandlePreviousRoom = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        navigation: { handlePreviousRoom: mockHandlePreviousRoom },
      });
      render(<MeterReadingApp />);

      const prevButtons = screen.getAllByLabelText('前の部屋に移動');
      await user.click(prevButtons[0]);

      expect(mockHandlePreviousRoom).toHaveBeenCalled();
    });

    it('calls handleNextRoom when header next button clicked', async () => {
      const user = userEvent.setup();
      const mockHandleNextRoom = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        navigation: { handleNextRoom: mockHandleNextRoom },
      });
      render(<MeterReadingApp />);

      const nextButtons = screen.getAllByLabelText('次の部屋に移動');
      await user.click(nextButtons[0]);

      expect(mockHandleNextRoom).toHaveBeenCalled();
    });

    it('calls handlePreviousRoom when footer prev button clicked', async () => {
      const user = userEvent.setup();
      const mockHandlePreviousRoom = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        navigation: { handlePreviousRoom: mockHandlePreviousRoom },
      });
      render(<MeterReadingApp />);

      const prevButtons = screen.getAllByLabelText('前の部屋に移動');
      // footer button is the second one
      await user.click(prevButtons[1]);

      expect(mockHandlePreviousRoom).toHaveBeenCalledTimes(1);
    });

    it('calls handleNextRoom when footer next button clicked', async () => {
      const user = userEvent.setup();
      const mockHandleNextRoom = vi.fn();
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        navigation: { handleNextRoom: mockHandleNextRoom },
      });
      render(<MeterReadingApp />);

      const nextButtons = screen.getAllByLabelText('次の部屋に移動');
      // footer button is the second one
      await user.click(nextButtons[1]);

      expect(mockHandleNextRoom).toHaveBeenCalledTimes(1);
    });

    it('shows network error toast when fetch promise rejects', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

      setupMocks({
        meterReadings: {
          meterReadings: MOCK_METER_READINGS,
          gasWebAppUrl: 'https://example.com/gas',
        },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '200');

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(screen.getByText(/更新エラー/)).toBeInTheDocument();
      });
      vi.restoreAllMocks();
    });

    it('shows error toast when API returns success false', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'サーバーエラー' }),
      }));

      setupMocks({
        meterReadings: {
          meterReadings: MOCK_METER_READINGS,
          gasWebAppUrl: 'https://example.com/gas',
        },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '200');

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(screen.getByText(/サーバーエラー/)).toBeInTheDocument();
      });
      vi.restoreAllMocks();
    });

    it('shows reload warning when data reload fails after successful update', async () => {
      const user = userEvent.setup();
      const mockLoadMeterReadings = vi.fn().mockRejectedValue(new Error('reload failed'));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }));

      setupMocks({
        meterReadings: {
          meterReadings: MOCK_METER_READINGS,
          gasWebAppUrl: 'https://example.com/gas',
          loadMeterReadings: mockLoadMeterReadings,
        },
      });
      render(<MeterReadingApp />);

      const inputs = screen.getAllByRole('spinbutton');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '200');

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(screen.getByText(/ページを再読み込み/)).toBeInTheDocument();
      });
      vi.restoreAllMocks();
    });
  });

  describe('ReadingHistoryTable branch coverage', () => {
    it('renders readings without previousPreviousReading', () => {
      setupMocks({
        meterReadings: {
          meterReadings: [
            {
              date: '2025/06/15',
              currentReading: 150,
              previousReading: 100,
              previousPreviousReading: '',
              threeTimesPrevious: '',
              usage: 50,
              warningFlag: '正常',
              standardDeviation: '',
            },
          ],
        },
      });
      render(<MeterReadingApp />);
      expect(screen.getByText('前回: 100')).toBeInTheDocument();
      expect(screen.queryByText(/前々回/)).not.toBeInTheDocument();
      expect(screen.queryByText(/前々々回/)).not.toBeInTheDocument();
    });

    it('renders readings with N/A values', () => {
      setupMocks({
        meterReadings: {
          meterReadings: [
            {
              date: '2025/06/15',
              currentReading: 150,
              previousReading: 100,
              previousPreviousReading: 'N/A',
              threeTimesPrevious: 'N/A',
              usage: 50,
              warningFlag: '正常',
              standardDeviation: '',
            },
          ],
        },
      });
      render(<MeterReadingApp />);
      expect(screen.getByText('前回: 100')).toBeInTheDocument();
    });

    it('renders readings with non-standard warningFlag status', () => {
      setupMocks({
        meterReadings: {
          meterReadings: [
            {
              date: '2025/06/15',
              currentReading: '',
              previousReading: 100,
              previousPreviousReading: 80,
              threeTimesPrevious: 60,
              usage: '',
              warningFlag: '判定不可',
              standardDeviation: '',
            },
          ],
        },
      });
      render(<MeterReadingApp />);
      expect(screen.getByText('判定不可')).toBeInTheDocument();
    });

    it('renders usage display with dash for negative input error', () => {
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        update: { usageStates: { '2025/06/15': '-' } },
      });
      render(<MeterReadingApp />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders input error message for a reading', () => {
      setupMocks({
        meterReadings: { meterReadings: MOCK_METER_READINGS },
        update: { inputErrors: { '2025/06/15': '0以上の数値を入力してください' } },
      });
      render(<MeterReadingApp />);
      expect(screen.getByText('0以上の数値を入力してください')).toBeInTheDocument();
    });
  });

  describe('FAB button / initial reading form', () => {
    it('saves initial reading via FAB with empty meterReadings', async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      setupMocks({
        meterReadings: {
          meterReadings: [],
          gasWebAppUrl: 'https://example.com/gas',
        },
      });
      render(<MeterReadingApp />);

      const input = screen.getByPlaceholderText('指示数入力');
      await user.type(input, '100');

      const fab = screen.getByTitle('初回検針データを保存');
      await user.click(fab);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(mockFetch.mock.calls[0][0]).toContain('updateMeterReadings');
      });
    });

    it('shows toast when FAB clicked with no propertyId', async () => {
      const user = userEvent.setup();
      setupMocks({
        meterReadings: {
          meterReadings: MOCK_METER_READINGS,
          propertyId: '',
        },
      });
      render(<MeterReadingApp />);

      const fab = screen.getByTitle('指示数を更新');
      await user.click(fab);

      await waitFor(() => {
        expect(screen.getByText(/物件IDまたは部屋IDが取得できませんでした/)).toBeInTheDocument();
      });
    });
  });

  describe('initial reading form edge cases', () => {
    it('saves initial reading via FAB with empty meterReadings', async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      setupMocks({
        meterReadings: {
          meterReadings: [],
          gasWebAppUrl: 'https://example.com/gas',
        },
      });
      render(<MeterReadingApp />);

      const input = screen.getByPlaceholderText('指示数入力');
      await user.type(input, '100');

      const fab = screen.getByTitle('初回検針データを保存');
      await user.click(fab);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(mockFetch.mock.calls[0][0]).toContain('updateMeterReadings');
      });
    });
  });
});
