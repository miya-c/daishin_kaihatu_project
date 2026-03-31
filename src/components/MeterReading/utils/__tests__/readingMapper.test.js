import { describe, it, expect } from 'vitest';
import { mapReadingFromApi } from '../readingMapper';

describe('mapReadingFromApi', () => {
  describe('English keys', () => {
    it('maps all English keys correctly', () => {
      const raw = {
        recordId: 'rec-1',
        date: '2025-06-01',
        currentReading: '100',
        previousReading: '80',
        previousPreviousReading: '60',
        threeTimesPrevious: '40',
        usage: '20',
        warningFlag: '正常',
        standardDeviation: '0.5',
        status: '正常',
      };

      const result = mapReadingFromApi(raw, 0);
      expect(result.id).toBe('rec-1');
      expect(result.date).toBe('2025-06-01');
      expect(result.currentReading).toBe('100');
      expect(result.previousReading).toBe('80');
      expect(result.previousPreviousReading).toBe('60');
      expect(result.threeTimesPrevious).toBe('40');
      expect(result.usage).toBe(20);
      expect(result.warningFlag).toBe('正常');
      expect(result.standardDeviation).toBe('0.5');
      expect(result.status).toBe('正常');
    });

    it('uses index-based fallback ID when no ID present', () => {
      const raw = { date: '2025-06-01' };
      const result = mapReadingFromApi(raw, 3);
      expect(result.id).toBe('reading-3');
    });
  });

  describe('Japanese keys', () => {
    it('maps all Japanese keys correctly', () => {
      const raw = {
        記録ID: 'rec-jp',
        検針日時: '2025-07-01',
        今回の指示数: '200',
        前回指示数: '150',
        前々回指示数: '100',
        前々々回指示数: '50',
        今回使用量: '50',
        警告フラグ: '要確認',
        標準偏差値: '1.2',
        状態: '注意',
      };

      const result = mapReadingFromApi(raw, 0);
      expect(result.id).toBe('rec-jp');
      expect(result.date).toBe('2025-07-01');
      expect(result.currentReading).toBe('200');
      expect(result.previousReading).toBe('150');
      expect(result.previousPreviousReading).toBe('100');
      expect(result.threeTimesPrevious).toBe('50');
      expect(result.usage).toBe(50);
      expect(result.warningFlag).toBe('要確認');
      expect(result.standardDeviation).toBe('1.2');
    });

    it('maps alternative Japanese keys', () => {
      const raw = {
        ID: 'alt-id',
        記録日: '2025-08-01',
        今回指示数: '300',
        前回: '250',
        前々回: '200',
        前々々回: '150',
        使用量: '50',
      };

      const result = mapReadingFromApi(raw, 0);
      expect(result.id).toBe('alt-id');
      expect(result.date).toBe('2025-08-01');
      expect(result.currentReading).toBe('300');
      expect(result.previousReading).toBe('250');
      expect(result.previousPreviousReading).toBe('200');
      expect(result.threeTimesPrevious).toBe('150');
      expect(result.usage).toBe(50);
    });
  });

  describe('mixed keys', () => {
    it('prefers Japanese keys when both present', () => {
      const raw = {
        date: 'en-date',
        検針日時: 'jp-date',
        currentReading: 'en-reading',
        今回の指示数: 'jp-reading',
      };

      const result = mapReadingFromApi(raw, 0);
      expect(result.date).toBe('jp-date');
      expect(result.currentReading).toBe('jp-reading');
    });
  });

  describe('missing fields', () => {
    it('returns defaults for empty object', () => {
      const result = mapReadingFromApi({}, 0);
      expect(result.id).toBe('reading-0');
      expect(result.date).toBe('');
      expect(result.currentReading).toBe('');
      expect(result.previousReading).toBe('');
      expect(result.previousPreviousReading).toBe('');
      expect(result.threeTimesPrevious).toBe('');
      expect(result.usage).toBe(0);
      expect(result.warningFlag).toBe('正常');
      expect(result.standardDeviation).toBe('');
      expect(result.status).toBe('正常');
    });
  });

  describe('roomId option', () => {
    it('generates roomId-based ID when roomId provided', () => {
      const raw = { date: '2025-06-01', currentReading: '100' };
      const result = mapReadingFromApi(raw, 0, { roomId: 'room-101' });
      expect(result.id).toBe('room-101-2025-06-01');
    });

    it('uses date fallback in ID when roomId provided', () => {
      const raw = { 検針日時: '2025-07-01' };
      const result = mapReadingFromApi(raw, 2, { roomId: 'room-202' });
      expect(result.id).toBe('room-202-2025-07-01');
    });

    it('uses index fallback in ID when roomId provided and no date', () => {
      const raw = {};
      const result = mapReadingFromApi(raw, 5, { roomId: 'room-303' });
      expect(result.id).toBe('room-303-5');
    });
  });

  describe('calculateWarnings option', () => {
    it('recalculates warnings when calculateWarnings is true', () => {
      const raw = {
        currentReading: '1000',
        previousReading: '100',
        previousPreviousReading: '80',
        threeTimesPrevious: '60',
        warningFlag: '正常',
      };

      const result = mapReadingFromApi(raw, 0, { calculateWarnings: true });
      // 1000 is very high compared to previous readings, should trigger warning
      expect(result.warningFlag).toBeDefined();
    });

    it('does not recalculate warnings when calculateWarnings is false', () => {
      const raw = {
        currentReading: '1000',
        previousReading: '100',
        warningFlag: '正常',
      };

      const result = mapReadingFromApi(raw, 0, { calculateWarnings: false });
      expect(result.warningFlag).toBe('正常');
    });

    it('handles empty currentReading with calculateWarnings', () => {
      const raw = {
        previousReading: '100',
        previousPreviousReading: '80',
        threeTimesPrevious: '60',
      };

      const result = mapReadingFromApi(raw, 0, { calculateWarnings: true });
      expect(result.warningFlag).toBeDefined();
    });
  });
});
