import { describe, it, expect } from 'vitest';
import {
  calculateSTDEV_S,
  calculateAVERAGE,
  calculateThreshold,
  calculateWarningFlag,
  getStatusDisplay,
} from '../warningFlag';

describe('calculateSTDEV_S', () => {
  it('returns 0 for empty array', () => {
    expect(calculateSTDEV_S([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(calculateSTDEV_S([10])).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(calculateSTDEV_S(null)).toBe(0);
  });

  it('calculates sample standard deviation for two values', () => {
    // [10, 20] -> mean=15, variance=(25+25)/(2-1)=50, stdev=7.071...
    const result = calculateSTDEV_S([10, 20]);
    expect(result).toBeCloseTo(7.071, 2);
  });

  it('calculates sample standard deviation for three values', () => {
    // [10, 20, 30] -> mean=20, variance=(100+0+100)/(3-1)=100, stdev=10
    const result = calculateSTDEV_S([10, 20, 30]);
    expect(result).toBeCloseTo(10, 5);
  });

  it('returns 0 for identical values', () => {
    expect(calculateSTDEV_S([5, 5, 5, 5])).toBe(0);
  });
});

describe('calculateAVERAGE', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAVERAGE([])).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(calculateAVERAGE(null)).toBe(0);
  });

  it('calculates average correctly', () => {
    expect(calculateAVERAGE([10, 20, 30])).toBe(20);
  });

  it('handles single value', () => {
    expect(calculateAVERAGE([42])).toBe(42);
  });
});

describe('calculateThreshold', () => {
  it('returns isCalculable=false when insufficient history', () => {
    const result = calculateThreshold(100);
    expect(result.isCalculable).toBe(false);
    expect(result.reason).toBe('履歴データ不足');
  });

  it('returns isCalculable=false when all null', () => {
    const result = calculateThreshold(null, null, null);
    expect(result.isCalculable).toBe(false);
  });

  it('calculates threshold with two history values', () => {
    // previous=100, prevPrev=90 -> stdev of [100,90] = 7.071, floor=7
    // threshold = 100 + 7 + 10 = 117
    const result = calculateThreshold(100, 90);
    expect(result.isCalculable).toBe(true);
    expect(result.threshold).toBe(117);
    expect(result.standardDeviation).toBe(7);
  });

  it('calculates threshold with three history values', () => {
    // previous=100, prevPrev=90, prevPrevPrev=80 -> stdev of [100,90,80]=10
    // threshold = 100 + 10 + 10 = 120
    const result = calculateThreshold(100, 90, 80);
    expect(result.isCalculable).toBe(true);
    expect(result.threshold).toBe(120);
    expect(result.standardDeviation).toBe(10);
  });

  it('ignores negative history values', () => {
    const result = calculateThreshold(100, -5);
    expect(result.isCalculable).toBe(false);
  });

  it('ignores NaN values', () => {
    const result = calculateThreshold(100, NaN);
    expect(result.isCalculable).toBe(false);
  });
});

describe('calculateWarningFlag', () => {
  it('returns 入力待ち when current is null and history is sufficient', () => {
    const result = calculateWarningFlag(null, 100, 90, 80);
    expect(result.warningFlag).toBe('入力待ち');
  });

  it('returns 判定不可 when current is null and insufficient history', () => {
    const result = calculateWarningFlag(null, 100);
    expect(result.warningFlag).toBe('判定不可');
  });

  it('returns 要確認 when current < previous', () => {
    const result = calculateWarningFlag(50, 100, 90, 80);
    expect(result.warningFlag).toBe('要確認');
    expect(result.reason).toBe('前回値未満');
  });

  it('returns 正常 when current is within threshold', () => {
    // threshold = 100 + floor(stdev([100,90,80])) + 10 = 100+10+10 = 120
    const result = calculateWarningFlag(115, 100, 90, 80);
    expect(result.warningFlag).toBe('正常');
  });

  it('returns 要確認 when current exceeds threshold', () => {
    // threshold = 100 + 10 + 10 = 120
    const result = calculateWarningFlag(125, 100, 90, 80);
    expect(result.warningFlag).toBe('要確認');
  });

  it('returns 正常 when current equals threshold', () => {
    // threshold = 120
    const result = calculateWarningFlag(120, 100, 90, 80);
    expect(result.warningFlag).toBe('正常');
  });

  it('returns 正常 when no history and valid current', () => {
    const result = calculateWarningFlag(50, null, null, null);
    expect(result.warningFlag).toBe('正常');
  });

  it('handles empty string as missing current', () => {
    const result = calculateWarningFlag('', 100, 90, 80);
    expect(result.warningFlag).toBe('入力待ち');
  });

  it('handles negative current reading', () => {
    const result = calculateWarningFlag(-5, 100, 90, 80);
    expect(result.warningFlag).toBe('入力待ち');
  });
});

describe('getStatusDisplay', () => {
  it('returns 入力待ち when no currentReading with sufficient history', () => {
    const result = getStatusDisplay({
      previousReading: 100,
      previousPreviousReading: 90,
      threeTimesPrevious: 80,
    });
    expect(result).toBe('入力待ち');
  });

  it('returns existing warningFlag when set', () => {
    const result = getStatusDisplay({
      currentReading: '',
      warningFlag: '要確認',
    });
    expect(result).toBe('要確認');
  });

  it('returns 要確認 when usage is negative', () => {
    const result = getStatusDisplay({
      currentReading: 50,
      previousReading: 100,
      warningFlag: '',
    });
    expect(result).toBe('要確認');
  });

  it('returns 正常 when usage is positive', () => {
    const result = getStatusDisplay({
      currentReading: 150,
      previousReading: 100,
      warningFlag: '',
    });
    expect(result).toBe('正常');
  });
});
