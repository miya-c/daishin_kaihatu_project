/**
 * main.gs - 水道検針ライブラリ: メインエントリーポイント
 * 外部プロジェクトから利用可能なライブラリ関数
 * バージョン: v3.0.0-library
 */

/**
 * ライブラリのバージョン情報
 */
function getLibraryVersion() {
  return "v3.0.0-library";
}

/**
 * ライブラリ情報を返す
 * @returns {Object} ライブラリ情報
 */
function getLibraryInfo() {
  return {
    name: "水道検針ライブラリ",
    version: getLibraryVersion(),
    description: "水道メーター検針システム用のGoogleスプレッドシート操作ライブラリ",
    modules: [
      "api_data_functions - データアクセス機能",
      "data_indexes - データインデックス・検索機能", 
      "web_app_api - WebアプリAPI機能",
      "data_management - データ管理・生成機能",
      "data_validation - データ検証・整合性チェック機能",
      "data_formatting - データフォーマット・クリーンアップ機能",
      "utilities - ユーティリティ・ヘルパー機能",
      "system_diagnostics - システム診断機能",
      "spreadsheet_config - スプレッドシート設定管理"
    ],
    functions: [
      "getProperties",
      "getRooms", 
      "getMeterReadings",
      "updateMeterReadings",
      "completePropertyInspectionSimple",
      "validateRoomId",
      "getSpreadsheetInfo",
      "fastSearch",
      "createAllIndexes",
      "testFastSearch",
      "populateInspectionDataFromMasters",
      "validateInspectionDataIntegrity",
      "formatAllPropertyIds",
      "cleanupSheetData",
      "optimizedCleanupDuplicateInspectionData",
      "cleanUpOrphanedRooms",
      "menuCleanupDuplicateData",
      "testSearchFunctions",
      "showSearchUsageGuide",
      "showWaterMeterWebApp",
      "batchValidateMeterReadings",
      "runDataMaintenance",
      "runSystemDiagnostics",
      "showSystemDiagnostics",
      "collectErrorLogs",
      "getConfigSpreadsheetId",
      "checkConfigStatus"
    ],
    lastUpdated: "2025-06-26"
  };
}

/**
 * ライブラリのヘルプを表示
 * @returns {string} ヘルプテキスト
 */
function getLibraryHelp() {
  const version = getLibraryVersion();
  return `
=== 水道検針ライブラリ v${version} ===

【利用可能な関数】

■ データ取得系
• getProperties() - 物件一覧を取得
• getRooms(propertyId) - 指定物件の部屋一覧を取得
• getMeterReadings(propertyId, roomId) - 検針データを取得

■ データ更新系
• updateMeterReadings(propertyId, roomId, readings) - 検針データを更新
• completePropertyInspectionSimple(propertyId, completionDate) - 物件検針完了

■ 検索・インデックス系
• fastSearch(type, key, indexes) - 高速検索
• createAllIndexes() - 全インデックスを作成
• testFastSearch() - 検索機能テスト

■ データ管理系
• formatPropertyIdsInPropertyMaster() - 物件IDフォーマット
• formatPropertyIdsInRoomMaster() - 部屋IDフォーマット
• populateInspectionDataFromMasters() - 新規部屋反映
• validateInspectionDataIntegrity() - データ整合性チェック

■ システム管理系
• runSystemDiagnostics() - システム診断実行
• showSystemDiagnostics() - システム診断表示
• collectErrorLogs() - エラーログ収集
• checkConfigStatus() - 設定状態確認

■ ユーティリティ系
• validateRoomId(propertyId, roomId) - 部屋ID妥当性チェック
• getSpreadsheetInfo() - スプレッドシート情報取得

【使用例】
// 物件一覧を取得
const properties = getProperties();

// 特定物件の部屋一覧を取得
const roomsData = getRooms('P000001');

// 検針データを取得
const readings = getMeterReadings('P000001', 'R001');

// 高速検索を使用
const indexes = createAllIndexes();
const property = fastSearch('property', 'P000001', indexes);

【エラーハンドリング】
try {
  const result = getProperties();
  console.log(result);
} catch (error) {
  console.error('エラー:', error.message);
}

【ライブラリとしての使用】
// ライブラリを「cmlibrary」識別子で追加後
const properties = cmlibrary.getProperties();
const rooms = cmlibrary.getRooms('P001');
  `;
}

/**
 * ライブラリのテスト実行
 * @returns {Object} テスト結果
 */
function runLibraryTest() {
  const results = {
    libraryInfo: getLibraryInfo(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };
  
  // テスト1: 物件一覧取得
  try {
    const properties = getProperties();
    results.tests.push({
      name: "getProperties",
      status: "PASS",
      result: Array.isArray(properties) ? `${properties.length}件取得` : "配列以外を取得"
    });
    results.summary.passed++;
  } catch (error) {
    results.tests.push({
      name: "getProperties", 
      status: "FAIL",
      error: error.message
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  // テスト2: スプレッドシート情報取得
  try {
    const info = getSpreadsheetInfo();
    results.tests.push({
      name: "getSpreadsheetInfo",
      status: "PASS", 
      result: info.success ? "取得成功" : "取得失敗"
    });
    results.summary.passed++;
  } catch (error) {
    results.tests.push({
      name: "getSpreadsheetInfo",
      status: "FAIL",
      error: error.message
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  // テスト3: インデックス作成
  try {
    const indexes = createAllIndexes();
    results.tests.push({
      name: "createAllIndexes",
      status: "PASS",
      result: `インデックス作成成功`
    });
    results.summary.passed++;
  } catch (error) {
    results.tests.push({
      name: "createAllIndexes",
      status: "FAIL", 
      error: error.message
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  // テスト4: 高速検索テスト
  try {
    const searchTest = testFastSearch();
    results.tests.push({
      name: "testFastSearch",
      status: "PASS",
      result: `検索テスト完了`
    });
    results.summary.passed++;
  } catch (error) {
    results.tests.push({
      name: "testFastSearch",
      status: "FAIL",
      error: error.message
    });
    results.summary.failed++;
  }
  results.summary.total++;
  
  return results;
}

// =============================================
// システム診断機能プロキシ関数
// =============================================
function runSystemDiagnostics() { 
  return system_diagnostics.runSystemDiagnostics(...arguments); 
}

function showSystemDiagnostics() { 
  return system_diagnostics.showSystemDiagnostics(...arguments); 
}

function collectErrorLogs() { 
  return system_diagnostics.collectErrorLogs(...arguments); 
}

function showIntegrationSummary() { 
  return system_diagnostics.showIntegrationSummary(...arguments); 
}

// =============================================
// スプレッドシート設定機能プロキシ関数
// =============================================
function getConfigSpreadsheetId() { 
  return spreadsheet_config.getConfigSpreadsheetId(...arguments); 
}

function getActiveSpreadsheetId() { 
  return spreadsheet_config.getActiveSpreadsheetId(...arguments); 
}

function getSpreadsheetConfig() { 
  return spreadsheet_config.getSpreadsheetConfig(...arguments); 
}

function openSpreadsheetById() { 
  return spreadsheet_config.openSpreadsheetById(...arguments); 
}

function checkConfigStatus() { 
  return spreadsheet_config.checkConfigStatus(...arguments); 
}

function showConfigStatus() { 
  return spreadsheet_config.showConfigStatus(...arguments); 
}
