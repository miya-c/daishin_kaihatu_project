/**
 * Date utility functions for JST (Japan Standard Time) date handling.
 * All functions handle timezone conversion to ensure consistent JST-based date operations.
 */

/**
 * Formats a date for display using Japanese locale with JST timezone.
 * Returns the date in "M月D日" format (e.g., "6月18日").
 *
 * @param {string|Date|null|undefined} rawDate - The date value to format
 * @returns {string|null} Formatted date string in Japanese, or null if invalid
 */
export const formatDateForDisplay = (rawDate) => {
  if (!rawDate) {
    return null;
  }

  try {
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) {
      return null;
    }

    const formatted = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'long',
      day: 'numeric',
    }).format(date);

    return formatted;
  } catch (error) {
    return null;
  }
};

/**
 * Gets the current date as a JST date string in YYYY-MM-DD format.
 * Uses Intl.DateTimeFormat with 'ja-CA' locale for calendar-aligned formatting.
 *
 * @returns {string} Current JST date string (e.g., "2025-06-18")
 */
export const getCurrentJSTDateString = () => {
  const now = new Date();

  const jstDateString = new Intl.DateTimeFormat('ja-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return jstDateString;
};

/**
 * Normalizes a date value to a JST date string in YYYY-MM-DD format.
 * If the input is already in YYYY-MM-DD format, returns it as-is.
 * Falls back to the current JST date for invalid or missing input.
 *
 * @param {string|Date|null|undefined} dateValue - The date value to normalize
 * @returns {string} Normalized JST date string in YYYY-MM-DD format
 */
export const normalizeToJSTDate = (dateValue) => {
  if (!dateValue) return getCurrentJSTDateString();

  try {
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return getCurrentJSTDateString();
    }

    const jstDate = new Intl.DateTimeFormat('ja-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

    return jstDate;
  } catch (error) {
    return getCurrentJSTDateString();
  }
};

/**
 * Gets the current JST date string using manual UTC offset calculation.
 * This is an alternative to getCurrentJSTDateString that computes the JST offset
 * manually rather than relying on Intl.DateTimeFormat timezone support.
 *
 * @returns {string} JST date string in YYYY-MM-DD format
 */
export const getJSTDateString = () => {
  const now = new Date();
  const jstOffset = 9 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jstTime = new Date(utc + jstOffset * 60000);

  const year = jstTime.getFullYear();
  const month = String(jstTime.getMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
