import { mapReadingFromApi } from '../utils/readingMapper';
import { validateId } from '../../../utils/validateParams';
import { NOT_AVAILABLE, ROOM_NAME_UNKNOWN } from '../../../constants/messages';

import type { MeterReading } from '../../../types';

export function createMeterReadings() {
  let loading = $state(true);
  let error = $state<string | null>(null);
  let propertyId = $state('');
  let propertyName = $state('');
  let roomId = $state('');
  let roomName = $state('');
  let meterReadings = $state<MeterReading[]>([]);
  let gasWebAppUrl = $state('');
  let abortController: AbortController | null = null;

  // Scroll to top on mount
  $effect(() => {
    window.scrollTo(0, 0);
  });

  // Load gasWebAppUrl from sessionStorage (runs once at creation time)
  {
    let urlFromSession: string | null = null;
    try {
      urlFromSession = sessionStorage.getItem('gasWebAppUrl');
    } catch {
      // sessionStorage unavailable (e.g. private browsing)
    }
    if (!urlFromSession) {
      error = 'アプリのURLが設定されていません。物件選択画面から再度アクセスしてください。';
      loading = false;
    } else {
      gasWebAppUrl = urlFromSession;
    }
  }

  async function loadMeterReadings(
    propId: string,
    rId: string,
    maxRetries: number = 3,
    silent: boolean = false
  ): Promise<MeterReading[] | null> {
    const currentGasUrl = gasWebAppUrl || sessionStorage.getItem('gasWebAppUrl');
    if (!currentGasUrl) {
      error = 'gasWebAppURLが設定されていません。物件選択画面から再度アクセスしてください。';
      if (!silent) loading = false;
      return null;
    }

    if (!silent) {
      loading = true;
    }

    // Cancel any in-flight request
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    abortController = controller;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fetchUrl = `${currentGasUrl}?action=getMeterReadings&propertyId=${propId}&roomId=${rId}`;
        const response = await fetch(fetchUrl, { signal: controller.signal });

        if (!response.ok) {
          if (response.status === 503 && attempt < maxRetries) {
            const delayMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
          throw new Error(
            'ネットワークの応答が正しくありませんでした。ステータス: ' + response.status
          );
        }

        const responseObject = await response.json();
        if (!responseObject.success) {
          throw new Error(responseObject.error || '検針データの取得に失敗しました');
        }

        const data = responseObject.data;
        if (!data) throw new Error('応答データが空です');

        let pName: string, rName: string, readings: Record<string, unknown>[];
        if (
          Object.prototype.hasOwnProperty.call(data, 'propertyName') &&
          Object.prototype.hasOwnProperty.call(data, 'roomName') &&
          Object.prototype.hasOwnProperty.call(data, 'readings')
        ) {
          pName = data.propertyName || NOT_AVAILABLE;
          rName = data.roomName || ROOM_NAME_UNKNOWN;
          readings = data.readings || [];
        } else if (Array.isArray(data)) {
          if (data.length > 0 && data[0]) {
            pName = data[0]['物件名'] || data[0].propertyName || NOT_AVAILABLE;
            rName = data[0]['部屋名'] || data[0].roomName || ROOM_NAME_UNKNOWN;
          } else {
            pName = NOT_AVAILABLE;
            rName = ROOM_NAME_UNKNOWN;
          }
          readings = data;
        } else {
          throw new Error('検針データの形式が認識できません');
        }

        propertyId = propId || NOT_AVAILABLE;
        propertyName = pName;
        roomId = rId || NOT_AVAILABLE;
        roomName = rName;

        let resultReadings: MeterReading[] = [];
        if (Array.isArray(readings) && readings.length > 0) {
          const mappedReadings = readings.map(
            (rawReading: Record<string, unknown>, index: number) =>
              mapReadingFromApi(rawReading, index, { calculateWarnings: true })
          );
          resultReadings = mappedReadings;
          meterReadings = mappedReadings;
        } else {
          meterReadings = [];
        }

        if (!silent) loading = false;
        return resultReadings;
      } catch (err: unknown) {
        if (controller.signal.aborted) return null;
        if (attempt === maxRetries) {
          const message = err instanceof Error ? err.message : String(err);
          let userMessage = '検針データの読み込みに失敗しました。';
          if (message.includes('503')) {
            userMessage =
              'サーバーが一時的に利用できません。しばらく待ってから再度お試しください。';
          } else if (message.includes('network') || message.includes('fetch')) {
            userMessage =
              'ネットワーク接続に問題があります。インターネット接続を確認してください。';
          }
          error = userMessage + '\n\n問題が継続する場合は、管理者にお問い合わせください。';
          if (!silent) loading = false;
          return null;
        }
      }
    }
    return null;
  }

  // Initial data load when gasWebAppUrl is set
  $effect(() => {
    if (!gasWebAppUrl) return;

    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('propertyId');
    const rId = urlParams.get('roomId');

    if (!propId || !rId) {
      error = '物件情報または部屋情報が不足しているため、検針データを取得できません。';
      loading = false;
      return;
    }

    const propValidation = validateId(propId, '物件ID');
    if (!propValidation.valid) {
      error = propValidation.error ?? '物件IDが無効です';
      loading = false;
      return;
    }

    const roomValidation = validateId(rId, '部屋ID');
    if (!roomValidation.valid) {
      error = roomValidation.error ?? '部屋IDが無効です';
      loading = false;
      return;
    }

    loadMeterReadings(propId, rId);
  });

  // Abort in-flight requests on cleanup
  $effect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  });

  return {
    get loading() { return loading; },
    set loading(val: boolean) { loading = val; },
    get error() { return error; },
    set error(val: string | null) { error = val; },
    get propertyId() { return propertyId; },
    get propertyName() { return propertyName; },
    get roomId() { return roomId; },
    get roomName() { return roomName; },
    get meterReadings() { return meterReadings; },
    set meterReadings(val: MeterReading[]) { meterReadings = val; },
    get gasWebAppUrl() { return gasWebAppUrl; },
    loadMeterReadings,
  };
}
