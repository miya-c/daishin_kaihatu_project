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

  const performSPANavigation = useCallback(async (targetRoomId, navigationResult) => {
    try {
      const newUrl = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
      window.history.pushState(
        { propertyId, roomId: targetRoomId },
        `検針 - ${navigationResult?.propertyName || ''} ${navigationResult?.roomName || ''}`,
        newUrl
      );

      if (navigationResult?.readings && navigationResult.readings.length > 0) {
        const mappedReadings = navigationResult.readings.map((reading, index) => ({
          id: `${targetRoomId}-${reading.date || reading['検針日時'] || index}`,
          date: reading.date || reading['検針日時'] || '',
          currentReading: reading.currentReading || reading['今回指示数'] || reading['今回の指示数'] || '',
          previousReading: reading.previousReading || reading['前回指示数'] || '',
          previousPreviousReading: reading.previousPreviousReading || reading['前々回指示数'] || '',
          threeTimesPrevious: reading.threeTimesPreviousReading || reading['前々々回指示数'] || '',
          warningFlag: reading.warningFlag || reading['警告フラグ'] || '正常',
          standardDeviation: reading.standardDeviation || reading['標準偏差値'] || '',
          usage: reading.usage || reading['今回使用量'] || 0
        }));
        setMeterReadings(mappedReadings);
      } else {
        setMeterReadings([]);
      }

      // Update session storage
      try {
        const selectedRooms = sessionStorage.getItem('selectedRooms');
        if (selectedRooms) {
          const roomsArray = JSON.parse(selectedRooms);
          const targetRoom = roomsArray.find(room => room.id === targetRoomId);
          if (targetRoom) {
            sessionStorage.setItem('currentRoom', JSON.stringify(targetRoom));
          }
        }
      } catch (storageErr) {
        // Continue
      }

      // Reset UI state
      const focusedElement = document.activeElement;
      if (focusedElement && focusedElement.tagName === 'INPUT') {
        focusedElement.blur();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setUpdating(false);

    } catch (err) {
      window.location.href = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
    }
  }, [propertyId, setMeterReadings]);

  const saveAndNavigateToRoom = useCallback(async (targetRoomId, direction, collectReadingsFn) => {
    try {
      setUpdating(true);
      const meterReadingsData = collectReadingsFn ? collectReadingsFn() : [];
      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');

      // Save readings via updateMeterReadings if there are changes
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
          if (saveResult.success && saveResult.updatedCount > 0) {
            displayToast(`${saveResult.updatedCount}件のデータを保存しました`);
          }
        }
      }

      // Navigate to target room
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
