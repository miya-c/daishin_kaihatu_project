/**
 * Warning flag calculation utilities for meter reading analysis.
 * Uses statistical methods (STDEV.S) to determine abnormal readings
 * based on historical meter reading data.
 */

/**
 * Calculates the sample standard deviation (STDEV.S) of a set of values.
 * Uses n-1 denominator (Bessel's correction) for unbiased estimation.
 *
 * @param {number[]} values - Array of numeric values
 * @returns {number} Sample standard deviation, or 0 if fewer than 2 values
 */
export const calculateSTDEV_S = (values) => {
  if (!values || values.length < 2) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

/**
 * Calculates the arithmetic mean (average) of a set of values.
 *
 * @param {number[]} values - Array of numeric values
 * @returns {number} Average value, or 0 if the array is empty
 */
export const calculateAVERAGE = (values) => {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/**
 * Calculates the warning threshold based on historical meter readings.
 * Threshold formula: previousReading + floor(standardDeviation) + 10
 *
 * @param {number} previousReading - The previous meter reading
 * @param {number} previousPreviousReading - The reading before the previous one
 * @param {number} threeTimesPreviousReading - The reading three periods ago
 * @returns {{ standardDeviation: number, threshold: number, reason: string, isCalculable: boolean }}
 *   Threshold calculation result with metadata
 */
export const calculateThreshold = (previousReading, previousPreviousReading, threeTimesPreviousReading) => {
  try {
    const readingHistory = [];

    if (typeof previousReading === 'number' && !isNaN(previousReading) && previousReading >= 0) {
      readingHistory.push(previousReading);
    }
    if (typeof previousPreviousReading === 'number' && !isNaN(previousPreviousReading) && previousPreviousReading >= 0) {
      readingHistory.push(previousPreviousReading);
    }
    if (typeof threeTimesPreviousReading === 'number' && !isNaN(threeTimesPreviousReading) && threeTimesPreviousReading >= 0) {
      readingHistory.push(threeTimesPreviousReading);
    }

    if (readingHistory.length < 2) {
      return {
        standardDeviation: 0,
        threshold: 0,
        reason: '履歴データ不足',
        isCalculable: false
      };
    }

    const average = calculateAVERAGE(readingHistory);
    const standardDeviation = calculateSTDEV_S(readingHistory);

    const threshold = previousReading + Math.floor(standardDeviation) + 10;

    return {
      standardDeviation: Math.floor(standardDeviation),
      threshold: threshold,
      reason: `前回値${previousReading} + σ${Math.floor(standardDeviation)} + 10`,
      isCalculable: true
    };
  } catch (error) {
    return {
      standardDeviation: 0,
      threshold: 0,
      reason: 'エラー',
      isCalculable: false
    };
  }
};

/**
 * Calculates the warning flag for a meter reading based on statistical analysis.
 * Compares the current reading against a threshold derived from historical data.
 *
 * Warning flag values:
 * - '入力待ち' (waiting for input): Current reading is missing but threshold is calculable
 * - '判定不可' (cannot determine): Current reading is missing and insufficient history
 * - '要確認' (needs review): Current reading is below previous or exceeds threshold
 * - '正常' (normal): Reading is within expected range
 *
 * @param {number|null|undefined} currentReading - The current meter reading value
 * @param {number|null|undefined} previousReading - The previous meter reading value
 * @param {number|null|undefined} previousPreviousReading - The reading from two periods ago
 * @param {number|null|undefined} threeTimesPreviousReading - The reading from three periods ago
 * @returns {{ warningFlag: string, standardDeviation: number, threshold: number, reason: string }}
 *   Warning flag result with statistical metadata
 */
export const calculateWarningFlag = (currentReading, previousReading, previousPreviousReading, threeTimesPreviousReading) => {
  try {
    const thresholdInfo = calculateThreshold(previousReading, previousPreviousReading, threeTimesPreviousReading);

    if (currentReading === null || currentReading === undefined || currentReading === '' ||
        typeof currentReading !== 'number' || isNaN(currentReading) || currentReading < 0) {
      return {
        warningFlag: thresholdInfo.isCalculable ? '入力待ち' : '判定不可',
        standardDeviation: thresholdInfo.standardDeviation,
        threshold: thresholdInfo.threshold,
        reason: thresholdInfo.reason
      };
    }

    if (typeof previousReading === 'number' && !isNaN(previousReading) && previousReading >= 0) {
      if (currentReading < previousReading) {
        return {
          warningFlag: '要確認',
          standardDeviation: thresholdInfo.standardDeviation,
          threshold: thresholdInfo.threshold,
          reason: '前回値未満'
        };
      }
    }

    if (!thresholdInfo.isCalculable) {
      return {
        warningFlag: '正常',
        standardDeviation: 0,
        threshold: 0,
        reason: thresholdInfo.reason
      };
    }

    const warningFlag = (currentReading > thresholdInfo.threshold) ? '要確認' : '正常';

    return {
      warningFlag: warningFlag,
      standardDeviation: thresholdInfo.standardDeviation,
      threshold: thresholdInfo.threshold,
      reason: thresholdInfo.reason
    };
  } catch (error) {
    return {
      warningFlag: 'エラー',
      standardDeviation: 0,
      threshold: 0,
      reason: 'エラー'
    };
  }
};

/**
 * Gets the display status for a meter reading entry.
 * Evaluates the warning flag, reading values, and historical data to determine
 * the appropriate status label.
 *
 * @param {Object} reading - The reading object containing reading data
 * @param {string|number|null} reading.currentReading - Current meter reading value
 * @param {string} [reading.warningFlag] - Pre-calculated warning flag
 * @param {string|number|null} reading.previousReading - Previous meter reading
 * @param {string|number|null} reading.previousPreviousReading - Reading from two periods ago
 * @param {string|number|null} reading.threeTimesPrevious - Reading from three periods ago
 * @returns {string} Status display string ('要確認', '正常', '入力待ち', or '判定不可')
 */
export const getStatusDisplay = (reading) => {
  if (!reading.currentReading || reading.currentReading === '') {
    if (reading.warningFlag && reading.warningFlag !== '') {
      return reading.warningFlag;
    }

    const previousReading = parseFloat(reading.previousReading) || 0;
    const previousPreviousReading = parseFloat(reading.previousPreviousReading) || 0;
    const threeTimesPreviousReading = parseFloat(reading.threeTimesPrevious) || 0;

    const thresholdResult = calculateWarningFlag(null, previousReading, previousPreviousReading, threeTimesPreviousReading);
    return thresholdResult.warningFlag;
  }

  if (reading.warningFlag && reading.warningFlag !== '') {
    return reading.warningFlag;
  }

  const current = parseFloat(reading.currentReading) || 0;
  const previous = parseFloat(reading.previousReading) || 0;

  if (current > 0 && previous > 0) {
    const usage = current - previous;
    return usage < 0 ? '要確認' : '正常';
  }

  return '正常';
};

/**
 * Gets the standard deviation display value for a reading.
 * Currently always returns null to hide standard deviation from the UI.
 *
 * @param {Object} _reading - The reading object (unused)
 * @returns {null} Always returns null
 */
export const getStandardDeviationDisplay = (_reading) => {
  return null;
};
