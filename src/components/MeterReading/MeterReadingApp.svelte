<script lang="ts">
  import { formatReading, calculateUsageDisplay } from './utils/formatUtils';
  import { mapReadingFromApi } from './utils/readingMapper';
  import { calculateWarningFlag } from './utils/warningFlag';
  import { createMeterReadings } from './hooks/useMeterReadings.svelte';
  import { createRoomNavigation } from './hooks/useRoomNavigation.svelte';
  import { createToast } from './hooks/useToast.svelte';
  import { gasFetch } from '../../utils/gasClient';
  import { updateRoomInBothCaches } from '../../utils/roomCache';
  import { CACHE_STALE_THRESHOLD_MS, API_TIMEOUT_MS } from '../../utils/config';
  import {
    saveToQueue,
    registerOnlineListener,
    registerServiceWorkerMessageListener,
    getQueueStatus,
    isCurrentlySyncing,
  } from '../../utils/offlineQueue';
  import LoadingOverlay from './components/LoadingOverlay.svelte';
  import ToastOverlay from './components/ToastOverlay.svelte';
  import NavigationButtons from './components/NavigationButtons.svelte';
  import PropertyInfoHeader from './components/PropertyInfoHeader.svelte';
  import ReadingHistoryTable from './components/ReadingHistoryTable.svelte';
  import InitialReadingForm from './components/InitialReadingForm.svelte';
  import NetworkStatusBar from '../NetworkStatusBar.svelte';

  import type { MeterReading } from '../../types';

  // ── Core state stores ──
  const readings = createMeterReadings();
  const toast = createToast();

  let readingValues = $state<Record<string, string>>({});
  let inputErrors = $state<Record<string, string>>({});
  let usageStates = $state<Record<string, string>>({});

  // Mutable flag — does NOT need to trigger re-renders.
  // Tracks whether reading was successfully saved for optimistic cache update.
  let hasSaved = false;
  let offlineMode = $state(!navigator.onLine);
  let showZeroUsageModal = $state(false);
  let zeroUsageSource = $state<'fab' | 'nav'>('fab');
  let pendingCount = $state(0);

  // ── Derived: whether any reading has a valid previousReading ──
  let hasReadingsWithPrevious = $derived(
    Array.isArray(readings.meterReadings) &&
      readings.meterReadings.length > 0 &&
      readings.meterReadings.some(
        (r: MeterReading) =>
          r.previousReading && r.previousReading !== '' && r.previousReading !== 0
      )
  );

  // ── Initialize readingValues when meterReadings changes ──
  $effect(() => {
    const current = readings.meterReadings;
    if (current.length > 0) {
      const rvCache = readings.getReadingValuesFromCache(readings.propertyId, readings.roomId);
      const updated = { ...readingValues };
      let changed = false;
      current.forEach((reading: MeterReading) => {
        if (!(reading.date in updated)) {
          const cached = rvCache?.[reading.date];
          if (cached && cached.trim() !== '') {
            updated[reading.date] = cached;
          } else {
            updated[reading.date] = formatReading(reading.currentReading);
          }
          changed = true;
        }
      });
      if (!('' in updated)) {
        const cachedInit = rvCache?.[''];
        updated[''] = cachedInit && cachedInit.trim() !== '' ? cachedInit : '';
        changed = true;
      }
      if (changed) readingValues = updated;
    }
  });

  // ── Queue sync ──
  $effect(() => {
    pendingCount = getQueueStatus().pendingCount;

    const unregisterSync = registerOnlineListener((result) => {
      pendingCount = getQueueStatus().pendingCount;
      offlineMode = !navigator.onLine;
      if (result.processed > 0) {
        toast.displayToast(`${result.processed}件のデータを送信しました`);
      }
    });

    const unregisterSwMessage = registerServiceWorkerMessageListener(async () => {
      const { processQueue } = await import('../../utils/offlineQueue');
      const result = await processQueue();
      pendingCount = getQueueStatus().pendingCount;
      offlineMode = !navigator.onLine;
      if (result.processed > 0) {
        toast.displayToast(`${result.processed}件のデータを送信しました`);
      }
    });

    return () => {
      unregisterSync();
      unregisterSwMessage();
    };
  });

  $effect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasSaved) {
        const unsaved = collectReadingsFromState();
        if (unsaved.length > 0) {
          try {
            saveToQueue({
              action: 'updateMeterReadings',
              propertyId: readings.propertyId,
              roomId: readings.roomId,
              readings: unsaved,
            });
          } catch {
            /* storage full */
          }
          e.preventDefault();
        }
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  // ── Room navigation (created after readings store is available) ──
  const navigation = createRoomNavigation({
    get propertyId() {
      return readings.propertyId;
    },
    get roomId() {
      return readings.roomId;
    },
    get gasWebAppUrl() {
      return readings.gasWebAppUrl;
    },
    get displayToast() {
      return toast.displayToast;
    },
    get invalidatePrefetch() {
      return readings.invalidatePrefetch;
    },
    get hasPrefetch() {
      return readings.hasPrefetch;
    },
    get updateOfflineCache() {
      return (propId: string, rId: string, updatedReadings: Record<string, unknown>[]) => {
        const merged = readings.meterReadings.map((r: MeterReading) => {
          const date = r.date;
          const match = updatedReadings.find(
            (u: Record<string, unknown>) => u.date === date || u.date === r.date
          );
          if (match && match.currentReading !== undefined) {
            return {
              ...r,
              currentReading: parseFloat(String(match.currentReading)) || r.currentReading,
            };
          }
          return r;
        });
        readings.updateOfflineCache(propId, rId, merged);
      };
    },
    get onNavigateToRoom() {
      return (targetRoomId: string, preloadedNavData?: Record<string, unknown>) => {
        hasSaved = false;
        const newUrl = `/reading/?propertyId=${encodeURIComponent(readings.propertyId)}&roomId=${encodeURIComponent(targetRoomId)}`;
        window.history.replaceState(null, '', newUrl);

        if (preloadedNavData && preloadedNavData.readings) {
          const newReadings = Array.isArray(preloadedNavData.readings)
            ? preloadedNavData.readings.map((raw: Record<string, unknown>, index: number) =>
                mapReadingFromApi(raw, index, { calculateWarnings: true })
              )
            : [];
          readings.roomId = targetRoomId;
          readings.meterReadings = newReadings;
          readings.propertyName = String(preloadedNavData.propertyName || readings.propertyName);
          readings.roomName = String(preloadedNavData.roomName || readings.roomName);

          const newValues: Record<string, string> = { '': '' };
          newReadings.forEach((reading: MeterReading) => {
            newValues[reading.date] = formatReading(reading.currentReading);
          });
          const rvCache = readings.getReadingValuesFromCache(readings.propertyId, targetRoomId);
          if (rvCache) {
            Object.keys(rvCache).forEach((key) => {
              const cached = rvCache[key];
              if (cached && cached.trim() !== '' && key in newValues) {
                newValues[key] = cached;
              }
            });
          }
          readingValues = newValues;
          inputErrors = {};
          usageStates = {};
          navigation.updating = false;
          window.scrollTo(0, 0);
          setTimeout(
            () => document.querySelector<HTMLInputElement>('input.mantine-input')?.focus(),
            100
          );
          return;
        }

        readings
          .loadMeterReadings(readings.propertyId, targetRoomId, 3, true)
          .then((newReadings: MeterReading[] | null) => {
            const newValues: Record<string, string> = { '': '' };
            if (newReadings && Array.isArray(newReadings)) {
              newReadings.forEach((reading: MeterReading) => {
                newValues[reading.date] = formatReading(reading.currentReading);
              });
            }
            const rvCache = readings.getReadingValuesFromCache(readings.propertyId, targetRoomId);
            if (rvCache) {
              Object.keys(rvCache).forEach((key) => {
                const cached = rvCache[key];
                if (cached && cached.trim() !== '' && key in newValues) {
                  newValues[key] = cached;
                }
              });
            }
            readingValues = newValues;
            inputErrors = {};
            usageStates = {};
            navigation.updating = false;
            window.scrollTo(0, 0);
            setTimeout(
              () => document.querySelector<HTMLInputElement>('input.mantine-input')?.focus(),
              100
            );
          })
          .catch(() => {
            navigation.updating = false;
          });
      };
    },
    get checkZeroUsage() {
      return () => {
        if (checkForZeroUsage()) {
          zeroUsageSource = 'nav';
          showZeroUsageModal = true;
          return true;
        }
        return false;
      };
    },
    get saveReadingValuesCache() {
      return readings.saveReadingValuesToCache;
    },
    get getReadingValuesFromCache() {
      return readings.getReadingValuesFromCache;
    },
    get collectReadingValues() {
      return () => ({ ...readingValues });
    },
  });

  // ── Helpers ──

  function checkForZeroUsage(): boolean {
    return readings.meterReadings.some((reading: MeterReading) => {
      const date = reading.date;
      const currentInput = readingValues[date];
      if (!currentInput || currentInput.trim() === '') return false;
      const current = parseFloat(currentInput);
      if (isNaN(current)) return false;
      const previous = parseFloat(String(reading.previousReading));
      if (isNaN(previous) || previous === 0) return false;
      return current - previous === 0;
    });
  }

  function getCurrentJSTDateString(): string {
    return new Intl.DateTimeFormat('ja-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  function collectReadingsFromState(): Record<string, unknown>[] {
    const result: Record<string, unknown>[] = [];

    /* eslint-disable svelte/prefer-svelte-reactivity -- Set is local-only, not reactive state */
    const processedDates = new Set<string>();

    for (const reading of readings.meterReadings) {
      const date = reading.date;
      const originalValue = formatReading(reading.currentReading);
      const currentValue = readingValues[date] ?? originalValue;

      if (currentValue && currentValue !== originalValue && currentValue.trim() !== '') {
        const numericValue = parseFloat(currentValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          result.push({
            date: getCurrentJSTDateString(),
            currentReading: currentValue,
            warningFlag: reading.warningFlag || '正常',
          });
          processedDates.add(date);
        }
      }
    }

    // Also check initial reading form (empty date key)
    // Only add if it wasn't already processed in the loop above (date="")
    if (!processedDates.has('')) {
      const initialValue = readingValues[''] ?? '';
      if (initialValue && initialValue.trim() !== '') {
        const numericValue = parseFloat(initialValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          result.push({
            date: getCurrentJSTDateString(),
            currentReading: initialValue,
            warningFlag: '正常',
          });
        }
      }
    }

    return result;
  }

  function handleInputChange(date: string, value: string, reading: MeterReading): void {
    readingValues = { ...readingValues, [date]: value };
    const previousValue = formatReading(reading.previousReading);
    const numericValue = parseFloat(value);

    if (value === '') {
      inputErrors[date] = '';
      usageStates[date] = calculateUsageDisplay(value, previousValue);
    } else if (isNaN(numericValue) || numericValue < 0) {
      inputErrors[date] = '0以上の数値を入力';
      usageStates[date] = '-';
    } else {
      inputErrors[date] = '';
      usageStates[date] = calculateUsageDisplay(value, previousValue);

      // Real-time warning flag calculation
      const previousReadingValue = parseFloat(String(reading.previousReading)) || 0;
      const previousPreviousReadingValue = parseFloat(String(reading.previousPreviousReading)) || 0;
      const threeTimesPreviousReadingValue = parseFloat(String(reading.threeTimesPrevious)) || 0;

      const warningResult = calculateWarningFlag(
        numericValue,
        previousReadingValue,
        previousPreviousReadingValue,
        threeTimesPreviousReadingValue
      );

      readings.meterReadings = readings.meterReadings.map((r: MeterReading) =>
        r.date === date
          ? {
              ...r,
              warningFlag: warningResult.warningFlag,
              standardDeviation: warningResult.standardDeviation,
            }
          : r
      );
    }
  }

  function handleInitialInputChange(value: string): void {
    const dateForDataAttribute = '';
    readingValues = { ...readingValues, '': value };
    const numericValue = parseFloat(value);

    if (value === '') {
      inputErrors[dateForDataAttribute] = '初回検針では指示数の入力が必須です。';
      usageStates[dateForDataAttribute] = '-';
    } else if (isNaN(numericValue) || numericValue < 0) {
      inputErrors[dateForDataAttribute] = '0以上の数値を入力してください。';
      usageStates[dateForDataAttribute] = '-';
    } else {
      inputErrors[dateForDataAttribute] = '';
      usageStates[dateForDataAttribute] = calculateUsageDisplay(value, '');
    }
  }

  async function handleUpdateReadings(): Promise<void> {
    const { propertyId, roomId, meterReadings } = readings;

    if (!propertyId || !roomId) {
      toast.displayToast('物件IDまたは部屋IDが取得できませんでした。');
      return;
    }

    // Validate: check for empty required fields
    let hasValidationErrors = false;
    if (hasReadingsWithPrevious) {
      // Regular readings: validate each entry's date-keyed value
      for (const reading of meterReadings) {
        const date = reading.date;
        const originalValue = formatReading(reading.currentReading);
        const currentValue = readingValues[date] ?? originalValue;

        if (originalValue === '' && (!currentValue || currentValue.trim() === '')) {
          inputErrors = { ...inputErrors, [date]: '初回検針では指示数の入力が必須です。' };
          hasValidationErrors = true;
        }
      }
    } else {
      // Initial reading: validate the InitialReadingForm value (stored under '' key)
      const initialValue = readingValues[''] ?? '';
      if (!initialValue || initialValue.trim() === '') {
        inputErrors = { ...inputErrors, '': '初回検針では指示数の入力が必須です。' };
        hasValidationErrors = true;
      }
    }

    if (hasValidationErrors) {
      toast.displayToast('入力値に誤りがあります。各項目のエラーを確認してください。');
      return;
    }

    if (checkForZeroUsage()) {
      zeroUsageSource = 'fab';
      showZeroUsageModal = true;
      return;
    }

    performSave();
  }

  async function performSave(): Promise<void> {
    const propertyId = readings.propertyId;
    const roomId = readings.roomId;

    const updatedReadings = collectReadingsFromState();

    if (updatedReadings.length === 0) {
      toast.displayToast('更新するデータがありません。');
      return;
    }

    navigation.updating = true;

    try {
      if (isCurrentlySyncing()) throw new Error('sync in progress');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let result: Record<string, unknown>;
      try {
        result = (await gasFetch(
          'updateMeterReadings',
          {
            propertyId,
            roomId,
            readings: JSON.stringify(updatedReadings),
          },
          'POST',
          controller.signal
        )) as Record<string, unknown>;
      } finally {
        clearTimeout(timeoutId);
      }

      if (result.success) {
        hasSaved = true;
        toast.displayToast('検針データが正常に更新されました');
        inputErrors = {};
        readings.invalidatePrefetch(readings.propertyId, readings.roomId);
      } else {
        throw new Error((result.error as string) || '指示数の更新に失敗しました。');
      }
    } catch (err: unknown) {
      try {
        saveToQueue({
          action: 'updateMeterReadings',
          propertyId,
          roomId,
          readings: updatedReadings,
        });
      } catch {
        toast.displayToast('保存に失敗しました。保存領域が一杯の可能性があります。');
        navigation.updating = false;
        return;
      }
      hasSaved = true;
      pendingCount = getQueueStatus().pendingCount;
      toast.displayToast('保存しました（オンライン復帰時に同期します）');
      inputErrors = {};
      readings.invalidatePrefetch(readings.propertyId, readings.roomId);

      const mergedReadings = readings.meterReadings.map((r: MeterReading) => {
        const date = r.date;
        const updatedValue = readingValues[date];
        if (updatedValue && updatedValue.trim() !== '') {
          return { ...r, currentReading: parseFloat(updatedValue) || r.currentReading };
        }
        return r;
      });
      readings.updateOfflineCache(readings.propertyId, readings.roomId, mergedReadings);

      updateRoomInBothCaches(readings.propertyId, readings.roomId);
    } finally {
      navigation.updating = false;
    }
  }

  // ── Derived: room navigation info ──
  let roomNav = $derived(navigation.getRoomNavigation());

  // ── Prefetch adjacent rooms after data loads ──
  $effect(() => {
    const current = readings.meterReadings;
    const isLoading = readings.loading;
    const hasError = readings.error;
    if (isLoading || hasError || !current) return;

    const propId = readings.propertyId;
    if (!propId) return;

    const nav = navigation.getRoomNavigation();
    if (nav.previousRoom?.id) {
      readings.prefetchRoom(propId, nav.previousRoom.id);
    }
    if (nav.nextRoom?.id) {
      readings.prefetchRoom(propId, nav.nextRoom.id);
    }
  });
</script>

<!-- ═══════════════ Loading state ═══════════════ -->
{#if readings.loading}
  <NetworkStatusBar />
  <a href="#main-content" class="skip-link"> メインコンテンツへ </a>
  <div class="app-header">
    <button
      onclick={() =>
        navigation.handleBackButton(
          readings.propertyId,
          readings.roomId,
          hasSaved,
          collectReadingsFromState
        )}
      class="back-button"
      aria-label="戻る"
    >
      &lt;
    </button>
    <h1 class="header-title">検針情報</h1>
  </div>
  <div id="main-content" class="content-area mantine-container">
    <div class="mantine-stack center">
      <div class="mantine-loader"></div>
      <p class="mantine-text">検針データを読み込んでいます...</p>
    </div>
  </div>

  <!-- ═══════════════ Error state ═══════════════ -->
{:else if readings.error}
  <NetworkStatusBar />
  <a href="#main-content" class="skip-link"> メインコンテンツへ </a>
  <div class="app-header">
    <button
      onclick={() =>
        navigation.handleBackButton(
          readings.propertyId,
          readings.roomId,
          hasSaved,
          collectReadingsFromState
        )}
      class="back-button"
      aria-label="戻る"
    >
      &lt;
    </button>
    <h1 class="header-title">検針情報</h1>
  </div>
  <div id="main-content" class="content-area mantine-container">
    <div class="mantine-stack">
      <div class="mantine-alert">
        <h3 class="mantine-text weight-600">{navigator.onLine ? 'エラー' : 'オフラインです'}</h3>
        <p class="mantine-text">
          {navigator.onLine
            ? String(readings.error || 'エラーが発生しました')
            : 'インターネットに接続されていません。オンライン状態で一度アプリを開いてから再度お試しください。'}
        </p>
        {#if navigator.onLine}
          <button
            onclick={() => readings.loadMeterReadings(readings.propertyId, readings.roomId)}
            style="margin-top: 16px; padding: 14px 24px; background: var(--mui-palette-blue-6); color: #fff; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; min-height: 44px;"
          >
            再試行
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- ═══════════════ Main content ═══════════════ -->
{:else}
  {#if navigation.isNavigating}
    <LoadingOverlay message={navigation.navigationMessage} />
  {:else if navigation.updating}
    <LoadingOverlay message="移動中..." />
  {/if}

  <NetworkStatusBar />
  <a href="#main-content" class="skip-link"> メインコンテンツへ </a>
  <div class="app-header">
    <button
      onclick={() =>
        navigation.handleBackButton(
          readings.propertyId,
          readings.roomId,
          hasSaved,
          collectReadingsFromState
        )}
      class="back-button"
      aria-label="戻る"
    >
      &lt;
    </button>
    <h1 class="header-title">検針情報</h1>
  </div>

  <div id="main-content" class="content-area mantine-container">
    <div class="mantine-stack">
      <PropertyInfoHeader propertyName={readings.propertyName} roomName={readings.roomName} />
      {#if readings.cacheAgeMs !== null && readings.cacheAgeMs > CACHE_STALE_THRESHOLD_MS}
        <div style="font-size: 0.75rem; color: #888; text-align: center; margin-top: -4px;">
          キャッシュからの表示（{Math.round(readings.cacheAgeMs / CACHE_STALE_THRESHOLD_MS)}分前）
        </div>
      {/if}
      <div
        class="mantine-paper reading-history-container"
        style="padding: var(--mui-spacing-xs); margin: 0;"
      >
        <div class="reading-history-header">
          <NavigationButtons
            hasPrevious={roomNav.hasPrevious}
            hasNext={roomNav.hasNext}
            disabled={navigation.updating}
            onPrevious={() => navigation.handlePreviousRoom(collectReadingsFromState)}
            onNext={() => navigation.handleNextRoom(collectReadingsFromState)}
            variant="header"
          />
        </div>

        {#if hasReadingsWithPrevious}
          <ReadingHistoryTable
            meterReadings={readings.meterReadings}
            {readingValues}
            {inputErrors}
            {usageStates}
            onInputChange={handleInputChange}
          />
        {:else}
          <InitialReadingForm
            readingValue={readingValues[''] ?? ''}
            inputError={inputErrors[''] ?? ''}
            usageState={usageStates[''] ?? ''}
            onInputChange={handleInitialInputChange}
          />
        {/if}
      </div>
    </div>

    {#if !readings.loading && !readings.error}
      <div class="fab-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 1001;">
        <button
          class="fab-button mantine-button variant-filled"
          onclick={handleUpdateReadings}
          disabled={navigation.updating || navigation.isNavigating}
          title={offlineMode
            ? '保存（オンライン復帰時に同期）'
            : hasReadingsWithPrevious
              ? '指示数を更新'
              : '初回検針データを保存'}
          style="width: 72px; height: 72px; border-radius: 50%; font-size: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;"
        >
          {#if navigation.updating}
            <div
              class="mantine-loader"
              style="width: 32px; height: 32px; border-top-color: white;"
            ></div>
          {:else}
            💾
          {/if}
        </button>
        {#if offlineMode && pendingCount > 0}
          <span
            style="position: absolute; top: -6px; right: -6px; background: #ed6c02; color: #fff; border-radius: 10px; padding: 2px 6px; font-size: 0.7rem; font-weight: 700; min-width: 18px; text-align: center;"
          >
            {pendingCount}
          </span>
        {/if}
      </div>

      <div style="position: fixed; bottom: 20px; left: 20px; z-index: 1001;">
        <button
          onclick={() =>
            navigation.handleBackButton(
              readings.propertyId,
              readings.roomId,
              hasSaved,
              collectReadingsFromState
            )}
          disabled={navigation.updating || navigation.isNavigating}
          style="padding: 14px 20px; background: #6c757d; color: #fff; border: none; border-radius: 8px; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; gap: 6px; min-height: 44px;"
          title="部屋選択画面へ戻る"
        >
          <span style="font-size: 16px;">◀</span> 選択画面へ
        </button>
      </div>
    {/if}

    <ToastOverlay show={toast.showToast} message={toast.toastMessage} />

    {#if showZeroUsageModal}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="使用量0㎥の確認"
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2147483647;"
      >
        <div
          style="background-color: var(--mui-palette-primary-main, #1976d2); border-radius: 16px; padding: 32px; max-width: 360px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2); text-align: center;"
        >
          <span
            class="material-icons"
            style="font-size: 48px; color: #fff; display: block; margin-bottom: 8px;">warning</span
          >
          <h3 style="margin: 0 0 8px; font-size: 1.25rem; font-weight: 600; color: #fff;">
            使用量が0㎥です
          </h3>
          <p style="margin: 0 0 24px; font-size: 1rem; color: rgba(255,255,255,0.85);">
            このまま保存しますか？
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button
              onclick={() => {
                showZeroUsageModal = false;
                if (zeroUsageSource === 'nav') {
                  navigation.resumePendingNavigation();
                } else {
                  performSave();
                }
              }}
              style="flex: 1; padding: 12px 16px; border-radius: 8px; border: 2px solid #fff; background-color: #fff; color: var(--mui-palette-primary-main, #1976d2); cursor: pointer; font-weight: 600; font-size: 1.125rem; min-height: 44px;"
            >
              保存する
            </button>
            <button
              onclick={() => {
                showZeroUsageModal = false;
                if (zeroUsageSource === 'nav') {
                  navigation.cancelPendingNavigation();
                }
              }}
              style="flex: 1; padding: 12px 16px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.5); background-color: transparent; color: #fff; cursor: pointer; font-weight: 600; font-size: 1.125rem; min-height: 44px;"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
