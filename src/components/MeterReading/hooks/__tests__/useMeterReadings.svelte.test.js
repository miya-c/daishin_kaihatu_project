import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { createMeterReadings } from '../useMeterReadings.svelte';

describe('createMeterReadings', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    const store = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => Object.keys(store).forEach((k) => delete store[k])),
    });
    delete window.location;
    window.location = { ...originalLocation, search: '' };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  it('initializes with loading=true and gasWebAppUrl set from sessionStorage', () => {
    sessionStorage.getItem.mockImplementation((key) => {
      if (key === 'gasWebAppUrl') return 'https://script.google.com/test';
      return null;
    });

    const cleanup = $effect.root(() => {
      const readings = createMeterReadings();
      // Before flushSync: gasWebAppUrl is set synchronously, effects haven't run yet
      expect(readings.loading).toBe(true);
      expect(readings.error).toBeNull();
      expect(readings.meterReadings).toEqual([]);
      expect(readings.gasWebAppUrl).toBe('https://script.google.com/test');
      return () => {};
    });
    cleanup();
  });

  it('sets error when gasWebAppUrl is missing', () => {
    sessionStorage.getItem.mockReturnValue(null);

    const cleanup = $effect.root(() => {
      const readings = createMeterReadings();
      flushSync();
      expect(readings.error).toBeTruthy();
      expect(readings.loading).toBe(false);
      return () => {};
    });
    cleanup();
  });

  it('sets error when URL params are missing', () => {
    sessionStorage.getItem.mockImplementation((key) => {
      if (key === 'gasWebAppUrl') return 'https://script.google.com/test';
      return null;
    });
    window.location.search = '';

    const cleanup = $effect.root(() => {
      const readings = createMeterReadings();
      flushSync();
      flushSync();
      // After flushes, the initial-load $effect should have detected missing params
      expect(readings.error).toBeTruthy();
      expect(readings.loading).toBe(false);
      return () => {};
    });
    cleanup();
  });

  it('loadMeterReadings returns null without gasWebAppUrl', async () => {
    sessionStorage.getItem.mockReturnValue(null);

    let readings;
    const cleanup = $effect.root(() => {
      readings = createMeterReadings();
      flushSync();
      return () => {};
    });

    const result = await readings.loadMeterReadings('prop1', 'room1');
    expect(result).toBeNull();
    expect(readings.error).toBeTruthy();

    cleanup();
  });
});
