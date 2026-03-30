import { calculateWarningFlag } from './warningFlag';

/**
 * Maps a raw API reading object to the internal reading model.
 * Covers both English and Japanese key variants from the API.
 *
 * @param {Object} rawReading - Raw reading from API response
 * @param {number} index - Array index for fallback ID generation
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.roomId] - Room ID for ID generation (navigation flow)
 * @param {boolean} [options.calculateWarnings=false] - Whether to recalculate warning flags
 * @returns {Object} Normalized reading object
 */
export const mapReadingFromApi = (rawReading, index, options = {}) => {
  const { roomId, calculateWarnings = false } = options;

  const mapped = {
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

function extractId(raw, index, roomId) {
  const base = raw['記録ID'] || raw['recordId'] || raw['ID'] || raw.id || `reading-${index}`;
  return roomId ? `${roomId}-${raw.date || raw['検針日時'] || index}` : base;
}

function extractDate(raw) {
  return raw['検針日時'] || raw.date || raw['記録日'] || '';
}

function extractCurrentReading(raw) {
  return (
    raw['今回の指示数'] ||
    raw['今回指示数'] ||
    raw['今回指示数（水道）'] ||
    raw.currentReading ||
    raw['指示数'] ||
    ''
  );
}

function extractPreviousReading(raw) {
  return raw['前回指示数'] || raw.previousReading || raw['前回'] || '';
}

function extractPreviousPreviousReading(raw) {
  return (
    raw['前々回指示数'] ||
    raw.previousPreviousReading ||
    raw.previousPreviousReading ||
    raw['前々回'] ||
    ''
  );
}

function extractThreeTimesPrevious(raw) {
  return (
    raw['前々々回指示数'] ||
    raw.threeTimesPreviousReading ||
    raw.threeTimesPrevious ||
    raw['前々々回'] ||
    ''
  );
}

function extractUsage(raw) {
  return raw['今回使用量'] || raw.usage || raw['使用量'] || 0;
}

function extractWarningFlag(raw) {
  return raw['警告フラグ'] || raw.warningFlag || '正常';
}

function extractStandardDeviation(raw) {
  return raw['標準偏差値'] || raw.standardDeviation || '';
}

function extractStatus(raw) {
  return raw['警告フラグ'] || raw.status || raw['状態'] || '正常';
}

function recalculateWarnings(mapped) {
  const current = parseFloat(mapped.currentReading);
  const previous = parseFloat(mapped.previousReading);
  const prevPrev = parseFloat(mapped.previousPreviousReading);
  const prevPrevPrev = parseFloat(mapped.threeTimesPrevious);

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
