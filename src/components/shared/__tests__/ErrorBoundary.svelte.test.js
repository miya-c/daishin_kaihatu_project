import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ErrorBoundaryWrapper from './ErrorBoundaryWrapper.svelte';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Suppress console.error for expected error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    const cleanup = $effect.root(() => {
      render(ErrorBoundaryWrapper, { props: { shouldCrash: false } });
      flushSync();
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('shows error UI when child throws', () => {
    const cleanup = $effect.root(() => {
      render(ErrorBoundaryWrapper, { props: { shouldCrash: true } });
      flushSync();
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('再試行')).toBeInTheDocument();
      expect(screen.getByText('ホームに戻る')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('error UI has role="alert"', () => {
    const cleanup = $effect.root(() => {
      render(ErrorBoundaryWrapper, { props: { shouldCrash: true } });
      flushSync();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });

  it('has error details section', () => {
    const cleanup = $effect.root(() => {
      render(ErrorBoundaryWrapper, { props: { shouldCrash: true } });
      flushSync();
      expect(screen.getByText('エラー詳細（開発者向け）')).toBeInTheDocument();
      return () => {};
    });
    cleanup();
  });
});
