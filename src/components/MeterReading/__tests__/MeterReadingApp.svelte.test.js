import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';

import MeterReadingApp from '../MeterReadingApp.svelte';

describe('MeterReadingApp', () => {
  const originalLocation = window.location;
  let store;

  beforeEach(() => {
    vi.useFakeTimers();
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
    delete window.location;
    window.location = { ...originalLocation, search: '?propertyId=p1&roomId=r1', href: '' };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  it('shows loading state when gasWebAppUrl is set', () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

    const cleanup = $effect.root(() => {
      render(MeterReadingApp);
      flushSync();
      expect(screen.getByText('検針データを読み込んでいます...')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('shows error when gasWebAppUrl is missing', () => {
    // No gasWebAppUrl in store
    const cleanup = $effect.root(() => {
      render(MeterReadingApp);
      flushSync();
      expect(screen.getByText(/エラー/)).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('shows error when URL params are missing', () => {
    window.location.search = '';
    store['gasWebAppUrl'] = 'https://script.google.com/test';

    const cleanup = $effect.root(() => {
      render(MeterReadingApp);
      flushSync();
      flushSync();
      expect(screen.getByText(/物件情報または部屋情報が不足/)).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('renders main content after successful data load', async () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';
    store['selectedRooms'] = JSON.stringify([{ id: 'r1' }, { id: 'r2' }]);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              propertyName: 'テスト物件',
              roomName: '101号室',
              readings: [
                {
                  date: '2024-01-15',
                  currentReading: 100,
                  previousReading: 90,
                },
              ],
            },
          }),
      })
    );

    const cleanup = $effect.root(() => {
      render(MeterReadingApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText('テスト物件')).toBeInTheDocument();
    expect(screen.getByText(/101号室/)).toBeInTheDocument();
    cleanup();
  });

  it('shows initial reading form when no previous readings', async () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';
    store['selectedRooms'] = JSON.stringify([{ id: 'r1' }]);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              propertyName: '新規物件',
              roomName: '201号室',
              readings: [
                {
                  date: '2024-06-01',
                  currentReading: '',
                  previousReading: '',
                },
              ],
            },
          }),
      })
    );

    const cleanup = $effect.root(() => {
      render(MeterReadingApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText('初回検針')).toBeInTheDocument();
    cleanup();
  });

  it('renders back button', async () => {
    store['gasWebAppUrl'] = 'https://script.google.com/test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              propertyName: 'テスト物件',
              roomName: '101号室',
              readings: [],
            },
          }),
      })
    );

    const cleanup = $effect.root(() => {
      render(MeterReadingApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByLabelText('戻る')).toBeInTheDocument();
    cleanup();
  });
});
