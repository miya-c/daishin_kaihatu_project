/**
 * Shared Google Apps Script (GAS) API client.
 * Provides functions for communicating with the GAS Web App backend,
 * including property fetching, room management, and meter reading operations.
 */

/** Default GAS Web App URL from environment variable */
const GAS_URL_DEFAULT = import.meta.env.VITE_GAS_WEB_APP_URL || '';

/**
 * Retrieves the GAS Web App URL from browser storage.
 * Checks sessionStorage first, then falls back to localStorage,
 * and finally uses the hardcoded default URL.
 *
 * @returns {string} The GAS Web App URL
 */
export const getGasUrl = () => {
  try {
    return (
      sessionStorage.getItem('gasWebAppUrl') ||
      localStorage.getItem('gasWebAppUrl') ||
      GAS_URL_DEFAULT
    );
  } catch (storageError) {
    return GAS_URL_DEFAULT;
  }
};

/**
 * Fetches the list of properties from the GAS backend.
 *
 * @param {string} [gasUrl] - Optional GAS Web App URL; defaults to getGasUrl()
 * @returns {Promise<Object>} The API response containing property data
 * @throws {Error} If the network request fails or returns a non-OK status
 */
export const fetchProperties = async (gasUrl) => {
  const url = gasUrl || getGasUrl();
  const requestUrl = `${url}?action=getProperties&cache=${Date.now()}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Fetches the list of rooms for a specific property from the GAS backend.
 *
 * @param {string} [gasUrl] - Optional GAS Web App URL; defaults to getGasUrl()
 * @param {string} propertyId - The property ID to fetch rooms for
 * @returns {Promise<Object>} The API response containing room data
 * @throws {Error} If the network request fails or returns a non-OK status
 */
export const fetchRooms = async (gasUrl, propertyId) => {
  const url = gasUrl || getGasUrl();
  const requestUrl = `${url}?action=getRooms&propertyId=${encodeURIComponent(propertyId)}&cache=${Date.now()}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Fetches meter readings for a specific property and room from the GAS backend.
 *
 * @param {string} [gasUrl] - Optional GAS Web App URL; defaults to getGasUrl()
 * @param {string} propertyId - The property ID
 * @param {string} roomId - The room ID
 * @returns {Promise<Object>} The API response containing meter reading data
 * @throws {Error} If the network request fails or returns a non-OK status
 */
export const fetchMeterReadings = async (gasUrl, propertyId, roomId) => {
  const url = gasUrl || getGasUrl();
  const requestUrl = `${url}?action=getMeterReadings&propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(roomId)}`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Updates meter readings for a specific property and room via the GAS backend.
 * Sends reading data as a JSON-encoded parameter in a GET request.
 *
 * @param {string} [gasUrl] - Optional GAS Web App URL; defaults to getGasUrl()
 * @param {string} propertyId - The property ID
 * @param {string} roomId - The room ID
 * @param {Array<Object>} readings - Array of reading objects to update
 * @returns {Promise<Object>} The API response confirming the update
 * @throws {Error} If the network request fails or returns a non-OK status
 */
export const updateMeterReadings = async (gasUrl, propertyId, roomId, readings) => {
  const url = gasUrl || getGasUrl();
  const params = new URLSearchParams({
    action: 'updateMeterReadings',
    propertyId,
    roomId,
    readings: JSON.stringify(readings),
  });

  const requestUrl = `${url}?${params}`;
  const response = await fetch(requestUrl, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Marks an inspection as completed for a specific property.
 * Records the completion date on the GAS backend.
 *
 * @param {string} [gasUrl] - Optional GAS Web App URL; defaults to getGasUrl()
 * @param {string} propertyId - The property ID to complete inspection for
 * @param {string} completionDate - The date string (YYYY-MM-DD) when inspection was completed
 * @returns {Promise<Object>} The API response confirming the completion
 * @throws {Error} If the network request fails or returns a non-OK status
 */
export const completeInspection = async (gasUrl, propertyId, completionDate) => {
  const url = gasUrl || getGasUrl();
  const params = new URLSearchParams({
    action: 'completeInspection',
    propertyId,
    completionDate,
  });

  const requestUrl = `${url}?${params}`;
  const response = await fetch(requestUrl, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};
