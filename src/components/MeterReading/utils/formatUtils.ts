/**
 * Formatting utility functions for meter reading data display.
 * Handles reading values, usage calculations, status formatting, and inspection status.
 */

import { formatDateForDisplay } from './dateUtils';

/**
 * Formats a meter reading value for display.
 * Returns the trimmed string representation, or empty string for null/undefined/empty values.
 *
 * @param value - The reading value to format
 * @returns Formatted reading string
 */
export const formatReading = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value).trim();
};

/**
 * Formats a usage value for display.
 * Converts to a numeric string representation, or empty string for invalid values.
 *
 * @param value - The usage value to format
 * @returns Formatted usage string
 */
export const formatUsage = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const numValue = parseFloat(String(value));
  if (isNaN(numValue)) {
    return '';
  }
  return numValue.toString();
};

/**
 * Formats a status value for display.
 * Returns '正常' (normal) for empty or unset status values.
 *
 * @param value - The status value to format
 * @returns Formatted status string
 */
export const formatStatus = (value: string | null | undefined): string => {
  if (!value || value === '' || value === '未入力' || value === null || value === undefined) {
    return '正常';
  }
  return String(value).trim();
};

/**
 * Inspection status result with status label and optional display date.
 */
interface InspectionStatus {
  status: string;
  displayDate: string | null;
}

/**
 * Determines the inspection status and formatted display date from a raw date value.
 * Returns an object with the inspection status ('検針済み' or '未検針') and the display date.
 *
 * @param rawDate - The inspection date to evaluate
 * @returns Inspection status object
 */
export const formatInspectionStatus = (rawDate: string | Date | null | undefined): InspectionStatus => {
  const formattedDate = formatDateForDisplay(rawDate);
  return formattedDate
    ? { status: '検針済み', displayDate: formattedDate }
    : { status: '未検針', displayDate: null };
};

/**
 * Calculates water usage from current and previous meter readings.
 * If no valid previous reading exists, returns the current reading as-is.
 * Returns a non-negative usage value as a string.
 *
 * @param currentReading - The current meter reading
 * @param previousReading - The previous meter reading
 * @returns Calculated usage as a string, or empty string if current is invalid
 */
export const calculateUsage = (
  currentReading: string | number | null,
  previousReading: string | number | null
): string => {
  const current = parseFloat(String(currentReading));
  const previous = parseFloat(String(previousReading));

  if (isNaN(current)) return '';

  if (!previousReading || previousReading === '' || previous === 0 || isNaN(previous)) {
    return current.toString();
  }

  const usage = current - previous;
  return (usage >= 0 ? usage : 0).toString();
};

/**
 * Alias for calculateUsage. Calculates water usage from current and previous readings.
 */
export const calculateUsageDisplay = calculateUsage;
