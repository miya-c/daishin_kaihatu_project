import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import NavigationButtons from '../NavigationButtons.svelte';

describe('NavigationButtons', () => {
  const defaultProps = {
    hasPrevious: true,
    hasNext: true,
    disabled: false,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  };

  it('renders previous and next buttons (header variant)', () => {
    render(NavigationButtons, { props: defaultProps });
    expect(screen.getByText('← 前の部屋')).toBeInTheDocument();
    expect(screen.getByText('次の部屋 →')).toBeInTheDocument();
  });

  it('renders previous and next buttons (footer variant)', () => {
    render(NavigationButtons, { props: { ...defaultProps, variant: 'footer' } });
    expect(screen.getByText('← 前の部屋へ')).toBeInTheDocument();
    expect(screen.getByText('次の部屋へ →')).toBeInTheDocument();
  });

  it('calls onPrevious when previous button clicked', async () => {
    const onPrevious = vi.fn();
    render(NavigationButtons, { props: { ...defaultProps, onPrevious } });
    await userEvent.click(screen.getByText('← 前の部屋'));
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it('calls onNext when next button clicked', async () => {
    const onNext = vi.fn();
    render(NavigationButtons, { props: { ...defaultProps, onNext } });
    await userEvent.click(screen.getByText('次の部屋 →'));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('disables previous button when hasPrevious=false', () => {
    render(NavigationButtons, { props: { ...defaultProps, hasPrevious: false } });
    expect(screen.getByText('← 前の部屋')).toBeDisabled();
  });

  it('disables next button when hasNext=false', () => {
    render(NavigationButtons, { props: { ...defaultProps, hasNext: false } });
    expect(screen.getByText('次の部屋 →')).toBeDisabled();
  });

  it('disables both buttons when disabled=true', () => {
    render(NavigationButtons, { props: { ...defaultProps, disabled: true } });
    expect(screen.getByText('← 前の部屋')).toBeDisabled();
    expect(screen.getByText('次の部屋 →')).toBeDisabled();
  });

  it('has aria-labels on buttons', () => {
    render(NavigationButtons, { props: defaultProps });
    expect(screen.getByLabelText('前の部屋に移動')).toBeInTheDocument();
    expect(screen.getByLabelText('次の部屋に移動')).toBeInTheDocument();
  });
});
