import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ToastOverlay from '../ToastOverlay.svelte';

describe('ToastOverlay', () => {
  it('renders when show=true', () => {
    render(ToastOverlay, { props: { show: true, message: '保存しました' } });
    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('does not render when show=false', () => {
    render(ToastOverlay, { props: { show: false, message: 'テスト' } });
    expect(screen.queryByText('テスト')).not.toBeInTheDocument();
  });

  it('has role="status" when visible', () => {
    render(ToastOverlay, { props: { show: true, message: 'メッセージ' } });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite" when visible', () => {
    render(ToastOverlay, { props: { show: true, message: 'メッセージ' } });
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
