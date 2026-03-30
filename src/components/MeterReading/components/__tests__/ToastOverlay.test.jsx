import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToastOverlay from '../ToastOverlay';

describe('ToastOverlay', () => {
  it('renders message when show is true', () => {
    render(<ToastOverlay show={true} message="保存しました" />);

    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('returns null when show is false', () => {
    const { container } = render(<ToastOverlay show={false} message="保存しました" />);

    expect(container.innerHTML).toBe('');
  });

  it('renders with correct overlay styling', () => {
    const { container } = render(<ToastOverlay show={true} message="テストメッセージ" />);
    const overlay = container.firstChild;

    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.zIndex).toBe('2000');
  });

  it('renders with dark background overlay', () => {
    const { container } = render(<ToastOverlay show={true} message="テスト" />);
    const overlay = container.firstChild;

    expect(overlay.style.backgroundColor).toContain('rgba(0, 0, 0');
  });
});
