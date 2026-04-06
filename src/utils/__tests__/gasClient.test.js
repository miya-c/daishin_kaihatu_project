import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGasUrl,
  isOffline,
  fetchProperties,
  fetchRooms,
  fetchMeterReadings,
  updateMeterReadings,
  completeInspection,
} from '../gasClient';

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

describe('fetchProperties', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('constructs correct URL with action=getProperties', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchProperties(MOCK_URL);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('action=getProperties');
    expect(calledUrl).toContain('cache=');
    expect(calledUrl).toContain(MOCK_URL);
    vi.restoreAllMocks();
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' })
    );
    await expect(fetchProperties(MOCK_URL)).rejects.toThrow('HTTP 500');
    vi.restoreAllMocks();
  });
});

describe('fetchRooms', () => {
  it('constructs correct URL with propertyId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchRooms(MOCK_URL, 'prop-1');

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('action=getRooms');
    expect(calledUrl).toContain('propertyId=prop-1');
    vi.restoreAllMocks();
  });
});

describe('fetchMeterReadings', () => {
  it('constructs correct URL with propertyId and roomId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchMeterReadings(MOCK_URL, 'prop-1', 'room-1');

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('action=getMeterReadings');
    expect(calledUrl).toContain('propertyId=prop-1');
    expect(calledUrl).toContain('roomId=room-1');
    vi.restoreAllMocks();
  });
});

describe('updateMeterReadings', () => {
  it('sends readings as JSON-encoded parameter via POST', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const readings = [{ date: '2025-06-18', currentReading: '100' }];
    await updateMeterReadings(MOCK_URL, 'prop-1', 'room-1', readings);

    // POSTリクエストの検証
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe(MOCK_URL);
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    const body = callArgs[1].body;
    expect(body).toContain('action=updateMeterReadings');
    expect(body).toContain('propertyId=prop-1');
    expect(body).toContain('roomId=room-1');
    expect(body).toContain(encodeURIComponent(JSON.stringify(readings)));
    vi.restoreAllMocks();
  });
});

describe('completeInspection', () => {
  it('constructs correct URL with propertyId and completionDate', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await completeInspection(MOCK_URL, 'prop-1', '2025-06-18');

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('action=completeInspection');
    expect(calledUrl).toContain('propertyId=prop-1');
    expect(calledUrl).toContain('completionDate=2025-06-18');
    vi.restoreAllMocks();
  });
});

describe('error handling', () => {
  it('throws on non-OK response in fetchProperties', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' })
    );
    await expect(fetchProperties(MOCK_URL)).rejects.toThrow('HTTP 500');
    vi.restoreAllMocks();
  });

  it('throws on non-OK response in fetchRooms', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' })
    );
    await expect(fetchRooms(MOCK_URL, 'prop-1')).rejects.toThrow('HTTP 404');
    vi.restoreAllMocks();
  });

  it('throws on non-OK response in fetchMeterReadings', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' })
    );
    await expect(fetchMeterReadings(MOCK_URL, 'prop-1', 'room-1')).rejects.toThrow('HTTP 503');
    vi.restoreAllMocks();
  });

  it('throws on non-OK response in updateMeterReadings', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' })
    );
    await expect(updateMeterReadings(MOCK_URL, 'prop-1', 'room-1', [])).rejects.toThrow('HTTP 400');
    vi.restoreAllMocks();
  });

  it('throws on non-OK response in completeInspection', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: false, status: 500, statusText: 'Internal Server Error' })
    );
    await expect(completeInspection(MOCK_URL, 'prop-1', '2025-06-18')).rejects.toThrow('HTTP 500');
    vi.restoreAllMocks();
  });

  it('throws for invalid propertyId in fetchRooms', async () => {
    await expect(fetchRooms(MOCK_URL, '')).rejects.toThrow();
  });

  it('throws for invalid propertyId in fetchMeterReadings', async () => {
    await expect(fetchMeterReadings(MOCK_URL, '', 'room-1')).rejects.toThrow();
  });

  it('throws for invalid roomId in fetchMeterReadings', async () => {
    await expect(fetchMeterReadings(MOCK_URL, 'prop-1', '')).rejects.toThrow();
  });

  it('throws for invalid propertyId in updateMeterReadings', async () => {
    await expect(updateMeterReadings(MOCK_URL, '', 'room-1', [])).rejects.toThrow();
  });

  it('throws for invalid roomId in updateMeterReadings', async () => {
    await expect(updateMeterReadings(MOCK_URL, 'prop-1', '', [])).rejects.toThrow();
  });

  it('throws for invalid propertyId in completeInspection', async () => {
    await expect(completeInspection(MOCK_URL, '', '2025-06-18')).rejects.toThrow();
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
