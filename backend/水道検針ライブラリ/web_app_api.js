/**
 * web_app_api.gs - 水道検針ライブラリ: Web App API関数群
 * ライブラリ版 - 外部プロジェクトから利用可能
 * Last Updated: 2025-06-26
 * バージョン: v3.0.0-library
 */

const API_VERSION = 'v3.0.0-library';
const LAST_UPDATED = '2025-06-26 JST';

// Per-request caches (GAS re-initializes globals on each invocation)
let _cachedApiKey = null;
let _apiKeyFetched = false;
let _cachedFeatureFlags = null;

function validateApiKey(params, requireAuth) {
  const apiKey = params.apiKey || params.api_key;
  if (!_apiKeyFetched) {
    _cachedApiKey =
      params._storedApiKey || PropertiesService.getScriptProperties().getProperty('API_KEY');
    _apiKeyFetched = true;
  }
  const storedKey = _cachedApiKey;

  // 書き込み操作（requireAuth=true）は、API key未設定でもkey必須
  if (requireAuth && !apiKey) {
    return { authorized: false, error: 'API keyが必要です' };
  }

  if (!storedKey) {
    if (requireAuth) {
      return {
        authorized: false,
        error: 'API keyが設定されていません。スクリプトプロパティにAPI_KEYを設定してください。',
      };
    }
    return { authorized: true };
  }

  if (apiKey && apiKey !== storedKey) {
    return { authorized: false, error: 'API keyが無効です' };
  }

  return { authorized: true };
}

/**
 * APIパラメータの入力バリデーション
 * @param {Object} params - リクエストパラメータ
 * @returns {Object} {valid: boolean, error?: string}
 */
function sanitizeApiParams(params) {
  if (params.propertyId) {
    if (!/^P\d{6}$/.test(String(params.propertyId))) {
      return { valid: false, error: 'propertyIdの形式が不正です' };
    }
  }
  if (params.roomId) {
    if (!/^R\d{3,6}$/.test(String(params.roomId))) {
      return { valid: false, error: 'roomIdの形式が不正です' };
    }
  }
  if (params.readings) {
    try {
      const readingsStr =
        typeof params.readings === 'string' ? params.readings : JSON.stringify(params.readings);
      if (readingsStr.length > 10240) {
        return { valid: false, error: 'readingsデータが大きすぎます（10KB上限）' };
      }
      const parsed = JSON.parse(readingsStr);
      if (Array.isArray(parsed)) {
        for (const r of parsed) {
          if (r.currentReading !== undefined) {
            const val = Number(r.currentReading);
            if (isNaN(val) || val < 0 || val > 999999) {
              return { valid: false, error: '検針値が範囲外です（0-999999）' };
            }
          }
        }
      }
    } catch (e) {
      return { valid: false, error: 'readingsのJSON解析に失敗しました' };
    }
  }
  return { valid: true };
}

function createCorsJsonResponse(data) {
  // setHeaders は使用しません - ContentService標準のみ
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet(e) {
  const startTime = new Date();
  try {
    const action = e?.parameter?.action;
    if (!action) {
      return HtmlService.createHtmlOutputFromFile('admin')
        .setTitle('水道検針 管理画面')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }

    // API処理
    switch (action) {
      case 'test':
        return createCorsJsonResponse({
          success: true,
          message: 'ライブラリAPI正常動作',
          version: API_VERSION,
          timestamp: new Date().toISOString(),
        });

      case 'getProperties':
        const propAuth = validateApiKey(e.parameter, false);
        if (!propAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: propAuth.error });
        }
        const propResult = getProperties();
        if (!propResult.success) {
          return createCorsJsonResponse({ success: false, error: propResult.error });
        }
        return createCorsJsonResponse({
          success: true,
          data: propResult.data,
          count: propResult.data.length,
          _meta: { dataVersion: new Date().toISOString() },
        });

      case 'getRooms':
        try {
          if (!e.parameter.propertyId) {
            return createCorsJsonResponse({
              success: false,
              error: 'propertyIdが必要です',
            });
          }
          const roomsValidation = sanitizeApiParams(e.parameter);
          if (!roomsValidation.valid) {
            return createCorsJsonResponse({ success: false, error: roomsValidation.error });
          }
          const roomsResult = getRooms(e.parameter.propertyId);
          if (!roomsResult.success) {
            return createCorsJsonResponse({ success: false, error: roomsResult.error });
          }
          return createCorsJsonResponse({
            success: true,
            data: roomsResult.data,
            message: `${roomsResult.data.rooms ? roomsResult.data.rooms.length : 0}件の部屋データを取得しました`,
          });
        } catch (error) {
          Logger.log(`getRooms API エラー: ${error.message}`);
          return createCorsJsonResponse({
            success: false,
            error: `部屋データの取得に失敗しました: ${error.message}`,
          });
        }

      case 'getMeterReadings':
        if (!e.parameter.propertyId || !e.parameter.roomId) {
          return createCorsJsonResponse({
            success: false,
            error: 'propertyIdとroomIdが必要です',
          });
        }
        {
          const meterAuth = validateApiKey(e.parameter, false);
          if (!meterAuth.authorized) {
            return createCorsJsonResponse({ success: false, error: meterAuth.error });
          }
        }

        try {
          const result = getMeterReadings(e.parameter.propertyId, e.parameter.roomId);

          if (!result.success) {
            return createCorsJsonResponse({ success: false, error: result.error });
          }

          return createCorsJsonResponse({
            success: true,
            data: {
              propertyName: result.propertyName || '物件名不明',
              roomName: result.roomName || '部屋名不明',
              readings: Array.isArray(result.readings) ? result.readings : [],
            },
          });
        } catch (error) {
          Logger.log(`[web_app_api] getMeterReadingsエラー: ${error.message}`);
          return createCorsJsonResponse({
            success: false,
            error: `検針データ取得に失敗しました: ${error.message}`,
          });
        }

      case 'updateMeterReadings': {
        const updateAuth = validateApiKey(e.parameter, true);
        if (!updateAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: updateAuth.error });
        }
        const updateSanitize = sanitizeApiParams(e.parameter);
        if (!updateSanitize.valid) {
          return createCorsJsonResponse({ success: false, error: updateSanitize.error });
        }
        if (!e.parameter.propertyId || !e.parameter.roomId || !e.parameter.readings) {
          return createCorsJsonResponse({
            success: false,
            error: 'propertyId, roomId, readings が必要です',
          });
        }
        try {
          const readings = JSON.parse(e.parameter.readings);
          const result = updateMeterReadings(e.parameter.propertyId, e.parameter.roomId, readings);
          return createCorsJsonResponse(result);
        } catch (error) {
          return createCorsJsonResponse({
            success: false,
            error: `検針データ更新エラー: ${error.message}`,
          });
        }
      }

      case 'saveAndNavigate': {
        const saveNavAuth = validateApiKey(e.parameter, true);
        if (!saveNavAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: saveNavAuth.error });
        }
        const featureFlags = {
          integratedApiEnabled: getFeatureFlag('INTEGRATED_API_ENABLED', true),
          legacyFallbackEnabled: getFeatureFlag('LEGACY_FALLBACK_ENABLED', true),
        };
        if (!featureFlags.integratedApiEnabled) {
          return executeLegacyFallback(e.parameter);
        }
        try {
          const result = saveAndNavigate(e.parameter);
          return createCorsJsonResponse(ensureResponseCompatibility(result));
        } catch (error) {
          if (featureFlags.legacyFallbackEnabled) {
            try {
              return executeLegacyFallback(e.parameter, error._saveCompleted || false);
            } catch (e2) {}
          }
          return createCorsJsonResponse({
            success: false,
            error: `統合APIエラー: ${error.message}`,
          });
        }
      }

      case 'batchUpdateReadings': {
        const batchAuth = validateApiKey(e.parameter, true);
        if (!batchAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: batchAuth.error });
        }
        if (!e.parameter.batchData) {
          return createCorsJsonResponse({ success: false, error: 'batchDataが必要です' });
        }
        try {
          const entries =
            typeof e.parameter.batchData === 'string'
              ? JSON.parse(e.parameter.batchData)
              : e.parameter.batchData;
          if (!Array.isArray(entries) || entries.length === 0) {
            return createCorsJsonResponse({
              success: false,
              error: 'batchDataは空でない配列である必要があります',
            });
          }
          if (entries.length > 50) {
            return createCorsJsonResponse({
              success: false,
              error: `バッチサイズ上限超過（${entries.length}件、上限50件）`,
            });
          }
          const results = [];
          let successCount = 0;
          let failCount = 0;
          for (const entry of entries) {
            try {
              if (entry.action === 'updateMeterReadings') {
                const readings = entry.readings
                  ? typeof entry.readings === 'string'
                    ? JSON.parse(entry.readings)
                    : entry.readings
                  : [];
                if (
                  !entry.propertyId ||
                  !entry.roomId ||
                  !Array.isArray(readings) ||
                  readings.length === 0
                ) {
                  results.push({ action: entry.action, success: false, error: 'パラメータ不足' });
                  failCount++;
                  continue;
                }
                const r = updateMeterReadings(entry.propertyId, entry.roomId, readings);
                results.push({
                  action: entry.action,
                  propertyId: entry.propertyId,
                  roomId: entry.roomId,
                  success: r.success !== false,
                });
                if (r.success !== false) successCount++;
                else failCount++;
              } else if (entry.action === 'completeInspection') {
                if (!entry.propertyId || !entry.completionDate) {
                  results.push({ action: entry.action, success: false, error: 'パラメータ不足' });
                  failCount++;
                  continue;
                }
                const r = completePropertyInspectionSimple(entry.propertyId, entry.completionDate);
                results.push({
                  action: entry.action,
                  propertyId: entry.propertyId,
                  success: r.success !== false,
                });
                if (r.success !== false) successCount++;
                else failCount++;
              } else {
                results.push({ action: entry.action, success: false, error: '未知のアクション' });
                failCount++;
              }
            } catch (entryError) {
              results.push({ action: entry.action, success: false, error: entryError.message });
              failCount++;
            }
          }
          return createCorsJsonResponse({
            success: failCount === 0,
            processed: successCount,
            failed: failCount,
            results,
            total: entries.length,
          });
        } catch (batchError) {
          return createCorsJsonResponse({
            success: false,
            error: `バッチ処理エラー: ${batchError.message}`,
          });
        }
      }

      case 'completeInspection':
      case 'completePropertyInspection': {
        const completeAuth = validateApiKey(e.parameter, true);
        if (!completeAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: completeAuth.error });
        }
        if (!e.parameter.propertyId) {
          return createCorsJsonResponse({ success: false, error: 'propertyIdが必要です' });
        }
        const completeSanitize = sanitizeApiParams(e.parameter);
        if (!completeSanitize.valid) {
          return createCorsJsonResponse({ success: false, error: completeSanitize.error });
        }
        try {
          const result = completePropertyInspectionSimple(
            e.parameter.propertyId,
            e.parameter.completionDate
          );
          return createCorsJsonResponse(result);
        } catch (error) {
          return createCorsJsonResponse({
            success: false,
            error: `検針完了処理に失敗しました: ${error.message}`,
          });
        }
      }

      case 'getRoomsLight':
        try {
          if (!e.parameter.propertyId) {
            return createCorsJsonResponse({
              success: false,
              error: 'propertyIdが必要です',
            });
          }
          const roomsLightAuth = validateApiKey(e.parameter, false);
          if (!roomsLightAuth.authorized) {
            return createCorsJsonResponse({ success: false, error: roomsLightAuth.error });
          }

          const roomsLightResult = getRoomsLight(e.parameter.propertyId, e.parameter.lastSync);
          if (!roomsLightResult.success) {
            return createCorsJsonResponse({ success: false, error: roomsLightResult.error });
          }
          return createCorsJsonResponse({
            success: true,
            data: roomsLightResult.data,
            message: `${roomsLightResult.data.totalCount || 0}件の軽量部屋データを取得しました`,
            _meta: { dataVersion: new Date().toISOString() },
          });
        } catch (error) {
          Logger.log(`getRoomsLight API エラー: ${error.message}`);
          return createCorsJsonResponse({
            success: false,
            error: `軽量部屋データの取得に失敗しました: ${error.message}`,
          });
        }

      case 'adminAction': {
        const adminSubAction = e.parameter.adminSubAction;
        if (!adminSubAction) {
          return createCorsJsonResponse({ success: false, error: 'adminSubActionが必要です' });
        }
        const adminResult = adminDispatch(adminSubAction, e.parameter);
        return createCorsJsonResponse(adminResult);
      }

      default:
        return createCorsJsonResponse({
          success: false,
          error: `未知のアクション: ${action}`,
        });
    }
  } catch (error) {
    return createCorsJsonResponse({
      success: false,
      error: 'サーバーエラーが発生しました',
    });
  }
}

function doPost(e) {
  try {
    // パラメータ抽出（複数の形式に対応）
    let params = {};

    // URLエンコードされたフォームデータの場合
    if (e.parameter) {
      params = { ...e.parameter };
    }

    // JSON POSTデータの解析（text/plainでもJSON文字列の場合があるため常に試行）
    if (e.postData && e.postData.contents) {
      try {
        const jsonData = JSON.parse(e.postData.contents);
        if (typeof jsonData === 'object' && jsonData !== null) {
          params = { ...params, ...jsonData };
        }
      } catch (parseError) {}
    }

    const action = params.action;
    // ═══════════════════════════════════════════════════════
    // Phase 2.3 - 統合API (saveAndNavigate) 処理 - 互換性確保版
    // ═══════════════════════════════════════════════════════
    if (action === 'saveAndNavigate') {
      const saveNavAuth = validateApiKey(params, true);
      if (!saveNavAuth.authorized) {
        return createCorsJsonResponse({ success: false, error: saveNavAuth.error });
      }
      // Phase 2.3: フィーチャーフラグ対応
      const featureFlags = {
        integratedApiEnabled: getFeatureFlag('INTEGRATED_API_ENABLED', true),
        legacyFallbackEnabled: getFeatureFlag('LEGACY_FALLBACK_ENABLED', true),
        detailedLogging: getFeatureFlag('DETAILED_LOGGING', false),
      };

      // 統合APIが無効化されている場合のフォールバック処理
      if (!featureFlags.integratedApiEnabled) {
        return executeLegacyFallback(params);
      }

      try {
        // API使用状況ログ（Phase 2.3: 移行監視用）
        logApiUsage('saveAndNavigate', params, featureFlags);

        const result = saveAndNavigate(params);

        // Phase 2.3: レスポンス互換性チェック
        const compatibleResult = ensureResponseCompatibility(result);

        return createCorsJsonResponse(compatibleResult);
      } catch (error) {
        Logger.log(`[doPost] saveAndNavigateエラー: ${error.message}`);

        // Phase 2.3: エラー時のレガシーフォールバック
        if (featureFlags.legacyFallbackEnabled) {
          try {
            return executeLegacyFallback(params, error._saveCompleted || false);
          } catch (fallbackError) {
            Logger.log(`[doPost] フォールバックも失敗: ${fallbackError.message}`);
          }
        }

        return createCorsJsonResponse({
          success: false,
          error: {
            code: 'SYSTEM_ERROR',
            message: `統合API処理中にエラーが発生しました: ${error.message}`,
            details: {
              phase: 'system',
              timestamp: new Date().toISOString(),
              fallbackAttempted: featureFlags.legacyFallbackEnabled,
            },
          },
          method: 'POST',
          apiVersion: 'v1.0.0-integrated',
        });
      }
    }

    // 既存のcompleteInspection処理（API key必須）
    if (action === 'completeInspection') {
      const completePostAuth = validateApiKey(params, true);
      if (!completePostAuth.authorized) {
        return createCorsJsonResponse({ success: false, error: completePostAuth.error });
      }
      const propertyId = params.propertyId;
      const completionDate = params.completionDate;

      if (!propertyId) {
        return createCorsJsonResponse({
          success: false,
          error: 'propertyIdが必要です',
        });
      }
      if (propertyId) {
        const completeSanitize = sanitizeApiParams({ propertyId });
        if (!completeSanitize.valid) {
          return createCorsJsonResponse({ success: false, error: completeSanitize.error });
        }
      }

      try {
        const result = completePropertyInspectionSimple(propertyId, completionDate);
        return createCorsJsonResponse(result);
      } catch (error) {
        console.error(`[doPost] 検針完了エラー: ${error.message}`);
        return createCorsJsonResponse({
          success: false,
          error: `検針完了処理に失敗しました: ${error.message}`,
          timestamp: new Date().toISOString(),
          method: 'POST',
        });
      }
    }

    // 既存のupdateMeterReadings処理（API key必須）
    if (action === 'updateMeterReadings') {
      // 書き込み操作: API key必須
      const postUpdateAuth = validateApiKey(params, true);
      if (!postUpdateAuth.authorized) {
        return createCorsJsonResponse({ success: false, error: postUpdateAuth.error });
      }
      const postSanitize = sanitizeApiParams(params);
      if (!postSanitize.valid) {
        return createCorsJsonResponse({ success: false, error: postSanitize.error });
      }

      const propertyId = params.propertyId;
      const roomId = params.roomId;
      const readingsData = params.readings;

      if (!propertyId || !roomId || !readingsData) {
        return createCorsJsonResponse({
          success: false,
          error: 'propertyId, roomId, readings が必要です',
        });
      }

      try {
        const readings = JSON.parse(readingsData);
        const result = updateMeterReadings(propertyId, roomId, readings);
        return createCorsJsonResponse(result);
      } catch (error) {
        Logger.log(`[doPost] updateMeterReadingsエラー: ${error.message}`);
        return createCorsJsonResponse({
          success: false,
          error: `検針データ更新エラー: ${error.message}`,
          method: 'POST',
        });
      }
    }

    // バッチ更新: オフラインキューの一括処理用
    if (action === 'batchUpdateReadings') {
      const batchAuth = validateApiKey(params, true);
      if (!batchAuth.authorized) {
        return createCorsJsonResponse({ success: false, error: batchAuth.error });
      }

      const batchData = params.batchData;
      if (!batchData) {
        return createCorsJsonResponse({
          success: false,
          error: 'batchDataが必要です',
        });
      }

      try {
        const entries = typeof batchData === 'string' ? JSON.parse(batchData) : batchData;
        if (!Array.isArray(entries) || entries.length === 0) {
          return createCorsJsonResponse({
            success: false,
            error: 'batchDataは空でない配列である必要があります',
          });
        }
        if (entries.length > 50) {
          return createCorsJsonResponse({
            success: false,
            error: `バッチサイズが上限を超えています（${entries.length}件、上限50件）`,
          });
        }

        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const entry of entries) {
          try {
            if (entry.action === 'updateMeterReadings') {
              const readings = entry.readings
                ? typeof entry.readings === 'string'
                  ? JSON.parse(entry.readings)
                  : entry.readings
                : [];
              if (
                !entry.propertyId ||
                !entry.roomId ||
                !Array.isArray(readings) ||
                readings.length === 0
              ) {
                results.push({ action: entry.action, success: false, error: 'パラメータ不足' });
                failCount++;
                continue;
              }
              const r = updateMeterReadings(entry.propertyId, entry.roomId, readings);
              results.push({
                action: entry.action,
                propertyId: entry.propertyId,
                roomId: entry.roomId,
                success: r.success !== false,
              });
              if (r.success !== false) successCount++;
              else failCount++;
            } else if (entry.action === 'completeInspection') {
              if (!entry.propertyId || !entry.completionDate) {
                results.push({ action: entry.action, success: false, error: 'パラメータ不足' });
                failCount++;
                continue;
              }
              const r = completePropertyInspectionSimple(entry.propertyId, entry.completionDate);
              results.push({
                action: entry.action,
                propertyId: entry.propertyId,
                success: r.success !== false,
              });
              if (r.success !== false) successCount++;
              else failCount++;
            } else {
              results.push({ action: entry.action, success: false, error: '未知のアクション' });
              failCount++;
            }
          } catch (entryError) {
            results.push({ action: entry.action, success: false, error: entryError.message });
            failCount++;
          }
        }

        return createCorsJsonResponse({
          success: failCount === 0,
          processed: successCount,
          failed: failCount,
          results: results,
          total: entries.length,
        });
      } catch (batchError) {
        return createCorsJsonResponse({
          success: false,
          error: `バッチ処理エラー: ${batchError.message}`,
        });
      }
    }

    // 不明なPOSTアクション
    return createCorsJsonResponse({
      success: false,
      error: `Unknown action: ${action || 'none'}`,
      receivedAction: action || 'none',
    });
  } catch (error) {
    console.error('[doPost] 予期しないエラー:', error);
    return createCorsJsonResponse({
      success: false,
      error: 'サーバーエラーが発生しました',
      timestamp: new Date().toISOString(),
      method: 'POST',
    });
  }
}

// ═══════════════════════════════════════════════════════
// Phase 2.3 - 既存API互換性確保関数群
// ═══════════════════════════════════════════════════════

/**
 * フィーチャーフラグ値を取得
 * @param {string} flagName - フラグ名
 * @param {*} defaultValue - デフォルト値
 * @returns {*} フラグ値
 */
function getFeatureFlag(flagName, defaultValue = false) {
  try {
    if (!_cachedFeatureFlags) {
      const allProps = PropertiesService.getScriptProperties().getProperties();
      _cachedFeatureFlags = {};
      for (const key in allProps) {
        if (key.startsWith('FEATURE_')) {
          _cachedFeatureFlags[key] = allProps[key];
        }
      }
    }
    const flagValue = _cachedFeatureFlags[`FEATURE_${flagName}`];
    if (flagValue === undefined || flagValue === null) {
      return defaultValue;
    }
    if (typeof defaultValue === 'boolean') {
      return flagValue === 'true' || flagValue === '1';
    }
    return flagValue;
  } catch (error) {
    Logger.log(`[getFeatureFlag] エラー - ${flagName}: ${error.message}`);
    return defaultValue;
  }
}

/**
 * レガシーフォールバック実行
 * @param {Object} params - リクエストパラメータ
 * @returns {Object} レスポンス
 */
function executeLegacyFallback(params, skipSave) {
  try {
    const { propertyId, currentRoomId, targetRoomId, meterReadingsData } = params;

    // 1. 既存のupdateMeterReadings実行（統合APIで保存済みの場合はスキップ）
    if (!skipSave) {
      const readings = JSON.parse(meterReadingsData);
      const saveResult = updateMeterReadings(propertyId, currentRoomId, readings);

      if (!saveResult || !saveResult.success) {
        return createCorsJsonResponse({
          success: false,
          error: `保存失敗: ${saveResult?.error || '不明なエラー'}`,
          fallbackMode: true,
        });
      }
    }

    // 2. 既存のgetMeterReadings実行
    const navResult = getMeterReadings(propertyId, targetRoomId);

    if (!navResult || !navResult.success) {
      return createCorsJsonResponse({
        success: false,
        error: 'ナビゲーションデータ取得失敗',
        fallbackMode: true,
      });
    }

    // 3. レガシー形式でレスポンス構築
    return createCorsJsonResponse({
      success: true,
      saveResult: {
        success: true,
        updatedCount: saveResult.updatedRows || 1,
      },
      navigationResult: {
        propertyName: navResult.propertyName,
        roomName: navResult.roomName,
        roomId: targetRoomId,
        readings: navResult.readings || [],
      },
      fallbackMode: true,
      apiVersion: 'v0.9.0-legacy',
    });
  } catch (error) {
    Logger.log(`[executeLegacyFallback] 失敗: ${error.message}`);
    return createCorsJsonResponse({
      success: false,
      error: `レガシーフォールバック失敗: ${error.message}`,
      fallbackMode: true,
    });
  }
}

/**
 * API使用状況ログ記録
 * @param {string} apiName - API名
 * @param {Object} params - パラメータ
 * @param {Object} flags - フィーチャーフラグ
 */
function logApiUsage(apiName, params, flags) {
  try {
    const usageData = {
      api: apiName,
      timestamp: new Date().toISOString(),
      propertyId: params.propertyId,
      roomTransition: `${params.currentRoomId} → ${params.targetRoomId}`,
      direction: params.direction,
      flags: flags,
    };

    // 使用統計をPropertiesServiceに記録（簡易版）
    try {
      const properties = PropertiesService.getScriptProperties();
      const usageCount = parseInt(properties.getProperty('API_USAGE_COUNT') || '0') + 1;
      properties.setProperty('API_USAGE_COUNT', usageCount.toString());
      properties.setProperty('LAST_API_USAGE', new Date().toISOString());
    } catch (propError) {
      Logger.log(`[logApiUsage] 統計記録エラー: ${propError.message}`);
    }
  } catch (error) {
    Logger.log(`[logApiUsage] ログ記録エラー: ${error.message}`);
  }
}

/**
 * レスポンス互換性確保
 * @param {Object} result - 統合APIレスポンス
 * @returns {Object} 互換性チェック済みレスポンス
 */
function ensureResponseCompatibility(result) {
  try {
    // 必須フィールドの確認と補完
    if (!result.success && !result.error) {
      result.success = false;
      result.error = { code: 'UNKNOWN_ERROR', message: 'レスポンス構造エラー' };
    }

    // 成功レスポンスの互換性確保
    if (result.success) {
      if (!result.saveResult) {
        result.saveResult = { success: true, updatedCount: 1 };
      }
      if (!result.navigationResult) {
        result.navigationResult = { propertyName: '', roomName: '', readings: [] };
      }
    }

    // バージョン情報が未設定の場合の補完
    if (!result.apiVersion) {
      result.apiVersion = 'v1.0.0-integrated';
    }

    return result;
  } catch (error) {
    Logger.log(`[ensureResponseCompatibility] エラー: ${error.message}`);
    return result; // エラー時は元のレスポンスを返す
  }
}
