import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NetworkStatusBar from '../NetworkStatusBar.svelte';

describe('NetworkStatusBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows offline bar when navigator.onLine is false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const cleanup = $effect.root(() => {
      render(NetworkStatusBar);
      flushSync();
      expect(
        screen.getByText('オフライン - インターネット接続を確認してください')
      ).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('shows nothing when online and was never offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const cleanup = $effect.root(() => {
      const { container } = render(NetworkStatusBar);
      flushSync();
      expect(container.querySelector('.network-status-bar')).toBeNull();
      return () => {};
    });
    cleanup();
  });

  it('shows back-online bar after going offline then online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const cleanup = $effect.root(() => {
      render(NetworkStatusBar);
      flushSync();
      expect(screen.getByText(/オフライン/)).toBeInTheDocument();

      // Simulate going back online
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      fireEvent(window, new Event('online'));
      flushSync();

      expect(screen.getByText('オンラインに復帰しました')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('hides back-online bar after timeout', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const cleanup = $effect.root(() => {
      render(NetworkStatusBar);
      flushSync();

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      fireEvent(window, new Event('online'));
      flushSync();

      expect(screen.getByText('オンラインに復帰しました')).toBeInTheDocument();

      vi.advanceTimersByTime(3000);
      flushSync();

      expect(screen.queryByText('オンラインに復帰しました')).not.toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });
});
