import { describe, it, expect } from 'vitest';
import {
  formatReading,
  formatUsage,
  formatStatus,
  formatInspectionStatus,
  calculateUsage,
  calculateUsageDisplay,
} from '../formatUtils';

describe('formatReading', () => {
  it('returns empty string for null', () => {
    expect(formatReading(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatReading(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatReading('')).toBe('');
  });

  it('returns string representation of a number', () => {
    expect(formatReading(123)).toBe('123');
  });

  it('returns string representation of a string number', () => {
    expect(formatReading('456')).toBe('456');
  });

  it('trims whitespace from string values', () => {
    expect(formatReading('  789  ')).toBe('789');
  });

  it('handles zero correctly', () => {
    expect(formatReading(0)).toBe('0');
  });

  it('handles decimal values', () => {
    expect(formatReading(12.5)).toBe('12.5');
  });
});

describe('formatUsage', () => {
  it('returns empty string for null', () => {
    expect(formatUsage(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatUsage(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatUsage('')).toBe('');
  });

  it('returns empty string for non-numeric string', () => {
    expect(formatUsage('abc')).toBe('');
  });

  it('returns numeric string for valid number', () => {
    expect(formatUsage(42)).toBe('42');
  });

  it('returns numeric string for numeric string input', () => {
    expect(formatUsage('15.5')).toBe('15.5');
  });

  it('handles zero', () => {
    expect(formatUsage(0)).toBe('0');
  });
});

describe('formatStatus', () => {
  it('returns 正常 for null', () => {
    expect(formatStatus(null)).toBe('正常');
  });

  it('returns 正常 for undefined', () => {
    expect(formatStatus(undefined)).toBe('正常');
  });

  it('returns 正常 for empty string', () => {
    expect(formatStatus('')).toBe('正常');
  });

  it('returns 正常 for 未入力', () => {
    expect(formatStatus('未入力')).toBe('正常');
  });

  it('returns trimmed status value for other strings', () => {
    expect(formatStatus('  要確認  ')).toBe('要確認');
  });

  it('returns the status as-is for valid status', () => {
    expect(formatStatus('要確認')).toBe('要確認');
  });

  it('returns 正常 for a normal status', () => {
    expect(formatStatus('正常')).toBe('正常');
  });
});

describe('formatInspectionStatus', () => {
  it('returns 未検針 status for null date', () => {
    const result = formatInspectionStatus(null);
    expect(result.status).toBe('未検針');
    expect(result.displayDate).toBeNull();
  });

  it('returns 未検針 status for undefined date', () => {
    const result = formatInspectionStatus(undefined);
    expect(result.status).toBe('未検針');
    expect(result.displayDate).toBeNull();
  });

  it('returns 未検針 status for empty string', () => {
    const result = formatInspectionStatus('');
    expect(result.status).toBe('未検針');
    expect(result.displayDate).toBeNull();
  });

  it('returns 検針済み status for a valid date string', () => {
    const result = formatInspectionStatus('2026/03/30');
    expect(result.status).toBe('検針済み');
    expect(result.displayDate).toBeTruthy();
  });

  it('returns an object with status and displayDate properties', () => {
    const result = formatInspectionStatus('2026-03-30');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('displayDate');
  });
});

describe('calculateUsage', () => {
  it('returns empty string when current reading is invalid', () => {
    expect(calculateUsage(null, '100')).toBe('');
    expect(calculateUsage(undefined, '100')).toBe('');
    expect(calculateUsage('abc', '100')).toBe('');
  });

  it('returns current reading as string when no previous reading', () => {
    expect(calculateUsage('50', null)).toBe('50');
    expect(calculateUsage('50', '')).toBe('50');
    expect(calculateUsage('50', undefined)).toBe('50');
  });

  it('returns current reading when previous is zero', () => {
    expect(calculateUsage('50', 0)).toBe('50');
    expect(calculateUsage('50', '0')).toBe('50');
  });

  it('calculates positive usage correctly', () => {
    expect(calculateUsage('150', '100')).toBe('50');
    expect(calculateUsage(200, 150)).toBe('50');
  });

  it('returns 0 when previous exceeds current (negative usage)', () => {
    expect(calculateUsage('50', '100')).toBe('0');
    expect(calculateUsage(10, 50)).toBe('0');
  });

  it('handles decimal values', () => {
    const result = parseFloat(calculateUsage('100.5', '80.2'));
    expect(result).toBeCloseTo(20.3, 1);
  });

  it('returns empty string when current is empty string', () => {
    expect(calculateUsage('', '100')).toBe('');
  });

  it('handles numeric string inputs', () => {
    expect(calculateUsage('200', '150')).toBe('50');
  });

  it('returns zero usage when current equals previous', () => {
    expect(calculateUsage('100', '100')).toBe('0');
  });
});

describe('calculateUsageDisplay', () => {
  it('is an alias for calculateUsage', () => {
    expect(calculateUsageDisplay).toBe(calculateUsage);
  });

  it('produces the same results as calculateUsage', () => {
    expect(calculateUsageDisplay('150', '100')).toBe(calculateUsage('150', '100'));
    expect(calculateUsageDisplay(null, '100')).toBe(calculateUsage(null, '100'));
    expect(calculateUsageDisplay('50', '')).toBe(calculateUsage('50', ''));
  });
});
