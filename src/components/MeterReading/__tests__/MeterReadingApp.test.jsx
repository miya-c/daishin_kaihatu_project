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
  });
});
