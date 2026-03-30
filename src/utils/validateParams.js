/**
 * URL parameter validation utilities.
 * Prevents injection attacks by validating IDs before use in API calls.
 */

// Safe pattern: alphanumeric, hyphens, underscores, dots
const SAFE_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

// Maximum allowed ID length
const MAX_ID_LENGTH = 128;

/**
 * Validates that a parameter value is a safe, non-empty string ID.
 * Rejects empty strings, whitespace-only values, overly long values,
 * and values containing characters outside the safe set.
 *
 * @param {string} value - The parameter value to validate
 * @param {string} paramName - Name of the parameter (for error messages)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateId(value, paramName = 'ID') {
  if (value == null || typeof value !== 'string') {
    return { valid: false, error: `${paramName}が指定されていません。` };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: `${paramName}が指定されていません。` };
  }

  if (trimmed.length > MAX_ID_LENGTH) {
    return { valid: false, error: `${paramName}が長すぎます。` };
  }

  if (!SAFE_ID_PATTERN.test(trimmed)) {
    return { valid: false, error: `${paramName}の形式が不正です。` };
  }

  return { valid: true };
}

/**
 * Validates multiple ID parameters at once.
 *
 * @param {Record<string, string>} params - Key-value pairs of parameters
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateIds(params) {
  for (const [name, value] of Object.entries(params)) {
    const result = validateId(value, name);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
