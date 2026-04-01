import { useState, useCallback, useEffect, useRef } from 'react';
import { formatReading, calculateUsageDisplay } from './utils/formatUtils';
import { calculateWarningFlag } from './utils/warningFlag';
import { useMeterReadings } from './hooks/useMeterReadings';
import { useRoomNavigation } from './hooks/useRoomNavigation';
import { useReadingUpdate } from './hooks/useReadingUpdate';
import { useToast } from './hooks/useToast';
import LoadingOverlay from './components/LoadingOverlay';
import ToastOverlay from './components/ToastOverlay';
import NavigationButtons from './components/NavigationButtons';
import PropertyInfoHeader from './components/PropertyInfoHeader';
import ReadingHistoryTable from './components/ReadingHistoryTable';
import InitialReadingForm from './components/InitialReadingForm';
import NetworkStatusBar from '../NetworkStatusBar';
import useNetworkStatus from '../../hooks/useNetworkStatus';

import type { MeterReading } from '../../types';

const MeterReadingApp = () => {
  const { isOnline } = useNetworkStatus();
  const {
    loading,
    error,
    propertyId,
    propertyName,
    roomId,
    roomName,
    meterReadings,
    setMeterReadings,
    gasWebAppUrl,
    loadMeterReadings,
  } = useMeterReadings();

  const { toastMessage, showToast, displayToast } = useToast();

  // Ref for in-place room navigation (set after all hooks are initialized)
  const navigateToRoomRef = useRef<(targetRoomId: string) => void>(() => {});

  const {
    updating,
    isNavigating,
    navigationMessage,
    setUpdating,
    getRoomNavigation,
    handlePreviousRoom,
    handleNextRoom,
    handleBackButton,
  } = useRoomNavigation({
    propertyId,
    roomId,
    gasWebAppUrl,
    displayToast,
    onNavigateToRoom: useCallback((targetRoomId: string) => {
      navigateToRoomRef.current?.(targetRoomId);
    }, []),
  });

  const { inputErrors, setInputErrors, usageStates, setUsageStates } = useReadingUpdate({
    propertyId,
    roomId,
    gasWebAppUrl,
    meterReadings,
    displayToast,
    setUpdating,
  });

  // Track whether reading was successfully saved for optimistic cache update
  const hasSavedRef = useRef(false);

  // Wire up in-place navigation after all hooks are available
  navigateToRoomRef.current = (targetRoomId: string) => {
    hasSavedRef.current = false;
    const newUrl = `/reading/?propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(targetRoomId)}`;
    window.history.replaceState(null, '', newUrl);
    // silent=true: don't show full-page loading skeleton, keep current content visible
    loadMeterReadings(propertyId, targetRoomId, 3, true).then((newReadings) => {
      // Compute new readingValues directly from returned data (atomic update, no flash)
      const newValues: Record<string, string> = { '': '' };
      if (newReadings && Array.isArray(newReadings)) {
        newReadings.forEach((reading) => {
          newValues[reading.date] = formatReading(reading.currentReading);
        });
      }
      setReadingValues(newValues);
      setInputErrors({});
      setUsageStates({});
      window.scrollTo(0, 0);
    });
  };

  // Controlled input values for each reading date
  const [readingValues, setReadingValues] = useState<Record<string, string>>({});

  // Initialize reading values when meterReadings changes
  useEffect(() => {
    setReadingValues((prev) => {
      const updated = { ...prev };
      meterReadings.forEach((reading) => {
        if (!(reading.date in updated)) {
          updated[reading.date] = formatReading(reading.currentReading);
        }
      });
      if (!('' in updated)) updated[''] = '';
      return updated;
    });
  }, [meterReadings]);

  const collectReadingsFromState = useCallback(() => {
    const readings: Record<string, unknown>[] = [];

    for (const reading of meterReadings) {
      const date = reading.date;
      const originalValue = formatReading(reading.currentReading);
      const currentValue = readingValues[date] ?? originalValue;

      if (currentValue && currentValue !== originalValue && currentValue.trim() !== '') {
        const numericValue = parseFloat(currentValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          const inspectionDate = new Intl.DateTimeFormat('ja-CA', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());

          readings.push({
            date: inspectionDate,
            currentReading: currentValue,
            warningFlag: reading.warningFlag || '正常',
          });
        }
      }
    }

    // Also check initial reading form (empty date key)
    const initialValue = readingValues[''] ?? '';
    if (initialValue && initialValue.trim() !== '') {
      const numericValue = parseFloat(initialValue);
      if (!isNaN(numericValue) && numericValue >= 0) {
        const inspectionDate = new Intl.DateTimeFormat('ja-CA', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        readings.push({
          date: inspectionDate,
          currentReading: initialValue,
          warningFlag: '正常',
        });
      }
    }

    return readings;
  }, [meterReadings, readingValues]);

  const handleInputChange = useCallback(
    (date: string, value: string, reading: MeterReading) => {
      setReadingValues((prev) => ({ ...prev, [date]: value }));
      const previousValue = formatReading(reading.previousReading);
      const numericValue = parseFloat(value);

      if (value === '') {
        setInputErrors((prev) => ({ ...prev, [date]: '' }));
        setUsageStates((prev) => ({
          ...prev,
          [date]: calculateUsageDisplay(value, previousValue),
        }));
      } else if (isNaN(numericValue) || numericValue < 0) {
        setInputErrors((prev) => ({ ...prev, [date]: '0以上の数値を入力' }));
        setUsageStates((prev) => ({ ...prev, [date]: '-' }));
      } else {
        setInputErrors((prev) => ({ ...prev, [date]: '' }));
        const usageDisplay = calculateUsageDisplay(value, previousValue);
        setUsageStates((prev) => ({ ...prev, [date]: usageDisplay }));

        // Real-time warning flag calculation
        const previousReadingValue = parseFloat(String(reading.previousReading)) || 0;
        const previousPreviousReadingValue =
          parseFloat(String(reading.previousPreviousReading)) || 0;
        const threeTimesPreviousReadingValue = parseFloat(String(reading.threeTimesPrevious)) || 0;

        const warningResult = calculateWarningFlag(
          numericValue,
          previousReadingValue,
          previousPreviousReadingValue,
          threeTimesPreviousReadingValue
        );

        setMeterReadings((prevReadings) =>
          prevReadings.map((r) =>
            r.date === date
              ? {
                  ...r,
                  warningFlag: warningResult.warningFlag,
                  standardDeviation: warningResult.standardDeviation,
                }
              : r
          )
        );
      }
    },
    [setInputErrors, setUsageStates, setMeterReadings]
  );

  const handleInitialInputChange = useCallback(
    (value: string) => {
      const dateForDataAttribute = '';
      setReadingValues((prev) => ({ ...prev, '': value }));
      const numericValue = parseFloat(value);

      if (value === '') {
        setInputErrors((prev) => ({
          ...prev,
          [dateForDataAttribute]: '初回検針では指示数の入力が必須です。',
        }));
        setUsageStates((prev) => ({ ...prev, [dateForDataAttribute]: '-' }));
      } else if (isNaN(numericValue) || numericValue < 0) {
        setInputErrors((prev) => ({
          ...prev,
          [dateForDataAttribute]: '0以上の数値を入力してください。',
        }));
        setUsageStates((prev) => ({ ...prev, [dateForDataAttribute]: '-' }));
      } else {
        setInputErrors((prev) => ({ ...prev, [dateForDataAttribute]: '' }));
        setUsageStates((prev) => ({
          ...prev,
          [dateForDataAttribute]: calculateUsageDisplay(value, ''),
        }));
      }
    },
    [setInputErrors, setUsageStates]
  );

  const handleUpdateReadings = useCallback(async () => {
    if (!propertyId || !roomId) {
      displayToast('物件IDまたは部屋IDが取得できませんでした。');
      return;
    }

    // Validate: check for empty required fields
    let hasValidationErrors = false;
    for (const reading of meterReadings) {
      const date = reading.date;
      const originalValue = formatReading(reading.currentReading);
      const currentValue = readingValues[date] ?? originalValue;

      if (originalValue === '' && (!currentValue || currentValue.trim() === '')) {
        setInputErrors((prev) => ({ ...prev, [date]: '初回検針では指示数の入力が必須です。' }));
        hasValidationErrors = true;
      }
    }

    if (hasValidationErrors) {
      displayToast('入力値に誤りがあります。各項目のエラーを確認してください。');
      return;
    }

    const updatedReadings = collectReadingsFromState();

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
        readings: JSON.stringify(updatedReadings),
      });
      const requestUrl = `${currentGasUrl}?${params}`;

      const response = await fetch(requestUrl, { method: 'GET' });

      if (!response.ok) {
        throw new Error(
          'ネットワークの応答が正しくありませんでした。ステータス: ' + response.status
        );
      }

      const result = await response.json();

      if (result.success) {
        hasSavedRef.current = true;
        displayToast('検針データが正常に更新されました');
        setInputErrors({});
      } else {
        throw new Error(result.error || '指示数の更新に失敗しました。');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      displayToast('更新エラー: ' + message);
    } finally {
      setUpdating(false);
    }
  }, [
    propertyId,
    roomId,
    gasWebAppUrl,
    meterReadings,
    readingValues,
    displayToast,
    setUpdating,
    collectReadingsFromState,
    setInputErrors,
  ]);

  const navigation = getRoomNavigation();

  // Loading state
  if (loading) {
    return (
      <>
        <NetworkStatusBar />
        <a href="#main-content" className="skip-link">
          メインコンテンツへ
        </a>
        <div className="app-header">
          <button
            onClick={() => handleBackButton(propertyId, roomId, hasSavedRef.current)}
            className="back-button"
            aria-label="戻る"
          >
            &lt;
          </button>
          <h1 className="header-title">検針情報</h1>
        </div>
        <div id="main-content" className="content-area mantine-container">
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
        <NetworkStatusBar />
        <a href="#main-content" className="skip-link">
          メインコンテンツへ
        </a>
        <div className="app-header">
          <button
            onClick={() => handleBackButton(propertyId, roomId, hasSavedRef.current)}
            className="back-button"
            aria-label="戻る"
          >
            &lt;
          </button>
          <h1 className="header-title">検針情報</h1>
        </div>
        <div id="main-content" className="content-area mantine-container">
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

  const hasReadingsWithPrevious =
    Array.isArray(meterReadings) &&
    meterReadings.length > 0 &&
    meterReadings.some(
      (reading) =>
        reading.previousReading && reading.previousReading !== '' && reading.previousReading !== 0
    );

  // Main content
  return (
    <>
      {isNavigating && <LoadingOverlay message={navigationMessage} />}
      <NetworkStatusBar />
      <a href="#main-content" className="skip-link">
        メインコンテンツへ
      </a>
      <div className="app-header">
        <button
          onClick={() => handleBackButton(propertyId, roomId, hasSavedRef.current)}
          className="back-button"
          aria-label="戻る"
        >
          &lt;
        </button>
        <h1 className="header-title">検針情報</h1>
      </div>

      <div id="main-content" className="content-area mantine-container">
        <div className="mantine-stack">
          <PropertyInfoHeader propertyName={propertyName} roomName={roomName} />
          <div
            className="mantine-paper reading-history-container"
            style={{ padding: 'var(--mui-spacing-xs)', margin: '0' }}
          >
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
                <ReadingHistoryTable
                  meterReadings={meterReadings}
                  readingValues={readingValues}
                  inputErrors={inputErrors}
                  usageStates={usageStates}
                  onInputChange={handleInputChange}
                />

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
              <InitialReadingForm
                readingValue={readingValues[''] ?? ''}
                inputError={inputErrors[''] ?? ''}
                usageState={usageStates[''] ?? ''}
                onInputChange={handleInitialInputChange}
              />
            )}
          </div>
        </div>

        {!loading && !error && (
          <div
            className="fab-container"
            style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1001 }}
          >
            <button
              className="fab-button mantine-button variant-filled"
              onClick={handleUpdateReadings}
              disabled={updating || isNavigating || !isOnline}
              title={hasReadingsWithPrevious ? '指示数を更新' : '初回検針データを保存'}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                fontSize: '28px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {updating ? (
                <div
                  className="mantine-loader"
                  style={{ width: '32px', height: '32px', borderTopColor: 'white' }}
                ></div>
              ) : (
                '💾'
              )}
            </button>
          </div>
        )}

        <ToastOverlay show={showToast} message={toastMessage} />
      </div>
    </>
  );
};

export default MeterReadingApp;
