import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const MeterReading = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = searchParams.get('propertyId');
  const roomId = searchParams.get('roomId');
  
  const [propertyName, setPropertyName] = useState('物件名読み込み中...');
  const [roomName, setRoomName] = useState('部屋名読み込み中...');
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meterReadings, setMeterReadings] = useState([]);
  const [hasExistingData, setHasExistingData] = useState(false);
  
  const gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');

  const goBack = useCallback(() => {
    navigate(`/room_select?propertyId=${encodeURIComponent(propertyId)}`);
  }, [navigate, propertyId]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!reading.trim()) {
      alert('検針値を入力してください');
      return;
    }

    if (!gasWebAppUrl || !propertyId || !roomId) {
      alert('必要な情報が不足しています');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${gasWebAppUrl}?action=saveReading&propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(roomId)}&reading=${encodeURIComponent(reading)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        alert('検針値を保存しました！');
        goBack();
      } else {
        throw new Error(result.error || '検針値の保存に失敗しました');
      }
    } catch (error) {
      console.error('検針値保存エラー:', error);
      setError(`検針値の保存でエラーが発生しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [reading, gasWebAppUrl, propertyId, roomId, goBack]);

  const loadMeterReadings = useCallback(async () => {
    if (!propertyId || !roomId || !gasWebAppUrl) {
      setLoading(false);
      return;
    }

    try {
      const fetchUrl = `${gasWebAppUrl}?action=getMeterReadings&propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(roomId)}`;
      console.log('[meter_reading] APIから検針データを取得:', fetchUrl);
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[meter_reading] 検針データ取得結果:', result);
      
      if (result.success && result.data) {
        // 統合版レスポンス形式に対応
        if (result.data.propertyName) {
          setPropertyName(result.data.propertyName);
        }
        if (result.data.roomName) {
          setRoomName(result.data.roomName);
        }
        
        const readings = result.data.readings || [];
        setMeterReadings(readings);
        
        console.log('[meter_reading] 取得した検針データ:', readings);
        
        // 前回データがあるかチェック - より柔軟な判定に変更
        const hasData = readings.some(r => {
          // 前回指示数または今回指示数のいずれかがある場合は既存データと判定
          const hasPreviousReading = r.previousReading !== null && r.previousReading !== undefined && String(r.previousReading).trim() !== '';
          const hasCurrentReading = r.currentReading !== null && r.currentReading !== undefined && String(r.currentReading).trim() !== '';
          const hasReadingDate = r.date !== null && r.date !== undefined && String(r.date).trim() !== '';
          
          console.log('[meter_reading] 検針データ判定:', {
            previousReading: r.previousReading,
            currentReading: r.currentReading,
            date: r.date,
            hasPreviousReading,
            hasCurrentReading,
            hasReadingDate
          });
          
          return hasPreviousReading || hasCurrentReading || hasReadingDate;
        });
        setHasExistingData(hasData);
        
        console.log('[meter_reading] 前回データ存在:', hasData, '検針データ件数:', readings.length);
      } else {
        console.log('[meter_reading] 検針データが空または取得失敗');
        setMeterReadings([]);
        setHasExistingData(false);
      }
    } catch (error) {
      console.error('[meter_reading] 検針データ取得エラー:', error);
      setError(`検針データの取得に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [propertyId, roomId, gasWebAppUrl]);

  useEffect(() => {
    if (!propertyId || !roomId) {
      if (confirm('必要な情報が不足しています。部屋選択画面に戻りますか？')) {
        navigate('/room_select');
      }
      return;
    }

    // セッションストレージから物件名を取得
    const savedPropertyName = sessionStorage.getItem('selectedPropertyName');
    if (savedPropertyName) {
      setPropertyName(savedPropertyName);
    }

    // セッションストレージから部屋データを取得して部屋名を設定
    const savedRooms = sessionStorage.getItem('selectedRooms');
    if (savedRooms) {
      try {
        const roomsData = JSON.parse(savedRooms);
        const currentRoom = roomsData.find(room => 
          String(room.id) === String(roomId) || 
          String(room.roomId) === String(roomId)
        );
        if (currentRoom) {
          setRoomName(currentRoom.name || currentRoom.roomName || currentRoom['部屋名'] || roomId);
        } else {
          setRoomName(roomId);
        }
      } catch (error) {
        console.error('部屋データの解析エラー:', error);
        setRoomName(roomId);
      }
    } else {
      setRoomName(roomId);
    }

    // 検針データを読み込み
    loadMeterReadings();
  }, [propertyId, roomId, navigate, loadMeterReadings]);

  // ローディング中
  if (loading) {
    return (
      <div className="meter-reading-page">
        <div className="mantine-container">
          <div className="mantine-center">
            <div className="mantine-loader"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="meter-reading-page" style={{ backgroundColor: 'var(--app-bg-color)', minHeight: '100vh' }}>
      <div className="app-header">
        <button className="back-button" onClick={goBack}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="header-title">検針情報</h1>
      </div>

      <div className="content-area mantine-container">
        <div className="mantine-stack">
          <div className="property-info-card">
            <h2 className="property-name">{propertyName}</h2>
            <p className="room-info">部屋: {roomName}</p>
          </div>

          {error && (
            <div className="mantine-alert">
              <div className="mantine-text" style={{ color: '#b91c1c' }}>
                エラー: {error}
              </div>
            </div>
          )}

          {/* 前回データがある場合の表示 */}
          {hasExistingData && meterReadings.length > 0 && (
            <div className="mantine-paper reading-history-container">
              <h3 className="mantine-subtitle">検針履歴</h3>
              <table className="mantine-table">
                <thead>
                  <tr>
                    <th>検針日時</th>
                    <th>今回指示数(㎥)</th>
                    <th>前回指示数</th>
                    <th>今回使用量</th>
                    <th>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {meterReadings.map((record, index) => (
                    <tr key={index}>
                      <td>{record.date || '未検針'}</td>
                      <td>
                        <input 
                          type="number"
                          defaultValue={record.currentReading || ''}
                          placeholder="指示数入力"
                          min="0"
                          step="any"
                          className="mantine-input"
                          onChange={(e) => {
                            const newReadings = [...meterReadings];
                            newReadings[index].currentReading = e.target.value;
                            setMeterReadings(newReadings);
                          }}
                        />
                      </td>
                      <td>{record.previousReading || '-'}</td>
                      <td>
                        {record.currentReading && record.previousReading 
                          ? `${(parseFloat(record.currentReading) - parseFloat(record.previousReading)).toFixed(1)}㎥`
                          : '-'
                        }
                      </td>
                      <td>{record.warningFlag || '正常'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button 
                className="mantine-button" 
                onClick={handleSubmit}
                disabled={loading}
                style={{ marginTop: '16px' }}
              >
                {loading ? '保存中...' : '更新'}
              </button>
            </div>
          )}

          {/* 初回検針の場合の表示 */}
          {!hasExistingData && (
            <div className="mantine-paper">
              <h3 className="mantine-subtitle">初回検針</h3>
              <div className="mantine-alert info">
                <p>このお部屋は初回検針です。最初の指示数を入力してください。</p>
              </div>
              <form onSubmit={handleSubmit} className="mantine-form">
                <div className="mantine-text-input">
                  <label htmlFor="reading">検針値</label>
                  <input
                    type="number"
                    id="reading"
                    value={reading}
                    onChange={(e) => setReading(e.target.value)}
                    placeholder="検針値を入力"
                    min="0"
                    step="any"
                    required
                    className="mantine-input"
                  />
                </div>
                <button 
                  type="submit" 
                  className="mantine-button" 
                  disabled={loading}
                  style={{ marginTop: '16px' }}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeterReading;