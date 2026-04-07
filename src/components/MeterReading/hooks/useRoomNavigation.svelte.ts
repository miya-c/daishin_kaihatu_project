import type { RoomNavigation } from '../../../types';
import { gasFetch } from '../../../utils/gasClient';
import { saveToQueue, isCurrentlySyncing } from '../../../utils/offlineQueue';

interface CreateRoomNavigationParams {
  propertyId: string;
  roomId: string;
  gasWebAppUrl: string;
  displayToast: (message: string) => void;
  onNavigateToRoom?: (targetRoomId: string, preloadedNavData?: Record<string, unknown>) => void;
  invalidatePrefetch?: (propId: string, rId: string) => void;
  updateOfflineCache?: (propId: string, rId: string, readings: Record<string, unknown>[]) => void;
  hasPrefetch?: (propId: string, rId: string) => boolean;
}

interface NavigationRoom {
  id: string;
  isNotNeeded?: boolean;
  [key: string]: unknown;
}

interface GasApiResponse {
  success?: boolean;
  data?: unknown[];
  rooms?: unknown[];
  [key: string]: unknown;
}

export const createRoomNavigation = (options: CreateRoomNavigationParams) => {
  let updating = $state(false);
  let isNavigating = $state(false);
  let navigationMessage = $state('');
  let abortController: AbortController | null = null;
  let consecutiveSaveAndNavigateFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  const getRoomNavigation = (): RoomNavigation => {
    try {
      const selectedRooms = sessionStorage.getItem('selectedRooms');
      const currentRoomId = options.roomId;
      if (!selectedRooms || !currentRoomId)
        return { hasPrevious: false, hasNext: false, previousRoom: null, nextRoom: null };

      const roomsArray: NavigationRoom[] = JSON.parse(selectedRooms);
      const currentIndex = roomsArray.findIndex((room) => room.id === currentRoomId);

      // Find previous room that needs inspection (skip isNotNeeded rooms)
      let previousRoom: NavigationRoom | null = null;
      for (let i = currentIndex - 1; i >= 0; i--) {
        const room = roomsArray[i];
        if (room && room.isNotNeeded !== true) {
          previousRoom = room;
          break;
        }
      }

      // Find next room that needs inspection (skip isNotNeeded rooms)
      let nextRoom: NavigationRoom | null = null;
      for (let i = currentIndex + 1; i < roomsArray.length; i++) {
        const room = roomsArray[i];
        if (room && room.isNotNeeded !== true) {
          nextRoom = room;
          break;
        }
      }

      return {
        hasPrevious: previousRoom !== null,
        hasNext: nextRoom !== null,
        previousRoom: previousRoom as RoomNavigation['previousRoom'],
        nextRoom: nextRoom as RoomNavigation['nextRoom'],
      };
    } catch (_) {
      return { hasPrevious: false, hasNext: false, previousRoom: null, nextRoom: null };
    }
  };

  const updateSessionStorageCache = async (
    propId: string,
    _rId: string,
    maxRetries: number = 3
  ): Promise<void> => {
    const currentGasUrl = options.gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
    if (!currentGasUrl) return;

    // Cancel any in-flight request
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    abortController = controller;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fetchUrl = `${currentGasUrl}?action=getRooms&propertyId=${encodeURIComponent(propId)}`;
        const response = await fetch(fetchUrl, { method: 'GET', signal: controller.signal });
        if (!response.ok) {
          if (response.status === 503 && attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
            continue;
          }
          return;
        }
        const result: GasApiResponse = await response.json();
        let roomsArray: unknown[];
        if (result && result.success === true && Array.isArray(result.data)) {
          roomsArray = result.data;
        } else if (Array.isArray(result)) {
          roomsArray = result as unknown[];
        } else if (result && Array.isArray(result.rooms)) {
          roomsArray = result.rooms;
        } else {
          return;
        }
        if (roomsArray && roomsArray.length > 0) {
          sessionStorage.setItem('selectedRooms', JSON.stringify(roomsArray));
        }
        return;
      } catch (_) {
        if (controller.signal.aborted) return;
        if (attempt === maxRetries) return;
      }
    }
  };

  const saveReadings = async (
    readings: Record<string, unknown>[],
    silent: boolean = false,
    overrideRoomId?: string
  ): Promise<boolean> => {
    if (!readings || readings.length === 0) return false;

    const targetRoomId = overrideRoomId || options.roomId;

    const currentGasUrl = options.gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');

    // Use the shared abort controller for the save request
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    abortController = controller;

    try {
      if (!currentGasUrl) throw new Error('gasWebAppUrl not configured');
      if (isCurrentlySyncing()) throw new Error('sync in progress');
      const result = (await gasFetch(
        'updateMeterReadings',
        {
          propertyId: options.propertyId,
          roomId: targetRoomId,
          readings: JSON.stringify(readings),
        },
        'POST',
        controller.signal
      )) as Record<string, unknown>;

      if (result.success) {
        if (!silent) {
          options.displayToast('検針データを保存しました');
        }
        return true;
      }
      return false;
    } catch (err) {
      if (controller.signal.aborted) return false;
      // API failed — fallback to offline queue
      saveToQueue({
        action: 'updateMeterReadings',
        propertyId: options.propertyId,
        roomId: targetRoomId,
        readings,
      });
      updateSessionCacheForSavedRoom(targetRoomId);
      if (options.invalidatePrefetch) {
        options.invalidatePrefetch(options.propertyId, targetRoomId);
      }
      if (options.updateOfflineCache) {
        options.updateOfflineCache(options.propertyId, targetRoomId, readings);
      }
      if (!silent) {
        options.displayToast('オフラインで保存しました（オンライン復帰時に自動送信します）');
      }
      return true;
    }
  };

  const saveAndNavigateToRoom = async (
    targetRoomId: string,
    direction: string,
    collectReadingsFn: (() => Record<string, unknown>[]) | undefined
  ): Promise<void> => {
    try {
      updating = true;
      const meterReadingsData = collectReadingsFn ? collectReadingsFn() : [];
      const currentRoomId = options.roomId;

      const currentGasUrl = options.gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');

      const shouldTryIntegratedApi =
        currentGasUrl &&
        options.onNavigateToRoom &&
        meterReadingsData.length > 0 &&
        consecutiveSaveAndNavigateFailures < MAX_CONSECUTIVE_FAILURES;

      const targetHasPrefetch = options.hasPrefetch?.(options.propertyId, targetRoomId);

      if (shouldTryIntegratedApi && !targetHasPrefetch) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const result = (await gasFetch(
            'saveAndNavigate',
            {
              propertyId: options.propertyId,
              currentRoomId,
              targetRoomId,
              direction,
              meterReadingsData: JSON.stringify(meterReadingsData),
            },
            'POST',
            controller.signal
          )) as Record<string, unknown>;
          clearTimeout(timeoutId);

          if (result.success && result.navigationResult) {
            consecutiveSaveAndNavigateFailures = 0;
            updateSessionCacheForSavedRoom(currentRoomId);
            if (options.invalidatePrefetch) {
              options.invalidatePrefetch(options.propertyId, currentRoomId);
            }
            options.onNavigateToRoom!(
              targetRoomId,
              result.navigationResult as Record<string, unknown>
            );
            return;
          }
          consecutiveSaveAndNavigateFailures++;
        } catch {
          consecutiveSaveAndNavigateFailures++;
        }
      }

      if (options.onNavigateToRoom) {
        options.onNavigateToRoom(targetRoomId);
      } else {
        window.location.href = `/reading/?propertyId=${options.propertyId}&roomId=${targetRoomId}`;
      }

      if (meterReadingsData.length > 0) {
        saveReadings(meterReadingsData, true, currentRoomId).then((saveOk) => {
          if (saveOk) {
            updateSessionCacheForSavedRoom(currentRoomId);
            if (options.invalidatePrefetch) {
              options.invalidatePrefetch(options.propertyId, currentRoomId);
            }
          } else {
            options.displayToast('保存に失敗しました。ネットワークを確認して再試行してください。');
          }
        });
      }
    } catch (_) {
      options.displayToast('エラーが発生しました。');
      updating = false;
    }
  };

  const updateSessionCacheForSavedRoom = (currentRoomId: string): void => {
    try {
      const sessionRooms = sessionStorage.getItem('selectedRooms');
      if (sessionRooms) {
        const rooms = JSON.parse(sessionRooms);
        if (Array.isArray(rooms)) {
          const dateStr = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            month: 'long',
            day: 'numeric',
          }).format(new Date());
          const updated = rooms.map((room: Record<string, unknown>) => {
            const rid = String(room.id || room.roomId || '');
            if (rid === currentRoomId) {
              return {
                ...room,
                readingStatus: 'completed',
                isCompleted: true,
                readingDateFormatted: dateStr,
              };
            }
            return room;
          });
          sessionStorage.setItem('selectedRooms', JSON.stringify(updated));
          sessionStorage.setItem('updatedRoomId', currentRoomId);
          sessionStorage.setItem('lastUpdateTime', Date.now().toString());

          const propId = options.propertyId;
          const roomCache = localStorage.getItem('cached_rooms_' + propId);
          if (roomCache) {
            try {
              const parsed = JSON.parse(roomCache);
              if (parsed.rooms && Array.isArray(parsed.rooms)) {
                parsed.rooms = parsed.rooms.map((room: Record<string, unknown>) => {
                  const rid = String(room.id || room.roomId || '');
                  return rid === currentRoomId
                    ? {
                        ...room,
                        readingStatus: 'completed',
                        isCompleted: true,
                        readingDateFormatted: dateStr,
                      }
                    : room;
                });
                localStorage.setItem('cached_rooms_' + propId, JSON.stringify(parsed));
              }
            } catch {}
          }
        }
      }
    } catch (_) {
      // Cache update failure is non-critical
    }
  };

  const handlePreviousRoom = (
    collectReadingsFn: (() => Record<string, unknown>[]) | undefined
  ): void => {
    const nav = getRoomNavigation();
    if (!nav.hasPrevious || !nav.previousRoom) {
      options.displayToast('前の部屋がありません。');
      return;
    }
    saveAndNavigateToRoom(nav.previousRoom.id, 'prev', collectReadingsFn);
  };

  const handleNextRoom = (
    collectReadingsFn: (() => Record<string, unknown>[]) | undefined
  ): void => {
    const nav = getRoomNavigation();
    if (!nav.hasNext || !nav.nextRoom) {
      options.displayToast('次の部屋がありません。');
      return;
    }
    saveAndNavigateToRoom(nav.nextRoom.id, 'next', collectReadingsFn);
  };

  const handleBackButton = async (
    propId: string,
    rId: string,
    wasSaved: boolean = false
  ): Promise<void> => {
    try {
      isNavigating = true;
      navigationMessage = '画面を切り替えています...';
      window.scrollTo(0, 0);

      // Only set protection flags and optimistic update when data was actually saved
      if (wasSaved) {
        sessionStorage.setItem('updatedRoomId', rId);
        sessionStorage.setItem('lastUpdateTime', Date.now().toString());

        const sessionRooms = sessionStorage.getItem('selectedRooms');
        if (sessionRooms) {
          try {
            const rooms = JSON.parse(sessionRooms);
            if (Array.isArray(rooms)) {
              const today = new Date();
              const dateStr = new Intl.DateTimeFormat('ja-JP', {
                timeZone: 'Asia/Tokyo',
                month: 'long',
                day: 'numeric',
              }).format(today);
              const updated = rooms.map((room: Record<string, unknown>) => {
                const roomIdentifier = String(room.id || room.roomId || '');
                if (roomIdentifier === rId) {
                  return {
                    ...room,
                    readingStatus: 'completed',
                    isCompleted: true,
                    readingDateFormatted: dateStr,
                  };
                }
                return room;
              });
              sessionStorage.setItem('selectedRooms', JSON.stringify(updated));
            }
          } catch (_) {
            // Navigation proceeds even if cache update fails
          }
        }
      }

      window.location.href = `/room/?propertyId=${encodeURIComponent(propId)}`;
    } catch (_) {
      window.location.href = propId
        ? `/room/?propertyId=${encodeURIComponent(propId)}`
        : '/property/';
    }
  };

  /** Abort any in-flight requests. Call this when the component unmounts. */
  const destroy = (): void => {
    if (abortController) {
      abortController.abort();
    }
  };

  return {
    get updating() {
      return updating;
    },
    set updating(value: boolean) {
      updating = value;
    },
    get isNavigating() {
      return isNavigating;
    },
    set isNavigating(value: boolean) {
      isNavigating = value;
    },
    get navigationMessage() {
      return navigationMessage;
    },
    getRoomNavigation,
    handlePreviousRoom,
    handleNextRoom,
    handleBackButton,
    updateSessionStorageCache,
    saveReadings,
    destroy,
  };
};
