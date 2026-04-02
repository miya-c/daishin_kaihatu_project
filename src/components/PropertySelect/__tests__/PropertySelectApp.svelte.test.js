import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen, fireEvent } from '@testing-library/svelte';

vi.mock('../../../utils/gasClient', () => ({
  getGasUrl: vi.fn(),
  fetchProperties: vi.fn(),
}));

import PropertySelectApp from '../PropertySelectApp.svelte';
import { getGasUrl, fetchProperties } from '../../../utils/gasClient';

describe('PropertySelectApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const store = {};
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
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    getGasUrl.mockReturnValue('https://script.google.com/test');
    fetchProperties.mockReturnValue(new Promise(() => {})); // never resolves

    const cleanup = $effect.root(() => {
      render(PropertySelectApp);
      flushSync();
      expect(screen.getByText('物件情報を読み込み中です...')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('shows URL modal when gasWebAppUrl is missing', () => {
    getGasUrl.mockReturnValue('');

    const cleanup = $effect.root(() => {
      render(PropertySelectApp);
      flushSync();
      flushSync();
      expect(screen.getByText('GAS Web App URL設定')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('renders properties after successful fetch', async () => {
    getGasUrl.mockReturnValue('https://script.google.com/test');
    fetchProperties.mockResolvedValue({
      data: [
        { id: 'p1', name: 'テスト物件A' },
        { id: 'p2', name: 'テスト物件B' },
      ],
    });

    const cleanup = $effect.root(() => {
      render(PropertySelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText('テスト物件A')).toBeInTheDocument();
    expect(screen.getByText('テスト物件B')).toBeInTheDocument();
    cleanup();
  });

  it('shows error when fetch fails', async () => {
    getGasUrl.mockReturnValue('https://script.google.com/test');
    fetchProperties.mockRejectedValue(new Error('Failed to fetch'));

    const cleanup = $effect.root(() => {
      render(PropertySelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText(/物件情報の取得に失敗/)).toBeInTheDocument();
    cleanup();
  });

  it('shows empty state when no properties', async () => {
    getGasUrl.mockReturnValue('https://script.google.com/test');
    fetchProperties.mockResolvedValue({ data: [] });

    const cleanup = $effect.root(() => {
      render(PropertySelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    expect(screen.getByText('登録されている物件がありません。')).toBeInTheDocument();
    cleanup();
  });

  it('filters properties by search term', async () => {
    getGasUrl.mockReturnValue('https://script.google.com/test');
    fetchProperties.mockResolvedValue({
      data: [
        { id: 'p1', name: 'テスト物件A' },
        { id: 'p2', name: 'テスト物件B' },
      ],
    });

    const cleanup = $effect.root(() => {
      render(PropertySelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    const searchInput = screen.getByPlaceholderText('物件IDまたは物件名で検索...');
    fireEvent.input(searchInput, { target: { value: '物件A' } });
    flushSync();

    expect(screen.getByText('テスト物件A')).toBeInTheDocument();
    expect(screen.queryByText('テスト物件B')).not.toBeInTheDocument();
    cleanup();
  });

  it('shows "no match" when search filter has no results', async () => {
    getGasUrl.mockReturnValue('https://script.google.com/test');
    fetchProperties.mockResolvedValue({
      data: [{ id: 'p1', name: 'テスト物件A' }],
    });

    const cleanup = $effect.root(() => {
      render(PropertySelectApp);
      flushSync();
      return () => {};
    });

    await vi.runAllTimersAsync();
    flushSync();

    const searchInput = screen.getByPlaceholderText('物件IDまたは物件名で検索...');
    fireEvent.input(searchInput, { target: { value: '存在しない' } });
    flushSync();

    expect(screen.getByText('該当する物件が見つかりません。')).toBeInTheDocument();
    cleanup();
  });
});
