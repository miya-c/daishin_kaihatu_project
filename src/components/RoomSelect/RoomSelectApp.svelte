<script lang="ts">
  import { getGasUrl } from '../../utils/gasClient';
  import NetworkStatusBar from '../NetworkStatusBar.svelte';
  import { validateId } from '../../utils/validateParams';

  import type { Room } from '../../types';

  let rooms: Room[] = $state([]);
  let propertyName: string = $state('物件名読み込み中...');
  let loading: boolean = $state(true);
  let error: string | null = $state(null);
  let propertyId: string = $state('');
  let toastMessage: string = $state('');
  let showToast: boolean = $state(false);
  let toastTimerRef: ReturnType<typeof setTimeout> | null = null;

  function displayToast(message: string): void {
    toastMessage = message;
    showToast = true;
    if (toastTimerRef) clearTimeout(toastTimerRef);
    toastTimerRef = setTimeout(() => {
      showToast = false;
      toastMessage = '';
    }, 3000);
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
      // Clean up stale flags from previous navigation
      sessionStorage.removeItem('forceRefreshRooms');

      // Try sessionStorage cache first (always, since handleBackButton updates it optimistically)
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
            setTimeout(() => performBackgroundUpdate(propId, gasWebAppUrl!, parsedRooms), 100);
            return;
          }
        } catch (_) {
          // Continue to API fetch
        }
      }

      try {
        const fetchUrl = `${gasWebAppUrl}?action=getRoomsLight&propertyId=${encodeURIComponent(propId)}&cache=${Date.now()}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error || 'API error');
        }

        const fetchedRooms = data.data?.rooms || data.data || [];
        const fetchedPropertyName =
          data.data?.propertyName || sessionStorage.getItem('selectedPropertyName') || '物件名不明';

        if (!Array.isArray(fetchedRooms)) {
          throw new Error('Invalid data format');
        }

        rooms = fetchedRooms;
        propertyName = fetchedPropertyName;
        sessionStorage.setItem('selectedRooms', JSON.stringify(fetchedRooms));
        sessionStorage.setItem('selectedPropertyName', fetchedPropertyName);
        sessionStorage.setItem('selectedPropertyId', propId);
      } catch (_) {
        const fetchUrl = `${gasWebAppUrl}?action=getRooms&propertyId=${encodeURIComponent(propId)}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'データの取得に失敗しました');
        }

        let fetchedPropertyName = '物件名不明';
        if (data.data) {
          fetchedPropertyName =
            data.data.propertyName ||
            (data.data.property && data.data.property.name) ||
            data.data.property_name ||
            data.data.name ||
            sessionStorage.getItem('selectedPropertyName') ||
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
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error = message;
    } finally {
      loading = false;
    }
  }

  async function performBackgroundUpdate(
    propId: string,
    gasWebAppUrl: string,
    _currentRooms: Room[]
  ): Promise<void> {
    try {
      const fetchUrl = `${gasWebAppUrl}?action=getRoomsLight&propertyId=${encodeURIComponent(propId)}&cache=${Date.now()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        const updatedRooms = data.data?.rooms || data.data || [];
        if (Array.isArray(updatedRooms) && updatedRooms.length > 0) {
          // Preserve optimistic update for recently saved room
          const savedRoomId = sessionStorage.getItem('updatedRoomId');
          const savedTime = sessionStorage.getItem('lastUpdateTime');
          if (savedRoomId && savedTime) {
            const elapsed = Date.now() - parseInt(savedTime, 10);
            if (elapsed < 30000) {
              // Within 30s: protect the optimistic update from API cache lag
              const preserved = updatedRooms.map((room: Room) => {
                const rid = String(room.id || room.roomId || '');
                if (rid === savedRoomId) {
                  return {
                    ...room,
                    readingStatus: 'completed',
                    isCompleted: true,
                    readingDateFormatted:
                      room.readingDateFormatted ||
                      new Intl.DateTimeFormat('ja-JP', {
                        timeZone: 'Asia/Tokyo',
                        month: 'long',
                        day: 'numeric',
                      }).format(new Date()),
                  };
                }
                return room;
              });
              rooms = preserved;
              sessionStorage.setItem('selectedRooms', JSON.stringify(preserved));
              return;
            }
          }
          rooms = updatedRooms;
          sessionStorage.setItem('selectedRooms', JSON.stringify(updatedRooms));
        }
      }
    } catch (_) {
      // Background update failure is non-critical
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

  async function handleCompleteInspection(): Promise<void> {
    if (!propertyId) {
      displayToast('物件IDが取得できませんでした');
      return;
    }

    const gasUrl = sessionStorage.getItem('gasWebAppUrl');
    if (!gasUrl) {
      displayToast('Web App URLが設定されていません');
      return;
    }

    try {
      const today = new Date();
      const completionDate =
        today.getFullYear() +
        '-' +
        String(today.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(today.getDate()).padStart(2, '0');

      const response = await fetch(
        `${gasUrl}?action=completeInspection&propertyId=${propertyId}&completionDate=${completionDate}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.success) {
        displayToast(`検針完了日を ${completionDate} で保存しました！`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(result.error || '検針完了処理に失敗しました');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      displayToast(`検針完了処理でエラーが発生しました: ${message}`);
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
        <span class="MuiAlert-message">{String(error)}</span>
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

      <section class="room-grid" aria-label="部屋一覧" role="list">
        {#if rooms.length === 0}
          <div class="no-rooms-message">部屋データがありません</div>
        {:else}
          {#each rooms as room, index (room.id || index)}
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
                ? room.readingDateFormatted
                  ? `検針済み：${String(room.readingDateFormatted)}`
                  : '検針済み'
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
                (isSkipInspection ? ' 検針不要' : isCompleted ? ' 検針済み' : ' 未検針')}
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

      {#if rooms.length > 0}
        <div class="complete-button-container">
          <button
            class="MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge complete-button"
            onclick={handleCompleteInspection}
            aria-label="この物件の検針を完了する"
          >
            <span class="material-icons MuiSvgIcon-root" aria-hidden="true"> check_circle </span>
            <span class="MuiButton-label">この物件の検針を完了する</span>
          </button>
        </div>
      {/if}
    </main>

    {#if showToast}
      <div role="status" aria-live="polite" class="toast-inline">
        {toastMessage}
      </div>
    {/if}
  </div>
{/if}
