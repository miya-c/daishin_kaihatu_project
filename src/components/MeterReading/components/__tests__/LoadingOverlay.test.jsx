import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingOverlay from '../LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(<LoadingOverlay />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="データを保存しています..." />);

    expect(screen.getByText('データを保存しています...')).toBeInTheDocument();
  });

  it('covers the full viewport with high z-index', () => {
    const { container } = render(<LoadingOverlay />);
    const overlay = container.firstChild;

    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.width).toBe('100%');
    expect(overlay.style.height).toBe('100%');
    expect(overlay.style.zIndex).toBe('50000');
  });

  it('renders spinner element', () => {
    const { container } = render(<LoadingOverlay />);
    const spinner = container.querySelector('[style*="border-radius: 50%"]');

    expect(spinner).toBeTruthy();
  });
});
