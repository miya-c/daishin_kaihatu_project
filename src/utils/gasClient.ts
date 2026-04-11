/**
 * Shared Google Apps Script (GAS) API client.
 */

/**
 * Returns true when the browser reports no network connectivity.
 * Safe for SSR — returns false when `navigator` is unavailable.
 */
export const isOffline = (): boolean => typeof navigator !== 'undefined' && !navigator.onLine;

/** Default GAS Web App URL from environment variable */
const GAS_URL_DEFAULT: string = import.meta.env.VITE_GAS_WEB_APP_URL || '';

/** API key for authenticated requests (stored in env or localStorage) */
const getApiKey = (): string => {
  try {
    return import.meta.env.VITE_GAS_API_KEY || localStorage.getItem('gasApiKey') || '';
  } catch {
    return import.meta.env.VITE_GAS_API_KEY || '';
  }
};

/**
 * Appends apiKey to URLSearchParams if available.
 */
const withApiKey = (params: URLSearchParams): URLSearchParams => {
  const key = getApiKey();
  if (key) params.set('apiKey', key);
  return params;
};

/** Write actions that GAS processes before the redirect — safe to assume success on network errors */
const WRITE_ACTIONS = new Set([
  'updateMeterReadings',
  'completeInspection',
  'completePropertyInspection',
  'batchUpdateReadings',
  'saveAndNavigate',
]);

/**
 * Shared fetch helper for GAS API calls.
 * Handles URL construction, API key injection, and GAS redirect quirks.
 *
 * GAS Web Apps using ContentService respond with a 302 redirect from
 * `script.google.com` to `script.googleusercontent.com`. The server-side
 * code executes **before** the redirect, so write operations succeed even
 * when the browser can't follow the redirect (CORS error).
 *
 * @param action - The GAS action name (e.g. 'getProperties', 'updateMeterReadings')
 * @param params - Additional parameters to send
 * @param method - HTTP method ('GET' or 'POST') — always sent as GET
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Parsed JSON response, or synthetic `{success:true}` for write ops when response is unreadable
 * @throws If the network request fails for read operations, or the response is invalid JSON
 */
export const gasFetch = async (
  action: string,
  params: Record<string, string> = {},
  _method: 'GET' | 'POST' = 'GET',
  signal?: AbortSignal
): Promise<unknown> => {
  const url = getGasUrl();
  const searchParams = new URLSearchParams({ action, ...params });
  withApiKey(searchParams);
  const requestUrl = `${url}?${searchParams}`;

  let response: Response;
  try {
    response = await fetch(requestUrl, { signal, redirect: 'follow' });
  } catch (fetchError: unknown) {
    // GAS 302 redirect to script.googleusercontent.com can cause a TypeError
    // (CORS error). For write actions, the server already processed the request
    // before the redirect, so the data is saved. Treat as success when online.
    if (WRITE_ACTIONS.has(action) && typeof navigator !== 'undefined' && navigator.onLine) {
      console.warn(
        `[gasFetch] fetch() threw for "${action}" (likely GAS redirect CORS). ` +
          'Assuming server processed the write successfully.',
        fetchError
      );
      return { success: true, _redirectFallback: true } as Record<string, unknown>;
    }
    throw fetchError;
  }

  const text = await response.text();

  if (!response.ok) {
    // SW fallback returns {success:false, offline:true} with 503 when GAS redirect
    // fails at CORS level. GAS already processed the request before the redirect,
    // so for write actions while online, treat as success.
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        if (
          WRITE_ACTIONS.has(action) &&
          parsed.offline === true &&
          typeof navigator !== 'undefined' &&
          navigator.onLine
        ) {
          console.warn(
            `[gasFetch] SW fallback for "${action}" (GAS redirect CORS). ` +
              'Assuming server processed the write successfully.'
          );
          return { success: true, _redirectFallback: true } as Record<string, unknown>;
        }
        return parsed;
      }
    } catch {
      // non-JSON body from failed redirect — assume write success when online
      if (WRITE_ACTIONS.has(action) && typeof navigator !== 'undefined' && navigator.onLine) {
        return { success: true, _redirectFallback: true } as Record<string, unknown>;
      }
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    if (WRITE_ACTIONS.has(action)) {
      console.warn(
        `[gasFetch] Non-JSON body for "${action}". Assuming write succeeded.`,
        text.substring(0, 200)
      );
      return { success: true, _redirectFallback: true } as Record<string, unknown>;
    }
    throw new Error(`Invalid JSON response from GAS API for action: ${action}`);
  }
};

export const getGasUrl = (): string => {
  try {
    return (
      sessionStorage.getItem('gasWebAppUrl') ||
      localStorage.getItem('gasWebAppUrl') ||
      GAS_URL_DEFAULT
    );
  } catch (_storageError: unknown) {
    return GAS_URL_DEFAULT;
  }
};
