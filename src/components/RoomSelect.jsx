import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchRoomsWithFallback } from '../utils/api.js';

const RoomSelect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = searchParams.get('propertyId');
  
  const [rooms, setRooms] = useState([]);
  const [propertyName, setPropertyName] = useState('物件名読み込み中...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');

  const goBack = useCallback(() => {
    navigate('/property_select');
  }, [navigate]);

  const handleRoomSelect = useCallback((room) => {
    const meterReadingUrl = `/meter_reading?propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(String(room.id || ''))}`;
    navigate(meterReadingUrl);
  }, [propertyId, navigate]);

  const completeInspection = useCallback(async () => {
    if (!propertyId || !gasWebAppUrl) {
      alert('必要な情報が不足しています');
      return;
    }

    try {
      const today = new Date();
      const completionDate = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');

      console.log(`検針完了処理開始 - 物件ID: ${propertyId}, 完了日: ${completionDate}`);

      const response = await fetch(`${gasWebAppUrl}?action=completeInspection&propertyId=${propertyId}&completionDate=${completionDate}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`検針完了日を ${completionDate} で保存しました！`);
        window.location.reload();
      } else {
        throw new Error(result.error || '検針完了処理に失敗しました');
      }
    } catch (error) {
      console.error('検針完了処理エラー:', error);
      alert(`検針完了処理でエラーが発生しました: ${error.message}`);
    }
  }, [propertyId, gasWebAppUrl]);

  useEffect(() => {
    if (!propertyId) {
      if (confirm('物件IDが指定されていません。物件選択画面に戻りますか？')) {
        navigate('/property_select');
      }
      return;
    }

    const loadRoomData = async () => {
      try {
        setLoading(true);
        setError(null);

        // セッションストレージから物件名を取得
        const savedPropertyName = sessionStorage.getItem('selectedPropertyName');
        if (savedPropertyName) {
          setPropertyName(savedPropertyName);
        }

        // 部屋データを取得
        const roomsData = await fetchRoomsWithFallback(propertyId);
        
        // 部屋データを正規化
        const normalizedRooms = roomsData.map((room, index) => ({
          ...room,
          id: room.id || room.roomId || room['部屋ID'] || `room-${index}`,
          name: room.name || room.roomName || room['部屋名'] || '部屋名未設定',
          isNotNeeded: room.isNotNeeded || false,
          readingStatus: room.readingStatus || (room.isCompleted ? 'completed' : 'pending'),
          readingDateFormatted: room.readingDateFormatted || '',
          isCompleted: room.isCompleted || false
        }));

        // 部屋名順にソート
        normalizedRooms.sort((a, b) => {
          const nameA = String(a.name || '').trim();
          const nameB = String(b.name || '').trim();
          return nameA.localeCompare(nameB, 'ja', { numeric: true, sensitivity: 'base' });
        });

        setRooms(normalizedRooms);
        setLoading(false);

      } catch (error) {
        console.error('部屋データ取得エラー:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    loadRoomData();
  }, [propertyId, navigate]);

  // ローディング中
  if (loading) {
    return (
      <div>
        <div className="MuiAppBar-root">
          <div className="MuiToolbar-root">
            <button className="MuiIconButton-root" onClick={goBack}>
              <span className="material-icons">arrow_back</span>
            </button>
            <div className="app-title">部屋選択</div>
          </div>
        </div>
        
        <div className="MuiContainer-root">
          <div className="loading-container">
            <div className="MuiCircularProgress-root"></div>
            <div className="MuiTypography-root">部屋データを読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  // エラー時
  if (error) {
    return (
      <div>
        <div className="MuiAppBar-root">
          <div className="MuiToolbar-root">
            <button className="MuiIconButton-root" onClick={goBack}>
              <span className="material-icons">arrow_back</span>
            </button>
            <div className="app-title">部屋選択</div>
          </div>
        </div>
        
        <div className="MuiContainer-root">
          <div className="MuiAlert-root">
            <div className="MuiTypography-root" style={{ color: '#b91c1c' }}>
              エラー: {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="MuiAppBar-root app-header">
        <div className="MuiToolbar-root">
          <button className="MuiIconButton-root" onClick={goBack}>
            <span className="material-icons">arrow_back</span>
          </button>
          <div className="app-title">部屋選択</div>
        </div>
      </div>

      <div className="MuiContainer-root">
        {/* 物件名カード */}
        <div className="MuiCard-root MuiPaper-root MuiPaper-elevation1 property-card">
          <div className="MuiCardHeader-root property-header">
            <span className="MuiSvgIcon-root material-icons property-icon" aria-hidden="true">home</span>
            <span className="MuiTypography-root MuiTypography-h5">{propertyName}</span>
          </div>
        </div>

        {/* 部屋グリッド */}
        {rooms.length === 0 ? (
          <div className="no-rooms-message">部屋データがありません</div>
        ) : (
          <div className="room-grid">
            {rooms.map((room) => {
              const isSkipInspection = room.isNotNeeded === true;
              let statusIcon, statusColor, statusText;
              
              if (isSkipInspection) {
                statusIcon = 'block';
                statusColor = '#9e9e9e';
                statusText = '検針不要';
              } else if (room.readingStatus === 'completed' || room.isCompleted) {
                statusIcon = 'check_circle';
                statusColor = '#2e7d32';
                statusText = room.readingDateFormatted ? `検針済み：${room.readingDateFormatted}` : '検針済み';
              } else {
                statusIcon = 'warning';
                statusColor = '#ed6c02';
                statusText = '未検針';
              }

              return (
                <div
                  key={room.id}
                  className={`MuiCard-root MuiPaper-root MuiPaper-elevation1 MuiCardActionArea-root room-card ${
                    isSkipInspection ? 'status-skip' : 
                    (room.readingStatus === 'completed' || room.isCompleted) ? 'status-completed' : 'status-pending'
                  }`}
                  onClick={() => {
                    if (isSkipInspection) {
                      alert('この部屋は検針不要に設定されています。');
                    } else {
                      handleRoomSelect(room);
                    }
                  }}
                  style={{ 
                    cursor: isSkipInspection ? 'not-allowed' : 'pointer',
                    pointerEvents: isSkipInspection ? 'none' : 'auto'
                  }}
                  tabIndex={isSkipInspection ? -1 : 0}
                  role={isSkipInspection ? 'presentation' : 'button'}
                  aria-label={`${room.name} ${statusText}`}
                >
                  <div className="MuiCardContent-root room-info-row">
                    <span 
                      className="MuiSvgIcon-root material-icons status-icon" 
                      style={{ color: statusColor }}
                      aria-hidden="true"
                    >
                      {statusIcon}
                    </span>
                    <span className="MuiTypography-root MuiTypography-h6 room-name">
                      {room.name}
                    </span>
                    <span className="MuiTypography-root MuiTypography-body2 room-status">
                      {statusText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 完了ボタン */}
        {rooms.length > 0 && (
          <div className="complete-button-container">
            <button 
              className="MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge complete-button"
              onClick={completeInspection}
              aria-label="この物件の検針を完了する"
            >
              <span className="MuiSvgIcon-root material-icons" aria-hidden="true">check_circle</span>
              <span className="MuiButton-label">この物件の検針を完了する</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomSelect;