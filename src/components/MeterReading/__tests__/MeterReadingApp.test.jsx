import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
