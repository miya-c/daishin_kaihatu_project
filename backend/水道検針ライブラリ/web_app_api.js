/**
 * web_app_api.gs - 水道検針ライブラリ: Web App API関数群
 * ライブラリ版 - 外部プロジェクトから利用可能
 * Last Updated: 2025-06-26
 * バージョン: v3.0.0-library
 */

const API_VERSION = "v3.0.0-library";
const LAST_UPDATED = "2025-06-26 JST";

/**
 * API key認証を検証
 * @param {Object} params - リクエストパラメータ
 * @param {boolean} requireAuth - trueの場合、API key必須
 * @returns {Object} {authorized: boolean, error?: string}
 */
function validateApiKey(params, requireAuth) {
  const apiKey = params.apiKey || params.api_key;
  const storedKey = PropertiesService.getScriptProperties().getProperty('API_KEY');

  if (!storedKey) {
    // API key未設定時は認証スキップ
    return { authorized: true };
  }

  if (!apiKey && requireAuth) {
    return { authorized: false, error: 'API keyが必要です' };
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
      const readingsStr = typeof params.readings === 'string' ? params.readings : JSON.stringify(params.readings);
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
  console.log('[createCorsJsonResponse] APIバージョン:', API_VERSION);
  // setHeaders は使用しません - ContentService標準のみ
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const startTime = new Date();
  try {
    const action = e?.parameter?.action;
    Logger.log(`[doGet] API呼び出し開始 - action: ${action}, パラメータ: ${JSON.stringify(e?.parameter || {})}`);
    
    if (!action) {
      // テストページ表示（簡素版）
      return HtmlService.createHtmlOutput(`
        <html>
          <head><title>水道検針ライブラリ API</title></head>
          <body>
            <h1>🚰 水道検針ライブラリ API</h1>
            <p>現在時刻: ${new Date().toISOString()}</p>
            <p>APIバージョン: ${API_VERSION}</p>
            <ul>
              <li><a href="?action=getProperties">物件一覧を取得</a></li>
              <li>部屋一覧: ?action=getRooms&propertyId=物件ID</li>
              <li>検針データ: ?action=getMeterReadings&propertyId=物件ID&roomId=部屋ID</li>
            </ul>
          </body>
        </html>
      `).setTitle('水道検針ライブラリ API');
    }
    
    // API処理
    switch (action) {
      case 'test':
        Logger.log('[doGet] test API呼び出し');
        return createCorsJsonResponse({
          success: true,
          message: 'ライブラリAPI正常動作',
          version: API_VERSION,
          timestamp: new Date().toISOString()
        });
        
      case 'getProperties':
        Logger.log('[doGet] getProperties API呼び出し');
        // 認証チェック（移行期間中はkeyなしでも許可）
        const propAuth = validateApiKey(e.parameter, false);
        if (!propAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: propAuth.error });
        }
        const properties = getProperties();
        return createCorsJsonResponse({
          success: true,
          data: Array.isArray(properties) ? properties : [],
          count: Array.isArray(properties) ? properties.length : 0
        });
        
      case 'getRooms':
        try {
          if (!e.parameter.propertyId) {
            return createCorsJsonResponse({
              success: false,
              error: 'propertyIdが必要です'
            });
          }
          // バリデーション
          const roomsValidation = sanitizeApiParams(e.parameter);
          if (!roomsValidation.valid) {
            return createCorsJsonResponse({ success: false, error: roomsValidation.error });
          }
          const roomsResult = getRooms(e.parameter.propertyId);
          return createCorsJsonResponse({
            success: true,
            data: roomsResult, // {property: {...}, rooms: [...]} 形式
            message: `${roomsResult.rooms ? roomsResult.rooms.length : 0}件の部屋データを取得しました`
          });
        } catch (error) {
          Logger.log(`getRooms API エラー: ${error.message}`);
          return createCorsJsonResponse({
            success: false,
            error: `部屋データの取得に失敗しました: ${error.message}`
          });
        }
        
      case 'getMeterReadings':
        if (!e.parameter.propertyId || !e.parameter.roomId) {
          return createCorsJsonResponse({ 
            success: false,
            error: 'propertyIdとroomIdが必要です'
          });
        }
        
        try {
          const result = getMeterReadings(e.parameter.propertyId, e.parameter.roomId);
          console.log('[web_app_api] getMeterReadings結果:', result);
          console.log('[web_app_api] result type:', typeof result);
          console.log('[web_app_api] result isArray:', Array.isArray(result));
          
          // 結果の形式を確認
          if (result && typeof result === 'object' && result.hasOwnProperty('propertyName')) {
            console.log('[web_app_api] ✅ 統合版の戻り値を検出');
            return createCorsJsonResponse({
              success: true,
              data: {
                propertyName: result.propertyName || '物件名不明',
                roomName: result.roomName || '部屋名不明',
                readings: Array.isArray(result.readings) ? result.readings : []
              }
            });
          } else if (Array.isArray(result)) {
            console.log('[web_app_api] ⚠️ 旧形式（配列）の戻り値を検出');
            // 後方互換性: 旧形式への対応
            return createCorsJsonResponse({
              success: true,
              data: result
            });
          } else {
            console.error('[web_app_api] ❌ 予期しない戻り値形式:', result);
            throw new Error('getMeterReadings関数の戻り値が予期しない形式です');
          }
        } catch (error) {
          Logger.log(`[web_app_api] getMeterReadingsエラー: ${error.message}`);
          return createCorsJsonResponse({
            success: false,
            error: `検針データ取得に失敗しました: ${error.message}`
          });
        }
        
      case 'updateMeterReadings':
        // 書き込み操作: API key必須
        const updateAuth = validateApiKey(e.parameter, true);
        if (!updateAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: updateAuth.error });
        }
        // 入力バリデーション
        const updateSanitize = sanitizeApiParams(e.parameter);
        if (!updateSanitize.valid) {
          return createCorsJsonResponse({ success: false, error: updateSanitize.error });
        }
        if (!e.parameter.propertyId || !e.parameter.roomId || !e.parameter.readings) {
          return createCorsJsonResponse({ 
            success: false,
            error: '必須パラメータが不足しています'
          });
        }
        
        try {
          const readings = JSON.parse(e.parameter.readings);
          if (!Array.isArray(readings) || readings.length === 0) {
            throw new Error('readings配列が無効です');
          }
          
          const result = updateMeterReadings(e.parameter.propertyId, e.parameter.roomId, readings);
          return createCorsJsonResponse(result);
          
        } catch (parseError) {
          return createCorsJsonResponse({
            success: false,
            error: `データ処理エラー: ${parseError.message}`
          });
        }
        
      case 'completeInspection':
      case 'completePropertyInspection':
        // 書き込み操作: API key必須
        const completeAuth = validateApiKey(e.parameter, true);
        if (!completeAuth.authorized) {
          return createCorsJsonResponse({ success: false, error: completeAuth.error });
        }
        console.log(`[検針完了] 機能を実行します`);
        
        const propertyId = e.parameter.propertyId;
        const completionDate = e.parameter.completionDate;
        
        if (!propertyId) {
          return createCorsJsonResponse({
            success: false,
            error: 'propertyIdが必要です',
            apiVersion: API_VERSION
          });
        }
        
        try {
          const result = completePropertyInspectionSimple(propertyId, completionDate);
          return createCorsJsonResponse(result);
        } catch (error) {
          console.error(`[検針完了] エラー: ${error.message}`);
          return createCorsJsonResponse({
            success: false,
            error: `検針完了処理に失敗しました: ${error.message}`,
            apiVersion: API_VERSION
          });
        }

      case 'getRoomsLight':
        try {
          if (!e.parameter.propertyId) {
            return createCorsJsonResponse({ 
              success: false,
              error: 'propertyIdが必要です'
            });
          }
          
          const roomsLightResult = getRoomsLight(e.parameter.propertyId, e.parameter.lastSync);
          return createCorsJsonResponse({
            success: true,
            data: roomsLightResult,
            compressionRatio: roomsLightResult.compression || 0,
            message: `${roomsLightResult.totalCount || 0}件の軽量部屋データを取得しました`
          });
        } catch (error) {
          Logger.log(`getRoomsLight API エラー: ${error.message}`);
          return createCorsJsonResponse({
            success: false,
            error: `軽量部屋データの取得に失敗しました: ${error.message}`
          });
        }
        
      default:
        // 新しいデバッグ用API処理を追加
        if (action === 'test') {
          console.log('[doGet] 🧪 テスト接続要求');
          return createCorsJsonResponse({
            success: true,
            message: 'ライブラリAPI接続テスト成功',
            timestamp: new Date().toISOString(),
            apiVersion: API_VERSION
          });
        }
        
        if (action === 'getSpreadsheetInfo') {
          console.log('[doGet] 📊 スプレッドシート情報取得要求');
          // セキュリティ: 管理者トークン必須
          if (!e.parameter.adminToken) {
            return createCorsJsonResponse({
              success: false,
              error: '管理者トークンが必要です',
              timestamp: new Date().toISOString()
            });
          }
          try {
            const adminToken = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
            if (adminToken && e.parameter.adminToken !== adminToken) {
              return createCorsJsonResponse({
                success: false,
                error: '管理者トークンが無効です',
                timestamp: new Date().toISOString()
              });
            }
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheets = ss.getSheets().map(sheet => ({
              name: sheet.getName(),
              rowCount: sheet.getLastRow(),
              columnCount: sheet.getLastColumn()
            }));
            
            return createCorsJsonResponse({
              success: true,
              message: 'スプレッドシート情報取得成功',
              data: {
                spreadsheetId: ss.getId(),
                spreadsheetName: ss.getName(),
                sheets: sheets
              },
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            return createCorsJsonResponse({
              success: false,
              error: `スプレッドシート情報取得エラー: ${error.message}`,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        if (action === 'getPropertyMaster') {
          console.log('[doGet] 🏠 物件マスタデータ取得要求');
          // セキュリティ: 管理者トークン必須
          if (!e.parameter.adminToken) {
            return createCorsJsonResponse({
              success: false,
              error: '管理者トークンが必要です',
              timestamp: new Date().toISOString()
            });
          }
          try {
            const adminToken = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
            if (adminToken && e.parameter.adminToken !== adminToken) {
              return createCorsJsonResponse({
                success: false,
                error: '管理者トークンが無効です',
                timestamp: new Date().toISOString()
              });
            }
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const propertySheet = ss.getSheetByName('物件マスタ');
            
            if (!propertySheet) {
              throw new Error('物件マスタシートが見つかりません');
            }
            
            const data = propertySheet.getDataRange().getValues();
            const headers = data[0];
            const rows = data.slice(1);
            
            return createCorsJsonResponse({
              success: true,
              message: '物件マスタデータ取得成功',
              data: {
                headers: headers,
                rowCount: rows.length,
                sampleRows: rows.slice(0, 5) // 最初の5行のみ返す
              },
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            return createCorsJsonResponse({
              success: false,
              error: `物件マスタデータ取得エラー: ${error.message}`,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        console.log(`[doGet] ❌ 未知のアクション: ${action}`);
        return createCorsJsonResponse({ 
          success: false,
          error: `未知のアクション: ${action}`
        });
    }
    
  } catch (error) {
    return createCorsJsonResponse({ 
      success: false,
      error: `サーバーエラー: ${error.message}`
    });
  }
}

function doPost(e) {
  try {
    Logger.log('[doPost] POSTリクエスト開始');
    
    // パラメータ抽出（複数の形式に対応）
    let params = {};
    
    // URLエンコードされたフォームデータの場合
    if (e.parameter) {
      params = { ...e.parameter };
      Logger.log('[doPost] URL-encoded parameters:', params);
    }
    
    // JSON POSTデータの場合
    if (e.postData && e.postData.contents) {
      try {
        const jsonData = JSON.parse(e.postData.contents);
        params = { ...params, ...jsonData };
        Logger.log('[doPost] JSON parameters:', jsonData);
      } catch (parseError) {
        Logger.log('[doPost] JSON解析エラー、URL-encodedとして処理');
      }
    }
    
    const action = params.action;
    Logger.log(`[doPost] アクション: ${action}`);
    
    // ═══════════════════════════════════════════════════════
    // Phase 2.3 - 統合API (saveAndNavigate) 処理 - 互換性確保版
    // ═══════════════════════════════════════════════════════
    if (action === 'saveAndNavigate') {
      Logger.log('[doPost] saveAndNavigate統合API実行開始 - Phase 2.3');
      
      // Phase 2.3: フィーチャーフラグ対応
      const featureFlags = {
        integratedApiEnabled: getFeatureFlag('INTEGRATED_API_ENABLED', true),
        legacyFallbackEnabled: getFeatureFlag('LEGACY_FALLBACK_ENABLED', true),
        detailedLogging: getFeatureFlag('DETAILED_LOGGING', false)
      };
      
      Logger.log('[doPost] フィーチャーフラグ:', featureFlags);
      
      // 統合APIが無効化されている場合のフォールバック処理
      if (!featureFlags.integratedApiEnabled) {
        Logger.log('[doPost] 統合API無効 - レガシーフォールバック実行');
        return executeLegacyFallback(params);
      }
      
      try {
        // API使用状況ログ（Phase 2.3: 移行監視用）
        logApiUsage('saveAndNavigate', params, featureFlags);
        
        const result = saveAndNavigate(params);
        
        // Phase 2.3: レスポンス互換性チェック
        const compatibleResult = ensureResponseCompatibility(result);
        
        Logger.log('[doPost] saveAndNavigate実行完了:', compatibleResult);
        
        if (featureFlags.detailedLogging) {
          Logger.log('[doPost] 詳細ログ - パフォーマンス:', compatibleResult.performance);
        }
        
        return createCorsJsonResponse(compatibleResult);
      } catch (error) {
        Logger.log(`[doPost] saveAndNavigateエラー: ${error.message}`);
        
        // Phase 2.3: エラー時のレガシーフォールバック
        if (featureFlags.legacyFallbackEnabled) {
          Logger.log('[doPost] エラー発生 - レガシーフォールバック試行');
          try {
            return executeLegacyFallback(params);
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
              fallbackAttempted: featureFlags.legacyFallbackEnabled
            }
          },
          method: 'POST',
          apiVersion: 'v1.0.0-integrated'
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
          error: 'propertyIdが必要です' 
        });
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
          method: 'POST'
        });
      }
    }
    
    // 既存のupdateMeterReadings処理（API key必須）
    if (action === 'updateMeterReadings') {
      Logger.log('[doPost] updateMeterReadings処理開始');
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
          error: 'propertyId, roomId, readings が必要です'
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
          method: 'POST'
        });
      }
    }
    
    // 通常のPOSTリクエスト処理
    console.log('[doPost] 汎用POSTリクエスト処理');
    return createCorsJsonResponse({ 
      success: true, 
      message: 'POST request received successfully',
      timestamp: new Date().toISOString(),
      method: 'POST',
      receivedAction: action || 'none'
    });
    
  } catch (error) {
    console.error('[doPost] 予期しないエラー:', error);
    return createCorsJsonResponse({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      method: 'POST'
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
    // PropertiesServiceから設定値を取得（Phase 2.3: 設定管理）
    const properties = PropertiesService.getScriptProperties();
    const flagValue = properties.getProperty(`FEATURE_${flagName}`);
    
    if (flagValue === null) {
      Logger.log(`[getFeatureFlag] フラグ${flagName}未設定 - デフォルト値使用: ${defaultValue}`);
      return defaultValue;
    }
    
    // 文字列からブール値への変換
    if (typeof defaultValue === 'boolean') {
      const boolValue = flagValue === 'true' || flagValue === '1';
      Logger.log(`[getFeatureFlag] フラグ${flagName}: ${boolValue}`);
      return boolValue;
    }
    
    Logger.log(`[getFeatureFlag] フラグ${flagName}: ${flagValue}`);
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
function executeLegacyFallback(params) {
  Logger.log('[executeLegacyFallback] レガシーAPI方式実行開始');
  
  try {
    const { propertyId, currentRoomId, targetRoomId, meterReadingsData } = params;
    
    // 1. 既存のupdateMeterReadings実行
    const readings = JSON.parse(meterReadingsData);
    const saveResult = updateMeterReadings(propertyId, currentRoomId, readings);
    
    if (!saveResult || !saveResult.success) {
      throw new Error(`保存失敗: ${saveResult?.error || '不明なエラー'}`);
    }
    
    // 2. 既存のgetMeterReadings実行
    const navResult = getMeterReadings(propertyId, targetRoomId);
    
    if (!navResult) {
      throw new Error('ナビゲーションデータ取得失敗');
    }
    
    // 3. レガシー形式でレスポンス構築
    return createCorsJsonResponse({
      success: true,
      saveResult: {
        success: true,
        updatedCount: saveResult.updatedRows || 1
      },
      navigationResult: {
        propertyName: navResult.propertyName,
        roomName: navResult.roomName,
        roomId: targetRoomId,
        readings: navResult.readings || []
      },
      fallbackMode: true,
      apiVersion: 'v0.9.0-legacy'
    });
    
  } catch (error) {
    Logger.log(`[executeLegacyFallback] 失敗: ${error.message}`);
    return createCorsJsonResponse({
      success: false,
      error: `レガシーフォールバック失敗: ${error.message}`,
      fallbackMode: true
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
      flags: flags
    };
    
    Logger.log(`[API使用ログ] ${JSON.stringify(usageData)}`);
    
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
      Logger.log('[ensureResponseCompatibility] ⚠️ 不正なレスポンス構造を検出');
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
    
    Logger.log('[ensureResponseCompatibility] 互換性チェック完了');
    return result;
    
  } catch (error) {
    Logger.log(`[ensureResponseCompatibility] エラー: ${error.message}`);
    return result; // エラー時は元のレスポンスを返す
  }
}
