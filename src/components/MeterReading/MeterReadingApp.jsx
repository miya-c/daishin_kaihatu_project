import React, { useState, useCallback, useMemo } from 'react';
import { formatDateForDisplay } from './utils/dateUtils';
import { formatReading, formatInspectionStatus, calculateUsageDisplay } from './utils/formatUtils';
import { calculateWarningFlag, getStatusDisplay, getStandardDeviationDisplay } from './utils/warningFlag';
import { useMeterReadings } from './hooks/useMeterReadings';
import { useRoomNavigation } from './hooks/useRoomNavigation';
import { useReadingUpdate } from './hooks/useReadingUpdate';
import LoadingOverlay from './components/LoadingOverlay';
import ToastOverlay from './components/ToastOverlay';
import NavigationButtons from './components/NavigationButtons';

const MeterReadingApp = () => {
  const {
    loading, error, propertyId, propertyName, roomId, roomName,
    meterReadings, setMeterReadings, gasWebAppUrl,
    setError,
  } = useMeterReadings();

  const displayToast = useCallback((message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setToastMessage('');
    }, 3000);
  }, []);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const {
    updating, isNavigating, navigationMessage,
    setUpdating, setIsNavigating,
    getRoomNavigation, handlePreviousRoom, handleNextRoom, handleBackButton,
  } = useRoomNavigation({
    propertyId, roomId, gasWebAppUrl, meterReadings, setMeterReadings, displayToast
  });

  const {
    inputErrors, setInputErrors,
    usageStates, setUsageStates,
  } = useReadingUpdate({
    propertyId, roomId, gasWebAppUrl, meterReadings, setMeterReadings,
    displayToast, setUpdating
  });

  // Controlled input values for each reading date
  const [readingValues, setReadingValues] = useState({});

  // Initialize reading values when meterReadings changes
  React.useEffect(() => {
    const initialValues = {};
    meterReadings.forEach(reading => {
      const date = reading.date;
      if (!(date in readingValues)) {
        initialValues[date] = formatReading(reading.currentReading);
      }
    });
    // Also handle initial reading form (empty date key)
    if (!('' in readingValues)) {
      initialValues[''] = '';
    }
    if (Object.keys(initialValues).length > 0) {
      setReadingValues(prev => ({ ...initialValues, ...prev }));
    }
  }, [meterReadings]);

  const getPreviousReadingsText = useCallback((r) => {
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
  }, []);

  const collectReadingsFromState = useCallback(() => {
    const readings = [];
    meterReadings.forEach(reading => {
      const date = reading.date;
      const originalValue = formatReading(reading.currentReading);
      const currentValue = readingValues[date] ?? originalValue;

      if (currentValue && currentValue !== originalValue && currentValue.trim() !== '') {
        const numericValue = parseFloat(currentValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          readings.push({
            date: date,
            currentReading: currentValue,
            warningFlag: reading.warningFlag || '正常'
          });
        }
      }
    });
    return readings;
  }, [meterReadings, readingValues]);

  const handleInputChange = useCallback((date, value, reading, index) => {
    setReadingValues(prev => ({ ...prev, [date]: value }));
    const previousValue = formatReading(reading.previousReading);
    const numericValue = parseFloat(value);

    if (value === '') {
      setInputErrors(prev => ({ ...prev, [date]: '' }));
      setUsageStates(prev => ({ ...prev, [date]: calculateUsageDisplay(value, previousValue) }));
    } else if (isNaN(numericValue) || numericValue < 0) {
      setInputErrors(prev => ({ ...prev, [date]: '0以上の数値を入力' }));
      setUsageStates(prev => ({ ...prev, [date]: '-' }));
    } else {
      setInputErrors(prev => ({ ...prev, [date]: '' }));
      const usageDisplay = calculateUsageDisplay(value, previousValue);
      setUsageStates(prev => ({ ...prev, [date]: usageDisplay }));

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
  }, [setInputErrors, setUsageStates, setMeterReadings]);

  const handleInitialInputChange = useCallback((value) => {
    const dateForDataAttribute = "";
    setReadingValues(prev => ({ ...prev, '': value }));
    const numericValue = parseFloat(value);

    if (value === '') {
      setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '初回検針では指示数の入力が必須です。' }));
      setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: '-' }));
    } else if (isNaN(numericValue) || numericValue < 0) {
      setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '0以上の数値を入力してください。' }));
      setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: '-' }));
    } else {
      setInputErrors(prev => ({ ...prev, [dateForDataAttribute]: '' }));
      setUsageStates(prev => ({ ...prev, [dateForDataAttribute]: calculateUsageDisplay(value, '') }));
    }
  }, [setInputErrors, setUsageStates]);

  const handleUpdateReadings = useCallback(async () => {
    if (!propertyId || !roomId) {
      displayToast('物件IDまたは部屋IDが取得できませんでした。');
      return;
    }

    const updatedReadings = [];
    let hasValidationErrors = false;

    for (const reading of meterReadings) {
      const date = reading.date;
      const originalValue = formatReading(reading.currentReading);
      const currentValue = readingValues[date] ?? originalValue;

      if (originalValue === '' && (!currentValue || currentValue.trim() === '')) {
        setInputErrors(prev => ({ ...prev, [date]: '初回検針では指示数の入力が必須です。' }));
        hasValidationErrors = true;
        continue;
      }

      if (currentValue !== originalValue) {
        const numericValue = parseFloat(currentValue);
        if (currentValue && (isNaN(numericValue) || numericValue < 0)) {
          setInputErrors(prev => ({ ...prev, [date]: '指示数は0以上の数値を入力してください。' }));
          hasValidationErrors = true;
          continue;
        }

        const inspectionDate = new Intl.DateTimeFormat('ja-CA', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date());

        updatedReadings.push({
          date: inspectionDate,
          currentReading: currentValue,
          warningFlag: reading.warningFlag || '正常'
        });
      }
    }

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

        // Reload data
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
  }, [propertyId, roomId, gasWebAppUrl, meterReadings, readingValues, displayToast, setUpdating]);

  const navigation = getRoomNavigation();

  // Loading state
  if (loading) {
    return (
      <>
        <div className="app-header">
          <button onClick={() => handleBackButton(propertyId, roomId)} className="back-button" aria-label="戻る">
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
          <button onClick={() => handleBackButton(propertyId, roomId)} className="back-button" aria-label="戻る">
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

  const hasReadingsWithPrevious = Array.isArray(meterReadings) && meterReadings.length > 0 &&
    meterReadings.some(reading => reading.previousReading && reading.previousReading !== '' && reading.previousReading !== 0);

  // Main content
  return (
    <>
      {isNavigating && <LoadingOverlay message={navigationMessage} />}
      <div className="app-header">
        <button onClick={() => handleBackButton(propertyId, roomId)} className="back-button" aria-label="戻る">
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
          <div className="mantine-paper reading-history-container" style={{ padding: 'var(--mui-spacing-xs)', margin: '0' }}>
            <div className="reading-history-header">
              <NavigationButtons
                hasPrevious={navigation.hasPrevious}
                hasNext={navigation.hasNext}
                disabled={updating}
                onPrevious={() => handlePreviousRoom(collectReadingsFromState)}
                onNext={() => handleNextRoom(collectReadingsFromState)}
                variant="header"
              />
            </div>

            {hasReadingsWithPrevious ? (
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
                        const currentReadingDisplay = readingValues[dateForDataAttribute] ?? formatReading(reading.currentReading);

                        const usageToDisplay = usageStates[dateForDataAttribute] !== undefined
                          ? usageStates[dateForDataAttribute]
                          : calculateUsageDisplay(reading.currentReading, reading.previousReading);

                        const usageDisplayString = `${usageToDisplay}${usageToDisplay !== '-' ? '㎥' : ''}`;
                        const previousReadingsInfo = getPreviousReadingsText(reading);

                        return (
                          <tr key={index}>
                            <td data-label="検針日時">
                              <span style={{
                                color: inspectionStatus.status === '未検針' ? 'var(--mui-palette-red-6)' : 'inherit',
                                fontWeight: inspectionStatus.status === '未検針' ? 'bold' : 'normal'
                              }}>
                                最終検針日時: {inspectionStatus.status === '未検針' ? '未検針' : inspectionStatus.displayDate}
                              </span>
                            </td>
                            <td data-label="今回指示数(㎥)">
                              <input
                                type="number"
                                step="any"
                                value={currentReadingDisplay}
                                placeholder="指示数入力"
                                min="0"
                                data-date={dateForDataAttribute}
                                data-original-value={formatReading(reading.currentReading)}
                                data-previous-reading={formatReading(reading.previousReading)}
                                className="mantine-input"
                                onChange={(e) => handleInputChange(dateForDataAttribute, e.target.value, reading, index)}
                              />
                              {inputErrors[dateForDataAttribute] && (
                                <div style={{
                                  color: 'var(--mui-palette-red-6)',
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
                                  if (status === '要確認') return 'var(--mui-palette-red-light)';
                                  if (status === '正常') return 'var(--mui-palette-green-light)';
                                  return 'var(--mui-palette-grey-2)';
                                })(),
                                color: (() => {
                                  const status = getStatusDisplay(reading);
                                  if (status === '要確認') return 'var(--mui-palette-red-8)';
                                  if (status === '正常') return 'var(--mui-palette-green-8)';
                                  return 'var(--mui-palette-grey-7)';
                                })(),
                                borderRadius: 'var(--mui-radius-sm)'
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

                <NavigationButtons
                  hasPrevious={navigation.hasPrevious}
                  hasNext={navigation.hasNext}
                  disabled={updating}
                  onPrevious={() => handlePreviousRoom(collectReadingsFromState)}
                  onNext={() => handleNextRoom(collectReadingsFromState)}
                  variant="footer"
                />
              </>
            ) : (
              <div className="mantine-stack">
                <div className="mantine-alert info">
                  <h3 className="mantine-text weight-600">初回検針</h3>
                </div>
                <div className="mantine-paper" style={{ marginTop: 'var(--mui-spacing-md)', padding: 'var(--mui-spacing-md)' }}>
                  <h4 className="mantine-subtitle" style={{ marginBottom: 'var(--mui-spacing-sm)' }}>初回データ入力</h4>
                  <div className="mantine-stack" style={{ gap: 'var(--mui-spacing-lg)' }}>
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
                        value={readingValues[''] ?? ''}
                        onChange={(e) => handleInitialInputChange(e.target.value)}
                      />
                      {inputErrors[""] && (
                        <div style={{ color: 'var(--mui-palette-red-6)', fontSize: '0.9em', marginTop: '4px' }}>
                          {inputErrors[""]}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mantine-text weight-600" style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>今回使用量:</label>
                      <div style={{
                        backgroundColor: '#e3f2fd',
                        border: '1px solid var(--mui-palette-grey-3)',
                        borderRadius: 'var(--mui-radius-sm)',
                        padding: '10px',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: 'var(--mui-palette-blue-7)',
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {usageStates[""] !== undefined
                          ? `${usageStates[""]}${usageStates[""] !== '-' ? '㎥' : ''}`
                          : '-'}
                      </div>
                      <div style={{ fontSize: '0.85em', color: 'var(--mui-palette-grey-6)', marginTop: '4px' }}>
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
              title={hasReadingsWithPrevious ? "指示数を更新" : "初回検針データを保存"}
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

        <ToastOverlay show={showToast} message={toastMessage} />
      </div>
    </>
  );
};

export default MeterReadingApp;
