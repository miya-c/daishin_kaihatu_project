import { calculateWarningFlag } from './warningFlag';

import type { MeterReading } from '../../../types';

/**
 * Options for the mapReadingFromApi function.
 */
interface MapReadingOptions {
  /** Room ID for ID generation (navigation flow). */
  roomId?: string;
  /** Whether to recalculate warning flags. Defaults to false. */
  calculateWarnings?: boolean;
}

/**
 * Raw reading object from the API, which may contain English or Japanese keys.
 */
interface RawReading {
  [key: string]: unknown;
}

/**
 * Maps a raw API reading object to the internal reading model.
 * Covers both English and Japanese key variants from the API.
 *
 * @param rawReading - Raw reading from API response
 * @param index - Array index for fallback ID generation
 * @param options - Optional configuration
 * @returns Normalized reading object
 */
export const mapReadingFromApi = (
  rawReading: RawReading,
  index: number,
  options: MapReadingOptions = {}
): MeterReading => {
  const { roomId, calculateWarnings = false } = options;

  const mapped: MeterReading = {
    id: extractId(rawReading, index, roomId),
    date: extractDate(rawReading),
    currentReading: extractCurrentReading(rawReading),
    previousReading: extractPreviousReading(rawReading),
    previousPreviousReading: extractPreviousPreviousReading(rawReading),
    threeTimesPrevious: extractThreeTimesPrevious(rawReading),
    usage: extractUsage(rawReading),
    warningFlag: extractWarningFlag(rawReading),
    standardDeviation: extractStandardDeviation(rawReading),
    status: extractStatus(rawReading),
  };

  if (calculateWarnings) {
    recalculateWarnings(mapped);
  }

  return mapped;
};

function extractId(raw: RawReading, index: number, roomId?: string): string {
  const base = String(raw['記録ID'] || raw['recordId'] || raw['ID'] || raw['id'] || `reading-${index}`);
  return roomId ? `${roomId}-${raw['date'] || raw['検針日時'] || index}` : base;
}

function extractDate(raw: RawReading): string {
  return String(raw['検針日時'] || raw['date'] || raw['記録日'] || '');
}

function extractCurrentReading(raw: RawReading): string {
  return String(
    raw['今回の指示数'] ||
    raw['今回指示数'] ||
    raw['今回指示数（水道）'] ||
    raw['currentReading'] ||
    raw['指示数'] ||
    ''
  );
}

function extractPreviousReading(raw: RawReading): string {
  return String(raw['前回指示数'] || raw['previousReading'] || raw['前回'] || '');
}

function extractPreviousPreviousReading(raw: RawReading): string {
  return String(
    raw['前々回指示数'] ||
    raw['previousPreviousReading'] ||
    raw['前々回'] ||
    ''
  );
}

function extractThreeTimesPrevious(raw: RawReading): string {
  return String(
    raw['前々々回指示数'] ||
    raw['threeTimesPreviousReading'] ||
    raw['threeTimesPrevious'] ||
    raw['前々々回'] ||
    ''
  );
}

function extractUsage(raw: RawReading): number {
  const rawValue = raw['今回使用量'] ?? raw['usage'] ?? raw['使用量'] ?? 0;
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  return isNaN(value) ? 0 : value;
}

function extractWarningFlag(raw: RawReading): string {
  return String(raw['警告フラグ'] || raw['warningFlag'] || '正常');
}

function extractStandardDeviation(raw: RawReading): string | number {
  const value = raw['標準偏差値'] ?? raw['standardDeviation'] ?? '';
  if (value === '' || value === undefined) return '';
  return typeof value === 'number' ? value : String(value);
}

function extractStatus(raw: RawReading): string {
  return String(raw['警告フラグ'] || raw['status'] || raw['状態'] || '正常');
}

function recalculateWarnings(mapped: MeterReading): void {
  const current = parseFloat(String(mapped.currentReading));
  const previous = parseFloat(String(mapped.previousReading));
  const prevPrev = parseFloat(String(mapped.previousPreviousReading));
  const prevPrevPrev = parseFloat(String(mapped.threeTimesPrevious));

  if (mapped.currentReading && mapped.previousReading) {
    const result = calculateWarningFlag(
      isNaN(current) ? null : current,
      isNaN(previous) ? 0 : previous,
      isNaN(prevPrev) ? 0 : prevPrev,
      isNaN(prevPrevPrev) ? 0 : prevPrevPrev
    );
    mapped.warningFlag = result.warningFlag;
    mapped.standardDeviation = result.standardDeviation;
  } else if (!mapped.currentReading || mapped.currentReading === '') {
    const result = calculateWarningFlag(
      null,
      isNaN(previous) ? 0 : previous,
      isNaN(prevPrev) ? 0 : prevPrev,
      isNaN(prevPrevPrev) ? 0 : prevPrevPrev
    );
    mapped.warningFlag = result.warningFlag;
    mapped.standardDeviation = result.standardDeviation;
  }
}
