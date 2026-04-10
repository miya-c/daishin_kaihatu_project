/**
 * Shared Google Apps Script (GAS) API client.
 * Provides functions for communicating with the GAS Web App backend,
 * including property fetching, room management, and meter reading operations.
 */

import { validateId } from './validateParams';

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

/**
 * Shared fetch helper for GAS API calls.
 * Handles URL construction, API key injection, and error handling.
 *
 * @param action - The GAS action name (e.g. 'getProperties', 'updateMeterReadings')
 * @param params - Additional parameters to send
 * @param method - HTTP method ('GET' or 'POST')
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Parsed JSON response
 * @throws If the network request fails or returns a non-OK status
 */
export const gasFetch = async (
  action: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' = 'GET',
  signal?: AbortSignal
): Promise<unknown> => {
  const url = getGasUrl();
  const searchParams = new URLSearchParams({ action, ...params });
  withApiKey(searchParams);

  const response =
    method === 'POST'
      ? await fetch(url, {
          method: 'POST',
          body: searchParams.toString(),
          signal,
        })
      : await fetch(`${url}?${searchParams}`, { signal });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Retrieves the GAS Web App URL from browser storage.
 * Checks sessionStorage first, then falls back to localStorage,
 * and finally uses the hardcoded default URL.
 *
 * @returns The GAS Web App URL
 */
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

/**
 * Fetches the list of properties from the GAS backend.
 *
 * @param gasUrl - Optional GAS Web App URL; defaults to getGasUrl()
 * @returns The API response containing property data
 * @throws If the network request fails or returns a non-OK status
 */
export const fetchProperties = async (gasUrl?: string): Promise<unknown> => {
  const url = gasUrl || getGasUrl();
  const params = new URLSearchParams({ action: 'getProperties', cache: String(Date.now()) });
  withApiKey(params);
  const requestUrl = `${url}?${params}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Fetches the list of rooms for a specific property from the GAS backend.
 *
 * @param gasUrl - Optional GAS Web App URL; defaults to getGasUrl()
 * @param propertyId - The property ID to fetch rooms for
 * @returns The API response containing room data
 * @throws If the network request fails or returns a non-OK status
 */
export const fetchRooms = async (
  gasUrl: string | undefined,
  propertyId: string
): Promise<unknown> => {
  const validation = validateId(propertyId, 'propertyId');
  if (!validation.valid) throw new Error(validation.error);

  const url = gasUrl || getGasUrl();
  const params = new URLSearchParams({
    action: 'getRooms',
    propertyId,
    cache: String(Date.now()),
  });
  withApiKey(params);
  const requestUrl = `${url}?${params}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Fetches meter readings for a specific property and room from the GAS backend.
 *
 * @param gasUrl - Optional GAS Web App URL; defaults to getGasUrl()
 * @param propertyId - The property ID
 * @param roomId - The room ID
 * @returns The API response containing meter reading data
 * @throws If the network request fails or returns a non-OK status
 */
export const fetchMeterReadings = async (
  gasUrl: string | undefined,
  propertyId: string,
  roomId: string
): Promise<unknown> => {
  const propValidation = validateId(propertyId, 'propertyId');
  if (!propValidation.valid) throw new Error(propValidation.error);

  const roomValidation = validateId(roomId, 'roomId');
  if (!roomValidation.valid) throw new Error(roomValidation.error);

  const url = gasUrl || getGasUrl();
  const params = new URLSearchParams({
    action: 'getMeterReadings',
    propertyId,
    roomId,
  });
  withApiKey(params);
  const requestUrl = `${url}?${params}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Updates meter readings for a specific property and room via the GAS backend.
 * Sends reading data as a JSON-encoded parameter in a POST request.
 *
 * @param gasUrl - Optional GAS Web App URL; defaults to getGasUrl()
 * @param propertyId - The property ID
 * @param roomId - The room ID
 * @param readings - Array of reading objects to update
 * @returns The API response confirming the update
 * @throws If the network request fails or returns a non-OK status
 */
export const updateMeterReadings = async (
  gasUrl: string | undefined,
  propertyId: string,
  roomId: string,
  readings: Record<string, unknown>[]
): Promise<unknown> => {
  const propValidation = validateId(propertyId, 'propertyId');
  if (!propValidation.valid) throw new Error(propValidation.error);

  const roomValidation = validateId(roomId, 'roomId');
  if (!roomValidation.valid) throw new Error(roomValidation.error);

  const url = gasUrl || getGasUrl();
  const params = new URLSearchParams({
    action: 'updateMeterReadings',
    propertyId,
    roomId,
    readings: JSON.stringify(readings),
  });
  withApiKey(params);

  const response = await fetch(url, {
    method: 'POST',
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Marks an inspection as completed for a specific property.
 * Records the completion date on the GAS backend.
 *
 * @param gasUrl - Optional GAS Web App URL; defaults to getGasUrl()
 * @param propertyId - The property ID to complete inspection for
 * @param completionDate - The date string (YYYY-MM-DD) when inspection was completed
 * @returns The API response confirming the completion
 * @throws If the network request fails or returns a non-OK status
 */
export const completeInspection = async (
  gasUrl: string | undefined,
  propertyId: string,
  completionDate: string
): Promise<unknown> => {
  const propValidation = validateId(propertyId, 'propertyId');
  if (!propValidation.valid) throw new Error(propValidation.error);

  const url = gasUrl || getGasUrl();
  const params = new URLSearchParams({
    action: 'completeInspection',
    propertyId,
    completionDate,
  });
  withApiKey(params);

  const requestUrl = `${url}?${params}`;
  const response = await fetch(requestUrl, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};
