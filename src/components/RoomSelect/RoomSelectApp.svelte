<script lang="ts">
  import { getGasUrl, gasFetch } from '../../utils/gasClient';
  import { saveToQueue } from '../../utils/offlineQueue';
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
  let showExitModal: boolean = $state(false);

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
        const data: any = await gasFetch('getRoomsLight', {
          propertyId: propId,
          cache: String(Date.now()),
        });
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
        localStorage.setItem(
          'cached_rooms_' + propId,
          JSON.stringify({ rooms: fetchedRooms, propertyName: fetchedPropertyName })
        );
      } catch (_) {
        const data: any = await gasFetch('getRooms', { propertyId: propId });
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
        localStorage.setItem(
          'cached_rooms_' + propId,
          JSON.stringify({ rooms: fetchedRooms, propertyName: fetchedPropertyName })
        );
      }
    } catch (err) {
      const cached = localStorage.getItem('cached_rooms_' + propId);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.rooms)) {
            rooms = parsed.rooms;
            propertyName = parsed.propertyName || '物件名不明';
            loading = false;
            return;
          }
        } catch {}
      }
      const message = err instanceof Error ? err.message : String(err);
      error = message;
    } finally {
      loading = false;
    }
  }

  async function performBackgroundUpdate(
    propId: string,
    _gasWebAppUrl: string,
    _currentRooms: Room[]
  ): Promise<void> {
    try {
      const data: any = await gasFetch('getRoomsLight', {
        propertyId: propId,
        cache: String(Date.now()),
      });
      if (data.success) {
        const updatedRooms = data.data?.rooms || data.data || [];
        if (Array.isArray(updatedRooms) && updatedRooms.length > 0) {
          // Preserve optimistic update for recently saved room
          const savedRoomId = sessionStorage.getItem('updatedRoomId');
          const savedTime = sessionStorage.getItem('lastUpdateTime');
          if (savedRoomId && savedTime) {
            const elapsed = Date.now() - parseInt(savedTime, 10);
            if (elapsed < 600000) {
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
              localStorage.setItem(
                'cached_rooms_' + propId,
                JSON.stringify({ rooms: preserved, propertyName })
              );
              return;
            }
          }
          rooms = updatedRooms;
          sessionStorage.setItem('selectedRooms', JSON.stringify(updatedRooms));
          localStorage.setItem(
            'cached_rooms_' + propId,
            JSON.stringify({ rooms: updatedRooms, propertyName })
          );
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
      const properties = JSON.parse(cached);
      if (!Array.isArray(properties)) return;
      const updated = properties.map((p: any) =>
        String(p.id) === String(propId) ? { ...p, completionDate: date } : p
      );
      localStorage.setItem('cached_properties', JSON.stringify(updated));
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
      const result: any = await gasFetch('completeInspection', { propertyId, completionDate });

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
