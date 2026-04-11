<script lang="ts">
  import { getGasUrl, gasFetch } from '../../utils/gasClient';
  import { saveToQueue } from '../../utils/offlineQueue';
  import { saveRoomsToCache, readRoomsFromCache } from '../../utils/roomCache';
  import { TOAST_DISPLAY_MS } from '../../utils/config';
  import NetworkStatusBar from '../NetworkStatusBar.svelte';
  import { validateId } from '../../utils/validateParams';

  import type { Room, ApiResponse } from '../../types';

  let rooms: Room[] = $state([]);
  let propertyName: string = $state(
    localStorage.getItem('last_property_name') || '物件名読み込み中...'
  );
  let loading: boolean = $state(true);
  let error: string | null = $state(null);
  let propertyId: string = $state('');
  let completing: boolean = $state(false);
  let toastMessage: string = $state('');
  let showToast: boolean = $state(false);
  let toastTimerRef: ReturnType<typeof setTimeout> | null = null;
  let showExitModal: boolean = $state(false);
  let sortAsc: boolean = $state(true);

  let sortedRooms = $derived(sortAsc ? rooms : [...rooms].reverse());

  function displayToast(message: string): void {
    toastMessage = message;
    showToast = true;
    if (toastTimerRef) clearTimeout(toastTimerRef);
    toastTimerRef = setTimeout(() => {
      showToast = false;
      toastMessage = '';
    }, TOAST_DISPLAY_MS);
  }

  async function loadRoomData(propId: string): Promise<void> {
    let gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');
    if (!gasWebAppUrl) {
      gasWebAppUrl = localStorage.getItem('gasWebAppUrl');
      if (gasWebAppUrl) {
        sessionStorage.setItem('gasWebAppUrl', gasWebAppUrl);
      }
    }

    if (!gasWebAppUrl || !gasWebAppUrl.includes('script.google.com')) {
      error = 'GAS Web App URLが設定されていません。';
      loading = false;
      return;
    }

    try {
      // Always fetch fresh data from API first — stale cache causes confusion
      // when returning from reading page or resuming from index page.
      try {
        const data = (await gasFetch('getRoomsLight', {
          propertyId: propId,
          cache: String(Date.now()),
        })) as ApiResponse<{ rooms: Room[]; propertyName: string }>;
        if (data.success === false) {
          throw new Error(data.error || 'API error');
        }

        const fetchedRooms = data.data?.rooms || data.data || [];
        const fetchedPropertyName =
          data.data?.propertyName ||
          sessionStorage.getItem('selectedPropertyName') ||
          localStorage.getItem('last_property_name') ||
          '物件名不明';

        if (!Array.isArray(fetchedRooms)) {
          throw new Error('Invalid data format');
        }

        rooms = fetchedRooms;
        propertyName = fetchedPropertyName;
        sessionStorage.setItem('selectedRooms', JSON.stringify(fetchedRooms));
        sessionStorage.setItem('selectedPropertyName', fetchedPropertyName);
        sessionStorage.setItem('selectedPropertyId', propId);
        saveRoomsToCache(propId, fetchedRooms, fetchedPropertyName);
      } catch (_) {
        const data = (await gasFetch('getRooms', { propertyId: propId })) as ApiResponse<{
          rooms: Room[];
          propertyName: string;
          property?: { name: string };
          property_name?: string;
          name?: string;
        }>;
        if (!data.success) {
          throw new Error(data.error || 'データの取得に失敗しました');
        }

        let fetchedPropertyName = localStorage.getItem('last_property_name') || '物件名不明';
        if (data.data) {
          fetchedPropertyName =
            data.data.propertyName ||
            (data.data.property && data.data.property.name) ||
            data.data.property_name ||
            data.data.name ||
            sessionStorage.getItem('selectedPropertyName') ||
            localStorage.getItem('last_property_name') ||
            '物件名不明';
        }

        const fetchedRooms = data.data && Array.isArray(data.data.rooms) ? data.data.rooms : [];
        if (!Array.isArray(fetchedRooms)) {
          throw new Error('部屋データの取得に失敗しました');
        }

        rooms = fetchedRooms;
        propertyName = fetchedPropertyName;
        sessionStorage.setItem('selectedRooms', JSON.stringify(fetchedRooms));
        sessionStorage.setItem('selectedPropertyName', fetchedPropertyName);
        sessionStorage.setItem('selectedPropertyId', propId);
        saveRoomsToCache(propId, fetchedRooms, fetchedPropertyName);
      }
    } catch (err) {
      // Both API calls failed — try caches as last resort
      const sessionRooms = sessionStorage.getItem('selectedRooms');
      const sessionPropertyName = sessionStorage.getItem('selectedPropertyName');
      const sessionPropertyId = sessionStorage.getItem('selectedPropertyId');

      if (sessionRooms && sessionPropertyId === propId && sessionPropertyName) {
        try {
          const parsedRooms = JSON.parse(sessionRooms);
          if (Array.isArray(parsedRooms)) {
            rooms = parsedRooms;
            propertyName = sessionPropertyName;
            loading = false;
            return;
          }
        } catch (_) {
          // Continue to localStorage fallback
        }
      }

      const cached = readRoomsFromCache(propId);
      if (cached) {
        rooms = cached.rooms as Room[];
        propertyName = cached.propertyName || '物件名不明';
        loading = false;
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      error = message;
    } finally {
      loading = false;
    }
  }

  function handleRoomClick(room: Room): void {
    if (room.isNotNeeded === true) {
      displayToast('この部屋は検針不要に設定されています。');
      return;
    }

    const roomId = String(room.id || room.roomId || '');
    const gasUrl = getGasUrl();
    if (gasUrl) {
      sessionStorage.setItem('gasWebAppUrl', gasUrl);
    }
    window.location.href = `/reading/?propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(roomId)}`;
  }

  function handleBackButton(): void {
    window.location.href = '/property/';
  }

  function handleExitYes(): void {
    window.close();
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#333;font-size:1.125rem;">検針が完了しました。このタブを閉じてください。</div>';
  }

  function handleExitNo(): void {
    showExitModal = false;
    window.location.href = '/property/';
  }

  function updatePropertyCacheCompletion(propId: string, date: string): void {
    const cached = localStorage.getItem('cached_properties');
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      const entries = Array.isArray(parsed) ? parsed : parsed.data;
      if (!Array.isArray(entries)) return;
      const updated = entries.map((p: Record<string, unknown>) =>
        String(p.id) === String(propId) ? { ...p, completionDate: date } : p
      );
      localStorage.setItem(
        'cached_properties',
        JSON.stringify({ data: updated, cachedAt: parsed.cachedAt ?? Date.now() })
      );
    } catch {}
  }

  async function handleCompleteInspection(): Promise<void> {
    if (!propertyId) {
      displayToast('物件IDが取得できませんでした');
      return;
    }

    const today = new Date();
    const completionDate =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0');

    // Validate all rooms are completed before finishing
    const rooms =
      typeof sessionStorage !== 'undefined'
        ? JSON.parse(sessionStorage.getItem('selectedRooms') || '[]')
        : [];
    for (const room of rooms) {
      const roomId = String(room.id || room.roomId || '');
      if (
        roomId &&
        room.isNotNeeded !== true &&
        !(room.readingStatus === 'completed' || room.isCompleted)
      ) {
        displayToast('未検針の部屋があります。すべての検針を完了してください。');
        return;
      }
    }

    try {
      completing = true;
      const result = (await gasFetch('completeInspection', {
        propertyId,
        completionDate,
      })) as ApiResponse<unknown>;

      if (result.success) {
        updatePropertyCacheCompletion(propertyId, completionDate);
        showExitModal = true;
      } else {
        throw new Error(result.error || '検針完了処理に失敗しました');
      }
    } catch (err) {
      // API failed — fallback to offline queue
      try {
        saveToQueue({
          action: 'completeInspection',
          propertyId,
          roomId: propertyId,
          completionDate,
        });
      } catch {
        displayToast('保存に失敗しました。保存領域が一杯の可能性があります。');
        return;
      }
      updatePropertyCacheCompletion(propertyId, completionDate);
      showExitModal = true;
    } finally {
      completing = false;
    }
  }

  $effect(() => {
    window.scrollTo(0, 0);

    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('propertyId');

    if (!propId) {
      error = '物件IDが指定されていません。';
      loading = false;
      return;
    }

    const validation = validateId(propId, '物件ID');
    if (!validation.valid) {
      error = validation.error ?? '物件IDが無効です';
      loading = false;
      return;
    }

    propertyId = propId;
    loadRoomData(propId);
  });

  $effect(() => {
    return () => {
      if (toastTimerRef) clearTimeout(toastTimerRef);
    };
  });
</script>

{#if loading}
  <div>
    <NetworkStatusBar />
    <header class="MuiAppBar-root MuiAppBar-colorPrimary MuiAppBar-positionStatic mui-elevation-4">
      <nav class="MuiToolbar-root MuiToolbar-regular" aria-label="部屋選択ナビゲーション">
        <button
          class="MuiIconButton-root MuiIconButton-colorInherit"
          onclick={handleBackButton}
          aria-label="戻る"
        >
          <span class="material-icons MuiSvgIcon-root">arrow_back</span>
        </button>
        <span class="MuiTypography-root MuiTypography-h6 app-title">部屋選択</span>
      </nav>
    </header>
    <main class="MuiContainer-root MuiContainer-maxWidthLg" style="padding-top: 32px;">
      <div class="loading-container">
        <span class="MuiCircularProgress-root" aria-label="読み込み中"></span>
        <span class="MuiTypography-root MuiTypography-body1"> 部屋データを読み込み中... </span>
      </div>
    </main>
  </div>
{:else if error}
  <div>
    <NetworkStatusBar />
    <header class="MuiAppBar-root MuiAppBar-colorPrimary MuiAppBar-positionStatic mui-elevation-4">
      <nav class="MuiToolbar-root MuiToolbar-regular" aria-label="部屋選択ナビゲーション">
        <button
          class="MuiIconButton-root MuiIconButton-colorInherit"
          onclick={handleBackButton}
          aria-label="戻る"
        >
          <span class="material-icons MuiSvgIcon-root">arrow_back</span>
        </button>
        <span class="MuiTypography-root MuiTypography-h6 app-title">部屋選択</span>
      </nav>
    </header>
    <main class="MuiContainer-root MuiContainer-maxWidthLg" style="padding-top: 32px;">
      <div class="MuiAlert-root MuiAlert-standardError" role="alert">
        <span class="MuiAlert-message"
          >{navigator.onLine
            ? String(error)
            : 'オフラインです。インターネットに接続されていません。オンライン状態で一度アプリを開いてから再度お試しください。'}</span
        >
      </div>
    </main>
  </div>
{:else}
  <div>
    <header class="MuiAppBar-root MuiAppBar-colorPrimary MuiAppBar-positionStatic mui-elevation-4">
      <nav class="MuiToolbar-root MuiToolbar-regular" aria-label="部屋選択ナビゲーション">
        <button
          class="MuiIconButton-root MuiIconButton-colorInherit"
          onclick={handleBackButton}
          aria-label="戻る"
        >
          <span class="material-icons MuiSvgIcon-root">arrow_back</span>
        </button>
        <span class="MuiTypography-root MuiTypography-h6 app-title">部屋選択</span>
      </nav>
    </header>

    <main class="MuiContainer-root MuiContainer-maxWidthLg" style="padding-top: 32px;">
      <section
        class="MuiCard-root MuiPaper-root MuiPaper-elevation1 property-card"
        aria-label="物件情報"
      >
        <div class="MuiCardHeader-root property-header">
          <span class="material-icons MuiSvgIcon-root property-icon" aria-hidden="true">
            home
          </span>
          <span class="MuiTypography-root MuiTypography-h5">{propertyName}</span>
        </div>
      </section>

      {#if rooms.filter((r) => r.isNotNeeded !== true).length > 0}
        {@const completed = rooms.filter(
          (r) => (r.readingStatus === 'completed' || r.isCompleted) && r.isNotNeeded !== true
        ).length}
        {@const total = rooms.filter((r) => r.isNotNeeded !== true).length}
        {@const pct = Math.round((completed / total) * 100)}
        {@const barColor = pct === 100 ? '#2e7d32' : pct >= 50 ? '#e67700' : '#c92a2a'}
        <div style="padding: 12px 16px; margin: 0 0 8px;">
          <div
            style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;"
          >
            <span style="font-size: 1.15rem; font-weight: 700; color: {barColor};">
              {completed}/{total} 完了
            </span>
            <span style="font-size: 0.95rem; font-weight: 600; color: {barColor};">
              {pct}%
            </span>
          </div>
          <div
            style="width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;"
          >
            <div
              style="width: {pct}%; height: 100%; background: {barColor}; border-radius: 4px; transition: width 0.3s ease;"
            ></div>
          </div>
        </div>
      {/if}

      <div
        style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 8px 8px;"
      >
        {#if rooms.length > 0}
          {@const allDone = rooms.every(
            (r) => r.readingStatus === 'completed' || r.isCompleted || r.isNotNeeded === true
          )}
          <button
            onclick={handleCompleteInspection}
            disabled={completing}
            style="display: flex; flex: 1; max-width: calc(50% - 4px); justify-content: center; align-items: center; gap: 4px; padding: 8px 14px; background: {allDone
              ? '#2e7d32'
              : 'var(--mui-palette-primary-main, #1976d2)'}; border: none; border-radius: 8px; font-size: 0.85rem; color: #fff; cursor: pointer; min-height: 36px; font-weight: 600;"
            aria-label={allDone ? '全件完了 - 完了登録する' : 'この物件の検針を完了する'}
          >
            <span
              class="material-icons MuiSvgIcon-root"
              aria-hidden="true"
              style="font-size: 18px;"
            >
              {completing ? 'hourglass_empty' : 'check_circle'}
            </span>
            {completing ? '処理中...' : allDone ? '完了登録' : '検針完了にする'}
          </button>
        {/if}
        <button
          onclick={() => (sortAsc = !sortAsc)}
          style="display: flex; align-items: center; gap: 4px; padding: 8px 14px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; font-size: 0.85rem; color: #495057; cursor: pointer; min-height: 36px;"
          aria-label={sortAsc ? '降順に並べ替え' : '昇順に並べ替え'}
        >
          <span class="material-icons MuiSvgIcon-root" aria-hidden="true" style="font-size: 18px;">
            {sortAsc ? 'arrow_downward' : 'arrow_upward'}
          </span>
          {sortAsc ? '降順' : '昇順'}
        </button>
      </div>

      <section class="room-grid" aria-label="部屋一覧" role="list">
        {#if rooms.length === 0}
          <div class="no-rooms-message">部屋データがありません</div>
        {:else}
          {#each sortedRooms as room, index (room.id || index)}
            {@const isSkipInspection = room.isNotNeeded === true}
            {@const isCompleted = room.readingStatus === 'completed' || room.isCompleted}
            {@const statusIcon = isSkipInspection
              ? 'block'
              : isCompleted
                ? 'check_circle'
                : 'warning'}
            {@const statusColor = isSkipInspection
              ? '#9e9e9e'
              : isCompleted
                ? '#2e7d32'
                : '#ed6c02'}
            {@const statusText = isSkipInspection
              ? '検針不要'
              : isCompleted
                ? (() => {
                    const prev = parseFloat(String(room.previousReading));
                    const curr = parseFloat(String(room.currentReading));
                    if (!isNaN(curr) && !isNaN(prev) && prev > 0) {
                      return `前回 ${prev}  今回 ${curr}  ${curr - prev}`;
                    }
                    if (!isNaN(curr)) {
                      return `今回 ${curr}  検針済み`;
                    }
                    return '検針済み';
                  })()
                : '未検針'}
            {@const cardClasses = isSkipInspection
              ? 'MuiCard-root MuiPaper-root MuiPaper-elevation1 MuiCardActionArea-root room-card status-skip'
              : isCompleted
                ? 'MuiCard-root MuiPaper-root MuiPaper-elevation1 MuiCardActionArea-root room-card status-completed'
                : 'MuiCard-root MuiPaper-root MuiPaper-elevation1 MuiCardActionArea-root room-card status-pending'}
            <button
              type="button"
              class={cardClasses}
              disabled={isSkipInspection}
              aria-label={String(room.name || room['部屋名'] || room.id || '不明') +
                (isSkipInspection ? ' 検針不要' : isCompleted ? ' 検針済み' : ' 未検針') +
                ' ' +
                statusText}
              onclick={() => handleRoomClick(room)}
            >
              <div class="MuiCardContent-root room-info-row">
                <span
                  class="material-icons MuiSvgIcon-root status-icon"
                  aria-hidden="true"
                  style="color: {statusColor};"
                >
                  {statusIcon}
                </span>
                <span class="MuiTypography-root MuiTypography-h6 room-name">
                  {String(room.name || room['部屋名'] || room.id || '不明')}
                </span>
                <span class="MuiTypography-root MuiTypography-body2 room-status">
                  {statusText}
                </span>
              </div>
            </button>
          {/each}
        {/if}
      </section>
    </main>

    {#if showToast}
      <div role="status" aria-live="polite" class="toast-inline">
        {toastMessage}
      </div>
    {/if}

    {#if showExitModal}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2147483647;"
      >
        <div
          style="background-color: var(--mui-palette-primary-main, #1976d2); border-radius: 16px; padding: 32px; max-width: 360px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2); text-align: center;"
        >
          <h3
            id="exit-modal-title"
            style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 600; color: #fff; white-space: nowrap;"
          >
            検針を完了しました
          </h3>
          <p
            style="margin: 0 0 20px 0; font-size: 1rem; color: rgba(255,255,255,0.85); white-space: nowrap;"
          >
            アプリを終了しますか？
          </p>
          <p
            style="margin: 0 0 20px 0; font-size: 0.875rem; color: rgba(255,255,255,0.55); white-space: nowrap;"
          >
            「いいえ」で物件選択画面へ戻ります
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button
              onclick={handleExitYes}
              style="flex: 1; padding: 10px 16px; border-radius: 8px; border: 2px solid #fff; background-color: #fff; color: var(--mui-palette-primary-main, #1976d2); cursor: pointer; font-weight: 600; font-size: 1.125rem;"
            >
              はい
            </button>
            <button
              onclick={handleExitNo}
              style="flex: 1; padding: 10px 16px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.5); background-color: transparent; color: #fff; cursor: pointer; font-size: 1.125rem;"
            >
              いいえ
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
