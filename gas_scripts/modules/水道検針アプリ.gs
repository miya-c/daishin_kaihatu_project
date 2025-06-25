/**
 * ===================================================================
 * 📚 SampleUsage.gs - cmlibraryの使用サンプル
 * ===================================================================
 * 
 * このファイルは、cmlibraryを利用したGoogle Apps Scriptの作成例です。
 * 利用者は以下の手順でライブラリを追加してください。
 * 
 * 【ライブラリの追加手順】
 * 1. Apps Scriptエディタで「ライブラリ」の横の「+」をクリック
 * 2. cmlibraryのスクリプトIDを入力して検索
 * 3. 最新バージョンを選択して「追加」
 * 4. 識別子を「cmlibrary」に設定
 * 
 * 【前提条件】
 * - スプレッドシートに以下のシートが存在すること:
 *   - 物件マスタ
 *   - 部屋マスタ  
 *   - inspection_data (または検針データ)
 *   - 設定値
 * 
 * 作成日: 2025-06-24
 * ===================================================================
 */

/**
 * メニューを作成してスプレッドシートに追加する
 * スプレッドシートを開いた際に自動実行されます
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  // 基本メニュー
  ui.createMenu('🚰 検針管理システム')
    .addItem('📋 物件一覧を表示', 'showPropertiesList')
    .addItem('🏠 部屋一覧を表示', 'showRoomsDialog')
    .addItem('📊 検針データ入力', 'openMeterReadingInput')
    .addSeparator()
    .addItem('🔧 データ整合性チェック', 'runDataValidation')
    .addItem('🧹 データクリーンアップ', 'runDataCleanup')
    .addSeparator()
    .addItem('ℹ️ 使用方法ガイド', 'showUsageGuide')
    .addToUi();
  
  // 高度機能メニュー
  createAdvancedMenu();
}

/**
 * 物件一覧を取得して表示する
 */
function showPropertiesList() {
  try {
    // cmlibraryから物件一覧を取得
    const properties = cmlibrary.getProperties();
    
    if (!properties || properties.length === 0) {
      SpreadsheetApp.getUi().alert('物件データが見つかりません', 
        '物件マスタシートにデータがあることを確認してください。', 
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // 物件一覧をダイアログで表示
    let message = '📋 登録済み物件一覧:\n\n';
    properties.forEach((property, index) => {
      message += `${index + 1}. ${property.name} (ID: ${property.id})\n`;
    });
    
    message += `\n合計: ${properties.length}件の物件が登録されています。`;
    
    SpreadsheetApp.getUi().alert('物件一覧', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('[showPropertiesList] エラー:', error.message);
    SpreadsheetApp.getUi().alert('エラー', 
      `物件一覧の取得に失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 部屋一覧を表示するダイアログを開く
 */
function showRoomsDialog() {
  try {
    // まず物件一覧を取得
    const properties = cmlibrary.getProperties();
    
    if (!properties || properties.length === 0) {
      SpreadsheetApp.getUi().alert('物件データが見つかりません', 
        '物件マスタシートにデータがあることを確認してください。', 
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // 物件選択用のプロンプトを表示
    let propertyOptions = '物件IDを入力してください:\n\n';
    properties.forEach((property, index) => {
      propertyOptions += `${property.id}: ${property.name}\n`;
    });
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('物件選択', propertyOptions, ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() === ui.Button.OK) {
      const propertyId = response.getResponseText().trim();
      
      if (!propertyId) {
        ui.alert('エラー', '物件IDが入力されていません。', ui.ButtonSet.OK);
        return;
      }
      
      // 指定された物件の部屋一覧を取得
      const rooms = cmlibrary.getRooms(propertyId);
      
      if (!rooms || rooms.length === 0) {
        ui.alert('部屋データが見つかりません', 
          `物件ID「${propertyId}」に対応する部屋が見つかりません。\n物件IDを確認してください。`, 
          ui.ButtonSet.OK);
        return;
      }
      
      // 部屋一覧を表示
      let roomMessage = `🏠 物件「${propertyId}」の部屋一覧:\n\n`;
      rooms.forEach((room, index) => {
        roomMessage += `${index + 1}. ${room.name || room.id} (ID: ${room.id})\n`;
      });
      
      roomMessage += `\n合計: ${rooms.length}件の部屋が登録されています。`;
      
      ui.alert('部屋一覧', roomMessage, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    console.error('[showRoomsDialog] エラー:', error.message);
    SpreadsheetApp.getUi().alert('エラー', 
      `部屋一覧の取得に失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 検針データ入力画面を開く
 */
function openMeterReadingInput() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // 物件ID入力
    const propertyResponse = ui.prompt('検針データ入力 - Step 1/3', 
      '物件IDを入力してください:', ui.ButtonSet.OK_CANCEL);
    
    if (propertyResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const propertyId = propertyResponse.getResponseText().trim();
    if (!propertyId) {
      ui.alert('エラー', '物件IDが入力されていません。', ui.ButtonSet.OK);
      return;
    }
    
    // 部屋ID入力
    const roomResponse = ui.prompt('検針データ入力 - Step 2/3', 
      '部屋IDを入力してください:', ui.ButtonSet.OK_CANCEL);
    
    if (roomResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const roomId = roomResponse.getResponseText().trim();
    if (!roomId) {
      ui.alert('エラー', '部屋IDが入力されていません。', ui.ButtonSet.OK);
      return;
    }
    
    // 検針値入力
    const meterResponse = ui.prompt('検針データ入力 - Step 3/3', 
      '今回の検針値を入力してください:', ui.ButtonSet.OK_CANCEL);
    
    if (meterResponse.getSelectedButton() !== ui.Button.OK) return;
    
    const meterValue = parseFloat(meterResponse.getResponseText().trim());
    if (isNaN(meterValue)) {
      ui.alert('エラー', '有効な数値を入力してください。', ui.ButtonSet.OK);
      return;
    }
    
    // 検針データを保存 (簡単な例)
    saveMeterReading(propertyId, roomId, meterValue);
    
    ui.alert('完了', 
      `検針データを保存しました:\n物件ID: ${propertyId}\n部屋ID: ${roomId}\n検針値: ${meterValue}`, 
      ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[openMeterReadingInput] エラー:', error.message);
    SpreadsheetApp.getUi().alert('エラー', 
      `検針データの入力に失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 検針データを保存する
 * @param {string} propertyId 物件ID
 * @param {string} roomId 部屋ID
 * @param {number} meterValue 検針値
 */
function saveMeterReading(propertyId, roomId, meterValue) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('inspection_data') || ss.getSheetByName('検針データ');
    
    if (!sheet) {
      throw new Error('inspection_dataまたは検針データシートが見つかりません。');
    }
    
    // 現在の日時を取得
    const now = new Date();
    
    // 新しい行を追加 (簡単な例)
    const newRow = [
      `R${Date.now()}`, // 記録ID
      '', // 物件名（後で更新可能）
      propertyId,
      roomId,
      '', // 部屋名（後で更新可能）
      now, // 検針日時
      '', // 警告フラグ
      '', // 標準偏差値
      '', // 今回使用量
      meterValue, // 今回の指示数
      '', // 前回指示数
      '', // 前々回指示数
      ''  // 前々々回指示数
    ];
    
    sheet.appendRow(newRow);
    console.log(`検針データを保存しました: ${propertyId}-${roomId} = ${meterValue}`);
    
  } catch (error) {
    console.error('[saveMeterReading] エラー:', error.message);
    throw error;
  }
}

/**
 * データ整合性チェックを実行する
 */
function runDataValidation() {
  try {
    // cmlibraryのデータ検証機能を利用
    const result = cmlibrary.validateInspectionDataIntegrity();
    
    SpreadsheetApp.getUi().alert('データ整合性チェック完了', 
      'データの整合性チェックが完了しました。\n詳細はログを確認してください。', 
      SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('[runDataValidation] エラー:', error.message);
    SpreadsheetApp.getUi().alert('エラー', 
      `データ検証に失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * データクリーンアップを実行する
 */
function runDataCleanup() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('データクリーンアップ', 
      '重複データの削除などのクリーンアップを実行しますか？\nこの操作は元に戻せません。', 
      ui.ButtonSet.YES_NO);
    
    if (response === ui.Button.YES) {
      // cmlibraryのクリーンアップ機能を利用
      cmlibrary.optimizedCleanupDuplicateInspectionData();
      
      ui.alert('完了', 
        'データクリーンアップが完了しました。\n詳細はログを確認してください。', 
        ui.ButtonSet.OK);
    }
    
  } catch (error) {
    console.error('[runDataCleanup] エラー:', error.message);
    SpreadsheetApp.getUi().alert('エラー', 
      `データクリーンアップに失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 使用方法ガイドを表示する
 */
function showUsageGuide() {
  const guide = `
🚰 検針管理システム 使用方法ガイド

【基本的な使い方】
1. スプレッドシートを開くと、メニューバーに「🚰 検針管理システム」が表示されます
2. メニューから各機能を選択して利用してください

【主な機能】
📋 物件一覧を表示: 登録されている物件の一覧を確認
🏠 部屋一覧を表示: 指定した物件の部屋一覧を確認
📊 検針データ入力: 新しい検針データを入力
🔧 データ整合性チェック: データの整合性を確認
🧹 データクリーンアップ: 重複データの削除など

【必要なシート構成】
- 物件マスタ: 物件の基本情報
- 部屋マスタ: 部屋の基本情報
- inspection_data または 検針データ: 検針データの記録
- 設定値: システムの設定情報

【トラブルシューティング】
- エラーが発生した場合は、まずシート名が正しいか確認してください
- データが表示されない場合は、各マスタシートにデータがあるか確認してください
- 詳細なエラー情報は、Apps Scriptエディタの実行ログで確認できます

【ライブラリ情報】
- ライブラリ名: cmlibrary
- 利用関数: getProperties(), getRooms(), validateInspectionDataIntegrity() など
  `;
  
  console.log(guide);
  SpreadsheetApp.getUi().alert('使用方法ガイド', 
    '使用方法ガイドをログに出力しました。\nApps Scriptエディタの実行ログでご確認ください。', 
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * 高度な検索機能のサンプル
 */
function advancedSearchSample() {
  try {
    console.log('=== 高度な検索機能のサンプル ===');
    
    // 全インデックスを作成
    const indexes = cmlibrary.createAllIndexes();
    console.log('インデックス作成完了');
    
    // 物件検索のサンプル
    const propertyResult = cmlibrary.fastSearch('property', 'P001', indexes);
    console.log('物件検索結果:', propertyResult);
    
    // 部屋検索のサンプル
    const roomResult = cmlibrary.fastSearch('room', 'R001-101', indexes);
    console.log('部屋検索結果:', roomResult);
    
    // 物件に属する部屋一覧の取得
    const propertyRooms = cmlibrary.fastSearch('propertyRooms', 'P001', indexes);
    console.log('物件P001の部屋一覧:', propertyRooms);
    
    // インデックス統計情報
    const stats = cmlibrary.getIndexStats();
    console.log('インデックス統計:', stats);
    
  } catch (error) {
    console.error('[advancedSearchSample] エラー:', error.message);
  }
}

/**
 * バッチ処理のサンプル
 */
function batchProcessingSample() {
  try {
    console.log('=== バッチ処理のサンプル ===');
    
    // 月次バッチ処理の実行
    cmlibrary.processInspectionDataMonthly();
    console.log('月次バッチ処理完了');
    
    // データフォーマット処理
    cmlibrary.formatPropertyIdsInPropertyMaster();
    cmlibrary.formatPropertyIdsInRoomMaster();
    console.log('データフォーマット処理完了');
    
  } catch (error) {
    console.error('[batchProcessingSample] エラー:', error.message);
  }
}

/**
 * カスタム関数のサンプル（スプレッドシートのセルで利用可能）
 */

/**
 * 指定した物件の部屋数を返すカスタム関数
 * @param {string} propertyId 物件ID
 * @return {number} 部屋数
 * @customfunction
 */
function ROOM_COUNT(propertyId) {
  try {
    if (!propertyId) return 0;
    const rooms = cmlibrary.getRooms(propertyId);
    return rooms ? rooms.length : 0;
  } catch (error) {
    return `エラー: ${error.message}`;
  }
}

/**
 * 物件名を取得するカスタム関数
 * @param {string} propertyId 物件ID
 * @return {string} 物件名
 * @customfunction
 */
function PROPERTY_NAME(propertyId) {
  try {
    if (!propertyId) return '';
    const properties = cmlibrary.getProperties();
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : '物件が見つかりません';
  } catch (error) {
    return `エラー: ${error.message}`;
  }
}

// ======================================================================
// 📈 追加機能サンプル - ライブラリの全機能活用
// ======================================================================

/**
 * データ管理の高度な機能サンプル
 */
function advancedDataManagementSample() {
  try {
    console.log('=== データ管理高度機能サンプル ===');
    
    // マスタデータから検針データを自動生成
    cmlibrary.populateInspectionDataFromMasters();
    console.log('✅ マスタデータから検針データを生成完了');
    
    // 初期検針データの作成
    cmlibrary.createInitialInspectionData();
    console.log('✅ 初期検針データ作成完了');
    
    // IDフォーマット統一
    const formattedId = cmlibrary.formatID('p-001-a');
    console.log('✅ IDフォーマット例:', formattedId); // 結果: P001A
    
  } catch (error) {
    console.error('[advancedDataManagementSample] エラー:', error.message);
    SpreadsheetApp.getUi().alert('エラー', 
      `データ管理処理に失敗しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ダイアログ機能のサンプル
 */
function showDialogFunctionsSample() {
  try {
    console.log('=== ダイアログ機能サンプル ===');
    
    // Web App URL表示
    cmlibrary.showWaterMeterWebApp();
    
    // 物件選択ダイアログ
    cmlibrary.showPropertySelectDialog();
    
    // 実行ガイダンス表示
    cmlibrary.showExecutionGuidance();
    
  } catch (error) {
    console.error('[showDialogFunctionsSample] エラー:', error.message);
  }
}

/**
 * Web App API機能のテスト
 */
function testWebAppApiFunctions() {
  try {
    console.log('=== Web App API機能テスト ===');
    
    // Web App URL取得
    const webAppUrl = cmlibrary.getWebAppUrl();
    console.log('Web App URL:', webAppUrl);
    
    // 検針データ取得のテスト
    const meterReadings = cmlibrary.getMeterReadings('P001', 'R001');
    console.log('検針データ取得結果:', meterReadings);
    
    // 物件検針完了処理のテスト
    const completionResult = cmlibrary.completePropertyInspectionSimple('P001', new Date());
    console.log('検針完了処理結果:', completionResult);
    
  } catch (error) {
    console.error('[testWebAppApiFunctions] エラー:', error.message);
  }
}

/**
 * ユーティリティ関数のサンプル
 */
function utilityFunctionsSample() {
  try {
    console.log('=== ユーティリティ関数サンプル ===');
    
    // アクティブスプレッドシートID取得
    const activeId = cmlibrary.getActiveSpreadsheetId();
    console.log('アクティブスプレッドシートID:', activeId);
    
    // 設定状態確認
    const configStatus = cmlibrary.checkConfigStatus();
    console.log('設定状態:', configStatus);
    
    // 安全なアラート表示
    cmlibrary.safeAlert('テスト', 'ユーティリティ関数のテストです');
    
  } catch (error) {
    console.error('[utilityFunctionsSample] エラー:', error.message);
  }
}

/**
 * 統合テスト実行サンプル
 */
function runIntegrationTestSample() {
  try {
    console.log('=== 統合テスト実行サンプル ===');
    
    // 完全統合確認
    const integrationStatus = cmlibrary.verifyCompleteIntegration();
    console.log('統合状態確認:', integrationStatus);
    
    // 完全統合テスト実行
    const testResult = cmlibrary.runCompleteIntegrationTest();
    console.log('統合テスト結果:', testResult);
    
  } catch (error) {
    console.error('[runIntegrationTestSample] エラー:', error.message);
  }
}

/**
 * 検索機能の詳細サンプル
 */
function detailedSearchSample() {
  try {
    console.log('=== 検索機能詳細サンプル ===');
    
    // 各種インデックス個別作成
    const propertyIndex = cmlibrary.createPropertyIndex();
    console.log('物件インデックス作成完了:', Object.keys(propertyIndex).length + '件');
    
    const roomIndexes = cmlibrary.createRoomIndex();
    console.log('部屋インデックス作成完了:', Object.keys(roomIndexes.roomIndex).length + '件');
    
    const meterIndexes = cmlibrary.createMeterReadingIndex();
    console.log('検針データインデックス作成完了:', Object.keys(meterIndexes.meterIndex).length + '件');
    
    // 検索ガイド表示
    const searchGuide = cmlibrary.showSearchGuide();
    console.log('検索ガイド:', searchGuide);
    
    // テスト用検索実行
    cmlibrary.testFastSearch();
    
    // 実データサンプル検索
    cmlibrary.sampleDataSearch();
    
  } catch (error) {
    console.error('[detailedSearchSample] エラー:', error.message);
  }
}

/**
 * 全機能統合デモンストレーション
 */
function fullFeatureDemo() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('全機能デモ実行', 
      'cmlibraryの全機能をデモンストレーションします。\n実行しますか？', 
      ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) return;
    
    console.log('=== cmlibrary 全機能デモンストレーション開始 ===');
    
    // 1. データ管理機能
    console.log('1. データ管理機能テスト中...');
    advancedDataManagementSample();
    
    // 2. 検索機能
    console.log('2. 検索機能テスト中...');
    detailedSearchSample();
    
    // 3. バッチ処理
    console.log('3. バッチ処理テスト中...');
    batchProcessingSample();
    
    // 4. ダイアログ機能
    console.log('4. ダイアログ機能テスト中...');
    showDialogFunctionsSample();
    
    // 5. Web App API
    console.log('5. Web App API機能テスト中...');
    testWebAppApiFunctions();
    
    // 6. ユーティリティ
    console.log('6. ユーティリティ機能テスト中...');
    utilityFunctionsSample();
    
    // 7. 統合テスト
    console.log('7. 統合テスト実行中...');
    runIntegrationTestSample();
    
    console.log('=== 全機能デモンストレーション完了 ===');
    
    ui.alert('デモ完了', 
      'cmlibraryの全機能デモンストレーションが完了しました。\n詳細はコンソールログを確認してください。', 
      ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[fullFeatureDemo] エラー:', error.message);
    SpreadsheetApp.getUi().alert('エラー', 
      `デモ実行中にエラーが発生しました:\n${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ライブラリ機能一覧表示
 */
function showLibraryFeatureList() {
  const featureList = `
📚 cmlibrary 利用可能機能一覧

【📊 データ取得・管理】
• getProperties() - 物件一覧取得
• getRooms(propertyId) - 部屋一覧取得
• getMeterReadings(propertyId, roomId) - 検針データ取得
• populateInspectionDataFromMasters() - マスタからデータ生成
• createInitialInspectionData() - 初期データ作成
• processInspectionDataMonthly() - 月次処理

【🔍 検索・インデックス】
• createAllIndexes() - 全インデックス作成
• createPropertyIndex() - 物件インデックス作成
• createRoomIndex() - 部屋インデックス作成
• createMeterReadingIndex() - 検針データインデックス作成
• fastSearch(type, key, indexes) - 高速検索
• getIndexStats() - インデックス統計

【✅ データ検証・クリーンアップ】
• validateInspectionDataIntegrity() - データ整合性チェック
• optimizedCleanupDuplicateInspectionData() - 重複データクリーンアップ
• formatPropertyIdsInPropertyMaster() - 物件IDフォーマット
• formatPropertyIdsInRoomMaster() - 部屋IDフォーマット
• formatID(id) - ID統一フォーマット

【💬 UI・ダイアログ】
• showWaterMeterWebApp() - Web App表示
• showPropertySelectDialog() - 物件選択ダイアログ
• showExecutionGuidance() - 実行ガイド表示
• safeAlert(title, message) - 安全なアラート表示

【🌐 Web App API】
• getWebAppUrl() - Web App URL取得
• doGet(e) - GETリクエスト処理
• doPost(e) - POSTリクエスト処理
• completePropertyInspectionSimple() - 検針完了処理
• updateMeterReadings() - 検針データ更新

【🛠️ ユーティリティ】
• getActiveSpreadsheetId() - アクティブシートID取得
• checkConfigStatus() - 設定状態確認
• verifyCompleteIntegration() - 統合状態確認
• runCompleteIntegrationTest() - 統合テスト実行

【🧪 テスト・デバッグ】
• testFastSearch() - 検索機能テスト
• sampleDataSearch() - サンプルデータ検索
• showSearchGuide() - 検索ガイド表示
  `;
  
  console.log(featureList);
  SpreadsheetApp.getUi().alert('ライブラリ機能一覧', 
    'cmlibrary の全機能一覧をコンソールログに出力しました。\nApps Script エディタの実行ログでご確認ください。', 
    SpreadsheetApp.getUi().ButtonSet.OK);
}

// メニューに新機能を追加
/**
 * 拡張メニューを作成（高度な機能用）
 */
function createAdvancedMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔧 cmlibrary 高度機能')
    .addItem('📈 データ管理高度機能', 'advancedDataManagementSample')
    .addItem('🔍 検索機能詳細テスト', 'detailedSearchSample')
    .addItem('💬 ダイアログ機能テスト', 'showDialogFunctionsSample')
    .addItem('🌐 Web App API テスト', 'testWebAppApiFunctions')
    .addItem('🛠️ ユーティリティテスト', 'utilityFunctionsSample')
    .addSeparator()
    .addItem('🚀 全機能デモ実行', 'fullFeatureDemo')
    .addItem('📚 機能一覧表示', 'showLibraryFeatureList')
    .addToUi();
}
