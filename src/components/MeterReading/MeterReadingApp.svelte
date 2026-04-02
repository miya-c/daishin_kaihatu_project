<script lang="ts">
  import { formatReading, calculateUsageDisplay } from './utils/formatUtils';
  import { calculateWarningFlag } from './utils/warningFlag';
  import { createMeterReadings } from './hooks/useMeterReadings.svelte';
  import { createRoomNavigation } from './hooks/useRoomNavigation.svelte';
  import { createToast } from './hooks/useToast.svelte';
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
      const updated = { ...readingValues };
      let changed = false;
      current.forEach((reading: MeterReading) => {
        if (!(reading.date in updated)) {
          updated[reading.date] = formatReading(reading.currentReading);
          changed = true;
        }
      });
      if (!('' in updated)) {
        updated[''] = '';
        changed = true;
      }
      if (changed) readingValues = updated;
    }
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
    get onNavigateToRoom() {
      return (targetRoomId: string) => {
        hasSaved = false;
        const newUrl = `/reading/?propertyId=${encodeURIComponent(readings.propertyId)}&roomId=${encodeURIComponent(targetRoomId)}`;
        window.history.replaceState(null, '', newUrl);
        // silent=true: keep current content visible during transition
        readings
          .loadMeterReadings(readings.propertyId, targetRoomId, 3, true)
          .then((newReadings: MeterReading[] | null) => {
            // Compute new readingValues directly from returned data (atomic update)
            const newValues: Record<string, string> = { '': '' };
            if (newReadings && Array.isArray(newReadings)) {
              newReadings.forEach((reading: MeterReading) => {
                newValues[reading.date] = formatReading(reading.currentReading);
              });
            }
            readingValues = newValues;
            inputErrors = {};
            usageStates = {};
            navigation.updating = false;
            window.scrollTo(0, 0);
          })
          .catch(() => {
            navigation.updating = false;
          });
      };
    },
  });

  // ── Helpers ──

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
        }
      }
    }

    // Also check initial reading form (empty date key)
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

    return result;
  }

  function handleInputChange(date: string, value: string, reading: MeterReading): void {
    readingValues = { ...readingValues, [date]: value };
    const previousValue = formatReading(reading.previousReading);
    const numericValue = parseFloat(value);

    if (value === '') {
      inputErrors = { ...inputErrors, [date]: '' };
      usageStates = { ...usageStates, [date]: calculateUsageDisplay(value, previousValue) };
    } else if (isNaN(numericValue) || numericValue < 0) {
      inputErrors = { ...inputErrors, [date]: '0以上の数値を入力' };
      usageStates = { ...usageStates, [date]: '-' };
    } else {
      inputErrors = { ...inputErrors, [date]: '' };
      const usageDisplay = calculateUsageDisplay(value, previousValue);
      usageStates = { ...usageStates, [date]: usageDisplay };

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
      inputErrors = {
        ...inputErrors,
        [dateForDataAttribute]: '初回検針では指示数の入力が必須です。',
      };
      usageStates = { ...usageStates, [dateForDataAttribute]: '-' };
    } else if (isNaN(numericValue) || numericValue < 0) {
      inputErrors = { ...inputErrors, [dateForDataAttribute]: '0以上の数値を入力してください。' };
      usageStates = { ...usageStates, [dateForDataAttribute]: '-' };
    } else {
      inputErrors = { ...inputErrors, [dateForDataAttribute]: '' };
      usageStates = { ...usageStates, [dateForDataAttribute]: calculateUsageDisplay(value, '') };
    }
  }

  async function handleUpdateReadings(): Promise<void> {
    const { propertyId, roomId, gasWebAppUrl, meterReadings } = readings;

    if (!propertyId || !roomId) {
      toast.displayToast('物件IDまたは部屋IDが取得できませんでした。');
      return;
    }

    // Validate: check for empty required fields
    let hasValidationErrors = false;
    for (const reading of meterReadings) {
      const date = reading.date;
      const originalValue = formatReading(reading.currentReading);
      const currentValue = readingValues[date] ?? originalValue;

      if (originalValue === '' && (!currentValue || currentValue.trim() === '')) {
        inputErrors = { ...inputErrors, [date]: '初回検針では指示数の入力が必須です。' };
        hasValidationErrors = true;
      }
    }

    if (hasValidationErrors) {
      toast.displayToast('入力値に誤りがあります。各項目のエラーを確認してください。');
      return;
    }

    const updatedReadings = collectReadingsFromState();

    if (updatedReadings.length === 0) {
      toast.displayToast('更新するデータがありません。');
      return;
    }

    navigation.updating = true;

    try {
      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
      const params = new URLSearchParams({
        action: 'updateMeterReadings',
        propertyId,
        roomId,
        readings: JSON.stringify(updatedReadings),
      });
      const requestUrl = `${currentGasUrl}?${params}`;

      const response = await fetch(requestUrl, { method: 'GET' });

      if (!response.ok) {
        throw new Error(
          'ネットワークの応答が正しくありませんでした。ステータス: ' + response.status
        );
      }

      const result = await response.json();

      if (result.success) {
        hasSaved = true;
        toast.displayToast('検針データが正常に更新されました');
        inputErrors = {};
      } else {
        throw new Error(result.error || '指示数の更新に失敗しました。');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.displayToast('更新エラー: ' + message);
    } finally {
      navigation.updating = false;
    }
  }

  // ── Derived: room navigation info ──
  let roomNav = $derived(navigation.getRoomNavigation());
</script>

<!-- ═══════════════ Loading state ═══════════════ -->
{#if readings.loading}
  <NetworkStatusBar />
  <a href="#main-content" class="skip-link"> メインコンテンツへ </a>
  <div class="app-header">
    <button
      onclick={() => navigation.handleBackButton(readings.propertyId, readings.roomId, hasSaved)}
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
      onclick={() => navigation.handleBackButton(readings.propertyId, readings.roomId, hasSaved)}
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
        <h3 class="mantine-text weight-600">エラー</h3>
        <p class="mantine-text">{String(readings.error || 'エラーが発生しました')}</p>
      </div>
    </div>
  </div>

  <!-- ═══════════════ Main content ═══════════════ -->
{:else}
  {#if navigation.isNavigating}
    <LoadingOverlay message={navigation.navigationMessage} />
  {/if}

  <NetworkStatusBar />
  <a href="#main-content" class="skip-link"> メインコンテンツへ </a>
  <div class="app-header">
    <button
      onclick={() => navigation.handleBackButton(readings.propertyId, readings.roomId, hasSaved)}
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

          <NavigationButtons
            hasPrevious={roomNav.hasPrevious}
            hasNext={roomNav.hasNext}
            disabled={navigation.updating}
            onPrevious={() => navigation.handlePreviousRoom(collectReadingsFromState)}
            onNext={() => navigation.handleNextRoom(collectReadingsFromState)}
            variant="footer"
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
          disabled={navigation.updating || navigation.isNavigating || !navigator.onLine}
          title={hasReadingsWithPrevious ? '指示数を更新' : '初回検針データを保存'}
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
      </div>
    {/if}

    <ToastOverlay show={toast.showToast} message={toast.toastMessage} />
  </div>
{/if}
