import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropertyCard from './PropertyCard.jsx';
import { fetchPropertiesWithFallback, fetchRoomsWithFallback } from '../utils/api.js';

const PropertySelect = () => {
  // All state declarations
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFetched, setIsFetched] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState('');
  
  // Constants
  const gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbxo-Zij6If9eSFO-hB2bC_mvYtEGFxaUdwsngqGKcygh2GTHWqHPDrdHSJVC_JTpq2KSw/exec';

  // All callback functions first
  const formatCompletionDate = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
      return '';
    }
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `検針完了日：${month}月${day}日`;
    } catch (error) {
      console.error('formatCompletionDate error:', error);
      return '';
    }
  }, []);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // All memoized values
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties
      .filter(property => {
        const propertyIdString = String(property.id != null ? property.id : ''); 
        const propertyNameString = String(property.name != null ? property.name : '');
        return propertyIdString.toLowerCase().includes(searchTerm.toLowerCase()) ||
               propertyNameString.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const idA = String(a.id || '').trim();
        const idB = String(b.id || '').trim();
        return idA.localeCompare(idB, 'ja', { numeric: true, sensitivity: 'base' });
      });
  }, [properties, searchTerm]);

  // All useEffects
  useEffect(() => {
    const handleForceHideLoading = () => {
      if (!isFetched) {
        setLoading(false);
        setError(null);
        setIsNavigating(false);
        setNavigationMessage('');
      }
    };

    if (window.forceHideLoading) {
      handleForceHideLoading();
      window.forceHideLoading = false;
    }

    window.addEventListener('forceHideLoading', handleForceHideLoading);
    return () => window.removeEventListener('forceHideLoading', handleForceHideLoading);
  }, [isFetched]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchProperties = async () => {
      console.log('🚀 プロパティデータ取得開始');
      setLoading(true);
      setError(null);
      setIsFetched(false);
      
      try {
        const actualData = await fetchPropertiesWithFallback();
        
        if (!Array.isArray(actualData)) {
          throw new Error('取得されたデータが配列形式ではありません。');
        }
        
        const normalizedData = actualData.map(property => {
          const safeProperty = {
            ...property,
            id: String(property.id || property['物件ID'] || ''),
            name: String(property.name || property['物件名'] || '名称未設定'),
            completionDate: property.completionDate || property['検針完了日'] || '',
          };
          
          Object.keys(safeProperty).forEach(key => {
            if (safeProperty[key] === null || safeProperty[key] === undefined) {
              safeProperty[key] = '';
            }
          });
          
          return safeProperty;
        });
        
        console.log('✅ プロパティデータ正規化完了:', normalizedData.length, '件');
        setProperties(normalizedData);
        setLoading(true);
        
      } catch (fetchError) {
        console.error('❌ プロパティデータ取得エラー:', fetchError);
        setError(`物件情報の取得に失敗しました: ${fetchError.message}`);
        setLoading(false);
      } finally {
        setIsFetched(true);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    if (isFetched && loading) {
      const expectedCount = filteredProperties ? filteredProperties.length : 0;
      
      if (expectedCount === 0) {
        setLoading(false);
        return;
      }
      
      function checkRenderingComplete() {
        requestAnimationFrame(() => {
          const propertyElements = document.querySelectorAll('.MuiCard-root, .property-card, [data-property-id]');
          
          if (propertyElements.length >= expectedCount && expectedCount > 0) {
            requestAnimationFrame(() => {
              setLoading(false);
            });
          } else {
            setTimeout(checkRenderingComplete, 50);
          }
        });
      }
      
      const fallbackTimeout = setTimeout(() => {
        setLoading(false);
      }, 3000);
      
      checkRenderingComplete();
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [isFetched, loading, filteredProperties]);

  const handlePropertySelect = async (property) => {
    if (!property || typeof property.id === 'undefined' || typeof property.name === 'undefined') {
      alert('選択された物件情報が無効です。');
      return;
    }
    
    window.scrollTo(0, 0);
    setIsNavigating(true);
    setNavigationMessage('');
    
    try {
      console.log(`🏠 部屋データ取得開始 - 物件ID: ${property.id}`);
      
      // 改良されたAPI関数を使用
      const rooms = await fetchRoomsWithFallback(property.id);
      
      const normalizedRooms = rooms.map((room, index) => ({
        ...room,
        id: room.id || room.roomId || room['部屋ID'] || `room-${index}`,
        name: room.name || room.roomName || room['部屋名'] || '部屋名未設定',
        rawInspectionDate: room.rawInspectionDate || room.inspectionDate || room['検針日時'],
        hasActualReading: room.hasActualReading || room.hasReading || room['検針済み'] || false,
        ...Object.keys(room).reduce((acc, key) => {
          if (!['id', 'name', 'rawInspectionDate', 'hasActualReading'].includes(key)) {
            acc[key] = room[key];
          }
          return acc;
        }, {})
      }));
      
      // Store data in sessionStorage
      sessionStorage.setItem('selectedPropertyId', String(property.id));
      sessionStorage.setItem('selectedPropertyName', String(property.name));
      sessionStorage.setItem('selectedRooms', JSON.stringify(normalizedRooms));
      
      if (gasWebAppUrl) {
        sessionStorage.setItem('gasWebAppUrl', gasWebAppUrl);
      }

      setNavigationMessage('');
      
      const targetUrl = `/room_select?propertyId=${encodeURIComponent(property.id)}`;
      // Remove artificial delay - performance improvement
      window.location.href = targetUrl;
      
    } catch (error) {
      console.error('Error fetching rooms or navigating:', error);
      
      sessionStorage.setItem('selectedPropertyId', String(property.id));
      sessionStorage.setItem('selectedPropertyName', String(property.name));
      sessionStorage.setItem('selectedRooms', JSON.stringify([]));
      
      if (gasWebAppUrl) {
        sessionStorage.setItem('gasWebAppUrl', gasWebAppUrl);
      }
      
      if (error.message && (error.message.includes('部屋データの形式') || error.message.includes('部屋情報の取得に失敗'))) {
        setNavigationMessage('');
        const targetUrl = `/room_select?propertyId=${encodeURIComponent(property.id)}`;
        window.location.href = targetUrl;
      } else {
        setError(`部屋情報の処理中にエラーが発生しました: ${error.message}`);
        setIsNavigating(false);
      }
    }
  };

  // Loading overlay component
  const LoadingOverlay = ({ message }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
      
      const blockAllKeys = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      document.addEventListener('keydown', blockAllKeys, true);
      document.addEventListener('keyup', blockAllKeys, true);
      document.addEventListener('keypress', blockAllKeys, true);
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
        document.removeEventListener('keydown', blockAllKeys, true);
        document.removeEventListener('keyup', blockAllKeys, true);
        document.removeEventListener('keypress', blockAllKeys, true);
      };
    }, []);
    
    return (
      <div className="MuiBackdrop-root" style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647,
        backdropFilter: 'blur(4px)',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        pointerEvents: 'all'
      }}>
        <div className="MuiPaper-root" style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: 'var(--mui-shadows-4)',
          maxWidth: '320px',
          textAlign: 'center',
          position: 'relative',
          margin: 'auto'
        }}>
          <div className="MuiCircularProgress-root"></div>
          <div className="MuiTypography-root" style={{
            fontSize: '1rem',
            fontWeight: 500,
            color: 'var(--mui-palette-grey-900)',
            margin: 0,
            letterSpacing: '0.00938em'
          }}>
            {message || '読み込み中...'}
          </div>
        </div>
      </div>
    );
  };


  // Initial loading state
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
              <input
                type="text"
                placeholder="物件IDまたは物件名で検索..."
                value=""
                disabled
                style={{ 
                  opacity: 0.6,
                  cursor: 'not-allowed'
                }}
              />
            </div>
            
            <div className="loading-container">
              <div className="MuiCircularProgress-root"></div>
              <div className="MuiTypography-root" style={{
                fontSize: '1.1rem',
                color: 'var(--mui-palette-grey-900)',
                fontWeight: 500,
                textAlign: 'center',
                margin: '16px 0 0 0'
              }}>
                物件情報を読み込み中です...
              </div>
              <div className="MuiTypography-root" style={{
                fontSize: '0.875rem',
                color: 'var(--mui-palette-grey-600)',
                textAlign: 'center',
                margin: '8px 0 0 0'
              }}>
                しばらくお待ちください
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
              <input
                type="text"
                placeholder="物件IDまたは物件名で検索..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
            
            <div className="MuiAlert-root">
              <div className="MuiTypography-root" style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                margin: '0 0 8px 0',
                color: '#b91c1c'
              }}>
                エラー
              </div>
              <div className="MuiTypography-root" style={{
                fontSize: '1rem',
                margin: 0,
                color: '#b91c1c'
              }}>
                {String(error || 'エラーが発生しました')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Main display
  return (
    <div style={{ minHeight: '100vh' }}>
      {isNavigating && <LoadingOverlay message={navigationMessage} />}
      
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
              onChange={handleSearchChange}
              disabled={loading && properties.length === 0}
            />
          </div>
          
          {loading && isFetched && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              gap: '12px'
            }}>
              <div className="MuiCircularProgress-root" style={{
                width: '24px',
                height: '24px'
              }}></div>
              <div className="MuiTypography-root" style={{
                fontSize: '0.875rem',
                color: 'var(--mui-palette-grey-900)',
                margin: 0
              }}>
                処理中...
              </div>
            </div>
          )}
          
          {error && (
            <div className="MuiAlert-root" style={{ marginBottom: '16px' }}>
              <div className="MuiTypography-root" style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                margin: '0 0 8px 0',
                color: '#b91c1c'
              }}>
                エラー
              </div>
              <div className="MuiTypography-root" style={{
                fontSize: '1rem',
                margin: 0,
                color: '#b91c1c'
              }}>
                {String(error || 'エラーが発生しました')}
              </div>
            </div>
          )}

          {!loading && isFetched && properties.length === 0 && !error && (
            <div className="MuiTypography-root" style={{
              textAlign: 'center',
              color: 'var(--mui-palette-grey-900)',
              fontSize: '1rem',
              margin: 0
            }}>
              登録されている物件がありません。
            </div>
          )}
          
          {!loading && isFetched && properties.length > 0 && (filteredProperties ? filteredProperties.length === 0 : false) && (
            <div className="MuiTypography-root" style={{
              textAlign: 'center',
              color: 'var(--mui-palette-grey-900)',
              fontSize: '1rem',
              margin: 0
            }}>
              該当する物件が見つかりません。
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(filteredProperties || []).map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
                loading={loading}
                isNavigating={isNavigating}
                onPropertySelect={handlePropertySelect}
                formatCompletionDate={formatCompletionDate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertySelect;