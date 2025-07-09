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

  return (
    <div>
      <div className="MuiAppBar-root">
        <div className="MuiToolbar-root">
          <button className="MuiIconButton-root" onClick={goBack}>
            <span className="material-icons">arrow_back</span>
          </button>
          <div className="app-title">検針入力</div>
        </div>
      </div>

      <div className="MuiContainer-root">
        {/* 物件・部屋情報カード */}
        <div className="MuiCard-root property-card">
          <div className="MuiCardContent-root">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <span className="material-icons" style={{ marginRight: '8px', color: '#1976d2' }}>home</span>
              <span className="MuiTypography-root" style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                {propertyName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-icons" style={{ marginRight: '8px', color: '#1976d2' }}>meeting_room</span>
              <span className="MuiTypography-root" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {roomName}
              </span>
            </div>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="MuiAlert-root" style={{ marginBottom: '16px' }}>
            <div className="MuiTypography-root" style={{ color: '#b91c1c' }}>
              {error}
            </div>
          </div>
        )}

        {/* 検針入力フォーム */}
        <div className="MuiCard-root">
          <div className="MuiCardContent-root">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label 
                  htmlFor="reading-input"
                  className="MuiTypography-root"
                  style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: '#1976d2'
                  }}
                >
                  メーター検針値
                </label>
                <div className="MuiTextField-root">
                  <input
                    id="reading-input"
                    type="number"
                    value={reading}
                    onChange={(e) => setReading(e.target.value)}
                    placeholder="検針値を入力してください"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '1.2rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="MuiButton-root"
                  onClick={goBack}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    border: '2px solid #1976d2',
                    backgroundColor: 'transparent',
                    color: '#1976d2',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  キャンセル
                </button>
                
                <button
                  type="submit"
                  className="MuiButton-root"
                  disabled={loading || !reading.trim()}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    border: 'none',
                    backgroundColor: loading || !reading.trim() ? '#ccc' : '#1976d2',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: loading || !reading.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="MuiCircularProgress-root" style={{ width: '20px', height: '20px' }}></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <span className="material-icons">save</span>
                      保存
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 使用方法のヒント */}
        <div className="MuiCard-root" style={{ marginTop: '24px', backgroundColor: '#f5f5f5' }}>
          <div className="MuiCardContent-root">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span className="material-icons" style={{ marginRight: '8px', color: '#666' }}>info</span>
              <span className="MuiTypography-root" style={{ fontWeight: 500, color: '#666' }}>
                検針のヒント
              </span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
              <li>メーターの数値を正確に読み取ってください</li>
              <li>小数点以下がある場合は含めて入力してください</li>
              <li>前回の検針値と比較して異常がないか確認してください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterReading;