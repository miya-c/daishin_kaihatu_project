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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
  }, [propertyId, roomId, navigate]);

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
      {/* Mobile Header */}
      <div className="app-header">
        <button className="back-button" onClick={goBack}>
          ←
        </button>
        <h1 className="header-title">検針入力</h1>
      </div>

      <div className="content-area">
        <div className="mantine-container">
          <div className="mantine-stack">
            {/* Property Info Card */}
            <div className="property-info-card">
              <div className="property-name">{propertyName}</div>
              <div className="room-label">部屋</div>
              <div className="room-name">{roomName}</div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mantine-alert">
                <div className="mantine-text">
                  {error}
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="mantine-paper">
              <form onSubmit={handleSubmit}>
                <div className="mantine-stack">
                  <div>
                    <label 
                      htmlFor="reading-input"
                      className="mantine-text weight-600"
                      style={{ 
                        display: 'block', 
                        marginBottom: '8px',
                        color: 'var(--mantine-color-blue-7)'
                      }}
                    >
                      メーター検針値
                    </label>
                    <input
                      id="reading-input"
                      type="number"
                      value={reading}
                      onChange={(e) => setReading(e.target.value)}
                      placeholder="検針値を入力してください"
                      disabled={loading}
                      className="mantine-input"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: 'var(--mantine-spacing-md)', 
                    justifyContent: 'space-between',
                    marginTop: 'var(--mantine-spacing-lg)'
                  }}>
                    <button
                      type="button"
                      className="mantine-button variant-outline"
                      onClick={goBack}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      キャンセル
                    </button>
                    
                    <button
                      type="submit"
                      className="mantine-button variant-filled"
                      disabled={loading || !reading.trim()}
                      style={{ 
                        flex: 1,
                        backgroundColor: loading || !reading.trim() ? 'var(--mantine-color-gray-3)' : 'var(--mantine-color-blue-6)'
                      }}
                    >
                      {loading ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Usage Hints */}
            <div className="mantine-paper" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
              <div className="mantine-stack">
                <div className="mantine-text weight-600" style={{ color: 'var(--mantine-color-gray-7)' }}>
                  検針のヒント
                </div>
                <div className="mantine-text" style={{ fontSize: '1.1rem' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>メーターの数値を正確に読み取ってください</li>
                    <li>小数点以下がある場合は含めて入力してください</li>
                    <li>前回の検針値と比較して異常がないか確認してください</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterReading;