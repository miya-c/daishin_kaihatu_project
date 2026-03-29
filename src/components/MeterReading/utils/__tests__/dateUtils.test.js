import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDateForDisplay,
  getCurrentJSTDateString,
  normalizeToJSTDate,
  getJSTDateString
} from '../dateUtils';

describe('formatDateForDisplay', () => {
  it('returns null for null', () => {
    expect(formatDateForDisplay(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(formatDateForDisplay(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatDateForDisplay('')).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(formatDateForDisplay('not-a-date')).toBeNull();
  });

  it('formats a valid ISO date string', () => {
    const result = formatDateForDisplay('2025-06-18');
    expect(result).toBeTruthy();
    expect(result).toContain('6月');
    expect(result).toContain('18日');
  });

  it('formats a Date object', () => {
    const result = formatDateForDisplay(new Date('2025-01-15'));
    expect(result).toBeTruthy();
    expect(result).toContain('1月');
    expect(result).toContain('15日');
  });
});

describe('getCurrentJSTDateString', () => {
  it('returns a JST date string (YYYY/MM/DD via Intl)', () => {
    const result = getCurrentJSTDateString();
    // Intl.DateTimeFormat('ja-CA', ...) produces YYYY/MM/DD
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });
});

describe('normalizeToJSTDate', () => {
  it('returns current date for null', () => {
    const result = normalizeToJSTDate(null);
    // Falls back to getCurrentJSTDateString which uses Intl (YYYY/MM/DD)
    expect(result).toMatch(/^\d{4}[\/-]\d{2}[\/-]\d{2}$/);
  });

  it('returns current date for empty string', () => {
    const result = normalizeToJSTDate('');
    expect(result).toMatch(/^\d{4}[\/-]\d{2}[\/-]\d{2}$/);
  });

  it('returns YYYY-MM-DD string as-is', () => {
    expect(normalizeToJSTDate('2025-06-18')).toBe('2025-06-18');
  });

  it('converts ISO string to JST date', () => {
    const result = normalizeToJSTDate('2025-06-18T15:00:00.000Z');
    // Intl.DateTimeFormat produces YYYY/MM/DD
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });

  it('returns current date for invalid input', () => {
    const result = normalizeToJSTDate('invalid');
    expect(result).toMatch(/^\d{4}[\/-]\d{2}[\/-]\d{2}$/);
  });
});

describe('getJSTDateString', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getJSTDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('produces same date as getCurrentJSTDateString (ignoring separator)', () => {
    // getJSTDateString returns YYYY-MM-DD, getCurrentJSTDateString returns YYYY/MM/DD
    const result1 = getCurrentJSTDateString().replace(/\//g, '-');
    const result2 = getJSTDateString();
    expect(result1).toBe(result2);
  });
});
