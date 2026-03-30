import { useState, useEffect, useCallback } from 'react';
import { calculateWarningFlag } from '../utils/warningFlag';

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
    return readings.map((reading, index) => ({
      id: `${targetRoomId}-${reading.date || reading['検針日時'] || index}`,
      date: reading.date || reading['検針日時'] || '',
      currentReading:
        reading.currentReading || reading['今回指示数'] || reading['今回の指示数'] || '',
      previousReading: reading.previousReading || reading['前回指示数'] || '',
      previousPreviousReading: reading.previousPreviousReading || reading['前々回指示数'] || '',
      threeTimesPrevious: reading.threeTimesPreviousReading || reading['前々々回指示数'] || '',
      warningFlag: reading.warningFlag || reading['警告フラグ'] || '正常',
      standardDeviation: reading.standardDeviation || reading['標準偏差値'] || '',
      usage: reading.usage || reading['今回使用量'] || 0,
    }));
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
            const mappedReadings = readings.map((rawReading, index) => {
              const mapped = {
                id:
                  rawReading['記録ID'] ||
                  rawReading['recordId'] ||
                  rawReading['ID'] ||
                  `reading-${index}`,
                date: rawReading['検針日時'] || rawReading['date'] || rawReading['記録日'] || '',
                currentReading:
                  rawReading['今回の指示数'] ||
                  rawReading['今回指示数'] ||
                  rawReading['今回指示数（水道）'] ||
                  rawReading['currentReading'] ||
                  rawReading['指示数'] ||
                  '',
                previousReading:
                  rawReading['前回指示数'] ||
                  rawReading['previousReading'] ||
                  rawReading['前回'] ||
                  '',
                previousPreviousReading:
                  rawReading['前々回指示数'] ||
                  rawReading['previousPreviousReading'] ||
                  rawReading['前々回'] ||
                  '',
                threeTimesPrevious:
                  rawReading['前々々回指示数'] ||
                  rawReading['threeTimesPrevious'] ||
                  rawReading['前々々回'] ||
                  '',
                usage:
                  rawReading['今回使用量'] || rawReading['usage'] || rawReading['使用量'] || '',
                warningFlag: rawReading['警告フラグ'] || rawReading['warningFlag'] || '正常',
                standardDeviation:
                  rawReading['標準偏差値'] || rawReading['standardDeviation'] || '',
                status:
                  rawReading['警告フラグ'] || rawReading['status'] || rawReading['状態'] || '正常',
              };

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
