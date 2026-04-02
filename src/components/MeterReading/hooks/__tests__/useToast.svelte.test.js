import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { createToast } from '../useToast.svelte';

describe('createToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with showToast=false and empty message', () => {
    const cleanup = $effect.root(() => {
      const toast = createToast();
      flushSync();
      expect(toast.showToast).toBe(false);
      expect(toast.toastMessage).toBe('');
      return () => {};
    });
    cleanup();
  });

  it('displayToast shows toast with message', () => {
    const cleanup = $effect.root(() => {
      const toast = createToast();
      flushSync();

      toast.displayToast('テストメッセージ');
      flushSync();

      expect(toast.showToast).toBe(true);
      expect(toast.toastMessage).toBe('テストメッセージ');
      return () => {};
    });
    cleanup();
  });

  it('hides toast after autoHideMs', () => {
    const cleanup = $effect.root(() => {
      const toast = createToast(3000);
      flushSync();

      toast.displayToast('テスト');
      flushSync();
      expect(toast.showToast).toBe(true);

      vi.advanceTimersByTime(3000);
      flushSync();

      expect(toast.showToast).toBe(false);
      expect(toast.toastMessage).toBe('');
      return () => {};
    });
    cleanup();
  });

  it('resets timer when displayToast called again', () => {
    const cleanup = $effect.root(() => {
      const toast = createToast(3000);
      flushSync();

      toast.displayToast('1st');
      flushSync();

      vi.advanceTimersByTime(2000);

      toast.displayToast('2nd');
      flushSync();
      expect(toast.showToast).toBe(true);
      expect(toast.toastMessage).toBe('2nd');

      vi.advanceTimersByTime(1000);
      flushSync();
      expect(toast.showToast).toBe(true);

      vi.advanceTimersByTime(2000);
      flushSync();
      expect(toast.showToast).toBe(false);
      return () => {};
    });
    cleanup();
  });

  it('accepts custom autoHideMs', () => {
    const cleanup = $effect.root(() => {
      const toast = createToast(1000);
      flushSync();

      toast.displayToast('short');
      flushSync();

      vi.advanceTimersByTime(1000);
      flushSync();

      expect(toast.showToast).toBe(false);
      return () => {};
    });
    cleanup();
  });
});
