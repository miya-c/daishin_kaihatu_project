/**
 * web_app_api.gs - Web App API関数群（setHeaders削除・検針完了シンプル版）
 * Last Updated: 2025-06-21 15:15:00 JST
 * バージョン: v2.8.0-simple-completion
 */

const API_VERSION = "v2.8.0-simple-completion";
const LAST_UPDATED = "2025-06-21 15:15:00 JST";

function createCorsJsonResponse(data) {
  console.log('[createCorsJsonResponse] APIバージョン:', API_VERSION);
  // setHeaders は使用しません - ContentService標準のみ
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = e?.parameter?.action;
    
    if (!action) {
      // テストページ表示（簡素版）
      return HtmlService.createHtmlOutput(`
        <html>
          <head><title>水道検針アプリ API</title></head>
          <body>
            <h1>🚰 水道検針アプリ API</h1>
            <p>現在時刻: ${new Date().toISOString()}</p>
            <ul>
              <li><a href="?action=getProperties">物件一覧を取得</a></li>
              <li>部屋一覧: ?action=getRooms&propertyId=物件ID</li>
              <li>検針データ: ?action=getMeterReadings&propertyId=物件ID&roomId=部屋ID</li>
            </ul>
          </body>
        </html>
      `).setTitle('水道検針アプリ API');
    }
    
    // API処理
    switch (action) {
      case 'test':
        return createCorsJsonResponse({
          success: true,
          message: 'API正常動作',
          timestamp: new Date().toISOString()
        });
        
      case 'getProperties':
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
        
      default:
        // 新しいデバッグ用API処理を追加
        if (action === 'test') {
          console.log('[doGet] 🧪 テスト接続要求');
          return createCorsJsonResponse({
            success: true,
            message: 'API接続テスト成功',
            timestamp: new Date().toISOString(),
            apiVersion: API_VERSION
          });
        }
        
        if (action === 'getSpreadsheetInfo') {
          console.log('[doGet] 📊 スプレッドシート情報取得要求');
          try {
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
          try {
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
    const params = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const action = params.action || (e.parameter && e.parameter.action);
    
    if (action === 'completeInspection') {
      const propertyId = params.propertyId || (e.parameter && e.parameter.propertyId);
      const completionDate = params.completionDate || (e.parameter && e.parameter.completionDate);
      
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
    
    // 通常のPOSTリクエスト処理
    console.log('[doPost] POSTリクエスト処理開始');
    return createCorsJsonResponse({ 
      success: true, 
      message: 'POST request received successfully',
      timestamp: new Date().toISOString(),
      method: 'POST'
    });
  } catch (error) {
    console.error('[doPost] エラー:', error);
    return createCorsJsonResponse({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      method: 'POST'
    });
  }
}
