import { useState, useEffect, useCallback } from 'react';
import { calculateWarningFlag } from '../utils/warningFlag';
import { mapReadingFromApi } from '../utils/readingMapper';
import { validateId } from '../../../utils/validateParams';

export const useMeterReadings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertyId, setPropertyId] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [meterReadings, setMeterReadings] = useState([]);
  const [gasWebAppUrl, setGasWebAppUrl] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const urlFromSession = sessionStorage.getItem('gasWebAppUrl');
    if (!urlFromSession) {
      setError('アプリのURLが設定されていません。物件選択画面から再度アクセスしてください。');
      setLoading(false);
      return;
    }
    setGasWebAppUrl(urlFromSession);
  }, []);

  const mapNavigationReadingsData = useCallback((targetRoomId, readings) => {
    return readings.map((reading, index) =>
      mapReadingFromApi(reading, index, { roomId: targetRoomId })
    );
  }, []);

  const loadMeterReadings = useCallback(
    async (propId, rId, maxRetries = 3) => {
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
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }
            throw new Error(
              'ネットワークの応答が正しくありませんでした。ステータス: ' + response.status
            );
          }

          const responseObject = await response.json();
          if (!responseObject.success) {
            throw new Error(responseObject.error || '検針データの取得に失敗しました');
          }

          const data = responseObject.data;
          if (!data) throw new Error('応答データが空です');

          let pName, rName, readings;
          if (
            Object.prototype.hasOwnProperty.call(data, 'propertyName') &&
            Object.prototype.hasOwnProperty.call(data, 'roomName') &&
            Object.prototype.hasOwnProperty.call(data, 'readings')
          ) {
            pName = data.propertyName || 'N/A';
            rName = data.roomName || '部屋名不明';
            readings = data.readings || [];
          } else if (Array.isArray(data)) {
            if (data.length > 0 && data[0]) {
              pName = data[0]['物件名'] || data[0].propertyName || 'N/A';
              rName = data[0]['部屋名'] || data[0].roomName || '部屋名不明';
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
            const mappedReadings = readings.map((rawReading, index) =>
              mapReadingFromApi(rawReading, index, { calculateWarnings: true })
            );
            setMeterReadings(mappedReadings);
          } else {
            setMeterReadings([]);
          }

          clearTimeout(loadingTimeout);
          if (showLoading) setLoading(false);
          return;
        } catch (err) {
          if (attempt === maxRetries) {
            let userMessage = '検針データの読み込みに失敗しました。';
            if (err.message.includes('503')) {
              userMessage =
                'サーバーが一時的に利用できません。しばらく待ってから再度お試しください。';
            } else if (err.message.includes('network') || err.message.includes('fetch')) {
              userMessage =
                'ネットワーク接続に問題があります。インターネット接続を確認してください。';
            }
            setError(userMessage + '\n\n問題が継続する場合は、管理者にお問い合わせください。');
            clearTimeout(loadingTimeout);
            if (showLoading) setLoading(false);
            return;
          }
        }
      }
    },
    [gasWebAppUrl]
  );

  const loadRoomDataForSPA = useCallback(
    async (propId, rId) => {
      try {
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
            setMeterReadings(mapNavigationReadingsData(rId, result.data.readings));
          } else {
            setMeterReadings([]);
          }
        } else {
          throw new Error('データ読み込み失敗');
        }
      } catch (err) {
        window.location.reload();
      }
    },
    [gasWebAppUrl, mapNavigationReadingsData]
  );

  // Browser history management
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
  }, [loadRoomDataForSPA]);

  // Initial data load
  useEffect(() => {
    if (!gasWebAppUrl) return;

    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('propertyId');
    const rId = urlParams.get('roomId');

    if (!propId || !rId) {
      setError('物件情報または部屋情報が不足しているため、検針データを取得できません。');
      setLoading(false);
      return;
    }

    const propValidation = validateId(propId, '物件ID');
    if (!propValidation.valid) {
      setError(propValidation.error);
      setLoading(false);
      return;
    }

    const roomValidation = validateId(rId, '部屋ID');
    if (!roomValidation.valid) {
      setError(roomValidation.error);
      setLoading(false);
      return;
    }

    loadMeterReadings(propId, rId);
  }, [gasWebAppUrl, loadMeterReadings]);

  return {
    loading,
    error,
    propertyId,
    propertyName,
    roomId,
    roomName,
    meterReadings,
    setMeterReadings,
    gasWebAppUrl,
    setError,
    setLoading,
    loadMeterReadings,
    loadRoomDataForSPA,
    mapNavigationReadingsData,
  };
};
