/**
 * 水道検針アプリ - cmlibraryライブラリを使用するクライアントスクリプト
 * 
 * 使用方法:
 * 1. Google Apps Scriptプロジェクトで「ライブラリ」を追加
 * 2. ライブラリID（cmlibraryのスクリプトID）を入力
 * 3. 識別子を「cmlibrary」に設定
 * 4. このファイルの関数を使用してライブラリの機能を呼び出し
 */

/**
 * スプレッドシート開始時に呼び出されるメニュー作成関数
 * 水道検針システムのメニューを作成
 */
function onOpen() {
  try {
    console.log('[onOpen] メニュー作成開始');
    
    // まずライブラリのonOpen関数を試行
    if (typeof cmlibrary !== 'undefined' && typeof cmlibrary.onOpen === 'function') {
      cmlibrary.onOpen();
      console.log('[onOpen] ライブラリのonOpen関数実行成功');
    }
    
    // クライアント独自メニュー（管理画面等）を常に追加
    createWaterMeterMenu();
    
  } catch (error) {
    console.error('onOpen エラー:', error);
    console.log('[onOpen] エラーのため独自メニューを作成');
    createWaterMeterMenu();
  }
}

/**
 * クライアント独自のメニューを作成
 * ライブラリ側のメニューと重複しない、クライアント固有の機能のみ追加
 */
function createWaterMeterMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // クライアント固有メニュー（管理画面・Web App アクセス）
    ui.createMenu('📱 アプリ・管理画面')
      .addItem('📱 水道検針アプリを開く', 'showWaterMeterWebApp')
      .addItem('🔧 管理画面を開く', 'showAdminUI')
      .addToUi();
    
    console.log('[createWaterMeterMenu] クライアントメニュー作成完了');
    
  } catch (error) {
    console.error('[createWaterMeterMenu] メニュー作成エラー:', error);
  }
}

// =====================================================
// ライセンス検証
// =====================================================

/**
 * ライセンス検証 — license-manager APIでライセンス状態を確認
 * キャッシュはクライアント側のScriptPropertiesに保存
 * @returns {boolean} true: ライセンス有効, false: 無効・エラー
 */
function validateLicense() {
  var currentProps = PropertiesService.getScriptProperties().getProperties();
  currentProps._clientScriptId = ScriptApp.getScriptId();
  cmlibrary._setInjectedProps(currentProps);
  var result = cmlibrary.validateLicense();
  if (result && result.propsToSave) {
    var props = PropertiesService.getScriptProperties();
    var keys = Object.keys(result.propsToSave);
    for (var i = 0; i < keys.length; i++) {
      props.setProperty(keys[i], result.propsToSave[keys[i]]);
    }
  }
  return result ? result.authorized : false;
}

// =====================================================
// UI機能（メニューから呼び出される関数）
// =====================================================

/**
 * 初期セットアップ — ADMIN_TOKEN・API_KEYを自動生成
 * 既に設定されている場合はスキップ
 * @returns {Object} セットアップ結果
 */
function setupSheets() {
  var props = PropertiesService.getScriptProperties();
  var result = { success: true };

  if (!props.getProperty('ADMIN_TOKEN')) {
    var token = 'admin-' + Utilities.getUuid();
    props.setProperty('ADMIN_TOKEN', token);
    result.adminToken = token;
  }

  if (!props.getProperty('API_KEY')) {
    var apiKey = 'sk-' + Utilities.getUuid();
    props.setProperty('API_KEY', apiKey);
    result.apiKey = apiKey;
  }

  return result;
}

// =====================================================

/**
 * 水道検針アプリをブラウザで開く
 */
function showWaterMeterWebApp() {
  try {
    return cmlibrary.showWaterMeterWebApp();
  } catch (error) {
    console.error('水道検針アプリ表示エラー:', error);
    SpreadsheetApp.getUi().alert('エラー',
      `アプリの表示に失敗しました:\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showAdminUI() {
  try {
    var webAppUrl = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL');
    if (!webAppUrl) {
      var scriptId = ScriptApp.getScriptId();
      if (scriptId) {
        webAppUrl = 'https://script.google.com/macros/s/' + scriptId + '/exec';
      }
    }
    if (webAppUrl) {
      var html = HtmlService.createHtmlOutput(
        '<p>管理画面を開きます:</p>' +
        '<p><a href="' + webAppUrl + '" target="_blank" style="font-size:1.2em">🔗 管理画面を開く</a></p>' +
        '<p style="font-size:0.8em;color:#666">上記リンクをクリックしてください</p>'
      ).setTitle('管理画面');
      SpreadsheetApp.getUi().showModalDialog(html, '水道検針 管理画面');
    } else {
      SpreadsheetApp.getUi().alert('管理画面',
        'Web App URLが設定されていません。\nスクリプトプロパティにWEB_APP_URLを設定してください。',
        SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } catch (error) {
    console.error('管理画面表示エラー:', error);
    SpreadsheetApp.getUi().alert('エラー',
      '管理画面の表示に失敗しました:\n' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 物件一覧を表示
 */
function showPropertiesList() {
  try {
    const propResult = cmlibrary.getProperties();
    
    if (!propResult || !propResult.success) {
      SpreadsheetApp.getUi().alert('エラー', propResult?.error || '物件データの取得に失敗しました。', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    const properties = propResult.data;
    
    if (!properties || properties.length === 0) {
      SpreadsheetApp.getUi().alert('物件データなし', 
        '物件マスタシートにデータがありません。', 
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    let message = '📋 登録済み物件一覧:\n\n';
    properties.forEach((property, index) => {
      const propertyId = property['物件ID'] || property.id || '';
      const propertyName = property['物件名'] || property.name || '名称不明';
      message += `${index + 1}. ${propertyName} (ID: ${propertyId})\n`;
    });
    
    message += `\n合計: ${properties.length}件の物件が登録されています。`;
    
    SpreadsheetApp.getUi().alert('物件一覧', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('[showPropertiesList] エラー:', error);
    SpreadsheetApp.getUi().alert('エラー', 
      `物件一覧の取得に失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 部屋一覧を表示（物件IDを入力して表示）
 */
function showRoomsList() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 物件ID入力
    const response = ui.prompt('部屋一覧表示', 
      '物件IDを入力してください:', ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() !== ui.Button.OK) return;
    
    const propertyId = response.getResponseText().trim();
    if (!propertyId) {
      ui.alert('エラー', '物件IDが入力されていません。', ui.ButtonSet.OK);
      return;
    }
    
    // 部屋一覧取得
    const roomsResult = cmlibrary.getRooms(propertyId);
    
    if (!roomsResult || !roomsResult.success) {
      ui.alert('エラー', roomsResult?.error || '部屋データの取得に失敗しました。', ui.ButtonSet.OK);
      return;
    }
    
    const roomsData = roomsResult.data;
    
    if (!roomsData || !roomsData.rooms || roomsData.rooms.length === 0) {
      ui.alert('部屋データなし', 
        `物件ID「${propertyId}」に対応する部屋が見つかりません。`, 
        ui.ButtonSet.OK);
      return;
    }
    
    // 部屋一覧表示
    let message = `🏠 物件「${roomsData.property?.name || propertyId}」の部屋一覧:\n\n`;
    roomsData.rooms.forEach((room, index) => {
      const status = room.isCompleted ? '✅ 完了' : '⏳ 未完了';
      message += `${index + 1}. ${room.name || room.id} (ID: ${room.id}) ${status}\n`;
    });
    
    const completedCount = roomsData.rooms.filter(r => r.isCompleted).length;
    message += `\n合計: ${roomsData.rooms.length}件（完了: ${completedCount}件）`;
    
    ui.alert('部屋一覧', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[showRoomsList] エラー:', error);
    SpreadsheetApp.getUi().alert('エラー', 
      `部屋一覧の取得に失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// =====================================================
// データ管理機能
// =====================================================

/**
 * 物件マスタの物件IDフォーマット
 * cmlibraryのdata_formatting.gsの関数を使用
 */
function formatPropertyIdsInPropertyMaster() {
  try {
    return cmlibrary.formatPropertyIdsInPropertyMaster();
  } catch (error) {
    console.error('物件IDフォーマットエラー:', error);
    throw error;
  }
}

/**
 * 部屋マスタの物件IDフォーマット
 * cmlibraryのdata_formatting.gsの関数を使用
 */
function formatPropertyIdsInRoomMaster() {
  try {
    return cmlibrary.formatPropertyIdsInRoomMaster();
  } catch (error) {
    console.error('部屋マスタ物件IDフォーマットエラー:', error);
    throw error;
  }
}

/**
 * 部屋マスタの部屋ID自動生成
 * cmlibraryのdata_formatting.gsの関数を使用
 */
function generateRoomIds() {
  try {
    return cmlibrary.generateRoomIds();
  } catch (error) {
    console.error('部屋ID自動生成エラー:', error);
    throw error;
  }
}

/**
 * 部屋マスタの孤立データ削除
 * cmlibraryのdata_cleanup.gsの関数を使用
 */
function cleanUpOrphanedRooms() {
  try {
    return cmlibrary.cleanUpOrphanedRooms();
  } catch (error) {
    console.error('孤立データ削除エラー:', error);
    throw error;
  }
}

/**
 * 初期検針データ作成
 * cmlibraryのdata_management.gsの関数を使用
 */
function createInitialInspectionData() {
  try {
    return cmlibrary.createInitialInspectionData();
  } catch (error) {
    console.error('初期検針データ作成エラー:', error);
    throw error;
  }
}

/**
 * マスタから検針データへ新規部屋反映
 * cmlibraryのdata_management.gsの関数を使用
 */
function populateInspectionDataFromMasters() {
  try {
    return cmlibrary.populateInspectionDataFromMasters();
  } catch (error) {
    console.error('新規部屋反映エラー:', error);
    throw error;
  }
}

/**
 * 月次検針データ保存とリセット
 * cmlibraryのdata_management.gsの関数を使用
 */
function processInspectionDataMonthly() {
  try {
    return cmlibrary.processInspectionDataMonthly();
  } catch (error) {
    console.error('月次処理エラー:', error);
    throw error;
  }
}

// =====================================================
// データ品質管理機能
// =====================================================

/**
 * 重複データクリーンアップ
 * cmlibraryのdata_cleanup.gsの関数を使用
 */
function menuCleanupDuplicateData() {
  try {
    return cmlibrary.menuCleanupDuplicateData();
  } catch (error) {
    console.error('重複データクリーンアップエラー:', error);
    throw error;
  }
}

/**
 * データ整合性チェック
 * cmlibraryのdata_validation.gsの関数を使用
 */
function validateDataIntegrity() {
  try {
    return cmlibrary.validateInspectionDataIntegrity();
  } catch (error) {
    console.error('データ整合性チェックエラー:', error);
    throw error;
  }
}

/**
 * データ高速検索インデックス作成
 * cmlibraryのdata_indexes.gsの関数を使用
 */
function createAllIndexes() {
  const result = cmlibrary.createAllIndexes();
  if (!result.success) {
    console.error('インデックス作成エラー:', result.error);
    SpreadsheetApp.getUi().alert('エラー', 'インデックス作成に失敗しました: ' + result.error);
  }
  return result;
}

/**
 * 検索使用方法ガイド
 * cmlibraryのdialog_functions.gsの関数を使用
 */
function showSearchUsageGuide() {
  try {
    return cmlibrary.showSearchUsageGuide();
  } catch (error) {
    console.error('検索ガイド表示エラー:', error);
    throw error;
  }
}

// =====================================================
// Web App API機能
// =====================================================

/**
 * Web Appとして公開されるdoGet関数
 * cmlibraryのweb_app_api.gsの関数を使用
 * @param {Object} e - イベントオブジェクト
 * @returns {ContentService} JSONレスポンス
 */
function doGet(e) {
  try {
    console.log('doGet called with parameters:', e.parameter);
    
    // Inject client properties FIRST (needed for all _getScriptProp calls)
    var currentProps = PropertiesService.getScriptProperties().getProperties();
    currentProps._clientScriptId = ScriptApp.getScriptId();
    cmlibrary._setInjectedProps(currentProps);
    
    // License gate: block all actions except 'setup' and no-action (admin page)
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action && action !== 'setup' && !validateLicense()) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '利用期間が終了しました。管理者にお問い合わせください。',
        code: 'LICENSE_EXPIRED'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Inject client's API_KEY from script properties (always override to prevent URL injection)
    const clientStoredKey = cmlibrary._getScriptProp('API_KEY');
    if (clientStoredKey) {
      e.parameter._storedApiKey = clientStoredKey;
    } else {
      delete e.parameter._storedApiKey;
    }
    
    // ライブラリのdoGet関数を呼び出し
    return cmlibrary.doGet(e);
  } catch (error) {
    console.error('doGet エラー:', error);
    // エラー時はJSONレスポンスを返す
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web Appとして公開されるdoPost関数
 * cmlibraryのweb_app_api.gsの関数を使用
 * @param {Object} e - イベントオブジェクト
 * @returns {ContentService} JSONレスポンス
 */
  function doPost(e) {
   try {
    // Inject client properties FIRST (needed for all _getScriptProp calls)
    var currentProps = PropertiesService.getScriptProperties().getProperties();
    currentProps._clientScriptId = ScriptApp.getScriptId();
    cmlibrary._setInjectedProps(currentProps);

    // License gate: block all requests without valid license
    if (!validateLicense()) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '利用期間が終了しました。管理者にお問い合わせください。',
        code: 'LICENSE_EXPIRED'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Inject client's API_KEY from script properties (always override to prevent URL injection)
    const clientStoredKey = cmlibrary._getScriptProp('API_KEY');
    if (clientStoredKey) {
      e.parameter._storedApiKey = clientStoredKey;
    } else {
      delete e.parameter._storedApiKey;
    }
    return cmlibrary.doPost(e);
  } catch (error) {
    console.error('doPost エラー:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =====================================================
// 管理画面API機能
// =====================================================

/**
 * 一定時間文字列比較（タイミング攻撃対策）
 * @param {string} a - 比較文字列1
 * @param {string} b - 比較文字列2
 * @returns {boolean} 一致する場合true
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function adminAction(action, params) {
  params = params || {};
  // Inject props — adminAction is called via google.script.run (not through doGet/doPost),
  // so _setInjectedProps must be called explicitly
  var currentProps = PropertiesService.getScriptProperties().getProperties();
  currentProps._clientScriptId = ScriptApp.getScriptId();
  cmlibrary._setInjectedProps(currentProps);
  var storedToken = cmlibrary._getScriptProp('ADMIN_TOKEN');
  if (!params.adminToken || !storedToken || !constantTimeCompare(params.adminToken, storedToken)) {
    return { success: false, error: '管理者トークンが無効です', code: 'INVALID_TOKEN' };
  }

  // License gate: block data operations (after token verified, so admin can still log in)
  if (!validateLicense()) {
    return { success: false, error: '利用期間が終了しました', code: 'LICENSE_EXPIRED' };
  }

  // getProperties: ライブラリのgetProperties()を直接呼び出し
  // adminDispatch経由だとnullが返るため直接呼び出しに変更
  if (action === 'getProperties') {
    try {
      var propResult = cmlibrary.getProperties();
      if (propResult !== null && propResult !== undefined && propResult.success) {
        return propResult;
      }
      // getProperties失敗時: buildAdminDashboardDataから物件一覧を抽出
      var dashResult = cmlibrary.buildAdminDashboardData();
      if (dashResult && dashResult.success && dashResult.properties) {
        // ダッシュボード形式 {id, name} → getProperties形式 {propertyId, propertyName} に変換
        var props = dashResult.properties.map(function (p) {
          return {
            propertyId: p.id || p.propertyId || '',
            propertyName: p.name || p.propertyName || '',
            roomCount: p.roomCount || 0,
            completedCount: p.completedCount || 0
          };
        });
        return { success: true, data: props };
      }
      return { success: false, error: '物件データの取得に失敗しました' };
    } catch (e) {
      return { success: false, error: 'getPropertiesエラー: ' + e.message };
    }
  }

  params._storedAdminToken = storedToken;
  return cmlibrary.adminDispatch(action, params);
}

// =====================================================
// テスト・デバッグ機能
// =====================================================

/**
 * ライブラリ接続テスト
 * 水道検針アプリライブラリが正常に読み込まれているかテスト
 */
function testLibraryConnection() {
  try {
    console.log('=== 水道検針アプリ ライブラリ接続テスト開始 ===');
    
    // スプレッドシート情報を取得してテスト
    const spreadsheetInfo = cmlibrary.getSpreadsheetInfo();
    console.log('スプレッドシート情報取得成功:', spreadsheetInfo);
    
    // 物件一覧取得テスト
    const propResult = cmlibrary.getProperties();
    console.log('物件一覧取得成功: ' + (propResult.success ? propResult.data.length : 0) + '件');
    
    console.log('=== ライブラリ接続テスト完了 ===');
    return {
      success: true,
      message: '水道検針アプリライブラリとの接続が正常に確認できました',
      spreadsheetInfo: spreadsheetInfo,
      propertiesCount: propResult.success ? propResult.data.length : 0
    };
    
  } catch (error) {
    console.error('ライブラリ接続テストエラー:', error);
    return {
      success: false,
      error: error.message,
      suggestion: 'ライブラリが正しく追加されているか、識別子が「cmlibrary」になっているか確認してください'
    };
  }
}

/**
 * 使用可能な関数一覧を表示
 * 水道検針アプリライブラリで利用可能な関数を確認
 */
function showAvailableFunctions() {
  try {
    console.log('=== 水道検針アプリ 利用可能関数一覧 ===');
    
    const functions = [
      '【API・データ関数】',
      '- getProperties(): 物件一覧取得',
      '- getRooms(propertyId): 部屋一覧取得',
      '- getMeterReadings(propertyId, roomId): 検針データ取得',
      '- updateMeterReadings(propertyId, roomId, readings): 検針データ更新',
      '- completePropertyInspectionSimple(propertyId, date): 検針完了日更新',
      '- calculateWarningFlag(...): 警告フラグ計算',
      '',
      '【データ管理機能】',
      '- formatPropertyIdsInPropertyMaster(): 物件IDフォーマット',
      '- formatPropertyIdsInRoomMaster(): 部屋マスタIDフォーマット',
      '- cleanUpOrphanedRooms(): 孤立データ削除',
      '- createInitialInspectionData(): 初期検針データ作成',
      '- populateInspectionDataFromMasters(): 新規部屋反映',
      '- processInspectionDataMonthly(): 月次処理',
      '',
      '【データ品質管理】',
      '- menuCleanupDuplicateData(): 重複データクリーンアップ',
      '- validateDataIntegrity(): データ整合性チェック',
      '- createAllIndexes(): インデックス作成',
      '- showSearchUsageGuide(): 検索ガイド表示',
      '',
      '【Web App機能】',
      '- doGet(e): Web App GET処理',
      '- doPost(e): Web App POST処理',
      '- showWaterMeterWebApp(): 水道検針アプリ表示'
    ];
    
    functions.forEach(func => console.log(func));
    
    return {
      success: true,
      functions: functions
    };
    
  } catch (error) {
    console.error('関数一覧表示エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 簡単な使用例を実行
 * 水道検針アプリライブラリの基本的な使用方法のデモ
 */
function runUsageExample() {
  try {
    console.log('=== 水道検針アプリ 使用例実行 ===');
    
    // 1. スプレッドシート情報取得
    console.log('1. スプレッドシート情報取得...');
    const ssInfo = cmlibrary.getSpreadsheetInfo();
    console.log(`   スプレッドシート名: ${ssInfo.name}`);
    console.log(`   シート数: ${ssInfo.sheets.length}個`);
    
    // 2. 物件一覧取得
    console.log('2. 物件一覧取得...');
    const propResult = cmlibrary.getProperties();
    if (!propResult.success) {
      console.log('   物件一覧取得失敗: ' + propResult.error);
      return { success: false, error: propResult.error };
    }
    const properties = propResult.data;
    console.log('   物件数: ' + properties.length + '件');
    
    if (properties.length > 0) {
      const firstProperty = properties[0];
      console.log('   最初の物件ID: ' + (firstProperty.propertyId || firstProperty['物件ID']));
      console.log('   最初の物件名: ' + (firstProperty.propertyName || firstProperty['物件名']));
      
      console.log('3. 部屋一覧取得...');
      const roomsResult = cmlibrary.getRooms(firstProperty.propertyId || firstProperty['物件ID']);
      if (roomsResult.success && roomsResult.data) {
        var roomsList = roomsResult.data.rooms || roomsResult.data;
        console.log('   部屋数: ' + (Array.isArray(roomsList) ? roomsList.length : 0) + '件');
      } else {
        console.log('   部屋一覧取得失敗');
      }
    }
    
    console.log('=== 使用例実行完了 ===');
    
    return {
      success: true,
      message: '水道検針アプリライブラリの基本機能が正常に動作しました'
    };
    
  } catch (error) {
    console.error('使用例実行エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// =====================================================
// ライブラリメニュー関数ラッパー
// ライブラリ側のonOpen()が作成するメニュー項目から呼ばれる
// GASの仕様上、メニューの関数名はクライアント側スクリプト内で解決されるため
// ラッパー経由でライブラリの関数を呼び出す
// =====================================================

/** 🚰 検針管理システム メニュー */
function showRoomsDialog() { return cmlibrary.showRoomsDialog(); }
function openMeterReadingInput() { return cmlibrary.openMeterReadingInput(); }
function runDataValidation() { return cmlibrary.runDataValidation(); }
function runDataCleanup() { return cmlibrary.runDataCleanup(); }
function displayPreCheckResults() { return cmlibrary.displayPreCheckResults(); }
function showUsageGuide() { return cmlibrary.showUsageGuide(); }

/** 🚀 システム導入 メニュー */
function startSampleExperienceWizard() { return cmlibrary.startSampleExperienceWizard(); }
function startProductionTemplateWizard() { return cmlibrary.startProductionTemplateWizard(); }
function startSystemSetupWizardFromMenu() { return cmlibrary.startSystemSetupWizardFromMenu(); }
function runSystemDiagnosticsFromMenu() { return cmlibrary.runSystemDiagnosticsFromMenu(); }
function createMasterSheetTemplatesFromMenu() { return cmlibrary.createMasterSheetTemplatesFromMenu(); }
function formatAllPropertyIdsFromMenu() { return cmlibrary.formatAllPropertyIdsFromMenu(); }
function generateRoomIdsFromMenu() { return cmlibrary.generateRoomIdsFromMenu(); }
function createInitialInspectionDataFromMenu() { return cmlibrary.createInitialInspectionDataFromMenu(); }
function ensureInspectionDataFormulasFromMenu() { return cmlibrary.ensureInspectionDataFormulasFromMenu(); }
function validateSystemSetupFromMenu() { return cmlibrary.validateSystemSetupFromMenu(); }
function showSystemSetupGuide() { return cmlibrary.showSystemSetupGuide(); }

/**
 * HTMLファイルを読み込む関数
 * @param {string} filename - 読み込むHTMLファイル名
 * @returns {string} HTMLファイルの内容
 */
function include(filename) {
  try {
    // まずライブラリのinclude関数を試行
    if (typeof cmlibrary !== 'undefined' && typeof cmlibrary.include === 'function') {
      return cmlibrary.include(filename);
    } else {
      // ライブラリが利用できない場合は直接読み込み
      return HtmlService.createHtmlOutputFromFile(filename).getContent();
    }
  } catch (error) {
    console.error('include エラー:', error);
    return `<!-- include エラー: ${error.message} -->`;
  }
}
