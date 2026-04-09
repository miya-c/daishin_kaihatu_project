/**
 * main.gs - 水道検針ライブラリ: メインエントリーポイント
 * 外部プロジェクトから利用可能なライブラリ関数
 * バージョン: v3.0.0-library
 */

/**
 * ライブラリのバージョン情報
 */
function getLibraryVersion() {
  return 'v3.0.0-library';
}

/**
 * ライブラリ情報を返す
 * @returns {Object} ライブラリ情報
 */
function getLibraryInfo() {
  return {
    name: '水道検針ライブラリ',
    version: getLibraryVersion(),
    description: '水道メーター検針システム用のGoogleスプレッドシート操作ライブラリ',
    modules: [
      'api_data_functions - データアクセス機能',
      'data_indexes - データインデックス・検索機能',
      'web_app_api - WebアプリAPI機能',
      'data_management - データ管理・生成機能',
      'data_validation - データ検証・整合性チェック機能',
      'data_formatting - データフォーマット・クリーンアップ機能',
      'utilities - ユーティリティ・ヘルパー機能',
      'system_diagnostics - システム診断機能',
      'spreadsheet_config - スプレッドシート設定管理',
    ],
    functions: [
      'getProperties',
      'getRooms',
      'getMeterReadings',
      'updateMeterReadings',
      'completePropertyInspectionSimple',
      'calculateWarningFlag',
      'validateRoomId',
      'getSpreadsheetInfo',
      'fastSearch',
      'createAllIndexes',
      'populateInspectionDataFromMasters',
      'createInitialInspectionData',
      'processInspectionDataMonthlyImpl',
      'validateInspectionDataIntegrity',
      'formatPropertyIdsInPropertyMaster',
      'formatPropertyIdsInRoomMaster',
      'formatPropertyIdsInInspectionData',
      'formatAllPropertyIds',
      'optimizedCleanupDuplicateInspectionData',
      'batchValidateMeterReadings',
      'runSystemDiagnostics',
      'getConfigSpreadsheetId',
      'checkConfigStatus',
      'generateRoomIds',
      'safeAlert',
      'formatDate',
      'parseDate',
      'safeNumber',
      'safeString',
      'deepCopy',
      'calculateSTDEV_S',
      'showPropertiesList',
      'showRoomsDialog',
      'openMeterReadingInput',
      'runDataValidation',
      'runDataCleanup',
      'displayPreCheckResults',
      'showUsageGuide',
      'startSystemSetupWizardFromMenu',
      'runSystemDiagnosticsFromMenu',
      'createMasterSheetTemplatesFromMenu',
      'formatAllPropertyIdsFromMenu',
      'generateRoomIdsFromMenu',
      'createInitialInspectionDataFromMenu',
      'validateSystemSetupFromMenu',
      'showSystemSetupGuide',
    ],
    lastUpdated: '2026-04-09',
  };
}
