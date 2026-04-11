import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGasUrl, isOffline } from '../gasClient';

const MOCK_URL = 'https://example.com/gas';

describe('getGasUrl', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('returns sessionStorage value when set', () => {
    sessionStorage.setItem('gasWebAppUrl', MOCK_URL);
    expect(getGasUrl()).toBe(MOCK_URL);
  });

  it('falls back to localStorage when sessionStorage is empty', () => {
    localStorage.setItem('gasWebAppUrl', MOCK_URL);
    expect(getGasUrl()).toBe(MOCK_URL);
  });

  it('returns default URL when both storages are empty', () => {
    const result = getGasUrl();
    expect(result).toContain('script.google.com');
  });

  it('uses import.meta.env.VITE_GAS_WEB_APP_URL as default', () => {
    const result = getGasUrl();
    expect(result).toBe(import.meta.env.VITE_GAS_WEB_APP_URL);
  });

  it('returns default URL when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error();
    });
    const result = getGasUrl();
    expect(result).toContain('script.google.com');
    vi.restoreAllMocks();
  });
});

describe('isOffline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when navigator.onLine is true', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    expect(isOffline()).toBe(false);
  });

  it('returns true when navigator.onLine is false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(isOffline()).toBe(true);
  });
});
