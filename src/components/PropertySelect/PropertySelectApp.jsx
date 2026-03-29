import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getGasUrl, fetchProperties } from '../../utils/gasClient';

const PropertySelectApp = () => {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFetched, setIsFetched] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('https://script.google.com/macros/s/');

  const gasWebAppUrl = useMemo(() => getGasUrl(), []);

  const formatCompletionDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `検針完了日：${month}月${day}日`;
    } catch (error) {
      return '';
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchPropertiesData = async () => {
      setLoading(true);
      setError(null);
      setIsFetched(false);

      if (!gasWebAppUrl || !gasWebAppUrl.includes('script.google.com')) {
        setShowUrlModal(true);
        setLoading(false);
        return;
      }

      try {
        const data = await fetchProperties(gasWebAppUrl);
        const actualData = data.data || data.properties || (Array.isArray(data) ? data : null);
        if (!actualData || !Array.isArray(actualData)) {
          throw new Error('物件データの形式が正しくありません。');
        }
        const normalizedData = actualData.map(property => ({
          ...property,
          id: String(property.id || property['物件ID'] || ''),
          name: String(property.name || property['物件名'] || '名称未設定'),
          completionDate: property.completionDate || property['検針完了日'] || '',
        }));
        setProperties(normalizedData);
      } catch (fetchError) {
        let errorMessage = '物件情報の取得に失敗しました。\n\n';
        if (fetchError.message.includes('Failed to fetch')) {
          errorMessage += '原因: ネットワークエラーまたはCORS問題\n対処法: インターネット接続を確認してください';
        } else {
          errorMessage += `原因: ${fetchError.message}`;
        }
        setError(errorMessage);
        setLoading(false);
      } finally {
        setIsFetched(true);
      }
    };

    fetchPropertiesData();
  }, [gasWebAppUrl]);

  useEffect(() => {
    if (isFetched && loading) {
      setLoading(false);
    }
  }, [isFetched]);

  const handleUrlSubmit = useCallback(() => {
    if (urlInput && urlInput.includes('script.google.com')) {
      localStorage.setItem('gasWebAppUrl', urlInput);
      sessionStorage.setItem('gasWebAppUrl', urlInput);
      window.location.reload();
    } else {
      setError('正しいGAS Web App URLを設定してください。');
      setShowUrlModal(false);
    }
  }, [urlInput]);

  const handlePropertySelect = useCallback(async (property) => {
    if (!property || typeof property.id === 'undefined' || typeof property.name === 'undefined') return;

    window.scrollTo(0, 0);
    setIsNavigating(true);
    setNavigationMessage('部屋情報を取得中...');

    try {
      const requestUrl = `${gasWebAppUrl}?action=getRooms&propertyId=${property.id}&cache=${Date.now()}`;
      const roomResponse = await fetch(requestUrl);
      if (!roomResponse.ok) throw new Error(`HTTP ${roomResponse.status}`);
      const roomData = await roomResponse.json();
      if (roomData.success === false) throw new Error(roomData.error || '部屋APIエラー');

      let rooms = [];
      if (roomData.data && roomData.data.rooms && Array.isArray(roomData.data.rooms)) {
        rooms = roomData.data.rooms;
      } else if (Array.isArray(roomData.data)) {
        rooms = roomData.data;
      } else {
        throw new Error('部屋APIのデータ形式が正しくありません。');
      }

      const normalizedRooms = rooms.map((room, index) => ({
        ...room,
        id: room.id || room.roomId || room['部屋ID'] || `room-${index}`,
        name: room.name || room.roomName || room['部屋名'] || '部屋名未設定',
        rawInspectionDate: room.rawInspectionDate || room.inspectionDate || room['検針日時'],
        hasActualReading: room.hasActualReading || room.hasReading || room['検針済み'] || false,
      }));

      sessionStorage.setItem('selectedPropertyId', String(property.id));
      sessionStorage.setItem('selectedPropertyName', String(property.name));
      sessionStorage.setItem('selectedRooms', JSON.stringify(normalizedRooms));
      if (gasWebAppUrl && gasWebAppUrl.includes('script.google.com')) {
        sessionStorage.setItem('gasWebAppUrl', gasWebAppUrl);
        localStorage.setItem('gasWebAppUrl', gasWebAppUrl);
      }

      setTimeout(() => {
        window.location.href = `/room/?propertyId=${encodeURIComponent(property.id)}`;
      }, 300);
    } catch (error) {
      setError('部屋情報の読み込みに失敗しました。\n' + error.message);
      setIsNavigating(false);
    }
  }, [gasWebAppUrl]);

  const filteredProperties = useMemo(() =>
    (properties || []).filter(property => {
      const idStr = String(property.id != null ? property.id : '');
      const nameStr = String(property.name != null ? property.name : '');
      return idStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
             nameStr.toLowerCase().includes(searchTerm.toLowerCase());
    }),
    [properties, searchTerm]
  );

  // Loading state
  if (loading && !isFetched) {
    return (
      <div>
        <div className="MuiAppBar-root">
          <div className="MuiToolbar-root">
            <div className="app-title">物件選択</div>
          </div>
        </div>
        <div className="MuiContainer-root">
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="MuiTextField-root">
              <input type="text" placeholder="物件IDまたは物件名で検索..." value="" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className="loading-container">
              <div className="MuiCircularProgress-root"></div>
              <div className="MuiTypography-root" style={{ fontSize: '1.1rem', color: 'var(--mui-palette-grey-900)', fontWeight: 500, textAlign: 'center', margin: '16px 0 0 0' }}>
                物件情報を読み込み中です...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && isFetched) {
    return (
      <div>
        <div className="MuiAppBar-root">
          <div className="MuiToolbar-root">
            <div className="app-title">物件選択</div>
          </div>
        </div>
        <div className="MuiContainer-root">
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="MuiTextField-root">
              <input type="text" placeholder="物件IDまたは物件名で検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="MuiAlert-root">
              <div className="MuiTypography-root" style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 8px 0', color: '#b91c1c' }}>エラー</div>
              <div className="MuiTypography-root" style={{ fontSize: '1rem', margin: 0, color: '#b91c1c' }}>
                {String(error || 'エラーが発生しました')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div style={{ minHeight: '100vh' }}>
      {showUrlModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', fontWeight: 600 }}>GAS Web App URL設定</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: 'var(--mui-palette-grey-900)' }}>
              GAS Web App URLが設定されていません。Google Apps ScriptのWeb App URLを入力してください。
            </p>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '0.875rem', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '16px' }}
              placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowUrlModal(false); setError('正しいGAS Web App URLを設定してください。'); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleUrlSubmit} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--mui-palette-primary-main, #1976d2)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {isNavigating && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', boxShadow: 'var(--mui-shadows-4)', maxWidth: '320px', textAlign: 'center' }}>
            <div className="MuiCircularProgress-root"></div>
            <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--mui-palette-grey-900)' }}>{navigationMessage || '読み込み中...'}</div>
          </div>
        </div>
      )}

      <div className="MuiAppBar-root">
        <div className="MuiToolbar-root">
          <div className="app-title">物件選択</div>
        </div>
      </div>

      <div className="MuiContainer-root">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="MuiTextField-root">
            <input
              type="text"
              placeholder="物件IDまたは物件名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading && properties.length === 0}
            />
          </div>

          {loading && isFetched && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', gap: '12px' }}>
              <div className="MuiCircularProgress-root" style={{ width: '24px', height: '24px' }}></div>
              <div style={{ fontSize: '0.875rem', color: 'var(--mui-palette-grey-900)' }}>処理中...</div>
            </div>
          )}

          {error && (
            <div className="MuiAlert-root" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 8px 0', color: '#b91c1c' }}>エラー</div>
              <div style={{ fontSize: '1rem', margin: 0, color: '#b91c1c' }}>{String(error)}</div>
            </div>
          )}

          {!loading && isFetched && properties.length === 0 && !error && (
            <div style={{ textAlign: 'center', color: 'var(--mui-palette-grey-900)', fontSize: '1rem' }}>登録されている物件がありません。</div>
          )}

          {!loading && isFetched && properties.length > 0 && filteredProperties.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--mui-palette-grey-900)', fontSize: '1rem' }}>該当する物件が見つかりません。</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredProperties.map((property, index) => (
              <div
                key={property.id}
                data-property-id={property.id}
                className={`MuiCard-root ${(loading || isNavigating) ? 'MuiCard-disabled' : ''}`}
                onClick={() => !(loading || isNavigating) && handlePropertySelect(property)}
                style={{ opacity: (loading || isNavigating) ? 0.6 : 1, cursor: (loading || isNavigating) ? 'not-allowed' : 'pointer', animationDelay: `${index * 0.1}s` }}
              >
                <div className="MuiCardContent-root">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{ backgroundColor: 'var(--mui-palette-grey-100)', color: 'var(--mui-palette-grey-900)', fontSize: '0.875rem', fontWeight: 600, padding: '8px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          ID: {String(property.id || 'IDなし')}
                        </div>
                        {(() => {
                          const completionText = formatCompletionDate(property.completionDate);
                          return completionText ? (
                            <div style={{ backgroundColor: '#e8f5e8', color: '#2e7d32', fontSize: '0.75rem', fontWeight: 600, padding: '6px 10px', borderRadius: '12px', border: '1px solid #c8e6c9', boxShadow: '0 2px 8px rgba(46,125,50,0.15)' }}>
                              {completionText}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--mui-palette-grey-900)', lineHeight: 1.4, margin: 0 }}>
                        {String(property.name || '名称なし')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'var(--mui-palette-primary-main)', flexShrink: 0 }}>
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertySelectApp;
