import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import InitialReadingForm from '../InitialReadingForm.svelte';

describe('InitialReadingForm', () => {
  const defaultProps = {
    readingValue: '',
    inputError: '',
    usageState: '-',
    onInputChange: vi.fn(),
  };

  it('renders initial reading form', () => {
    render(InitialReadingForm, { props: defaultProps });
    expect(screen.getByText('初回検針')).toBeInTheDocument();
    expect(screen.getByLabelText('今回指示数(㎥):')).toBeInTheDocument();
  });

  it('displays reading value in input', () => {
    render(InitialReadingForm, { props: { ...defaultProps, readingValue: '123' } });
    expect(screen.getByLabelText('今回指示数(㎥):')).toHaveValue(123);
  });

  it('calls onInputChange when value is entered', async () => {
    const onInputChange = vi.fn();
    render(InitialReadingForm, { props: { ...defaultProps, onInputChange } });
    await userEvent.type(screen.getByLabelText('今回指示数(㎥):'), '50');
    expect(onInputChange).toHaveBeenCalledWith('50');
  });

  it('displays error when inputError is set', () => {
    render(InitialReadingForm, {
      props: { ...defaultProps, inputError: '数値を入力してください' },
    });
    expect(screen.getByText('数値を入力してください')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays usage state', () => {
    render(InitialReadingForm, { props: { ...defaultProps, usageState: '5' } });
    expect(screen.getByText('5㎥')).toBeInTheDocument();
  });

  it('displays dash for empty usage state', () => {
    render(InitialReadingForm, { props: { ...defaultProps, usageState: '-' } });
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows "検針日時" field as readonly with "未検針"', () => {
    render(InitialReadingForm, { props: defaultProps });
    const dateInput = screen.getByLabelText('検針日時:');
    expect(dateInput).toHaveValue('未検針');
    expect(dateInput).toHaveAttribute('readonly');
  });
});
