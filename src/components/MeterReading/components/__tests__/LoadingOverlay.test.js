import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LoadingOverlay from '../LoadingOverlay.svelte';

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(LoadingOverlay);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(LoadingOverlay, { props: { message: 'データを取得中...' } });
    expect(screen.getByText('データを取得中...')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(LoadingOverlay);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(LoadingOverlay);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
