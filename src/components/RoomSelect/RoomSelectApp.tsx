import { useState, useEffect, useCallback, useRef } from 'react';
import { getGasUrl } from '../../utils/gasClient';
import NetworkStatusBar from '../NetworkStatusBar';
import { validateId } from '../../utils/validateParams';

import type { Room } from '../../types';

const RoomSelectApp = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [propertyName, setPropertyName] = useState('物件名読み込み中...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
      setToastMessage('');
    }, 3000);
  }, []);

  const loadRoomData = async (propId: string): Promise<void> => {
    let gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');
    if (!gasWebAppUrl) {
      gasWebAppUrl = localStorage.getItem('gasWebAppUrl');
      if (gasWebAppUrl) {
        sessionStorage.setItem('gasWebAppUrl', gasWebAppUrl);
      }
    }

    if (!gasWebAppUrl || !gasWebAppUrl.includes('script.google.com')) {
      setError('GAS Web App URLが設定されていません。');
      setLoading(false);
      return;
    }

    try {
      const forceRefresh = sessionStorage.getItem('forceRefreshRooms') === 'true';
      if (forceRefresh) {
        sessionStorage.removeItem('forceRefreshRooms');
        sessionStorage.removeItem('updatedRoomId');
        sessionStorage.removeItem('lastUpdateTime');
      }

      if (!forceRefresh) {
        const sessionRooms = sessionStorage.getItem('selectedRooms');
        const sessionPropertyName = sessionStorage.getItem('selectedPropertyName');
        const sessionPropertyId = sessionStorage.getItem('selectedPropertyId');

        if (sessionRooms && sessionPropertyId === propId && sessionPropertyName) {
          try {
            const parsedRooms = JSON.parse(sessionRooms);
            if (Array.isArray(parsedRooms)) {
              setRooms(parsedRooms);
              setPropertyName(sessionPropertyName);
              setLoading(false);
              setTimeout(() => performBackgroundUpdate(propId, gasWebAppUrl!, parsedRooms), 100);
              return;
            }
          } catch (_) {
            // Continue to API fetch
          }
        }
      }

      try {
        const fetchUrl = `${gasWebAppUrl}?action=getRoomsLight&propertyId=${encodeURIComponent(propId)}&cache=${Date.now()}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error || 'API error');
        }

        const fetchedRooms = data.data?.rooms || data.data || [];
        const fetchedPropertyName =
          data.data?.propertyName || sessionStorage.getItem('selectedPropertyName') || '物件名不明';

        if (!Array.isArray(fetchedRooms)) {
          throw new Error('Invalid data format');
        }

        setRooms(fetchedRooms);
        setPropertyName(fetchedPropertyName);
        sessionStorage.setItem('selectedRooms', JSON.stringify(fetchedRooms));
        sessionStorage.setItem('selectedPropertyName', fetchedPropertyName);
        sessionStorage.setItem('selectedPropertyId', propId);
      } catch (_) {
        const fetchUrl = `${gasWebAppUrl}?action=getRooms&propertyId=${encodeURIComponent(propId)}`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'データの取得に失敗しました');
        }

        let fetchedPropertyName = '物件名不明';
        if (data.data) {
          fetchedPropertyName =
            data.data.propertyName ||
            (data.data.property && data.data.property.name) ||
            data.data.property_name ||
            data.data.name ||
            sessionStorage.getItem('selectedPropertyName') ||
            '物件名不明';
        }

        const fetchedRooms = data.data && Array.isArray(data.data.rooms) ? data.data.rooms : [];
        if (!Array.isArray(fetchedRooms)) {
          throw new Error('部屋データの取得に失敗しました');
        }

        setRooms(fetchedRooms);
        setPropertyName(fetchedPropertyName);
        sessionStorage.setItem('selectedRooms', JSON.stringify(fetchedRooms));
        sessionStorage.setItem('selectedPropertyName', fetchedPropertyName);
        sessionStorage.setItem('selectedPropertyId', propId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const performBackgroundUpdate = async (propId: string, gasWebAppUrl: string, _currentRooms: Room[]): Promise<void> => {
    try {
      const fetchUrl = `${gasWebAppUrl}?action=getRoomsLight&propertyId=${encodeURIComponent(propId)}&cache=${Date.now()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        const updatedRooms = data.data?.rooms || data.data || [];
        if (Array.isArray(updatedRooms) && updatedRooms.length > 0) {
          setRooms(updatedRooms);
          sessionStorage.setItem('selectedRooms', JSON.stringify(updatedRooms));
        }
      }
    } catch (_) {
      // Background update failure is non-critical
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('propertyId');

    if (!propId) {
      setError('物件IDが指定されていません。');
      setLoading(false);
      return;
    }

    const validation = validateId(propId, '物件ID');
    if (!validation.valid) {
      setError(validation.error ?? '物件IDが無効です');
      setLoading(false);
      return;
    }

    setPropertyId(propId);
    loadRoomData(propId);
  }, []);

  const handleRoomClick = useCallback(
    (room: Room) => {
      if (room.isNotNeeded === true) {
        displayToast('この部屋は検針不要に設定されています。');
        return;
      }

      const roomId = String(room.id || room.roomId || '');
      const gasUrl = getGasUrl();
      if (gasUrl) {
        sessionStorage.setItem('gasWebAppUrl', gasUrl);
      }
      window.location.href = `/reading/?propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(roomId)}`;
    },
    [propertyId, displayToast]
  );

  const handleBackButton = useCallback(() => {
    window.location.href = '/property/';
  }, []);

  const handleCompleteInspection = useCallback(async () => {
    if (!propertyId) {
      displayToast('物件IDが取得できませんでした');
      return;
    }

    const gasUrl = sessionStorage.getItem('gasWebAppUrl');
    if (!gasUrl) {
      displayToast('Web App URLが設定されていません');
      return;
    }

    try {
      const today = new Date();
      const completionDate =
        today.getFullYear() +
        '-' +
        String(today.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(today.getDate()).padStart(2, '0');

      const response = await fetch(
        `${gasUrl}?action=completeInspection&propertyId=${propertyId}&completionDate=${completionDate}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.success) {
        displayToast(`検針完了日を ${completionDate} で保存しました！`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(result.error || '検針完了処理に失敗しました');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      displayToast(`検針完了処理でエラーが発生しました: ${message}`);
    }
  }, [propertyId, displayToast]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div>
        <NetworkStatusBar />
        <a href="#main-content" className="skip-link">メインコンテンツへ</a>
        <header
          className="MuiAppBar-root MuiAppBar-colorPrimary MuiAppBar-positionStatic mui-elevation-4"
          role="banner"
        >
          <nav className="MuiToolbar-root MuiToolbar-regular" aria-label="部屋選択ナビゲーション">
            <button
              className="MuiIconButton-root MuiIconButton-colorInherit"
              onClick={handleBackButton}
              aria-label="戻る"
            >
              <span className="material-icons MuiSvgIcon-root">arrow_back</span>
            </button>
            <span className="MuiTypography-root MuiTypography-h6 app-title">部屋選択</span>
          </nav>
        </header>
        <main id="main-content" className="MuiContainer-root MuiContainer-maxWidthLg" style={{ paddingTop: '32px' }}>
          <div className="loading-container">
            <span className="MuiCircularProgress-root" aria-label="読み込み中"></span>
            <span className="MuiTypography-root MuiTypography-body1">
              部屋データを読み込み中...
            </span>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <NetworkStatusBar />
        <a href="#main-content" className="skip-link">メインコンテンツへ</a>
        <header
          className="MuiAppBar-root MuiAppBar-colorPrimary MuiAppBar-positionStatic mui-elevation-4"
          role="banner"
        >
          <nav className="MuiToolbar-root MuiToolbar-regular" aria-label="部屋選択ナビゲーション">
            <button
              className="MuiIconButton-root MuiIconButton-colorInherit"
              onClick={handleBackButton}
              aria-label="戻る"
            >
              <span className="material-icons MuiSvgIcon-root">arrow_back</span>
            </button>
            <span className="MuiTypography-root MuiTypography-h6 app-title">部屋選択</span>
          </nav>
        </header>
        <main id="main-content" className="MuiContainer-root MuiContainer-maxWidthLg" style={{ paddingTop: '32px' }}>
          <div className="MuiAlert-root MuiAlert-standardError" role="alert">
            <span className="MuiAlert-message">{String(error)}</span>
          </div>
        </main>
      </div>
    );
  }

  // Main content
  return (
    <div>
      <a href="#main-content" className="skip-link">メインコンテンツへ</a>
      <header
        className="MuiAppBar-root MuiAppBar-colorPrimary MuiAppBar-positionStatic mui-elevation-4"
        role="banner"
      >
        <nav className="MuiToolbar-root MuiToolbar-regular" aria-label="部屋選択ナビゲーション">
          <button
            className="MuiIconButton-root MuiIconButton-colorInherit"
            onClick={handleBackButton}
            aria-label="戻る"
          >
            <span className="material-icons MuiSvgIcon-root">arrow_back</span>
          </button>
          <span className="MuiTypography-root MuiTypography-h6 app-title">部屋選択</span>
        </nav>
      </header>

      <main id="main-content" className="MuiContainer-root MuiContainer-maxWidthLg" style={{ paddingTop: '32px' }}>
        <section
          className="MuiCard-root MuiPaper-root MuiPaper-elevation1 property-card"
          aria-label="物件情報"
        >
          <div className="MuiCardHeader-root property-header">
            <span className="material-icons MuiSvgIcon-root property-icon" aria-hidden="true">
              home
            </span>
            <span className="MuiTypography-root MuiTypography-h5">{propertyName}</span>
          </div>
        </section>

        <section className="room-grid" aria-label="部屋一覧" role="list">
          {rooms.length === 0 ? (
            <div className="no-rooms-message">部屋データがありません</div>
          ) : (
            rooms.map((room, index) => {
              const isSkipInspection = room.isNotNeeded === true;
              const isCompleted = room.readingStatus === 'completed' || room.isCompleted;

              let statusIcon: string, statusColor: string, statusText: string;
              if (isSkipInspection) {
                statusIcon = 'block';
                statusColor = '#9e9e9e';
                statusText = '検針不要';
              } else if (isCompleted) {
                statusIcon = 'check_circle';
                statusColor = '#2e7d32';
                statusText = room.readingDateFormatted
                  ? `検針済み：${String(room.readingDateFormatted)}`
                  : '検針済み';
              } else {
                statusIcon = 'warning';
                statusColor = '#ed6c02';
                statusText = '未検針';
              }

              let cardClasses =
                'MuiCard-root MuiPaper-root MuiPaper-elevation1 MuiCardActionArea-root room-card';
              if (isSkipInspection) {
                cardClasses += ' status-skip';
              } else if (isCompleted) {
                cardClasses += ' status-completed';
              } else {
                cardClasses += ' status-pending';
              }

              return (
                <div
                  key={room.id || index}
                  className={cardClasses}
                  tabIndex={isSkipInspection ? -1 : 0}
                  role={isSkipInspection ? 'presentation' : 'button'}
                  aria-label={
                    String(room.name || room['部屋名'] || room.id || '不明') +
                    (isSkipInspection ? ' 検針不要' : isCompleted ? ' 検針済み' : ' 未検針')
                  }
                  onClick={() => handleRoomClick(room)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRoomClick(room);
                    }
                  }}
                >
                  <div className="MuiCardContent-root room-info-row">
                    <span
                      className="material-icons MuiSvgIcon-root status-icon"
                      aria-hidden="true"
                      style={{ color: statusColor }}
                    >
                      {statusIcon}
                    </span>
                    <span className="MuiTypography-root MuiTypography-h6 room-name">
                      {String(room.name || room['部屋名'] || room.id || '不明')}
                    </span>
                    <span className="MuiTypography-root MuiTypography-body2 room-status">
                      {statusText}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {rooms.length > 0 && (
          <div className="complete-button-container">
            <button
              className="MuiButton-root MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge complete-button"
              onClick={handleCompleteInspection}
              aria-label="この物件の検針を完了する"
            >
              <span className="material-icons MuiSvgIcon-root" aria-hidden="true">
                check_circle
              </span>
              <span className="MuiButton-label">この物件の検針を完了する</span>
            </button>
          </div>
        )}
      </main>

      {showToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--mui-palette-primary-main, #1976d2)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10000,
            textAlign: 'center',
            maxWidth: '90vw',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default RoomSelectApp;
