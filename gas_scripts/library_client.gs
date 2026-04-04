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
    } else {
      console.log('[onOpen] ライブラリのonOpen関数が見つからないため、独自メニューを作成');
      createWaterMeterMenu();
    }
    
  } catch (error) {
    console.error('ライブラリのonOpen関数呼び出しエラー:', error);
    console.log('[onOpen] エラーのため独自メニューを作成');
    createWaterMeterMenu();
  }
}

/**
 * 水道検針システムのメニューを作成
 */
function createWaterMeterMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // メインメニューを作成
    const mainMenu = ui.createMenu('🚰 水道検針システム');
    
    // 基本機能
    mainMenu.addItem('📱 水道検針アプリを開く', 'showWaterMeterApp');
    mainMenu.addSeparator();
    mainMenu.addItem('📋 物件一覧を表示', 'showPropertiesList');
    mainMenu.addItem('🏠 部屋一覧を表示', 'showRoomsList');
    mainMenu.addSeparator();
    
    // データ管理サブメニュー
    const dataMenu = ui.createMenu('📊 データ管理');
    dataMenu.addItem('1. 物件IDフォーマット整理', 'formatPropertyIdsInPropertyMaster');
    dataMenu.addItem('2. 部屋IDフォーマット整理', 'formatPropertyIdsInRoomMaster');
    dataMenu.addItem('3. 部屋ID連番自動生成', 'generateRoomIds');
    dataMenu.addItem('4. 孤立データ削除', 'cleanUpOrphanedRooms');
    dataMenu.addSeparator();
    dataMenu.addItem('5. 初期検針データ作成', 'createInitialInspectionData');
    dataMenu.addItem('6. 新規部屋反映', 'populateInspectionDataFromMasters');
    dataMenu.addItem('7. 月次処理実行', 'processInspectionDataMonthly');
    
    mainMenu.addSubMenu(dataMenu);
    
    // データ品質管理サブメニュー
    const qualityMenu = ui.createMenu('🔍 データ品質管理');
    qualityMenu.addItem('1. 重複データ削除', 'menuCleanupDuplicateData');
    qualityMenu.addItem('2. データ整合性チェック', 'menuValidateDataIntegrity');
    qualityMenu.addItem('3. 検索インデックス作成', 'createDataIndexes');
    qualityMenu.addSeparator();
    qualityMenu.addItem('4. 検索機能テスト', 'testSearchFunctions');
    qualityMenu.addItem('5. 検索ガイド表示', 'showSearchUsageGuide');
    
    mainMenu.addSubMenu(qualityMenu);
    
    // テスト・デバッグサブメニュー
    const debugMenu = ui.createMenu('🧪 テスト・デバッグ');
    debugMenu.addItem('1. ライブラリ接続テスト', 'testLibraryConnection');
    debugMenu.addItem('2. 利用可能関数一覧', 'showAvailableFunctions');
    debugMenu.addItem('3. 使用例実行', 'runUsageExample');
    
    mainMenu.addSubMenu(debugMenu);
    
    // メニューをUIに追加
    mainMenu.addToUi();
    
    console.log('[createWaterMeterMenu] 水道検針システムメニュー作成完了');
    
  } catch (error) {
    console.error('[createWaterMeterMenu] メニュー作成エラー:', error);
  }
}

// =====================================================
// UI機能（メニューから呼び出される関数）
// =====================================================

/**
 * 物件一覧を表示
 */
function showPropertiesList() {
  try {
    const properties = cmlibrary.getProperties();
    
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
    const roomsData = cmlibrary.getRooms(propertyId);
    
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
function menuValidateDataIntegrity() {
  try {
    return cmlibrary.menuValidateDataIntegrity();
  } catch (error) {
    console.error('データ整合性チェックエラー:', error);
    throw error;
  }
}

/**
 * データ高速検索インデックス作成
 * cmlibraryのdata_indexes.gsの関数を使用
 */
function createDataIndexes() {
  try {
    return cmlibrary.createDataIndexes();
  } catch (error) {
    console.error('インデックス作成エラー:', error);
    throw error;
  }
}

/**
 * 高速検索機能テスト
 * cmlibraryのbatch_processing.gsの関数を使用
 */
function testSearchFunctions() {
  try {
    return cmlibrary.testSearchFunctions();
  } catch (error) {
    console.error('検索機能テストエラー:', error);
    throw error;
  }
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
    const properties = cmlibrary.getProperties();
    console.log(`物件一覧取得成功: ${properties.length}件`);
    
    console.log('=== ライブラリ接続テスト完了 ===');
    return {
      success: true,
      message: '水道検針アプリライブラリとの接続が正常に確認できました',
      spreadsheetInfo: spreadsheetInfo,
      propertiesCount: properties.length
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
      '- menuValidateDataIntegrity(): データ整合性チェック',
      '- createDataIndexes(): インデックス作成',
      '- testSearchFunctions(): 検索機能テスト',
      '- showSearchUsageGuide(): 検索ガイド表示',
      '',
      '【Web App機能】',
      '- doGet(e): Web App GET処理',
      '- doPost(e): Web App POST処理',
      '- showWaterMeterApp(): 水道検針アプリ表示'
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
    const properties = cmlibrary.getProperties();
    console.log(`   物件数: ${properties.length}件`);
    
    if (properties.length > 0) {
      const firstProperty = properties[0];
      console.log(`   最初の物件ID: ${firstProperty['物件ID']}`);
      console.log(`   最初の物件名: ${firstProperty['物件名']}`);
      
      // 3. 部屋一覧取得（最初の物件の）
      console.log('3. 部屋一覧取得...');
      const roomsData = cmlibrary.getRooms(firstProperty['物件ID']);
      console.log(`   部屋数: ${roomsData.rooms.length}件`);
      console.log(`   検針完了部屋数: ${roomsData.rooms.filter(r => r.isCompleted).length}件`);
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
