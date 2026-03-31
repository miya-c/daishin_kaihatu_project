import { useState, useCallback } from 'react';
import { getCurrentJSTDateString } from '../utils/dateUtils';

import type { MeterReading } from '../../../types';

interface UseReadingUpdateParams {
  propertyId: string;
  roomId: string;
  gasWebAppUrl: string;
  meterReadings: MeterReading[];
  setMeterReadings: React.Dispatch<React.SetStateAction<MeterReading[]>>;
  displayToast: (message: string) => void;
  setUpdating: React.Dispatch<React.SetStateAction<boolean>>;
}

function formatReading(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value).trim();
}

export const useReadingUpdate = ({
  propertyId,
  roomId,
  gasWebAppUrl,
  meterReadings,
  displayToast,
  setUpdating,
}: Omit<UseReadingUpdateParams, 'setMeterReadings'>) => {
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const [usageStates, setUsageStates] = useState<Record<string, string>>({});

  const handleUpdateReadings = useCallback(
    async (readingValues: Record<string, string>): Promise<boolean | void> => {
      if (!propertyId || !roomId) {
        displayToast('物件IDまたは部屋IDが取得できませんでした。');
        return;
      }

      const updatedReadings: Record<string, unknown>[] = [];
      let hasValidationErrors = false;
      const newInputErrors = { ...inputErrors };

      for (const reading of meterReadings) {
        const date = reading.date;
        const originalValue = formatReading(reading.currentReading);
        const currentValue = (readingValues && readingValues[date]) ?? originalValue;

        newInputErrors[date] = '';

        if (originalValue === '' && (!currentValue || currentValue.trim() === '')) {
          newInputErrors[date] = '初回検針では指示数の入力が必須です。';
          hasValidationErrors = true;
          continue;
        }

        if (currentValue !== originalValue && currentValue && currentValue.trim() !== '') {
          const numericValue = parseFloat(currentValue);
          if (isNaN(numericValue) || numericValue < 0) {
            newInputErrors[date] = '指示数は0以上の数値を入力してください。';
            hasValidationErrors = true;
            continue;
          }

          const inspectionDate = getCurrentJSTDateString();
          const warningFlag = reading.warningFlag || '正常';

          updatedReadings.push({
            date: inspectionDate,
            currentReading: currentValue,
            warningFlag: warningFlag,
          });
        }
      }

      setInputErrors(newInputErrors);

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
          displayToast('検針データが正常に更新されました');
          setInputErrors({});
          return true;
        } else {
          throw new Error(result.error || '指示数の更新に失敗しました。');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        displayToast('更新エラー: ' + message);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [propertyId, roomId, gasWebAppUrl, meterReadings, inputErrors, displayToast, setUpdating]
  );

  return {
    inputErrors,
    setInputErrors,
    usageStates,
    setUsageStates,
    handleUpdateReadings,
  };
};
