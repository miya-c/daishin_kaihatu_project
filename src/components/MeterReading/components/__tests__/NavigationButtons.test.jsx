import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import NavigationButtons from '../NavigationButtons';

describe('NavigationButtons', () => {
  describe('header variant', () => {
    it('renders title and both buttons', () => {
      render(
        <NavigationButtons
          hasPrevious={true}
          hasNext={true}
          disabled={false}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          variant="header"
        />
      );

      expect(screen.getByText('検針データ')).toBeInTheDocument();
      expect(screen.getByLabelText('前の部屋に移動')).toBeInTheDocument();
      expect(screen.getByLabelText('次の部屋に移動')).toBeInTheDocument();
    });

    it('disables previous button when hasPrevious is false', () => {
      render(
        <NavigationButtons
          hasPrevious={false}
          hasNext={true}
          disabled={false}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
        />
      );

      expect(screen.getByLabelText('前の部屋に移動')).toBeDisabled();
      expect(screen.getByLabelText('次の部屋に移動')).not.toBeDisabled();
    });

    it('disables next button when hasNext is false', () => {
      render(
        <NavigationButtons
          hasPrevious={true}
          hasNext={false}
          disabled={false}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
        />
      );

      expect(screen.getByLabelText('前の部屋に移動')).not.toBeDisabled();
      expect(screen.getByLabelText('次の部屋に移動')).toBeDisabled();
    });
  });

  describe('footer variant', () => {
    it('renders both buttons without title', () => {
      render(
        <NavigationButtons
          hasPrevious={true}
          hasNext={true}
          disabled={false}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          variant="footer"
        />
      );

      expect(screen.queryByText('検針データ')).not.toBeInTheDocument();
      expect(screen.getByText('← 前の部屋へ')).toBeInTheDocument();
      expect(screen.getByText('次の部屋へ →')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onPrevious when previous button clicked', async () => {
      const onPrevious = vi.fn();
      const user = userEvent.setup();

      render(
        <NavigationButtons
          hasPrevious={true}
          hasNext={true}
          disabled={false}
          onPrevious={onPrevious}
          onNext={vi.fn()}
        />
      );

      await user.click(screen.getByLabelText('前の部屋に移動'));
      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it('calls onNext when next button clicked', async () => {
      const onNext = vi.fn();
      const user = userEvent.setup();

      render(
        <NavigationButtons
          hasPrevious={true}
          hasNext={true}
          disabled={false}
          onPrevious={vi.fn()}
          onNext={onNext}
        />
      );

      await user.click(screen.getByLabelText('次の部屋に移動'));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('disables both buttons when disabled prop is true', () => {
      render(
        <NavigationButtons
          hasPrevious={true}
          hasNext={true}
          disabled={true}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
        />
      );

      expect(screen.getByLabelText('前の部屋に移動')).toBeDisabled();
      expect(screen.getByLabelText('次の部屋に移動')).toBeDisabled();
    });

    it('does not call handler when button is disabled', async () => {
      const onPrevious = vi.fn();
      const user = userEvent.setup();

      render(
        <NavigationButtons
          hasPrevious={false}
          hasNext={true}
          disabled={false}
          onPrevious={onPrevious}
          onNext={vi.fn()}
        />
      );

      await user.click(screen.getByLabelText('前の部屋に移動'));
      expect(onPrevious).not.toHaveBeenCalled();
    });
  });
});
