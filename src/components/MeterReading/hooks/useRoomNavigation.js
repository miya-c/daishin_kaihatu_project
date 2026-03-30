import { useState, useCallback } from 'react';
import { getCurrentJSTDateString } from '../utils/dateUtils';

export const useRoomNavigation = ({
  propertyId, roomId, gasWebAppUrl, meterReadings, setMeterReadings, displayToast
}) => {
  const [updating, setUpdating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState('');

  const getRoomNavigation = useCallback(() => {
    try {
      const selectedRooms = sessionStorage.getItem('selectedRooms');
      if (!selectedRooms || !roomId) return { hasPrevious: false, hasNext: false };

      const roomsArray = JSON.parse(selectedRooms);
      const currentIndex = roomsArray.findIndex(room => room.id === roomId);

      return {
        hasPrevious: currentIndex > 0,
        hasNext: currentIndex >= 0 && currentIndex < roomsArray.length - 1,
        previousRoom: currentIndex > 0 ? roomsArray[currentIndex - 1] : null,
        nextRoom: currentIndex >= 0 && currentIndex < roomsArray.length - 1 ? roomsArray[currentIndex + 1] : null
      };
    } catch (err) {
      return { hasPrevious: false, hasNext: false };
    }
  }, [roomId]);

  const updateSessionStorageCache = useCallback(async (propId, rId, maxRetries = 3) => {
    const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
    if (!currentGasUrl) return;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fetchUrl = `${currentGasUrl}?action=getRooms&propertyId=${encodeURIComponent(propId)}`;
        const response = await fetch(fetchUrl, { method: 'GET' });
        if (!response.ok) {
          if (response.status === 503 && attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
            continue;
          }
          return;
        }
        const result = await response.json();
        let roomsArray;
        if (result && result.success === true && Array.isArray(result.data)) {
          roomsArray = result.data;
        } else if (Array.isArray(result)) {
          roomsArray = result;
        } else if (result && Array.isArray(result.rooms)) {
          roomsArray = result.rooms;
        } else {
          return;
        }
        if (roomsArray && roomsArray.length > 0) {
          sessionStorage.setItem('selectedRooms', JSON.stringify(roomsArray));
        }
        return;
      } catch (err) {
        if (attempt === maxRetries) return;
      }
    }
  }, [gasWebAppUrl]);

  const saveAndNavigateToRoom = useCallback(async (targetRoomId, direction, collectReadingsFn) => {
    try {
      setUpdating(true);
      const meterReadingsData = collectReadingsFn ? collectReadingsFn() : [];
      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');

      // Save readings using the same format as handleUpdateReadings
      if (meterReadingsData && meterReadingsData.length > 0) {
        const params = new URLSearchParams({
          action: 'updateMeterReadings',
          propertyId: propertyId,
          roomId: roomId,
          readings: JSON.stringify(meterReadingsData)
        });

        const saveResponse = await fetch(`${currentGasUrl}?${params}`, { method: 'GET' });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            displayToast('検針データを保存しました');
          }
        }
      }

      // Navigate to target room after save completes
      window.location.href = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
    } catch (err) {
      // Fallback: navigate even if save fails
      window.location.href = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
    } finally {
      setUpdating(false);
    }
  }, [propertyId, roomId, gasWebAppUrl, displayToast]);

  const handlePreviousRoom = useCallback((collectReadingsFn) => {
    const navigation = getRoomNavigation();
    if (!navigation.hasPrevious || !navigation.previousRoom) {
      displayToast('前の部屋がありません。');
      return;
    }
    saveAndNavigateToRoom(navigation.previousRoom.id, 'prev', collectReadingsFn);
  }, [getRoomNavigation, saveAndNavigateToRoom, displayToast]);

  const handleNextRoom = useCallback((collectReadingsFn) => {
    const navigation = getRoomNavigation();
    if (!navigation.hasNext || !navigation.nextRoom) {
      displayToast('次の部屋がありません。');
      return;
    }
    saveAndNavigateToRoom(navigation.nextRoom.id, 'next', collectReadingsFn);
  }, [getRoomNavigation, saveAndNavigateToRoom, displayToast]);

  const handleBackButton = useCallback(async (propId, rId) => {
    try {
      setIsNavigating(true);
      setNavigationMessage('画面を切り替えています...');
      await updateSessionStorageCache(propId, rId);
      window.scrollTo(0, 0);
      sessionStorage.setItem('forceRefreshRooms', 'true');
      sessionStorage.setItem('updatedRoomId', rId);
      sessionStorage.setItem('lastUpdateTime', Date.now().toString());
      window.location.href = `/room/?propertyId=${encodeURIComponent(propId)}`;
    } catch (err) {
      window.location.href = propId ? `/room/?propertyId=${encodeURIComponent(propId)}` : '/property/';
    }
  }, [updateSessionStorageCache]);

  return {
    updating, isNavigating, navigationMessage,
    setUpdating, setIsNavigating,
    getRoomNavigation, handlePreviousRoom, handleNextRoom, handleBackButton,
    updateSessionStorageCache,
  };
};
