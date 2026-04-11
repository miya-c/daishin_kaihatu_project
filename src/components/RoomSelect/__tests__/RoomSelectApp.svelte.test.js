import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';

vi.mock('../../../utils/gasClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getGasUrl: vi.fn(),
    gasFetch: vi.fn(),
  };
});

import RoomSelectApp from '../RoomSelectApp.svelte';
import { getGasUrl, gasFetch } from '../../../utils/gasClient';

describe('RoomSelectApp', () => {
  const originalLocation = window.location;
  let store;

  beforeEach(() => {
    vi.useFakeTimers();
    gasFetch.mockReset();
    store = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => Object.keys(store).forEach((k) => delete store[k])),
    });
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
    delete window.location;
    window.location = { ...originalLocation, href: '', search: '?propertyId=prop1' };
    getGasUrl.mockReturnValue('https://script.google.com/test');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  it('shows loading state initially', () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';
    gasFetch.mockReturnValue(new Promise(() => {}));

    const cleanup = $effect.root(() => {
      render(RoomSelectApp);
      flushSync();
      expect(screen.getByText('部屋データを読み込み中...')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('shows error when propertyId is missing', () => {
    window.location.search = '';

    const cleanup = $effect.root(() => {
      render(RoomSelectApp);
      flushSync();
      flushSync();
      expect(screen.getByText('物件IDが指定されていません。')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('renders rooms from API (with sessionStorage as fallback)', async () => {
    store['selectedRooms'] = JSON.stringify([
      { id: 'r1', name: '101号室', readingStatus: 'pending' },
      { id: 'r2', name: '102号室', readingStatus: 'completed', isCompleted: true },
    ]);
    store['selectedPropertyName'] = 'テスト物件';
    store['selectedPropertyId'] = 'prop1';
    store['gasWebAppUrl'] = 'https://script.google.com/test';

    gasFetch.mockResolvedValue({
      success: true,
      data: {
        rooms: [
          { id: 'r1', name: '101号室', readingStatus: 'pending' },
          { id: 'r2', name: '102号室', readingStatus: 'completed', isCompleted: true },
        ],
        propertyName: 'テスト物件',
      },
    });

    const cleanup = $effect.root(() => {
      render(RoomSelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText('テスト物件')).toBeInTheDocument();
    expect(screen.getByText('101号室')).toBeInTheDocument();
    expect(screen.getByText('102号室')).toBeInTheDocument();
    cleanup();
  });

  it('renders rooms from API when no cache', async () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';

    gasFetch.mockResolvedValue({
      success: true,
      data: {
        rooms: [
          { id: 'r1', name: '201号室' },
          { id: 'r2', name: '202号室' },
        ],
        propertyName: 'API物件',
      },
    });

    const cleanup = $effect.root(() => {
      render(RoomSelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText('API物件')).toBeInTheDocument();
    expect(screen.getByText('201号室')).toBeInTheDocument();
    expect(screen.getByText('202号室')).toBeInTheDocument();
    cleanup();
  });

  it('shows room status correctly', async () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';

    gasFetch.mockResolvedValue({
      success: true,
      data: {
        rooms: [
          { id: 'r1', name: '101号室', readingStatus: 'pending' },
          { id: 'r2', name: '102号室', readingStatus: 'completed', isCompleted: true },
          { id: 'r3', name: '103号室', isNotNeeded: true },
        ],
        propertyName: 'テスト物件',
      },
    });

    const cleanup = $effect.root(() => {
      render(RoomSelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByLabelText(/101号室.*未検針/)).toBeInTheDocument();
    expect(screen.getByLabelText(/102号室.*検針済み/)).toBeInTheDocument();
    expect(screen.getByLabelText(/103号室.*検針不要/)).toBeInTheDocument();
    cleanup();
  });

  it('shows "no rooms" message when rooms are empty', async () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';

    gasFetch.mockResolvedValue({
      success: true,
      data: {
        rooms: [],
        propertyName: '空の物件',
      },
    });

    const cleanup = $effect.root(() => {
      render(RoomSelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText('部屋データがありません')).toBeInTheDocument();
    cleanup();
  });
});
