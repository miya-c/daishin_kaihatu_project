import React, { useState, useEffect, useCallback } from 'react';
import { formatDateForDisplay, getCurrentJSTDateString } from './utils/dateUtils';
import { formatReading, formatStatus, formatInspectionStatus, calculateUsageDisplay } from './utils/formatUtils';
import { calculateWarningFlag, getStatusDisplay, getStandardDeviationDisplay } from './utils/warningFlag';
import { getGasUrl } from '../../utils/gasClient';

const MeterReadingApp = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertyId, setPropertyId] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [meterReadings, setMeterReadings] = useState([]);

  const [updating, setUpdating] = useState(false);
  const [usageStates, setUsageStates] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [inputErrors, setInputErrors] = useState({});
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState('');

  const [gasWebAppUrl, setGasWebAppUrl] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const urlFromSession = sessionStorage.getItem('gasWebAppUrl');

        if (!urlFromSession) {
          setError('アプリのURLが設定されていません。物件選択画面から再度アクセスしてください。');
          setLoading(false);
          return;
        }

        setGasWebAppUrl(urlFromSession);
        loadUrlParams();
      } catch (err) {
        setError('アプリの起動に失敗しました。ページを再読み込みしてください。');
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Browser history management for SPA navigation
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.roomId && event.state.propertyId) {
        loadRoomDataForSPA(event.state.propertyId, event.state.roomId);
      } else {
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const displayToast = useCallback((message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setToastMessage('');
    }, 3000);
  }, []);

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

  const loadRoomDataForSPA = async (propId, rId) => {
    try {
      setUpdating(true);

      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
      const fetchUrl = `${currentGasUrl}?action=getMeterReadings&propertyId=${propId}&roomId=${rId}`;
      const response = await fetch(fetchUrl);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();

      if (result.success && result.data) {
        setPropertyId(propId);
        setRoomId(rId);
        setPropertyName(result.data.propertyName || '');
        setRoomName(result.data.roomName || '');

        if (result.data.readings && result.data.readings.length > 0) {
          const mappedReadings = mapNavigationReadingsData(rId, result.data.readings);
          setMeterReadings(mappedReadings);
        } else {
          setMeterReadings([]);
        }

        setUsageStates({});
        setInputErrors({});
      } else {
        throw new Error('データ読み込み失敗');
      }
    } catch (err) {
      window.location.reload();
    } finally {
      setUpdating(false);
    }
  };

  const loadUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('propertyId');
    const rId = urlParams.get('roomId');

    if (!propId || !rId) {
      setError('物件情報または部屋情報が不足しているため、検針データを取得できません。');
      setLoading(false);
      return;
    }

    loadMeterReadings(propId, rId);
  };

  const loadMeterReadings = async (propId, rId, maxRetries = 3) => {
    const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
    if (!currentGasUrl) {
      setError('gasWebAppURLが設定されていません。物件選択画面から再度アクセスしてください。');
      setLoading(false);
      return;
    }

    let showLoading = false;
    const loadingTimeout = setTimeout(() => {
      showLoading = true;
      setLoading(true);
    }, 300);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fetchUrl = `${currentGasUrl}?action=getMeterReadings&propertyId=${propId}&roomId=${rId}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
          if (response.status === 503 && attempt < maxRetries) {
            const delayMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          throw new Error('ネットワークの応答が正しくありませんでした。ステータス: ' + response.status);
        }

        const responseObject = await response.json();

        if (!responseObject.success) {
          throw new Error(responseObject.error || '検針データの取得に失敗しました');
        }

        const data = responseObject.data;
        if (!data) {
          throw new Error('応答データが空です');
        }

        let pName, rName, readings;

        if (data.hasOwnProperty('propertyName') && data.hasOwnProperty('roomName') && data.hasOwnProperty('readings')) {
          pName = data.propertyName || 'N/A';
          rName = data.roomName || '部屋名不明';
          readings = data.readings || [];
        } else if (Array.isArray(data)) {
          if (data.length > 0 && data[0]) {
            const firstRecord = data[0];
            pName = firstRecord['物件名'] || firstRecord.propertyName || 'N/A';
            rName = firstRecord['部屋名'] || firstRecord.roomName || '部屋名不明';
          } else {
            pName = 'N/A';
            rName = '部屋名不明';
          }
          readings = data;
        } else {
          throw new Error('検針データの形式が認識できません');
        }

        setPropertyId(propId || 'N/A');
        setPropertyName(pName);
        setRoomId(rId || 'N/A');
        setRoomName(rName);

        if (Array.isArray(readings) && readings.length > 0) {
          const mappedReadings = readings.map((rawReading, index) => {
            const mapped = {
              id: rawReading['記録ID'] || rawReading['recordId'] || rawReading['ID'] || `reading-${index}`,
              date: rawReading['検針日時'] || rawReading['date'] || rawReading['記録日'] || '',
              currentReading: rawReading['今回の指示数'] || rawReading['今回指示数'] || rawReading['今回指示数（水道）'] || rawReading['currentReading'] || rawReading['指示数'] || '',
              previousReading: rawReading['前回指示数'] || rawReading['previousReading'] || rawReading['前回'] || '',
              previousPreviousReading: rawReading['前々回指示数'] || rawReading['previousPreviousReading'] || rawReading['前々回'] || '',
              threeTimesPrevious: rawReading['前々々回指示数'] || rawReading['threeTimesPrevious'] || rawReading['前々々回'] || '',
              usage: rawReading['今回使用量'] || rawReading['usage'] || rawReading['使用量'] || '',
              warningFlag: rawReading['警告フラグ'] || rawReading['warningFlag'] || '正常',
              standardDeviation: rawReading['標準偏差値'] || rawReading['standardDeviation'] || '',
              status: rawReading['警告フラグ'] || rawReading['status'] || rawReading['状態'] || '正常',
              recordId: rawReading['記録ID'] || rawReading['recordId'] || rawReading['ID'] || '',
              propertyId: rawReading['物件ID'] || rawReading['propertyId'] || '',
              roomId: rawReading['部屋ID'] || rawReading['roomId'] || '',
              propertyName: rawReading['物件名'] || rawReading['propertyName'] || '',
              roomName: rawReading['部屋名'] || rawReading['roomName'] || '',
              _original: rawReading
            };

            // Frontend warning flag calculation takes priority
            if (mapped.currentReading && mapped.previousReading) {
              const warningResult = calculateWarningFlag(
                parseFloat(mapped.currentReading),
                parseFloat(mapped.previousReading),
                parseFloat(mapped.previousPreviousReading),
                parseFloat(mapped.threeTimesPrevious)
              );
              mapped.warningFlag = warningResult.warningFlag;
              mapped.standardDeviation = warningResult.standardDeviation;
            } else if (!mapped.currentReading || mapped.currentReading === '') {
              const thresholdResult = calculateWarningFlag(
                null,
                parseFloat(mapped.previousReading),
                parseFloat(mapped.previousPreviousReading),
                parseFloat(mapped.threeTimesPrevious)
              );
              mapped.warningFlag = thresholdResult.warningFlag;
              mapped.standardDeviation = thresholdResult.standardDeviation;
            }

            return mapped;
          });

          setMeterReadings(mappedReadings);
        } else {
          setMeterReadings([]);
        }

        clearTimeout(loadingTimeout);
        if (showLoading) {
          setLoading(false);
        }
        return;

      } catch (err) {
        if (attempt === maxRetries) {
          let userMessage = '検針データの読み込みに失敗しました。';
          if (err.message.includes('503')) {
            userMessage = 'サーバーが一時的に利用できません。しばらく待ってから再度お試しください。';
          } else if (err.message.includes('network') || err.message.includes('fetch')) {
            userMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
          } else if (err.message.includes('timeout')) {
            userMessage = '通信がタイムアウトしました。しばらく待ってから再度お試しください。';
          }

          setError(userMessage + '\n\n問題が継続する場合は、管理者にお問い合わせください。');
          clearTimeout(loadingTimeout);
          if (showLoading) {
            setLoading(false);
          }
          return;
        }
      }
    }
  };

  const updateSessionStorageCache = async (propId, rId, maxRetries = 3) => {
    const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
    if (!currentGasUrl) return;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fetchUrl = `${currentGasUrl}?action=getRooms&propertyId=${encodeURIComponent(propId)}`;
        const response = await fetch(fetchUrl, { method: 'GET' });

        if (!response.ok) {
          if (response.status === 503 && attempt < maxRetries) {
            const delayMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delayMs));
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
  };

  const handleBackButton = async () => {
    try {
      setIsNavigating(true);
      setNavigationMessage('画面を切り替えています...');

      try {
        await updateSessionStorageCache(propertyId, roomId);
      } catch (cacheError) {
        // Continue even if cache update fails
      }

      window.scrollTo(0, 0);

      sessionStorage.setItem('forceRefreshRooms', 'true');
      sessionStorage.setItem('updatedRoomId', roomId);
      sessionStorage.setItem('lastUpdateTime', Date.now().toString());

      const backUrl = `/room/?propertyId=${encodeURIComponent(propertyId)}`;
      window.location.href = backUrl;

    } catch (err) {
      const fallbackUrl = propertyId
        ? `/room/?propertyId=${encodeURIComponent(propertyId)}`
        : '/property/';
      window.location.href = fallbackUrl;
    }
  };

  const handleUpdateReadings = async () => {
    if (!propertyId || !roomId) {
      displayToast('物件IDまたは部屋IDが取得できませんでした。');
      return;
    }

    const numberInputs = document.querySelectorAll('input[data-date]');
    const updatedReadings = [];
    let hasValidationErrors = false;

    numberInputs.forEach(input => {
      const date = input.getAttribute('data-date');
      const originalValue = input.getAttribute('data-original-value') || '';
      const currentValue = input.value || '';

      input.style.borderColor = '';
      setInputErrors(prev => ({ ...prev, [date]: '' }));

      if (originalValue === '' && currentValue.trim() === '') {
        input.style.borderColor = 'var(--mantine-color-red-6)';
        setInputErrors(prev => ({ ...prev, [date]: '初回検針では指示数の入力が必須です。' }));
        hasValidationErrors = true;
        return;
      }

      if (currentValue !== originalValue) {
        const numericValue = parseFloat(currentValue);
        if (currentValue && (isNaN(numericValue) || numericValue < 0)) {
          input.style.borderColor = 'var(--mantine-color-red-6)';
          setInputErrors(prev => ({ ...prev, [date]: '指示数は0以上の数値を入力してください。' }));
          hasValidationErrors = true;
          return;
        }

        const inspectionDate = getCurrentJSTDateString();

        // Get displayed warning flag from DOM for data integrity
        const statusCell = document.querySelector(`tr:has(input[data-date="${date}"]) td[data-label="状態"] span`);
        const displayedWarningFlag = statusCell ? statusCell.textContent.trim() : '正常';

        updatedReadings.push({
          date: inspectionDate,
          currentReading: currentValue,
          warningFlag: displayedWarningFlag
        });
      }
    });

    if (hasValidationErrors) {
      displayToast('入力値に誤りがあります。各項目のエラーを確認してください。');
      return;
    }

    if (updatedReadings.length === 0) {
      displayToast('更新するデータがありません。');
      return;
    }

    setUpdating(true);

    try {
      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');

      const params = new URLSearchParams({
        action: 'updateMeterReadings',
        propertyId,
        roomId,
        readings: JSON.stringify(updatedReadings)
      });

      const requestUrl = `${currentGasUrl}?${params}`;

      const [response, cacheUpdateResult] = await Promise.allSettled([
        fetch(requestUrl, { method: 'GET' }),
        updateSessionStorageCache(propertyId, roomId)
      ]);

      if (response.status === 'rejected') {
        throw new Error('ネットワークエラー: ' + response.reason?.message);
      }

      if (!response.value.ok) {
        throw new Error('ネットワークの応答が正しくありませんでした。ステータス: ' + response.value.status);
      }

      const result = await response.value.json();

      if (result.success) {
        displayToast('検針データが正常に更新されました');
        setInputErrors({});

        const [dataReloadResult] = await Promise.allSettled([
          loadMeterReadings(propertyId, roomId)
        ]);

        if (dataReloadResult.status === 'rejected') {
          displayToast('データが更新されました。最新情報を確認するにはページを再読み込みしてください。');
        }
      } else {
        throw new Error(result.error || '指示数の更新に失敗しました。');
      }
    } catch (err) {
      displayToast('更新エラー: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const collectCurrentMeterReadings = () => {
    const numberInputs = document.querySelectorAll('input[data-date]');
    const readings = [];

    numberInputs.forEach(input => {
      const date = input.getAttribute('data-date');
      const currentValue = input.value || '';
      const originalValue = input.getAttribute('data-original-value') || '';

      if (currentValue !== originalValue && currentValue.trim() !== '') {
        const numericValue = parseFloat(currentValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          readings.push({
            date: date,
            currentReading: currentValue,
            warningFlag: '正常'
          });
        }
      }
    });

    return readings;
  };

  const saveAndNavigateToRoom = async (targetRoomId, direction) => {
    try {
      setUpdating(true);

      const meterReadingsData = collectCurrentMeterReadings();

      const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');

      const requestData = {
        action: 'saveAndNavigate',
        propertyId: propertyId,
        currentRoomId: roomId,
        targetRoomId: targetRoomId,
        direction: direction,
        meterReadingsData: JSON.stringify(meterReadingsData),
        timeout: 30000
      };

      const response = await fetch(currentGasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        await handleSuccessfulNavigation(result, targetRoomId);
      } else {
        // Fallback: save then navigate
        await handleUpdateReadings();
        window.location.href = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
      }

    } catch (err) {
      // Fallback: save then navigate
      try {
        await handleUpdateReadings();
        window.location.href = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
      } catch (fallbackErr) {
        displayToast('処理に失敗しました。ページを再読み込みしてください。');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleSuccessfulNavigation = async (result, targetRoomId) => {
    const { navigationResult } = result;

    if (result.saveResult && result.saveResult.updatedCount > 0) {
      displayToast(`${result.saveResult.updatedCount}件のデータを保存しました`);
    }

    await performSPANavigation(targetRoomId, navigationResult);
  };

  const mapNavigationReadingsData = (targetRoomId, readings) => {
    return readings.map((reading, index) => ({
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
  };

  const performSPANavigation = async (targetRoomId, navigationResult) => {
    try {
      const newUrl = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
      window.history.pushState(
        { propertyId, roomId: targetRoomId },
        `検針 - ${navigationResult?.propertyName || ''} ${navigationResult?.roomName || ''}`,
        newUrl
      );

      setRoomId(targetRoomId);
      setPropertyName(navigationResult?.propertyName || propertyName);
      setRoomName(navigationResult?.roomName || '部屋名不明');

      if (navigationResult?.readings && navigationResult.readings.length > 0) {
        const mappedReadings = mapNavigationReadingsData(targetRoomId, navigationResult.readings);
        setMeterReadings(mappedReadings);
      } else {
        setMeterReadings([]);
      }

      setUsageStates({});
      setInputErrors({});

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
        document.title = `検針 - ${navigationResult?.propertyName || propertyName} ${navigationResult?.roomName || '部屋名不明'}`;
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
      const fallbackUrl = `/reading/?propertyId=${propertyId}&roomId=${targetRoomId}`;
      window.location.href = fallbackUrl;
    }
  };

  const handlePreviousRoom = async () => {
    try {
      const navigation = getRoomNavigation();
      if (!navigation.hasPrevious || !navigation.previousRoom) {
        displayToast('前の部屋がありません。');
        return;
      }
      await saveAndNavigateToRoom(navigation.previousRoom.id, 'prev');
    } catch (err) {
      displayToast('前の部屋への移動中にエラーが発生しました。');
    }
  };

  const handleNextRoom = async () => {
    try {
      const navigation = getRoomNavigation();
      if (!navigation.hasNext || !navigation.nextRoom) {
        displayToast('次の部屋がありません。');
        return;
      }
      await saveAndNavigateToRoom(navigation.nextRoom.id, 'next');
    } catch (err) {
      displayToast('次の部屋への移動中にエラーが発生しました。');
    }
  };

  const getPreviousReadingsText = (r) => {
    let parts = [];
    if (r.previousReading && r.previousReading !== 'N/A') {
      let text = `前回: ${r.previousReading}`;
      if (r.previousPreviousReading && r.previousPreviousReading !== 'N/A') {
        const prev = parseFloat(r.previousReading);
        const prevPrev = parseFloat(r.previousPreviousReading);
        if (!isNaN(prev) && !isNaN(prevPrev)) {
          const diff = prev - prevPrev;
          text += ` [${diff >= 0 ? '+' : ''}${diff}]`;
        }
      }
      parts.push(text);
    }
    if (r.previousPreviousReading && r.previousPreviousReading !== 'N/A') {
      let text = `前々回: ${r.previousPreviousReading}`;
      if (r.threeTimesPrevious && r.threeTimesPrevious !== 'N/A') {
        const prevPrev = parseFloat(r.previousPreviousReading);
        const prevPrevPrev = parseFloat(r.threeTimesPrevious);
        if (!isNaN(prevPrev) && !isNaN(prevPrevPrev)) {
          const diff = prevPrev - prevPrevPrev;
          text += ` [${diff >= 0 ? '+' : ''}${diff}]`;
        }
      }
      parts.push(text);
    }
    if (r.threeTimesPrevious && r.threeTimesPrevious !== 'N/A') {
      parts.push(`前々々回: ${r.threeTimesPrevious}`);
    }
    return parts;
  };

  // Loading state
  if (loading) {
    return (
      <>
        <div className="app-header">
          <button onClick={handleBackButton} className="back-button" aria-label="戻る">
            &lt;
          </button>
          <h1 className="header-title">検針情報</h1>
        </div>
        <div className="content-area mantine-container">
          <div className="mantine-stack center">
            <div className="mantine-loader"></div>
            <p className="mantine-text">検針データを読み込んでいます...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <div className="app-header">
          <button onClick={handleBackButton} className="back-button" aria-label="戻る">
            &lt;
          </button>
          <h1 className="header-title">検針情報</h1>
        </div>
        <div className="content-area mantine-container">
          <div className="mantine-stack">
            <div className="mantine-alert">
              <h3 className="mantine-text weight-600">エラー</h3>
              <p className="mantine-text">{String(error || 'エラーが発生しました')}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Main content
  return (
    <>
      {isNavigating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50000,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{
            marginTop: '16px',
            color: '#666',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            {navigationMessage}
          </p>
        </div>
      )}
      <div className="app-header">
        <button onClick={handleBackButton} className="back-button" aria-label="戻る">
          &lt;
        </button>
        <h1 className="header-title">検針情報</h1>
      </div>

      <div className="content-area mantine-container">
        <div className="mantine-stack">
          <div className="property-info-card">
            <h2 className="property-name">{String(propertyName || '物件名未設定')}</h2>
            <p className="room-info">部屋: {String(roomName || '部屋名未設定')}</p>
          </div>
          <div className="mantine-paper reading-history-container" style={{ padding: 'var(--mantine-spacing-xs)', margin: '0' }}>
            <div className="reading-history-header">
              <button
                className={`nav-button nav-button-large prev-room-btn ${!getRoomNavigation().hasPrevious ? 'disabled' : ''}`}
                disabled={!getRoomNavigation().hasPrevious || updating}
                onClick={handlePreviousRoom}
                aria-label="前の部屋に移動"
                title={getRoomNavigation().hasPrevious ? '前の部屋に移動（データを保存してから移動します）' : '前の部屋がありません'}
              >
                ← 前の部屋
              </button>

              <h3 className="mantine-subtitle desktop-only" style={{ textAlign: 'center', margin: '0', fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', flexShrink: 0, whiteSpace: 'nowrap' }}>検針データ</h3>

              <button
                className={`nav-button nav-button-large next-room-btn ${!getRoomNavigation().hasNext ? 'disabled' : ''}`}
                disabled={!getRoomNavigation().hasNext || updating}
                onClick={handleNextRoom}
                aria-label="次の部屋に移動"
                title={getRoomNavigation().hasNext ? '次の部屋に移動（データを保存してから移動します）' : '次の部屋がありません'}
              >
                次の部屋 →
              </button>
            </div>

            {Array.isArray(meterReadings) && meterReadings.length > 0 &&
              meterReadings.some(reading => reading.previousReading && reading.previousReading !== '' && reading.previousReading !== 0) ? (
              <>
                <table className="mantine-table">
                  <thead style={{ display: 'none' }}>
                    <tr>
                      <th>検針日時</th>
                      <th>今回指示数(㎥)</th>
                      <th>今回使用量</th>
                      <th>状態</th>
                      <th>前回履歴</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meterReadings
                      .filter(reading => reading.previousReading && reading.previousReading !== '' && reading.previousReading !== 0)
                      .map((reading, index) => {
                        const formattedDate = formatDateForDisplay(reading.date);
                        const inspectionStatus = formatInspectionStatus(reading.date);
                        const dateForDataAttribute = reading.date;
                        const currentReadingDisplay = formatReading(reading.currentReading);

                        const usageToDisplay = usageStates[dateForDataAttribute] !== undefined
                          ? usageStates[dateForDataAttribute]
                          : calculateUsageDisplay(reading.currentReading, reading.previousReading);

                        const usageDisplayString = `${usageToDisplay}${usageToDisplay !== '-' ? '㎥' : ''}`;
                        const previousReadingsInfo = getPreviousReadingsText(reading);

                        return (
                          <tr key={index}>
                            <td data-label="検針日時">
                              <span style={{
                                color: inspectionStatus.status === '未検針' ? 'var(--mantine-color-red-6)' : 'inherit',
                                fontWeight: inspectionStatus.status === '未検針' ? 'bold' : 'normal'
                              }}>
                                最終検針日時: {inspectionStatus.status === '未検針' ? '未検針' : inspectionStatus.displayDate}
                              </span>
                            </td>
                            <td data-label="今回指示数(㎥)">
                              <input
                                type="number"
                                step="any"
                                defaultValue={currentReadingDisplay}
                                placeholder="指示数入力"
                                min="0"
                                data-date={dateForDataAttribute}
                                data-original-value={formatReading(reading.currentReading)}
                                data-previous-reading={formatReading(reading.previousReading)}
                                className="mantine-input"
                                onChange={(e) => {
                                  const currentValue = e.target.value;
                                  const previousValue = formatReading(reading.previousReading);
                                  const numericValue = parseFloat(currentValue);

                                  if (currentValue === '') {
                                    setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '' }));
                                    e.target.style.borderColor = '';
                                    setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: calculateUsageDisplay(currentValue, previousValue) }));
                                  } else if (isNaN(numericValue) || numericValue < 0) {
                                    setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '0以上の数値を入力' }));
                                    e.target.style.borderColor = 'var(--mantine-color-red-6)';
                                    setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: '-' }));
                                  } else {
                                    setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '' }));
                                    e.target.style.borderColor = '';

                                    const usageDisplay = calculateUsageDisplay(currentValue, previousValue);
                                    setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: usageDisplay }));

                                    // Real-time warning flag calculation
                                    const previousReadingValue = parseFloat(reading.previousReading) || 0;
                                    const previousPreviousReadingValue = parseFloat(reading.previousPreviousReading) || 0;
                                    const threeTimesPreviousReadingValue = parseFloat(reading.threeTimesPrevious) || 0;

                                    const warningResult = calculateWarningFlag(numericValue, previousReadingValue, previousPreviousReadingValue, threeTimesPreviousReadingValue);

                                    setMeterReadings(prevReadings =>
                                      prevReadings.map((r, idx) =>
                                        idx === index ? {
                                          ...r,
                                          warningFlag: warningResult.warningFlag,
                                          standardDeviation: warningResult.standardDeviation
                                        } : r
                                      )
                                    );
                                  }
                                }}
                              />
                              {inputErrors[dateForDataAttribute] && (
                                <div style={{
                                  color: 'var(--mantine-color-red-6)',
                                  fontSize: '0.9em',
                                  marginTop: '4px'
                                }}>
                                  {inputErrors[dateForDataAttribute]}
                                </div>
                              )}
                            </td>
                            <td data-label="今回使用量">
                              {usageDisplayString}
                            </td>
                            <td data-label="状態">
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                fontSize: '0.9em',
                                fontWeight: 500,
                                backgroundColor: (() => {
                                  const status = getStatusDisplay(reading);
                                  if (status === '要確認') return 'var(--mantine-color-red-light)';
                                  if (status === '正常') return 'var(--mantine-color-green-light)';
                                  return 'var(--mantine-color-gray-2)';
                                })(),
                                color: (() => {
                                  const status = getStatusDisplay(reading);
                                  if (status === '要確認') return 'var(--mantine-color-red-8)';
                                  if (status === '正常') return 'var(--mantine-color-green-8)';
                                  return 'var(--mantine-color-gray-7)';
                                })(),
                                borderRadius: 'var(--mantine-radius-sm)'
                              }}>
                                {getStatusDisplay(reading)}
                                {(() => {
                                  const sigma = getStandardDeviationDisplay(reading);
                                  return sigma ? (
                                    <div style={{ fontSize: '0.7em', marginTop: '2px', opacity: 0.8 }}>
                                      σ: {sigma}
                                    </div>
                                  ) : null;
                                })()}
                              </span>
                            </td>
                            <td data-label="前回履歴">
                              {previousReadingsInfo && previousReadingsInfo.length > 0 ? (
                                <div style={{ lineHeight: '1.6' }}>
                                  {previousReadingsInfo.map((info, infoIndex) => (
                                    <div
                                      key={infoIndex}
                                      className="previous-reading-text"
                                      style={{
                                        marginBottom: infoIndex < previousReadingsInfo.length - 1 ? '6px' : '0'
                                      }}
                                    >
                                      {info}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div>-</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                <div className="reading-history-footer">
                  <button
                    className={`nav-button nav-button-footer prev-room-btn ${!getRoomNavigation().hasPrevious ? 'disabled' : ''}`}
                    disabled={!getRoomNavigation().hasPrevious || updating}
                    onClick={handlePreviousRoom}
                    aria-label="前の部屋に移動"
                    title={getRoomNavigation().hasPrevious ? '前の部屋に移動（データを保存してから移動します）' : '前の部屋がありません'}
                  >
                    ← 前の部屋へ
                  </button>

                  <button
                    className={`nav-button nav-button-footer next-room-btn ${!getRoomNavigation().hasNext ? 'disabled' : ''}`}
                    disabled={!getRoomNavigation().hasNext || updating}
                    onClick={handleNextRoom}
                    aria-label="次の部屋に移動"
                    title={getRoomNavigation().hasNext ? '次の部屋に移動（データを保存してから移動します）' : '次の部屋がありません'}
                  >
                    次の部屋へ →
                  </button>
                </div>
              </>
            ) : (
              <div className="mantine-stack">
                <div className="mantine-alert info">
                  <h3 className="mantine-text weight-600">初回検針</h3>
                </div>
                <div className="mantine-paper" style={{ marginTop: 'var(--mantine-spacing-md)', padding: 'var(--mantine-spacing-md)' }}>
                  <h4 className="mantine-subtitle" style={{ marginBottom: 'var(--mantine-spacing-sm)' }}>初回データ入力</h4>
                  <div className="mantine-stack" style={{ gap: 'var(--mantine-spacing-lg)' }}>
                    <div>
                      <label htmlFor="initialReadingDate" className="mantine-text weight-600" style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>検針日時:</label>
                      <input
                        type="text"
                        id="initialReadingDate"
                        value="未検針"
                        readOnly
                        className="mantine-input"
                        style={{ fontSize: '1rem', padding: '10px' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="initialReadingValue" className="mantine-text weight-600" style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>今回指示数(㎥):</label>
                      <input
                        type="number"
                        id="initialReadingValue"
                        className="mantine-input"
                        placeholder="指示数入力"
                        min="0"
                        step="any"
                        style={{ fontSize: '1rem', padding: '10px' }}
                        data-date=""
                        data-original-value=""
                        data-previous-reading=""
                        onChange={(e) => {
                          const dateForDataAttribute = "";
                          const numericValue = parseFloat(e.target.value);
                          if (e.target.value === '') {
                            setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '初回検針では指示数の入力が必須です。' }));
                            e.target.style.borderColor = 'var(--mantine-color-red-6)';
                            setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: '-' }));
                          } else if (isNaN(numericValue) || numericValue < 0) {
                            setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '0以上の数値を入力してください。' }));
                            e.target.style.borderColor = 'var(--mantine-color-red-6)';
                            setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: '-' }));
                          } else {
                            setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '' }));
                            e.target.style.borderColor = '';
                            setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: calculateUsageDisplay(e.target.value, '') }));
                          }
                        }}
                      />
                      {inputErrors[""] && (
                        <div style={{ color: 'var(--mantine-color-red-6)', fontSize: '0.9em', marginTop: '4px' }}>
                          {inputErrors[""]}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mantine-text weight-600" style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>今回使用量:</label>
                      <div style={{
                        backgroundColor: '#e3f2fd',
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: 'var(--mantine-radius-sm)',
                        padding: '10px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: 'var(--mantine-color-blue-7)',
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {usageStates[""] !== undefined
                          ? `${usageStates[""]}${usageStates[""] !== '-' ? '㎥' : ''}`
                          : '-'}
                      </div>
                      <div style={{ fontSize: '0.85em', color: 'var(--mantine-color-gray-6)', marginTop: '4px' }}>
                        ※初回検針では、指示数がそのまま使用量になります
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {(!loading && !error) && (
          <div className="fab-container" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1001 }}>
            <button
              className="fab-button mantine-button variant-filled"
              onClick={handleUpdateReadings}
              disabled={updating || isNavigating}
              title={Array.isArray(meterReadings) && meterReadings.length > 0 &&
                meterReadings.some(reading => reading.previousReading && reading.previousReading !== '' && reading.previousReading !== 0)
                ? "指示数を更新" : "初回検針データを保存"}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                fontSize: '28px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {updating ? <div className="mantine-loader" style={{ width: '32px', height: '32px', borderTopColor: 'white' }}></div> : '💾'}
            </button>
          </div>
        )}

        {showToast && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              backgroundColor: 'var(--mantine-color-blue-6)',
              color: 'white',
              padding: '24px 32px',
              borderRadius: 'var(--mantine-radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              fontSize: '1.2rem',
              fontWeight: '600',
              textAlign: 'center',
              minWidth: '240px',
              animation: 'fadeInScale 0.3s ease-out'
            }}>
              {toastMessage}
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default MeterReadingApp;
