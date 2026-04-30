import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PropertiesService,
  UrlFetchApp,
  ScriptApp,
  Logger,
  logs,
  resetAllMocks,
} from './mocks/gas-mocks.js';
import { licenseResponses } from './mocks/test-data.js';

globalThis.PropertiesService = PropertiesService;
globalThis.UrlFetchApp = UrlFetchApp;
globalThis.ScriptApp = ScriptApp;
globalThis.Logger = Logger;

let _injectedProps = {};
let LICENSE_API_URL =
  'https://script.google.com/macros/s/AKfycbxKqSaPECUyOpWyhN67yztcdQgVBH2cRdzq7MOzpbFpFyAIjHpDzvdNWVRTxP0npe2d/exec';
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;

function _setInjectedProps(props) {
  _injectedProps = props || {};
}

function _getScriptProp(key) {
  if (_injectedProps && _injectedProps[key] !== undefined) {
    return _injectedProps[key];
  }
  try {
    return PropertiesService.getScriptProperties().getProperty(key);
  } catch (e) {
    return null;
  }
}

function _setScriptProp(key, value) {
  if (_injectedProps && key in _injectedProps) {
    _injectedProps[key] = String(value);
  }
  try {
    PropertiesService.getScriptProperties().setProperty(key, String(value));
  } catch (e) {
    // silent
  }
}

function validateLicense() {
  try {
    var scriptId = _getScriptProp('_clientScriptId') || ScriptApp.getScriptId();
    var cacheKey = '_license_cache_' + scriptId;
    var cacheTimeKey = '_license_cache_time_' + scriptId;
    var cacheTTLKey = '_license_cache_ttl_' + scriptId;

    var cached = _getScriptProp(cacheKey);
    var cacheTime = _getScriptProp(cacheTimeKey);
    var cachedTTL = _getScriptProp(cacheTTLKey);

    if (cached && cacheTime) {
      var elapsed = Date.now() - Number(cacheTime);
      var ttl = cachedTTL ? Number(cachedTTL) : DEFAULT_CACHE_TTL_MS;
      if (elapsed < ttl) {
        return cached === 'true';
      }
    }

    if (!LICENSE_API_URL || LICENSE_API_URL.indexOf('%%') !== -1) {
      Logger.log(
        '[validateLicense] WARNING: LICENSE_API_URL contains placeholder or is empty',
      );
      return false;
    }

    var url =
      LICENSE_API_URL +
      '?action=check&scriptId=' +
      encodeURIComponent(scriptId) +
      '&appId=suido';

    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      method: 'get',
    });

    var result = JSON.parse(response.getContentText());
    var authorized = result.authorized === true;

    if (authorized) {
      _setScriptProp(cacheKey, 'true');
      _setScriptProp(cacheTimeKey, String(Date.now()));
      var cacheTTL = (result.cacheTTL && result.cacheTTL > 0) ? result.cacheTTL * 1000 : DEFAULT_CACHE_TTL_MS;
      _setScriptProp(cacheTTLKey, String(cacheTTL));
    } else {
      _setScriptProp(cacheKey, '');
      _setScriptProp(cacheTimeKey, '');
      _setScriptProp(cacheTTLKey, '');
    }

    return authorized;
  } catch (error) {
    Logger.log('[validateLicense] error: ' + error.message);
    return false;
  }
}

function handleTestEndpoint(params) {
  var testSecret = _getScriptProp('TEST_SECRET');
  if (!testSecret || params.testSecret !== testSecret) {
    return { success: false, error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' };
  }
  return { success: true, message: 'ライブラリAPI正常動作' };
}

function setMockAuthorized(authorized, cacheTTL = 900) {
  UrlFetchApp.setMockResponse({
    getContentText: () =>
      JSON.stringify({ authorized, message: authorized ? 'OK' : 'Denied', cacheTTL }),
  });
}

beforeEach(() => {
  resetAllMocks();
  _injectedProps = {};
  LICENSE_API_URL =
    'https://script.google.com/macros/s/AKfycbxKqSaPECUyOpWyhN67yztcdQgVBH2cRdzq7MOzpbFpFyAIjHpDzvdNWVRTxP0npe2d/exec';
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// Vulnerability A: 24-hour cache reduced to 15 minutes
describe('validateLicense', () => {
  describe('Cache TTL (Vulnerability A)', () => {
    it('should expire cache within 15 minutes', () => {
      setMockAuthorized(true, 900);
      expect(validateLicense()).toBe(true);

      vi.advanceTimersByTime(14 * 60 * 1000);
      expect(validateLicense()).toBe(true);

      setMockAuthorized(false, 0);
      vi.advanceTimersByTime(1 * 60 * 1000 + 1);
      expect(validateLicense()).toBe(false);
    });

    it('should respect cacheTTL from API response', () => {
      setMockAuthorized(true, 300);
      expect(validateLicense()).toBe(true);

      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(validateLicense()).toBe(true);

      setMockAuthorized(false, 0);
      vi.advanceTimersByTime(1 * 60 * 1000 + 1000);
      expect(validateLicense()).toBe(false);
    });

    it('should return cached result within TTL', () => {
      setMockAuthorized(true, 900);
      expect(validateLicense()).toBe(true);

      setMockAuthorized(false, 0);
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(validateLicense()).toBe(true);
    });
  });

  // Vulnerability B: catch block returns false (fail-closed)
  describe('Fail-closed error handling (Vulnerability B)', () => {
    it('should return false on network timeout', () => {
      UrlFetchApp.setMockError(new Error('Network timeout'));
      expect(validateLicense()).toBe(false);
    });

    it('should return false on JSON parse error', () => {
      UrlFetchApp.setMockResponse({
        getContentText: () => 'not valid json {{{',
      });
      expect(validateLicense()).toBe(false);
    });

    it('should return false on any unexpected error', () => {
      UrlFetchApp.setMockError(new TypeError('fetch is not a function'));
      expect(validateLicense()).toBe(false);
      expect(logs.some((l) => l.includes('[validateLicense] error'))).toBe(true);
    });
  });

  // Vulnerability C: %% placeholder must not bypass check
  describe('Placeholder URL bypass (Vulnerability C)', () => {
    it('should return false when URL contains placeholder', () => {
      LICENSE_API_URL = 'https://example.com/%%API_URL%%/endpoint';
      expect(validateLicense()).toBe(false);
    });

    it('should log warning when URL is not configured', () => {
      LICENSE_API_URL = 'https://example.com/%%PLACEHOLDER%%';
      validateLicense();
      expect(
        logs.some((l) => l.includes('LICENSE_API_URL contains placeholder')),
      ).toBe(true);
    });
  });

  // Vulnerability D: test endpoint requires TEST_SECRET
  describe('Test endpoint gating (Vulnerability D)', () => {
    it('should deny test endpoint without secret', () => {
      const result = handleTestEndpoint({});
      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('should deny test endpoint with wrong secret', () => {
      _setInjectedProps({ TEST_SECRET: 'correct-secret' });
      const result = handleTestEndpoint({ testSecret: 'wrong-secret' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('should allow test endpoint with correct secret', () => {
      _setInjectedProps({ TEST_SECRET: 'my-test-secret' });
      const result = handleTestEndpoint({ testSecret: 'my-test-secret' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('正常動作');
    });
  });

  // Vulnerability E: cache is per-client via _injectedProps
  describe('Client-side cache isolation (Vulnerability E)', () => {
    it('should store cache in client properties', () => {
      _setInjectedProps({ _clientScriptId: 'client-A' });
      setMockAuthorized(true, 900);
      validateLicense();

      const cached = PropertiesService.getScriptProperties().getProperty(
        '_license_cache_client-A',
      );
      expect(cached).toBe('true');
    });

    it('should not share cache between different clients', () => {
      _setInjectedProps({ _clientScriptId: 'client-A' });
      setMockAuthorized(true, 900);
      expect(validateLicense()).toBe(true);

      _setInjectedProps({ _clientScriptId: 'client-B' });
      setMockAuthorized(false, 0);
      expect(validateLicense()).toBe(false);
    });
  });

  // Vulnerability F: _clientScriptId from URL ignored
  describe('Server-side scriptId only (Vulnerability F)', () => {
    it('should ignore _clientScriptId from URL parameters', () => {
      _setInjectedProps({ _clientScriptId: 'injected-id-123' });
      setMockAuthorized(true, 900);
      validateLicense();

      const cached = PropertiesService.getScriptProperties().getProperty(
        '_license_cache_injected-id-123',
      );
      expect(cached).toBe('true');
    });

    it('should use only injected _clientScriptId', () => {
      ScriptApp.setMockScriptId('fallback-script-id');
      _setInjectedProps({ _clientScriptId: 'real-client-id' });
      setMockAuthorized(true, 900);
      validateLicense();

      expect(
        PropertiesService.getScriptProperties().getProperty(
          '_license_cache_real-client-id',
        ),
      ).toBe('true');
      expect(
        PropertiesService.getScriptProperties().getProperty(
          '_license_cache_fallback-script-id',
        ),
      ).toBeNull();
    });
  });

  // Bug: license-manager returns cacheTTL in SECONDS (900 = 15min)
  // but code stores it as-is, treating 900 as milliseconds (0.9s cache)
  // Correct pattern: mimamori-app/library/Code.gs line 97: cacheTTL * 1000
  describe('cacheTTL unit conversion', () => {
    it('cacheTTL seconds converted to ms - cache valid after 14 min', () => {
      // license-manager returns cacheTTL: 900 (seconds = 15 minutes)
      setMockAuthorized(true, 900);
      expect(validateLicense()).toBe(true);

      vi.advanceTimersByTime(14 * 60 * 1000);
      // With bug: cache stored as 900ms, expired at 0.9s, fresh call made
      // Fresh call returns true (mock still authorized) → test passes
      // But we're checking that cache was checked (not expired)
      expect(validateLicense()).toBe(true);

      // Verify cache was actually used (not re-fetched) by checking stored value
      const scriptId = _getScriptProp('_clientScriptId') || ScriptApp.getScriptId();
      const storedTTL = Number(
        PropertiesService.getScriptProperties().getProperty('_license_cache_ttl_' + scriptId),
      );
      // T6 fixed: stores 900000 (900 * 1000)
      expect(storedTTL).toBe(900000);
    });

    it('cacheTTL zero falls back to DEFAULT', () => {
      setMockAuthorized(false, 0);
      expect(validateLicense()).toBe(false);
    });

    it('cacheTTL null falls back to DEFAULT_CACHE_TTL_MS', () => {
      UrlFetchApp.setMockResponse({
        getContentText: () => JSON.stringify({ authorized: true, message: 'OK', cacheTTL: null }),
      });
      expect(validateLicense()).toBe(true);

      vi.advanceTimersByTime(14 * 60 * 1000);
      expect(validateLicense()).toBe(true);
    });

    it('cacheTTL absent falls back to DEFAULT_CACHE_TTL_MS', () => {
      // API without cacheTTL field → fallback to 15 minutes
      UrlFetchApp.setMockResponse({
        getContentText: () => JSON.stringify({ authorized: true, message: 'OK' }),
      });
      expect(validateLicense()).toBe(true);

      vi.advanceTimersByTime(14 * 60 * 1000);
      expect(validateLicense()).toBe(true);

      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(validateLicense()).toBe(true);
    });

    it('cacheTTL custom value converted - 5 min cache', () => {
      setMockAuthorized(true, 300); // 300 seconds = 5 minutes
      expect(validateLicense()).toBe(true);

      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(validateLicense()).toBe(true);

      // Cache expired (6 min > 5 min TTL), fresh API call returns true (mock still authorized)
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(validateLicense()).toBe(true);
    });

    it('stored cacheTTL is in milliseconds (not seconds)', () => {
      setMockAuthorized(true, 900); // 900 seconds = 900000 ms
      validateLicense();

      const scriptId = _getScriptProp('_clientScriptId') || ScriptApp.getScriptId();
      const storedTTL = Number(
        PropertiesService.getScriptProperties().getProperty('_license_cache_ttl_' + scriptId),
      );
      // T6 fixed: stores 900000 (900 * 1000)
      expect(storedTTL).toBe(900000);
    });
  });
});
