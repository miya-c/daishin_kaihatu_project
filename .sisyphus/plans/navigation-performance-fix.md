# Navigation Performance Fix Plan

## Problem

Page transitions in the water meter reading PWA are slow (7+ seconds). Root causes identified:

1. Property→Room transition blocks on `gasFetch('getRooms')` (~7s) + `setTimeout(300ms)` before navigating
2. All cross-page navigation is full-page reload (no SPA routing)
3. `useMeterReadings` always hits network first, even when fresh localStorage cache exists
4. Service Worker uses network-first for HTML pages — always waits for network

## Fix Plan

### P0: PropertySelectApp.svelte — Remove blocking fetch + setTimeout

- **File**: `src/components/PropertySelect/PropertySelectApp.svelte`
- **Change**: `handlePropertySelect()` currently awaits `gasFetch('getRooms')` for ~7s, then `setTimeout(300)`, then navigates. Change to: save propertyId/propertyName to sessionStorage, navigate immediately. RoomSelectApp already handles fetching room data from API.
- **Expected saving**: ~7.3s per property→room transition
- **Cleanup**: Remove `gasFetch` import, `isNavigating`/`navigationMessage` state vars, navigation overlay template

### P1: useMeterReadings.svelte.ts — localStorage cache-first

- **File**: `src/components/MeterReading/hooks/useMeterReadings.svelte.ts`
- **Change**: After prefetch cache miss, check localStorage offline cache. If fresh (<5min), serve immediately + background refresh. Only go to network if no fresh cache.
- **Expected saving**: Offline/reconnect scenarios: 25s+ → instant
- **Details**: Add `OFFLINE_CACHE_TTL` constant, insert cache check between prefetch check and network call

### P2: service-worker.js — Stale-while-revalidate for HTML

- **File**: `src/sw/service-worker.js`
- **Change**: HTML page strategy from network-first to stale-while-revalidate. Serve cached HTML immediately, update in background.
- **Expected saving**: Cached page loads become instant instead of waiting for network

### Deferred (P3): GAS API read caching in SW

- Skipped due to stale data concerns after user saves. Can revisit later.

## Execution Order

All 3 fixes are independent (different files) → parallel implementation.

## Verification

- `svelte-check` on changed files
- `npm test` — full test suite
- `npm run build` — production build

## Risks

- P0: Room page must handle no-sessionStorage-rooms case (it already does)
- P1: Background refresh must not conflict with abort controllers
- P2: SW change requires cache version bump or wait for natural SW update cycle
