import { useState, useCallback } from 'react';

import type { MeterReading, RoomNavigation } from '../../../types';

interface UseRoomNavigationParams {
  propertyId: string;
  roomId: string;
  gasWebAppUrl: string;
  _meterReadings: MeterReading[];
  _setMeterReadings: React.Dispatch<React.SetStateAction<MeterReading[]>>;
  displayToast: (message: string) => void;
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

export const useRoomNavigation = ({
  propertyId,
  roomId,
  gasWebAppUrl,
  displayToast,
}: Omit<UseRoomNavigationParams, '_meterReadings' | '_setMeterReadings'>) => {
  const [updating, setUpdating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState('');

  const getRoomNavigation = useCallback((): RoomNavigation => {
    try {
      const selectedRooms = sessionStorage.getItem('selectedRooms');
      if (!selectedRooms || !roomId) return { hasPrevious: false, hasNext: false, previousRoom: null, nextRoom: null };

      const roomsArray: NavigationRoom[] = JSON.parse(selectedRooms);
      const currentIndex = roomsArray.findIndex((room) => room.id === roomId);

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
  }, [roomId]);

  const updateSessionStorageCache = useCallback(
    async (propId: string, _rId: string, maxRetries: number = 3): Promise<void> => {
      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
      if (!currentGasUrl) return;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const fetchUrl = `${currentGasUrl}?action=getRooms&propertyId=${encodeURIComponent(propId)}`;
          const response = await fetch(fetchUrl, { method: 'GET' });
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
          if (attempt === maxRetries) return;
        }
      }
    },
    [gasWebAppUrl]
  );

  const saveReadings = useCallback(
    async (readings: Record<string, unknown>[]): Promise<boolean> => {
      if (!readings || readings.length === 0) return false;

      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
      if (!currentGasUrl) return false;

      try {
        const params = new URLSearchParams({
          action: 'updateMeterReadings',
          propertyId: propertyId,
          roomId: roomId,
          readings: JSON.stringify(readings),
        });

        const response = await fetch(`${currentGasUrl}?${params}`, { method: 'GET' });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            displayToast('検針データを保存しました');
            return true;
          }
        }
        return false;
      } catch (_) {
        return false;
      }
    },
    [propertyId, roomId, gasWebAppUrl, displayToast]
  );

  const saveAndNavigateToRoom = useCallback(
    async (targetRoomId: string, _direction: string, collectReadingsFn: (() => Record<string, unknown>[]) | undefined): Promise<void> => {
      try {
        setUpdating(true);
        const meterReadingsData = collectReadingsFn ? collectReadingsFn() : [];
        await saveReadings(meterReadingsData);

        // Navigate to target room after save completes
        window.location.href = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
      } catch (_) {
        // Fallback: navigate even if save fails
        window.location.href = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
      } finally {
        setUpdating(false);
      }
    },
    [propertyId, saveReadings]
  );

  const handlePreviousRoom = useCallback(
    (collectReadingsFn: (() => Record<string, unknown>[]) | undefined) => {
      const navigation = getRoomNavigation();
      if (!navigation.hasPrevious || !navigation.previousRoom) {
        displayToast('前の部屋がありません。');
        return;
      }
      saveAndNavigateToRoom(navigation.previousRoom.id, 'prev', collectReadingsFn);
    },
    [getRoomNavigation, saveAndNavigateToRoom, displayToast]
  );

  const handleNextRoom = useCallback(
    (collectReadingsFn: (() => Record<string, unknown>[]) | undefined) => {
      const navigation = getRoomNavigation();
      if (!navigation.hasNext || !navigation.nextRoom) {
        displayToast('次の部屋がありません。');
        return;
      }
      saveAndNavigateToRoom(navigation.nextRoom.id, 'next', collectReadingsFn);
    },
    [getRoomNavigation, saveAndNavigateToRoom, displayToast]
  );

  const handleBackButton = useCallback(
    async (propId: string, rId: string): Promise<void> => {
      try {
        setIsNavigating(true);
        setNavigationMessage('画面を切り替えています...');
        await updateSessionStorageCache(propId, rId);
        window.scrollTo(0, 0);
        sessionStorage.setItem('forceRefreshRooms', 'true');
        sessionStorage.setItem('updatedRoomId', rId);
        sessionStorage.setItem('lastUpdateTime', Date.now().toString());
        window.location.href = `/room/?propertyId=${encodeURIComponent(propId)}`;
      } catch (_) {
        window.location.href = propId
          ? `/room/?propertyId=${encodeURIComponent(propId)}`
          : '/property/';
      }
    },
    [updateSessionStorageCache]
  );

  return {
    updating,
    isNavigating,
    navigationMessage,
    setUpdating,
    setIsNavigating,
    getRoomNavigation,
    handlePreviousRoom,
    handleNextRoom,
    handleBackButton,
    updateSessionStorageCache,
    saveReadings,
  };
};
