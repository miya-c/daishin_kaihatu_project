import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ReadingHistoryTable from '../ReadingHistoryTable.svelte';

const createReading = (overrides = {}) => ({
  date: '2024-01-15',
  currentReading: 100,
  previousReading: 90,
  previousPreviousReading: 80,
  threeTimesPrevious: 70,
  ...overrides,
});

// Helper: find input by data-date attribute
function getInputByDate(date) {
  return document.querySelector(`input[data-date="${date}"]`);
}

describe('ReadingHistoryTable', () => {
  const defaultProps = {
    meterReadings: [createReading()],
    readingValues: {},
    inputErrors: {},
    usageStates: {},
    onInputChange: vi.fn(),
  };

  it('renders table with readings', () => {
    render(ReadingHistoryTable, { props: defaultProps });
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders input for each reading', () => {
    render(ReadingHistoryTable, { props: defaultProps });
    const input = getInputByDate('2024-01-15');
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute('type', 'number');
  });

  it('displays reading value from readingValues when available', () => {
    render(ReadingHistoryTable, {
      props: { ...defaultProps, readingValues: { '2024-01-15': '105' } },
    });
    const input = getInputByDate('2024-01-15');
    expect(input).toHaveValue(105);
  });

  it('displays input error when present', () => {
    render(ReadingHistoryTable, {
      props: { ...defaultProps, inputErrors: { '2024-01-15': '無効な値です' } },
    });
    expect(screen.getByText('無効な値です')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('filters out readings without previousReading', () => {
    render(ReadingHistoryTable, {
      props: {
        ...defaultProps,
        meterReadings: [
          createReading({ date: '2024-01-15', previousReading: 90 }),
          createReading({ date: '2024-01-16', previousReading: '' }),
          createReading({ date: '2024-01-17', previousReading: 0 }),
        ],
      },
    });
    expect(getInputByDate('2024-01-15')).toBeTruthy();
    expect(getInputByDate('2024-01-16')).toBeNull();
    expect(getInputByDate('2024-01-17')).toBeNull();
  });

  it('displays usage from usageStates when available', () => {
    render(ReadingHistoryTable, {
      props: { ...defaultProps, usageStates: { '2024-01-15': '12' } },
    });
    expect(screen.getByText('12㎥')).toBeInTheDocument();
  });

  it('renders previous readings info', () => {
    render(ReadingHistoryTable, { props: defaultProps });
    expect(screen.getByText(/前回: 90/)).toBeInTheDocument();
  });
});
