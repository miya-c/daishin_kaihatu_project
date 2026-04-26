export const TOAST_DISPLAY_MS = 3000;

export const API_TIMEOUT_MS = 30000;

export const SYNC_LOCK_TTL_MS = 30000;

export const OPTIMISTIC_UPDATE_PROTECTION_MS = 600000;

export const SYNC_RETRY_DELAY_MS = 2000;

export const CACHE_STALE_THRESHOLD_MS = 60000;

const STORAGE_URL_KEY = 'gasWebAppUrl';
const STORAGE_KEY_KEY = 'gasApiKey';
const STORAGE_SETUP_URL_KEY = 'setupUrl';

export const parseHashConfig = (): boolean => {
  const hash = window.location.hash.slice(1);
  if (!hash) return false;

  const params = new URLSearchParams(hash);
  const url = params.get('url');
  const key = params.get('key');

  if (url && key && url.startsWith('https://script.google.com/')) {
    localStorage.setItem(STORAGE_URL_KEY, url);
    localStorage.setItem(STORAGE_KEY_KEY, key);
    const setupUrl = params.get('setupUrl');
    if (setupUrl) {
      localStorage.setItem(STORAGE_SETUP_URL_KEY, setupUrl);
    }
    window.location.hash = '';
    return true;
  }

  return false;
};

export const hasConfig = (): boolean => {
  try {
    return !!(localStorage.getItem(STORAGE_URL_KEY) && localStorage.getItem(STORAGE_KEY_KEY));
  } catch {
    return false;
  }
};

export const getConfig = (): { url: string; key: string } => {
  try {
    return {
      url: localStorage.getItem(STORAGE_URL_KEY) || '',
      key: localStorage.getItem(STORAGE_KEY_KEY) || '',
    };
  } catch {
    return { url: '', key: '' };
  }
};

export const saveConfig = (url: string, key: string): void => {
  localStorage.setItem(STORAGE_URL_KEY, url);
  localStorage.setItem(STORAGE_KEY_KEY, key);
};

export const clearConfig = (): void => {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
  localStorage.removeItem(STORAGE_SETUP_URL_KEY);
};

export const getSetupUrl = (): string => {
  try {
    return localStorage.getItem(STORAGE_SETUP_URL_KEY) || '';
  } catch {
    return '';
  }
};

export const generateSetupLink = (baseUrl: string): string => {
  const { url, key } = getConfig();
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/#url=${encodeURIComponent(url)}&key=${encodeURIComponent(key)}`;
};
