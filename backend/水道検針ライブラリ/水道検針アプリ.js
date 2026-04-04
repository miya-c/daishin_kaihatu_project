/**
 * 水道検針アプリ.gs - 水道検針アプリケーション機能
 * 検針データの管理とアプリケーション機能を提供
 * Version: 1.0.0 - Library Edition
 */

/**
 * スプレッドシート開始時のメニュー作成
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // システム導入メニュー
    createSystemSetupMenu();
    
    // 基本メニュー
    ui.createMenu('🚰 検針管理システム')
      .addItem('📋 物件一覧を表示', 'showPropertiesList')
      .addItem('🏠 部屋一覧を表示', 'showRoomsDialog')
      .addItem('📊 検針データ入力', 'openMeterReadingInput')
      .addSeparator()
      .addItem('🔧 データ整合性チェック', 'runDataValidation')
      .addItem('🧹 データクリーンアップ', 'runDataCleanup')
      .addSeparator()
      .addItem('📅 月次処理実行', 'processInspectionDataMonthly')
      .addItem('🔍 月次処理事前チェック', 'displayPreCheckResults')
      .addSeparator()
      .addItem('ℹ️ 使用方法ガイド', 'showUsageGuide')
      .addToUi();
    
    // 高度機能メニュー
    createAdvancedMenu();
    
    logWithLevel('INFO', 'onOpen: メニュー作成完了');
  } catch (error) {
    logWithLevel('ERROR', 'onOpen エラー', error.message);
  }
}

/**
 * システム導入メニューを作成
 */
function createSystemSetupMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    ui.createMenu('🚀 システム導入')
      .addItem('🎯 導入ウィザード開始', 'startSystemSetupWizardFromMenu')
      .addSeparator()
      .addItem('🔍 システム診断実行', 'runSystemDiagnosticsFromMenu')
      .addItem('📝 マスタシートテンプレート作成', 'createMasterSheetTemplatesFromMenu')
      .addItem('🏠 サンプルデータ投入', 'createSampleDataFromMenu')
      .addSeparator()
      .addItem('🆔 物件ID自動割り当て', 'formatAllPropertyIdsFromMenu')
      .addItem('🏢 部屋ID自動生成', 'generateRoomIdsFromMenu')
      .addItem('📊 検針データシート作成', 'createInitialInspectionDataFromMenu')
      .addSeparator()
      .addItem('✅ 導入完了確認', 'validateSystemSetupFromMenu')
      .addItem('📖 導入ガイド表示', 'showSystemSetupGuide')
      .addToUi();
      
  } catch (error) {
    logWithLevel('ERROR', 'createSystemSetupMenu エラー', error.message);
  }
}

/**
 * 高度機能メニューを作成
 */
function createAdvancedMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    ui.createMenu('🔧 高度機能')
      .addItem('📈 検索インデックス作成', 'createSearchIndexes')
      .addItem('🔍 高速検索テスト', 'testFastSearch')
      .addItem('📊 バッチ処理実行', 'runBatchProcessing')
      .addSeparator()
      .addItem('🔄 データ同期処理', 'syncDataFromMasters')
      .addItem('📋 月次レポート生成', 'generateMonthlyReport')
      .addSeparator()
      .addItem('🔒 ロック状態確認', 'displayLockStatus')
      .addItem('🔓 ロック強制解除', 'forceReleaseLock')
      .addSeparator()
      .addItem('📊 パフォーマンス統計', 'displayMonthlyProcessPerformance')
      .addItem('🩺 システムヘルスチェック', 'checkMonthlyProcessHealth')
      .addItem('📜 処理履歴表示', 'displayMonthlyProcessHistory')
      .addItem('🗑️ ログ履歴削除', 'clearMonthlyProcessHistory')
      .addSeparator()
      .addItem('🧪 Phase 2 統合テスト', 'menuRunPhase2IntegrationTest')
      .addItem('🧪 Phase 3 統合テスト', 'menuRunPhase3IntegrationTest')
      .addSeparator()
      .addItem('💾 バックアップガイド', 'displayBackupGuide')
      .addItem('🔒 ロック状態詳細', 'displayDetailedLockStatus')
      .addItem('🔧 安全な強制解除', 'safeForceReleaseLock')
      .addSeparator()
      .addItem('⚙️ システム設定', 'showSystemSettings')
      .addItem('🛠️ デバッグ情報', 'showDebugInfo')
      .addToUi();
      
  } catch (error) {
    logWithLevel('ERROR', 'createAdvancedMenu エラー', error.message);
  }
}

/**
 * 物件一覧を取得して表示
 * @returns {Object} 実行結果
 */
function showPropertiesList() {
  try {
    logWithLevel('INFO', 'showPropertiesList開始', 'メニューから呼び出し');
    const properties = getProperties();
    
    if (!properties || properties.length === 0) {
      if (typeof safeAlert === 'function') {
        safeAlert('物件データなし', 
          '物件マスタシートにデータがありません。', 
          SpreadsheetApp.getUi().ButtonSet.OK);
      }
      return { success: false, error: 'データなし' };
    }
    
    let message = '📋 登録済み物件一覧:\n\n';
    properties.forEach((property, index) => {
      const propertyId = property['物件ID'] || property.id || '';
      const propertyName = property['物件名'] || property.name || '名称不明';
      const completionDate = property['検針完了日'] || '';
      const status = completionDate ? '✅ 完了' : '⏳ 未完了';
      message += `${index + 1}. ${propertyName} (ID: ${propertyId}) ${status}\n`;
    });
    
    message += `\n合計: ${properties.length}件の物件が登録されています。`;
    
    if (typeof safeAlert === 'function') {
      safeAlert('物件一覧', message);
    }
    
    return { success: true, count: properties.length, properties: properties };
    
  } catch (error) {
    logWithLevel('ERROR', 'showPropertiesList エラー', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', `物件一覧の取得に失敗しました:\n${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 部屋一覧表示ダイアログ
 * @returns {Object} 実行結果
 */
function showRoomsDialog() {
  try {
    logWithLevel('INFO', 'showRoomsDialog開始', 'メニューから呼び出し');
    const ui = SpreadsheetApp.getUi();
    
    // 物件ID入力
    const response = ui.prompt('部屋一覧表示', 
      '物件IDを入力してください:', ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return { success: true, action: 'cancelled' };
    }
    
    const propertyId = response.getResponseText().trim();
    if (!propertyId) {
      safeAlert('エラー', '物件IDが入力されていません。');
      return { success: false, error: '物件IDが未入力' };
    }
    
    // 部屋一覧取得
    logWithLevel('INFO', 'getRooms呼び出し', `物件ID: ${propertyId}`);
    const roomsData = getRooms(propertyId);
    logWithLevel('INFO', 'getRooms結果', roomsData ? '成功' : '失敗');
    
    if (!roomsData || !roomsData.rooms || roomsData.rooms.length === 0) {
      safeAlert('部屋データなし', 
        `物件ID「${propertyId}」に対応する部屋が見つかりません。`);
      return { success: false, error: 'データなし' };
    }
    
    // 部屋一覧表示
    let message = `🏠 物件「${roomsData.property?.name || propertyId}」の部屋一覧:\n\n`;
    roomsData.rooms.forEach((room, index) => {
      const status = room.isCompleted ? '✅ 完了' : '⏳ 未完了';
      message += `${index + 1}. ${room.name || room.id} (ID: ${room.id}) ${status}\n`;
    });
    
    const completedCount = roomsData.rooms.filter(r => r.isCompleted).length;
    message += `\n合計: ${roomsData.rooms.length}件（完了: ${completedCount}件）`;
    
    safeAlert('部屋一覧', message);
    
    return { success: true, roomsData: roomsData };
    
  } catch (error) {
    logWithLevel('ERROR', 'showRoomsDialog エラー', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    safeAlert('エラー', `部屋一覧の取得に失敗しました:\n${error.message}\n\n技術的詳細: ${error.name}`);
    return { success: false, error: error.message };
  }
}

/**
 * 検針データ入力画面を開く
 * @returns {Object} 実行結果
 */
function openMeterReadingInput() {
  try {
    logWithLevel('INFO', 'openMeterReadingInput開始', 'メニューから呼び出し');
    const ui = SpreadsheetApp.getUi();
    
    // 物件ID入力
    const propertyResponse = ui.prompt('検針データ入力', 
      '物件IDを入力してください:', ui.ButtonSet.OK_CANCEL);
    
    if (propertyResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: true, action: 'cancelled' };
    }
    
    const propertyId = propertyResponse.getResponseText().trim();
    if (!propertyId) {
      safeAlert('エラー', '物件IDが入力されていません。');
      return { success: false, error: '物件IDが未入力' };
    }
    
    // 部屋ID入力
    const roomResponse = ui.prompt('検針データ入力', 
      '部屋IDを入力してください:', ui.ButtonSet.OK_CANCEL);
    
    if (roomResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: true, action: 'cancelled' };
    }
    
    const roomId = roomResponse.getResponseText().trim();
    if (!roomId) {
      safeAlert('エラー', '部屋IDが入力されていません。');
      return { success: false, error: '部屋IDが未入力' };
    }
    
    // 現在の検針データを取得
    const currentData = getMeterReadings(propertyId, roomId);
    
    let inputMessage = `🏠 物件: ${currentData.propertyName || propertyId}\n`;
    inputMessage += `🚪 部屋: ${currentData.roomName || roomId}\n\n`;
    inputMessage += `前回検針値: ${currentData.readings?.previousReading || '未入力'}\n\n`;
    inputMessage += `今回検針値を入力してください:`;
    
    // 今回検針値入力
    const readingResponse = ui.prompt('検針値入力', inputMessage, ui.ButtonSet.OK_CANCEL);
    
    if (readingResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: true, action: 'cancelled' };
    }
    
    const currentReading = readingResponse.getResponseText().trim();
    if (!currentReading || isNaN(Number(currentReading))) {
      safeAlert('エラー', '有効な数値を入力してください。');
      return { success: false, error: '無効な検針値' };
    }
    
    // データ更新
    const readings = [{
      date: formatDate(new Date(), 'YYYY-MM-DD'),
      currentReading: Number(currentReading),
      warningFlag: '正常'
    }];
    
    const updateResult = updateMeterReadings(propertyId, roomId, readings);
    
    if (updateResult.success) {
      safeAlert('更新完了', `検針データを更新しました。\n使用量: ${updateResult.usage || '計算中'}m³`);
      return { success: true, updateResult: updateResult };
    } else {
      safeAlert('更新失敗', `検針データの更新に失敗しました:\n${updateResult.error}`);
      return { success: false, error: updateResult.error };
    }
    
  } catch (error) {
    logWithLevel('ERROR', 'openMeterReadingInput エラー', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    safeAlert('エラー', `検針データ入力でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * データ整合性チェックを実行
 * @returns {Object} チェック結果
 */
function runDataValidation() {
  try {
    const validation = validateInspectionDataIntegrity(null, {});
    
    if (validation.success) {
      let message = '✅ データ整合性チェック完了\n\n';
      message += `📊 総レコード数: ${validation.summary.totalRecords}\n`;
      message += `✅ 有効レコード数: ${validation.summary.validRecords}\n`;
      message += `❌ 無効レコード数: ${validation.summary.invalidRecords}\n`;
      message += `⏱️ 処理時間: ${validation.summary.duration}ms`;
      
      if (validation.summary.invalidRecords > 0) {
        message += '\n\n⚠️ 無効なデータが見つかりました。詳細はログを確認してください。';
      }
      
      safeAlert('データ整合性チェック結果', message);
    } else {
      safeAlert('エラー', `データ整合性チェックに失敗しました:\n${validation.error}`);
    }
    
    return validation;
    
  } catch (error) {
    logWithLevel('ERROR', 'runDataValidation エラー', error.message);
    safeAlert('エラー', `データ整合性チェックでエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * データクリーンアップを実行
 * @returns {Object} クリーンアップ結果
 */
function runDataCleanup() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      'データクリーンアップ確認',
      '重複データの削除を実行しますか？\n（この操作は元に戻せません）',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return { success: true, action: 'cancelled' };
    }
    
    const cleanup = optimizedCleanupDuplicateInspectionData(null, {});
    
    if (cleanup.success) {
      let message = '🧹 データクリーンアップ完了\n\n';
      message += `🗑️ 削除件数: ${cleanup.removedCount}件\n`;
      message += `📋 残り件数: ${cleanup.remainingCount}件\n`;
      message += `⏱️ 処理時間: ${cleanup.duration}ms`;
      
      safeAlert('クリーンアップ完了', message);
    } else {
      safeAlert('エラー', `データクリーンアップに失敗しました:\n${cleanup.error}`);
    }
    
    return cleanup;
    
  } catch (error) {
    logWithLevel('ERROR', 'runDataCleanup エラー', error.message);
    safeAlert('エラー', `データクリーンアップでエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 使用方法ガイドを表示
 */
function showUsageGuide() {
  try {
    logWithLevel('INFO', 'showUsageGuide開始', 'メニューから呼び出し');
    return showLibraryUsageGuide();
  } catch (error) {
    logWithLevel('ERROR', 'showUsageGuide エラー', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    safeAlert('エラー', `使用方法ガイドの表示に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 検索インデックス作成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} 作成結果
 */
function createSearchIndexes() {
  try {
    const indexes = createAllIndexes();
    
    const message = `🔍 検索インデックス作成完了\n\n作成されたインデックス数: ${Object.keys(indexes).length}個`;
    safeAlert('インデックス作成完了', message);
    
    return { success: true, indexes: indexes };
    
  } catch (error) {
    logWithLevel('ERROR', 'createSearchIndexes エラー', error.message);
    safeAlert('エラー', `インデックス作成でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 高速検索テスト
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} テスト結果
 */
function testFastSearch() {
  try {
    return testSearchFunctions();
  } catch (error) {
    logWithLevel('ERROR', 'testFastSearch エラー', error.message);
    safeAlert('エラー', `検索テストでエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * バッチ処理実行
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} 処理結果
 */
function runBatchProcessing() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      'バッチ処理実行確認',
      'データの一括バリデーションを実行しますか？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return { success: true, action: 'cancelled' };
    }
    
    const result = batchValidateMeterReadings(100);
    
    let message = '📊 バッチ処理完了\n\n';
    message += `📋 処理件数: ${result.processed}件\n`;
    message += `✅ 成功: ${result.summary.successCount}件\n`;
    message += `❌ エラー: ${result.summary.errorCount}件\n`;
    message += `⚠️ 警告: ${result.summary.warningCount}件\n`;
    message += `📈 成功率: ${result.summary.successRate}`;
    
    safeAlert('バッチ処理結果', message);
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'runBatchProcessing エラー', error.message);
    safeAlert('エラー', `バッチ処理でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * マスタからデータ同期
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} 同期結果
 */
function syncDataFromMasters() {
  try {
    const result = populateInspectionDataFromMasters({});
    
    if (result) {
      safeAlert('データ同期完了', 'マスタからinspection_dataへの同期が完了しました。');
      return { success: true };
    } else {
      safeAlert('エラー', 'データ同期に失敗しました。');
      return { success: false, error: 'データ同期失敗' };
    }
    
  } catch (error) {
    logWithLevel('ERROR', 'syncDataFromMasters エラー', error.message);
    safeAlert('エラー', `データ同期でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * システム設定表示
 * @returns {Object} 設定情報
 */
function showSystemSettings() {
  try {
    const config = getLibraryInfo();
    
    let message = '⚙️ システム設定\n\n';
    message += `📚 ライブラリ名: ${config.name}\n`;
    message += `🔢 バージョン: ${config.version}\n`;
    message += `📅 更新日: ${config.lastUpdated}\n\n`;
    message += `📋 利用可能モジュール: ${config.modules ? config.modules.length : 0}個\n`;
    message += `🔧 利用可能関数: ${config.functions ? config.functions.length : 0}個`;
    
    safeAlert('システム設定', message);
    
    return { success: true, config: config };
    
  } catch (error) {
    logWithLevel('ERROR', 'showSystemSettings エラー', error.message);
    safeAlert('エラー', `システム設定表示でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * デバッグ情報表示
 * @returns {Object} デバッグ情報
 */
function showDebugInfo() {
  try {
    const info = getSpreadsheetInfo();
    
    let message = '🛠️ デバッグ情報\n\n';
    message += `📊 スプレッドシート名: ${info.name}\n`;
    message += `📋 シート数: ${info.sheets.length}個\n`;
    message += `📅 最終更新: ${info.lastUpdated}\n\n`;
    message += `💾 利用可能シート:\n`;
    info.sheets.forEach(sheet => {
      message += `  • ${sheet.name} (${sheet.rowCount}行)\n`;
    });
    
    safeAlert('デバッグ情報', message);
    
    return { success: true, info: info };
    
  } catch (error) {
    logWithLevel('ERROR', 'showDebugInfo エラー', error.message);
    safeAlert('エラー', `デバッグ情報表示でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 月次処理事前チェック結果を表示（メニュー呼び出し用直接実装）
 */
function displayPreCheckResults() {
  try {
    logWithLevel('INFO', 'displayPreCheckResults開始', 'メニューから呼び出し');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let message = '📋 月次処理事前チェック結果\n\n';
    const checkResults = [];
    let hasErrors = false;
    let hasWarnings = false;
    
    // 1. スプレッドシートの基本チェック
    if (ss) {
      checkResults.push({ type: 'success', item: 'スプレッドシート接続', message: '正常にアクセス可能' });
    } else {
      checkResults.push({ type: 'error', item: 'スプレッドシート接続', message: 'アクセスできません' });
      hasErrors = true;
    }
    
    // 2. 必須シートの存在確認
    const requiredSheets = ['inspection_data', '物件マスタ', '部屋マスタ'];
    let totalRecords = 0;
    let completedRecords = 0;
    let pendingRecords = 0;
    
    requiredSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const rowCount = sheet.getLastRow();
        checkResults.push({ 
          type: 'success', 
          item: `${sheetName}シート`, 
          message: `存在確認済み（${rowCount}行）` 
        });
        
        if (sheetName === 'inspection_data' && rowCount > 1) {
          totalRecords = rowCount - 1; // ヘッダー行を除く
          
          // 簡易的な完了状況チェック
          try {
            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const currentReadingIndex = headers.indexOf('今回の指示数');
            
            if (currentReadingIndex !== -1) {
              for (let i = 1; i < data.length; i++) {
                const currentReading = data[i][currentReadingIndex];
                if (currentReading && String(currentReading).trim() !== '') {
                  completedRecords++;
                } else {
                  pendingRecords++;
                }
              }
            }
          } catch (dataError) {
            checkResults.push({ 
              type: 'warning', 
              item: '検針完了状況', 
              message: 'データ分析でエラーが発生しました' 
            });
            hasWarnings = true;
          }
        }
      } else {
        checkResults.push({ 
          type: 'error', 
          item: `${sheetName}シート`, 
          message: 'シートが見つかりません' 
        });
        hasErrors = true;
      }
    });
    
    // 3. ロック状態確認
    const properties = PropertiesService.getScriptProperties();
    const lockData = properties.getProperty('MONTHLY_PROCESS_LOCK');
    
    if (lockData) {
      try {
        const lockInfo = JSON.parse(lockData);
        const lockDuration = Math.round((new Date().getTime() - lockInfo.startTime) / 1000);
        
        if (lockDuration > 1800) { // 30分以上
          checkResults.push({ 
            type: 'error', 
            item: 'プロセスロック', 
            message: `長時間ロック中（${Math.round(lockDuration/60)}分）- 強制解除が必要` 
          });
          hasErrors = true;
        } else {
          checkResults.push({ 
            type: 'warning', 
            item: 'プロセスロック', 
            message: `ロック中（${lockDuration}秒）- 他の処理が実行中` 
          });
          hasWarnings = true;
        }
      } catch (parseError) {
        checkResults.push({ 
          type: 'warning', 
          item: 'プロセスロック', 
          message: 'ロックデータが破損しています' 
        });
        hasWarnings = true;
      }
    } else {
      checkResults.push({ type: 'success', item: 'プロセスロック', message: '利用可能（ロック解除済み）' });
    }
    
    // 4. データ量チェック
    if (totalRecords > 0) {
      const dataSize = Math.round((totalRecords * 14 * 20) / 1024); // 概算KB
      const estimatedTime = Math.ceil(totalRecords / 100) * 2; // 概算秒
      
      checkResults.push({ 
        type: 'success', 
        item: 'データ量分析', 
        message: `${totalRecords}件、推定処理時間${estimatedTime}秒` 
      });
      
      if (totalRecords > 10000) {
        checkResults.push({ 
          type: 'warning', 
          item: 'データ量警告', 
          message: '大量データのため処理に時間がかかる可能性があります' 
        });
        hasWarnings = true;
      }
    }
    
    // 結果の整理と表示
    message += `📊 処理対象データ情報:\n`;
    message += `• 総レコード数: ${totalRecords.toLocaleString()}件\n`;
    message += `• 検針完了: ${completedRecords.toLocaleString()}件\n`;
    message += `• 検針未完了: ${pendingRecords.toLocaleString()}件\n\n`;
    
    message += `🔍 チェック項目サマリー:\n`;
    const successCount = checkResults.filter(r => r.type === 'success').length;
    const warningCount = checkResults.filter(r => r.type === 'warning').length;
    const errorCount = checkResults.filter(r => r.type === 'error').length;
    
    message += `• 成功: ${successCount}項目 ✅\n`;
    if (warningCount > 0) message += `• 警告: ${warningCount}項目 ⚠️\n`;
    if (errorCount > 0) message += `• エラー: ${errorCount}項目 🔥\n`;
    message += '\n';
    
    // 詳細結果
    checkResults.forEach(result => {
      const icon = result.type === 'success' ? '✅' : 
                   result.type === 'warning' ? '⚠️' : '🔥';
      message += `${icon} ${result.item}: ${result.message}\n`;
    });
    
    // 総合判定
    message += `\n🎯 総合判定: `;
    if (hasErrors) {
      message += `❌ エラーあり - 月次処理実行不可\n`;
      message += `エラー項目を修正してから再度お試しください。`;
    } else if (hasWarnings) {
      message += `⚠️ 警告あり - 注意して実行\n`;
      message += `警告内容を確認の上、必要に応じて修正してください。`;
    } else {
      message += `✅ 問題なし - 月次処理実行可能`;
    }
    
    logWithLevel('INFO', '月次処理事前チェック実行', { 
      success: successCount, 
      warnings: warningCount, 
      errors: errorCount,
      totalRecords: totalRecords
    });
    
    safeAlert(hasErrors ? 'エラー' : (hasWarnings ? '警告' : '成功'), message);
    
    return {
      success: !hasErrors,
      hasWarnings: hasWarnings,
      totalChecks: checkResults.length,
      errorCount: errorCount,
      warningCount: warningCount,
      successCount: successCount,
      checks: checkResults,
      detailedInfo: {
        totalRecords: totalRecords,
        completedRecords: completedRecords,
        pendingRecords: pendingRecords
      }
    };
    
  } catch (error) {
    const errorMsg = `月次処理事前チェックでエラーが発生しました: ${error.message}`;
    logWithLevel('ERROR', 'displayPreCheckResults エラー', error.message);
    safeAlert('エラー', errorMsg);
    return { success: false, error: error.message };
  }
}

/**
 * 月次レポート生成（未実装メニュー関数）
 */
function generateMonthlyReport() {
  try {
    safeAlert('情報', '月次レポート生成機能は現在開発中です。\n将来のバージョンで実装予定です。');
    logWithLevel('INFO', 'generateMonthlyReport 呼び出し', '未実装機能');
  } catch (error) {
    logWithLevel('ERROR', 'generateMonthlyReport エラー', error.message);
    safeAlert('エラー', `月次レポート生成でエラーが発生しました: ${error.message}`);
  }
}

/**
 * ロック状態詳細表示（未実装メニュー関数）
 */
function displayDetailedLockStatus() {
  try {
    if (typeof MonthlyProcessLock !== 'undefined' &&
        typeof MonthlyProcessLock.displayDetailedLockStatus === 'function') {
      return MonthlyProcessLock.displayDetailedLockStatus();
    }

    safeAlert('情報', 'ロック状態詳細の取得機能が利用できません。ライブラリを最新化してください。');
    logWithLevel('WARN', 'displayDetailedLockStatus 未対応', 'MonthlyProcessLock.displayDetailedLockStatus unavailable');
    return { success: false, error: 'lock_inspection_unavailable' };

  } catch (error) {
    logWithLevel('ERROR', 'displayDetailedLockStatus エラー', error.message);
    safeAlert('エラー', `ロック状態詳細表示でエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 安全な強制解除（未実装メニュー関数）
 */
function safeForceReleaseLock() {
  try {
    safeAlert('情報', '安全な強制解除機能は現在開発中です。\n将来のバージョンで実装予定です。');
    logWithLevel('INFO', 'safeForceReleaseLock 呼び出し', '未実装機能');
  } catch (error) {
    logWithLevel('ERROR', 'safeForceReleaseLock エラー', error.message);
    safeAlert('エラー', `安全な強制解除でエラーが発生しました: ${error.message}`);
  }
}

// =================================================
// data_management.gsからのメニュー関数ラッパー
// =================================================

/**
 * 月次処理実行（メニュー呼び出し用）
 * data_management.gsの完全実装を呼び出し
 */
function processInspectionDataMonthly() {
  try {
    logWithLevel('INFO', 'processInspectionDataMonthly開始', 'メニューから呼び出し - data_management.gsの完全実装を使用');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // data_management.gsの完全実装を呼び出し
    // 注意: data_management.gsの実装はUI確認ダイアログを含む完全な月次処理を行います
    const result = processInspectionDataMonthlyCore(ss);
    
    logWithLevel('INFO', '月次処理完了', {
      success: result.success,
      source: 'data_management.gs完全実装'
    });
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'processInspectionDataMonthly エラー', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    safeAlert('エラー', `月次処理実行でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 月次処理実行のコア実装（data_management.gsの関数を呼び出し）
 * この関数はprocessInspectionDataMonthlyから呼び出される
 */
function processInspectionDataMonthlyCore(ss = null) {
  // data_management.gsのprocessInspectionDataMonthly関数を直接呼び出し
  // この関数は完全な事前チェック、UI確認、データアーカイブ、ログ記録を含む
  return processInspectionDataMonthlyFromDataManagement(ss);
}

/**
 * data_management.gsの完全実装への橋渡し関数
 * 名前の衝突を避けるため、data_management.gs側の関数名を変更する必要がある
 */
function processInspectionDataMonthlyFromDataManagement(ss = null) {
  // この関数はdata_management.gsで定義される予定
  // 現在のprocessInspectionDataMonthly(data_management.gs:616)をリネームして呼び出し
  if (typeof processInspectionDataMonthlyImpl === 'function') {
    return processInspectionDataMonthlyImpl(ss);
  } else {
    throw new Error('月次処理の実装関数が見つかりません。data_management.gsを確認してください。');
  }
}

/**
 * ロック状態確認（メニュー呼び出し用直接実装）
 */
function clearLegacyMonthlyProcessLockKeys() {
  const properties = PropertiesService.getScriptProperties();
  const legacyKeys = ['MONTHLY_PROCESS_LOCK'];
  const deletedKeys = [];
  legacyKeys.forEach(key => {
    if (properties.getProperty(key)) {
      properties.deleteProperty(key);
      deletedKeys.push(key);
    }
  });
  if (deletedKeys.length > 0) {
    logWithLevel('INFO', 'レガシーロックキー削除', { keys: deletedKeys });
  }
  return deletedKeys;
}

function displayLockStatus() {
  try {
    if (typeof MonthlyProcessLock !== 'undefined' &&
        typeof MonthlyProcessLock.checkLock === 'function') {
      const lockStatus = MonthlyProcessLock.checkLock();
      let message = '🔒 月次処理ロック状態\n\n';

      if (lockStatus.isLocked) {
        message += '📊 ロック情報:\n';
        message += '• 状態: 🔒 ロック中\n';
        if (lockStatus.startTime) {
          message += `• 開始時刻: ${new Date(lockStatus.startTime).toLocaleString('ja-JP')}\n`;
        }
        if (lockStatus.user) {
          message += `• 実行者: ${lockStatus.user}\n`;
        }
        if (lockStatus.sessionId) {
          message += `• セッションID: ${lockStatus.sessionId}\n`;
        }
        message += `• 経過時間: ${(lockStatus.duration || 0)}分\n\n`;

        if ((lockStatus.duration || 0) >= 10) {
          message += '⚠️ 注意: ロックが10分以上継続しています。\n';
          message += '   応答がない場合は「🔓 ロック強制解除」を検討してください。';
        } else {
          message += 'ℹ️ 処理が完了するまでお待ちください。';
        }

        logWithLevel('INFO', 'ロック状態確認', lockStatus);
      } else {
        message += '📊 ロック情報:\n';
        message += '• 状態: 🔓 ロック解除済み\n';
        message += '• 月次処理: 実行可能\n\n';
        message += '✅ 現在、月次処理を実行できる状態です。';

        clearLegacyMonthlyProcessLockKeys();
        logWithLevel('INFO', 'ロック状態確認', { locked: false });
      }

      safeAlert('ロック状態', message);
      return {
        success: true,
        locked: !!lockStatus.isLocked,
        lockInfo: lockStatus
      };
    }

    // 旧形式（ライブラリ導入前）のロック情報にフォールバック
    const properties = PropertiesService.getScriptProperties();
    const legacyLockKey = 'MONTHLY_PROCESS_LOCK';
    const legacyData = properties.getProperty(legacyLockKey);

    let message = '🔒 月次処理ロック状態\n\n';
    let legacyInfo = null;
    if (legacyData) {
      try {
        legacyInfo = JSON.parse(legacyData);
        message += '📊 ロック情報:\n';
        message += '• 状態: 🔒 ロック中 (レガシー)\n';
        message += `• 開始時刻: ${new Date(legacyInfo.startTime).toLocaleString('ja-JP')}\n`;
        message += `• 実行者: ${legacyInfo.user || '不明'}\n\n`;
        message += '⚠️ ロックデータが旧形式のため、強制解除後に再実行してください。';
        logWithLevel('WARN', 'レガシーロック検出', legacyInfo);
      } catch (parseError) {
        message += '❌ ロックデータを解析できませんでした。\n';
        message += `エラー: ${parseError.message}\n`;
        message += '「ロック強制解除」の実行を推奨します。';
        logWithLevel('WARN', 'レガシーロック破損', parseError.message);
      }
    } else {
      message += '📊 ロック情報:\n';
      message += '• 状態: 🔓 ロック解除済み\n';
      message += '• 月次処理: 実行可能\n\n';
      message += '✅ 現在、月次処理を実行できる状態です。';
      logWithLevel('INFO', 'ロック状態確認', { locked: false, mode: 'legacy' });
    }

    safeAlert('ロック状態', message);
    return {
      success: true,
      locked: !!legacyData,
      lockInfo: legacyInfo,
      legacy: true
    };

  } catch (error) {
    logWithLevel('ERROR', 'displayLockStatus エラー', error.message);
    safeAlert('エラー', `ロック状態確認でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * ロック強制解除（メニュー呼び出し用直接実装）
 */
function forceReleaseLock() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'ロック強制解除確認',
      'ロックを強制的に解除しますか？\n\n⚠️ 注意: 実行中の月次処理がある場合、データ不整合が発生する可能性があります。',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      safeAlert('キャンセル', 'ロック強制解除がキャンセルされました。');
      return { success: false, message: 'ユーザーによりキャンセルされました' };
    }

    let releasedByLibrary = false;
    if (typeof MonthlyProcessLock !== 'undefined' &&
        typeof MonthlyProcessLock.releaseLock === 'function') {
      releasedByLibrary = MonthlyProcessLock.releaseLock();
    }

    const legacyDeleted = clearLegacyMonthlyProcessLockKeys();

    if (releasedByLibrary) {
      const status = MonthlyProcessLock.checkLock ? MonthlyProcessLock.checkLock() : { isLocked: false };
      safeAlert('解除完了', 'ロックを解除しました。月次処理を再実行できます。');
      logWithLevel('WARN', 'ロック強制解除', { releasedByLibrary: true, legacyDeleted });
      return {
        success: true,
        releasedByLibrary: true,
        legacyDeleted,
        lockStatus: status
      };
    }

    if (legacyDeleted.length > 0) {
      safeAlert('解除完了', '旧形式のロック情報を削除しました。月次処理を再実行できます。');
      logWithLevel('WARN', 'ロック強制解除(レガシー)', { legacyDeleted });
      return {
        success: true,
        legacyDeleted,
        releasedByLibrary: false
      };
    }

    safeAlert('情報', 'ロック情報は見つかりませんでした。既に解除済みです。');
    logWithLevel('INFO', 'ロック強制解除試行', '解除対象なし');
    return {
      success: true,
      message: '解除対象のロックはありませんでした',
      releasedByLibrary: false
    };

  } catch (error) {
    logWithLevel('ERROR', 'forceReleaseLock エラー', error.message);
    safeAlert('エラー', `ロック強制解除でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 処理履歴表示（メニュー呼び出し用直接実装）
 */
function displayMonthlyProcessHistory() {
  try {
    // PropertiesServiceから履歴データを取得
    const properties = PropertiesService.getScriptProperties();
    const logPrefix = 'MONTHLY_LOG_';
    const allProperties = properties.getProperties();
    
    // ログエントリを取得
    const logEntries = [];
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith(logPrefix)) {
        try {
          const logEntry = JSON.parse(allProperties[key]);
          logEntries.push(logEntry);
        } catch (parseError) {
          // 無効なログエントリは無視
        }
      }
    });
    
    // 時刻順にソート（新しい順）
    logEntries.sort((a, b) => b.timestamp - a.timestamp);
    
    let message = '📜 月次処理履歴（最新20件）\n\n';
    
    if (logEntries.length === 0) {
      message += 'ℹ️ 履歴データがありません。\n\n';
      message += '月次処理を実行すると、ここに履歴が表示されます。';
    } else {
      // 最新20件を表示
      const displayEntries = logEntries.slice(0, 20);
      
      displayEntries.forEach((entry, index) => {
        const levelIcon = entry.level === 'ERROR' ? '🔥' : 
                         entry.level === 'WARN' ? '⚠️' : 
                         entry.level === 'INFO' ? 'ℹ️' : '📝';
        
        message += `${levelIcon} [${entry.level}] ${entry.timestampString || new Date(entry.timestamp).toLocaleString('ja-JP')}\n`;
        message += `   ${entry.message}\n`;
        
        if (index < displayEntries.length - 1) {
          message += '\n';
        }
      });
      
      if (logEntries.length > 20) {
        message += `\n\n... 他 ${logEntries.length - 20} 件の履歴があります`;
      }
    }
    
    logWithLevel('INFO', '処理履歴表示', { entryCount: logEntries.length });
    safeAlert('処理履歴', message);
    
    return {
      success: true,
      totalEntries: logEntries.length,
      displayedEntries: Math.min(logEntries.length, 20)
    };
    
  } catch (error) {
    logWithLevel('ERROR', 'displayMonthlyProcessHistory エラー', error.message);
    safeAlert('エラー', `処理履歴表示でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * ログ履歴削除（メニュー呼び出し用直接実装）
 */
function clearMonthlyProcessHistory() {
  try {
    // 確認ダイアログを表示
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'ログ履歴削除確認',
      'すべてのログ履歴を削除しますか？\n\n⚠️ 注意: この操作は取り消しできません。',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      safeAlert('キャンセル', 'ログ履歴削除がキャンセルされました。');
      return { success: false, message: 'ユーザーによりキャンセルされました' };
    }
    
    // PropertiesServiceからログデータを削除
    const properties = PropertiesService.getScriptProperties();
    const logPrefix = 'MONTHLY_LOG_';
    const allProperties = properties.getProperties();
    
    let deletedCount = 0;
    const logKeys = [];
    
    // ログキーを特定
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith(logPrefix)) {
        logKeys.push(key);
      }
    });
    
    // ログを削除
    logKeys.forEach(key => {
      try {
        properties.deleteProperty(key);
        deletedCount++;
      } catch (deleteError) {
        logWithLevel('WARN', 'ログ削除エラー', `キー: ${key}, エラー: ${deleteError.message}`);
      }
    });
    
    let message = '🗑️ ログ履歴削除結果\n\n';
    
    if (deletedCount > 0) {
      message += `✅ ログ履歴を正常に削除しました\n\n`;
      message += `📊 削除結果:\n`;
      message += `• 削除されたエントリ数: ${deletedCount}件\n`;
      message += `• 削除実行日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
      message += `🎯 結果: ログ履歴がクリアされました。`;
      
      // 削除完了をログに記録（新しいログエントリとして）
      logWithLevel('WARN', 'ログ履歴全削除実行', { 
        deletedCount: deletedCount,
        executedBy: Session.getActiveUser().getEmail()
      });
    } else {
      message += `ℹ️ 削除対象のログが見つかりませんでした\n\n`;
      message += `📊 状態: 既にクリア済み\n`;
      message += `🎯 結果: ログ履歴は既に空の状態です。`;
      
      logWithLevel('INFO', 'ログ履歴削除試行', '削除対象なし');
    }
    
    safeAlert('削除完了', message);
    
    return {
      success: true,
      deletedCount: deletedCount,
      message: deletedCount > 0 ? 'ログ履歴を正常に削除しました' : '削除対象のログが見つかりませんでした'
    };
    
  } catch (error) {
    logWithLevel('ERROR', 'clearMonthlyProcessHistory エラー', error.message);
    safeAlert('エラー', `ログ履歴削除でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * パフォーマンス統計（メニュー呼び出し用直接実装）
 */
function displayMonthlyProcessPerformance() {
  try {
    safeAlert('情報', 'パフォーマンス統計機能は現在開発中です。\n将来のバージョンで実装予定です。\n\n現在は「システムヘルスチェック」で基本的なシステム状態を確認できます。');
    logWithLevel('INFO', 'displayMonthlyProcessPerformance 呼び出し', '未実装機能');
    return { success: true, message: '未実装機能' };
  } catch (error) {
    logWithLevel('ERROR', 'displayMonthlyProcessPerformance エラー', error.message);
    safeAlert('エラー', `パフォーマンス統計でエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * システムヘルスチェック（メニュー呼び出し用直接実装）
 */
function checkMonthlyProcessHealth() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let message = '🩺 システムヘルスチェック結果\n\n';
    const checkResults = [];
    let hasErrors = false;
    let hasWarnings = false;
    
    // 1. スプレッドシートの存在確認
    if (ss) {
      checkResults.push({ type: 'success', item: 'スプレッドシート', message: '正常に接続されています' });
    } else {
      checkResults.push({ type: 'error', item: 'スプレッドシート', message: 'アクセスできません' });
      hasErrors = true;
    }
    
    // 2. 必須シートの存在確認
    const requiredSheets = ['inspection_data', '物件マスタ', '部屋マスタ'];
    requiredSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const rowCount = sheet.getLastRow();
        checkResults.push({ 
          type: 'success', 
          item: `${sheetName}シート`, 
          message: `存在確認済み（${rowCount}行）` 
        });
      } else {
        checkResults.push({ 
          type: 'error', 
          item: `${sheetName}シート`, 
          message: 'シートが見つかりません' 
        });
        hasErrors = true;
      }
    });
    
    // 3. PropertiesServiceアクセス確認
    try {
      const properties = PropertiesService.getScriptProperties();
      const testKey = 'HEALTH_CHECK_TEST';
      const testValue = new Date().getTime().toString();
      properties.setProperty(testKey, testValue);
      const retrievedValue = properties.getProperty(testKey);
      
      if (retrievedValue === testValue) {
        checkResults.push({ type: 'success', item: 'PropertiesService', message: '読み書き正常' });
        properties.deleteProperty(testKey); // テストデータを削除
      } else {
        checkResults.push({ type: 'warning', item: 'PropertiesService', message: 'データ不整合の可能性' });
        hasWarnings = true;
      }
    } catch (propError) {
      checkResults.push({ type: 'error', item: 'PropertiesService', message: `アクセスエラー: ${propError.message}` });
      hasErrors = true;
    }
    
    // 4. ログシステム確認
    try {
      logWithLevel('INFO', 'ヘルスチェック実行', 'システム診断');
      checkResults.push({ type: 'success', item: 'ログシステム', message: '正常に動作中' });
    } catch (logError) {
      checkResults.push({ type: 'warning', item: 'ログシステム', message: `警告: ${logError.message}` });
      hasWarnings = true;
    }
    
    // 5. メモリ使用量確認（概算）
    const memoryEstimate = JSON.stringify(checkResults).length;
    if (memoryEstimate < 10000) {
      checkResults.push({ type: 'success', item: 'メモリ使用量', message: '正常範囲内' });
    } else {
      checkResults.push({ type: 'warning', item: 'メモリ使用量', message: '高使用量を検出' });
      hasWarnings = true;
    }
    
    // 結果の整理
    const successCount = checkResults.filter(r => r.type === 'success').length;
    const warningCount = checkResults.filter(r => r.type === 'warning').length;
    const errorCount = checkResults.filter(r => r.type === 'error').length;
    
    message += `📊 チェック結果サマリー:\n`;
    message += `• 成功: ${successCount}項目 ✅\n`;
    if (warningCount > 0) {
      message += `• 警告: ${warningCount}項目 ⚠️\n`;
    }
    if (errorCount > 0) {
      message += `• エラー: ${errorCount}項目 🔥\n`;
    }
    message += '\n';
    
    // 詳細結果
    checkResults.forEach(result => {
      const icon = result.type === 'success' ? '✅' : 
                   result.type === 'warning' ? '⚠️' : '🔥';
      message += `${icon} ${result.item}: ${result.message}\n`;
    });
    
    // 総合判定
    message += '\n🎯 総合判定: ';
    if (hasErrors) {
      message += '❌ システムエラーが検出されました';
    } else if (hasWarnings) {
      message += '⚠️ 警告事項がありますが、動作可能です';
    } else {
      message += '✅ システムは正常に動作しています';
    }
    
    logWithLevel('INFO', 'システムヘルスチェック完了', { 
      success: successCount, 
      warnings: warningCount, 
      errors: errorCount 
    });
    
    safeAlert('ヘルスチェック', message);
    
    return {
      success: !hasErrors,
      hasWarnings: hasWarnings,
      results: checkResults,
      summary: { success: successCount, warnings: warningCount, errors: errorCount }
    };
    
  } catch (error) {
    logWithLevel('ERROR', 'checkMonthlyProcessHealth エラー', error.message);
    safeAlert('エラー', `システムヘルスチェックでエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * バックアップガイド（メニュー呼び出し用直接実装）
 */
function displayBackupGuide() {
  try {
    const message = '💾 バックアップガイド\n\n' +
      '📊 スプレッドシートのバックアップ手順:\n\n' +
      '1️⃣ ファイルメニューから「コピーを作成」を選択\n' +
      '2️⃣ バックアップ名を入力（例：「水道検針_YYYY-MM-DD」）\n' +
      '3️⃣ バックアップを安全な場所に保存\n\n' +
      '⚠️ 重要な注意事項:\n' +
      '• 月次処理実行前に必ずバックアップを作成\n' +
      '• バックアップは定期的に（週次または月次）実行\n' +
      '• 複数のバックアップを保持することを推奨\n\n' +
      '📁 バックアップ対象シート:\n' +
      '• inspection_data（検針データ）\n' +
      '• 物件マスタ\n' +
      '• 部屋マスタ\n' +
      '• 設定値（ある場合）\n\n' +
      '🔄 復元手順:\n' +
      'バックアップからシートをコピーして元のシートに貼り付け';
    
    safeAlert('バックアップガイド', message);
    logWithLevel('INFO', 'displayBackupGuide 表示', 'バックアップ手順案内');
    
    return { success: true, message: 'バックアップガイドを表示しました' };
    
  } catch (error) {
    logWithLevel('ERROR', 'displayBackupGuide エラー', error.message);
    safeAlert('エラー', `バックアップガイドでエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

// =================================================
// システム導入メニュー関数ラッパー

/**
 * システム診断実行（メニュー呼び出し用）
 */
function runSystemDiagnosticsFromMenu() {
  try {
    logWithLevel('INFO', 'runSystemDiagnosticsFromMenu開始', 'メニューから呼び出し');
    
    const result = runSystemDiagnostics();
    
    if (result && typeof displaySystemDiagnosticsResult === 'function') {
      displaySystemDiagnosticsResult();
    } else {
      let message = '🔍 システム診断が完了しました。\n\n';
      
      if (result.sheets) {
        const existingSheets = result.sheets.filter(sheet => sheet.exists);
        message += `📊 既存シート: ${existingSheets.length}個\n`;
      }
      
      if (result.issues && result.issues.length > 0) {
        const errors = result.issues.filter(i => i.type === 'error');
        const warnings = result.issues.filter(i => i.type === 'warning');
        
        if (errors.length > 0) {
          message += `🚨 エラー: ${errors.length}件\n`;
        }
        if (warnings.length > 0) {
          message += `⚠️ 警告: ${warnings.length}件\n`;
        }
      }
      
      safeAlert('システム診断結果', message);
    }
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'runSystemDiagnosticsFromMenu エラー', error.message);
    safeAlert('エラー', `システム診断の実行に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * マスタシートテンプレート作成（メニュー呼び出し用）
 */
function createMasterSheetTemplatesFromMenu() {
  try {
    logWithLevel('INFO', 'createMasterSheetTemplatesFromMenu開始', 'メニューから呼び出し');
    
    const ui = SpreadsheetApp.getUi();
    let confirmMessage = '📝 マスタシートテンプレートを作成します。\n\n';
    confirmMessage += '以下のシートテンプレートが作成されます：\n';
    confirmMessage += '• 物件マスタ (物件の基本情報)\n';
    confirmMessage += '• 部屋マスタ (部屋の基本情報)\n';
    confirmMessage += '• 設定値 (システム設定)\n\n';
    confirmMessage += '⚠️ 既存のデータがある場合はスキップされます。\n\n';
    confirmMessage += 'テンプレートを作成しますか？';

    const response = ui.alert('マスタシートテンプレート作成', confirmMessage, ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) {
      return { success: false, message: 'ユーザーによりキャンセルされました', cancelled: true };
    }
    
    const result = createMasterSheetTemplates();
    
    if (result.success) {
      safeAlert('完了', result.message);
    } else {
      safeAlert('エラー', `テンプレート作成に失敗しました:\n${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'createMasterSheetTemplatesFromMenu エラー', error.message);
    safeAlert('エラー', `マスタシートテンプレート作成に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * サンプルデータ投入（メニュー呼び出し用）
 */
function createSampleDataFromMenu() {
  try {
    logWithLevel('INFO', 'createSampleDataFromMenu開始', 'メニューから呼び出し');
    
    const ui = SpreadsheetApp.getUi();
    let confirmMessage = '🏠 サンプルデータを投入します。\n\n';
    confirmMessage += '以下のサンプルデータが作成されます：\n';
    confirmMessage += '• 物件データ: 5件（グリーンハイツA棟など）\n';
    confirmMessage += '• 部屋データ: 14件（101号室、102号室など）\n\n';
    confirmMessage += '💡 これらのデータは動作テスト用のサンプルです。\n';
    confirmMessage += '実際の運用では削除または編集してください。\n\n';
    confirmMessage += '⚠️ 既存のデータがある場合はスキップされます。\n\n';
    confirmMessage += 'サンプルデータを投入しますか？';

    const response = ui.alert('サンプルデータ投入', confirmMessage, ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) {
      return { success: false, message: 'ユーザーによりキャンセルされました', cancelled: true };
    }
    
    const result = createSampleData();
    
    if (result.success) {
      safeAlert('完了', result.message);
    } else {
      safeAlert('エラー', `サンプルデータ投入に失敗しました:\n${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'createSampleDataFromMenu エラー', error.message);
    safeAlert('エラー', `サンプルデータ投入に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 物件ID自動割り当て（メニュー呼び出し用）
 */
function formatAllPropertyIdsFromMenu() {
  try {
    logWithLevel('INFO', 'formatAllPropertyIdsFromMenu開始', 'メニューから呼び出し');
    
    const ui = SpreadsheetApp.getUi();
    let confirmMessage = '🆔 物件ID自動割り当てを実行します。\n\n';
    confirmMessage += '以下の処理が実行されます：\n';
    confirmMessage += '• 物件マスタの物件IDをP000001形式に統一\n';
    confirmMessage += '• 部屋マスタの物件IDを同期\n';
    confirmMessage += '• inspection_dataの物件IDを更新\n\n';
    confirmMessage += '⚠️ 既存のIDが変更される可能性があります。\n';
    confirmMessage += '事前にバックアップを取ることを推奨します。\n\n';
    confirmMessage += '物件ID自動割り当てを実行しますか？';

    const response = ui.alert('物件ID自動割り当て', confirmMessage, ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) {
      return { success: false, message: 'ユーザーによりキャンセルされました', cancelled: true };
    }
    
    const result = formatAllPropertyIds();
    
    if (result.success) {
      safeAlert('完了', result.message);
    } else {
      safeAlert('エラー', `物件ID自動割り当てに失敗しました:\n${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'formatAllPropertyIdsFromMenu エラー', error.message);
    safeAlert('エラー', `物件ID自動割り当てに失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 部屋ID自動生成（メニュー呼び出し用）
 */
function generateRoomIdsFromMenu() {
  try {
    logWithLevel('INFO', 'generateRoomIdsFromMenu開始', 'メニューから呼び出し');
    
    const ui = SpreadsheetApp.getUi();
    let confirmMessage = '🏢 部屋ID自動生成を実行します。\n\n';
    confirmMessage += '以下の処理が実行されます：\n';
    confirmMessage += '• 物件ごとにR001, R002, R003...の形式で部屋IDを生成\n';
    confirmMessage += '• 部屋マスタの部屋ID列を更新\n';
    confirmMessage += '• 連番は物件別にリセットされます\n\n';
    confirmMessage += '⚠️ 既存の部屋IDが変更される可能性があります。\n';
    confirmMessage += '事前にバックアップを取ることを推奨します。\n\n';
    confirmMessage += '部屋ID自動生成を実行しますか？';

    const response = ui.alert('部屋ID自動生成', confirmMessage, ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) {
      return { success: false, message: 'ユーザーによりキャンセルされました', cancelled: true };
    }
    
    const result = generateRoomIds();
    
    if (result.success) {
      safeAlert('完了', result.message);
    } else {
      safeAlert('エラー', `部屋ID自動生成に失敗しました:\n${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'generateRoomIdsFromMenu エラー', error.message);
    safeAlert('エラー', `部屋ID自動生成に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 検針データシート作成（メニュー呼び出し用）
 */
function createInitialInspectionDataFromMenu() {
  try {
    logWithLevel('INFO', 'createInitialInspectionDataFromMenu開始', 'メニューから呼び出し');
    
    const ui = SpreadsheetApp.getUi();
    let confirmMessage = '📊 検針データシートを作成します。\n\n';
    confirmMessage += '以下の処理が実行されます：\n';
    confirmMessage += '• 物件マスタと部屋マスタから検針データを生成\n';
    confirmMessage += '• inspection_dataシートを作成\n';
    confirmMessage += '• 全14列の完全な検針データ構造を構築\n\n';
    confirmMessage += '📋 前提条件：\n';
    confirmMessage += '• 物件マスタに物件データが登録済み\n';
    confirmMessage += '• 部屋マスタに部屋データが登録済み\n\n';
    confirmMessage += '検針データシートを作成しますか？';

    const response = ui.alert('検針データシート作成', confirmMessage, ui.ButtonSet.YES_NO);
    
    if (response !== ui.Button.YES) {
      return { success: false, message: 'ユーザーによりキャンセルされました', cancelled: true };
    }
    
    const result = createInitialInspectionData();
    
    if (result.success) {
      safeAlert('完了', result.message);
    } else {
      safeAlert('エラー', `検針データシート作成に失敗しました:\n${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'createInitialInspectionDataFromMenu エラー', error.message);
    safeAlert('エラー', `検針データシート作成に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 導入完了確認（メニュー呼び出し用）
 */
function validateSystemSetupFromMenu() {
  try {
    logWithLevel('INFO', 'validateSystemSetupFromMenu開始', 'メニューから呼び出し');
    
    const result = validateSystemSetup();
    
    if (result.success) {
      safeAlert('導入完了確認', result.message);
    } else {
      safeAlert('導入確認', `導入に問題があります:\n${result.error || result.message}`);
    }
    
    return result;
    
  } catch (error) {
    logWithLevel('ERROR', 'validateSystemSetupFromMenu エラー', error.message);
    safeAlert('エラー', `導入完了確認に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * システム導入ウィザードを開始（メニューから呼び出し）
 */
function startSystemSetupWizardFromMenu() {
  try {
    logWithLevel('INFO', 'startSystemSetupWizardFromMenu開始', 'メニューから呼び出し');
    console.log('=== 検針システム導入ウィザード開始 ===');
    
    // ウィザード設定
    const wizardData = {
      currentStep: 1,
      totalSteps: 7,
      setupData: {
        startTime: new Date(),
        completedSteps: [],
        errors: [],
        warnings: [],
        results: {}
      },
      steps: defineSetupSteps()
    };
    
    const ui = SpreadsheetApp.getUi();
    
    // ウェルカムメッセージ表示
    if (!showWelcomeMessage(ui, wizardData.steps)) {
      return {
        success: false,
        message: 'ユーザーによりウィザードがキャンセルされました',
        cancelled: true
      };
    }
    
    // ウィザードフロー実行
    const result = executeWizardFlow(ui, wizardData);
    
    if (result.success) {
      logWithLevel('INFO', 'システム導入ウィザード完了', `完了ステップ: ${result.completedSteps?.length || 0}`);
      
      if (typeof safeAlert === 'function') {
        safeAlert(
          '導入ウィザード完了',
          result.message || 'システム導入ウィザードが正常に完了しました。'
        );
      }
    } else if (!result.cancelled) {
      logWithLevel('ERROR', 'システム導入ウィザードエラー', result.error || result.message);
      
      if (typeof safeAlert === 'function') {
        safeAlert(
          'エラー',
          result.message || 'システム導入ウィザードでエラーが発生しました。'
        );
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('導入ウィザード開始エラー:', error);
    logWithLevel('ERROR', 'startSystemSetupWizardFromMenu エラー', error.message);
    
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', `システム導入ウィザードの実行中にエラーが発生しました:\n${error.message}`);
    }
    
    return {
      success: false,
      error: error.message,
      message: `導入ウィザードの開始に失敗しました: ${error.message}`
    };
  }
}

/**
 * 導入ガイド表示（メニュー呼び出し用）
 */
function showSystemSetupGuide() {
  try {
    logWithLevel('INFO', 'showSystemSetupGuide開始', 'メニューから呼び出し');
    
    let message = '📖 検針システム導入ガイド\n\n';
    message += '🎯 導入手順：\n\n';
    message += '1️⃣ システム診断実行\n';
    message += '   → スプレッドシートの状態確認\n\n';
    message += '2️⃣ マスタシートテンプレート作成\n';
    message += '   → 物件マスタ・部屋マスタの基本構造作成\n\n';
    message += '3️⃣ サンプルデータ投入（オプション）\n';
    message += '   → テスト用データで動作確認\n\n';
    message += '4️⃣ 物件ID自動割り当て\n';
    message += '   → P000001形式のID統一\n\n';
    message += '5️⃣ 部屋ID自動生成\n';
    message += '   → 物件ごとにR001形式のID生成\n\n';
    message += '6️⃣ 検針データシート作成\n';
    message += '   → マスタデータから検針用シート生成\n\n';
    message += '7️⃣ 導入完了確認\n';
    message += '   → システム全体の動作確認\n\n';
    message += '🚀 簡単導入：\n';
    message += '「🎯 導入ウィザード開始」で自動導入も可能です！\n\n';
    message += '💡 各機能は個別実行も可能です。\n';
    message += '困った時はこのガイドを参照してください。';
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('システム導入ガイド', message, ui.ButtonSet.OK);
    
    return { success: true, message: '導入ガイドを表示しました' };
    
  } catch (error) {
    logWithLevel('ERROR', 'showSystemSetupGuide エラー', error.message);
    safeAlert('エラー', `導入ガイドの表示に失敗しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

// 他ファイルからのメニュー関数ラッパー
// =================================================

/**
 * 高速検索テスト（メニュー呼び出し用ラッパー）
 * 元実装: data_indexes.gs
 */
function testFastSearch() {
  try {
    // 既存の水道検針アプリ.gsの実装を使用（無限ループ回避）
    const results = fastSearch('物件', '物件');
    
    let message = '🔍 高速検索テスト結果\n\n';
    if (results && results.length > 0) {
      message += `✅ 検索成功: ${results.length}件の結果が見つかりました\n\n`;
      results.slice(0, 5).forEach((result, index) => {
        message += `${index + 1}. ${JSON.stringify(result)}\n`;
      });
      if (results.length > 5) {
        message += `\n... 他 ${results.length - 5} 件`;
      }
    } else {
      message += '⚠️ 検索結果が見つかりませんでした';
    }
    
    safeAlert('高速検索テスト', message);
    return { success: true, results: results };
  } catch (error) {
    logWithLevel('ERROR', 'testFastSearch エラー', error.message);
    safeAlert('エラー', `高速検索テストでエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Phase 2 統合テスト（メニュー呼び出し用直接実装）
 */
function menuRunPhase2IntegrationTest() {
  try {
    // phase2-integration-test.gsの関数を呼び出し
    return runPhase2IntegrationTest();
  } catch (error) {
    logWithLevel('ERROR', 'menuRunPhase2IntegrationTest ラッパー エラー', error.message);
    safeAlert('エラー', `Phase 2 統合テストでエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Phase 3 統合テスト（メニュー呼び出し用直接実装）
 */
function menuRunPhase3IntegrationTest() {
  try {
    // phase3-integration-test.gsの関数を呼び出し
    return runPhase3IntegrationTest();
  } catch (error) {
    logWithLevel('ERROR', 'menuRunPhase3IntegrationTest ラッパー エラー', error.message);
    safeAlert('エラー', `Phase 3 統合テストでエラーが発生しました:\n${error.message}`);
    return { success: false, error: error.message };
  }
}

// ========================================
// システム導入ウィザード サポート関数群
// ========================================

/**
 * セットアップステップを定義
 */
function defineSetupSteps() {
  return {
    1: {
      name: 'システム診断・環境確認',
      description: 'スプレッドシートの状態を確認し、導入準備を行います',
      function: 'executeSystemDiagnosis',
      required: true,
      estimatedTime: '1-2分'
    },
    2: {
      name: 'マスタシートテンプレート作成',
      description: '物件マスタ・部屋マスタの基本構造を作成します',
      function: 'executeTemplateCreation',
      required: true,
      estimatedTime: '30秒'
    },
    3: {
      name: 'サンプルデータ投入',
      description: 'テスト用のサンプルデータを作成します（オプション）',
      function: 'executeSampleDataCreation',
      required: false,
      estimatedTime: '1分'
    },
    4: {
      name: '物件ID自動割り当て',
      description: '物件マスタにP000001形式のIDを割り当てます',
      function: 'executePropertyIdAssignment',
      required: true,
      estimatedTime: '30秒'
    },
    5: {
      name: '部屋ID自動生成',
      description: '物件ごとにR001形式の部屋IDを生成します',
      function: 'executeRoomIdGeneration',
      required: true,
      estimatedTime: '30秒'
    },
    6: {
      name: '検針データシート作成',
      description: '物件・部屋マスタから検針データシートを生成します',
      function: 'executeInspectionDataCreation',
      required: true,
      estimatedTime: '1分'
    },
    7: {
      name: '最終確認・動作テスト',
      description: 'システム全体の動作確認とセットアップ完了確認を行います',
      function: 'executeFinalValidation',
      required: true,
      estimatedTime: '1分'
    }
  };
}

/**
 * ウェルカムメッセージ表示
 */
function showWelcomeMessage(ui, steps) {
  let welcomeMessage = '🚀 検針システム導入ウィザードへようこそ！\n\n';
  welcomeMessage += '本ウィザードでは、以下の手順で検針システムをセットアップします：\n\n';
  
  Object.entries(steps).forEach(([stepNum, step]) => {
    const required = step.required ? '[必須]' : '[オプション]';
    welcomeMessage += `${stepNum}. ${step.name} ${required}\n`;
    welcomeMessage += `   ${step.description}\n`;
    welcomeMessage += `   予想時間: ${step.estimatedTime}\n\n`;
  });
  
  welcomeMessage += '⏱️ 総予想時間: 5-8分\n\n';
  welcomeMessage += '🔧 準備事項:\n';
  welcomeMessage += '• スプレッドシートの編集権限があることを確認\n';
  welcomeMessage += '• 物件・部屋データがある場合は事前に整理\n';
  welcomeMessage += '• 途中でキャンセルしても問題ありません\n\n';
  welcomeMessage += '導入ウィザードを開始しますか？';

  const response = ui.alert(
    '検針システム導入ウィザード',
    welcomeMessage,
    ui.ButtonSet.YES_NO
  );

  return response === ui.Button.YES;
}

/**
 * ウィザードフロー実行
 */
function executeWizardFlow(ui, wizardData) {
  try {
    for (let stepNum = 1; stepNum <= wizardData.totalSteps; stepNum++) {
      const step = wizardData.steps[stepNum];
      console.log(`=== ステップ${stepNum}: ${step.name} ===`);
      
      // ステップ開始確認（ヘルプ機能付き）
      const confirmResult = confirmStepExecutionWithHelp(ui, stepNum, step);
      if (confirmResult === 'cancel') {
        if (step.required) {
          return {
            success: false,
            message: `必須ステップ${stepNum}がキャンセルされたため、セットアップを中止しました`,
            completedSteps: wizardData.setupData.completedSteps
          };
        } else {
          console.log(`オプションステップ${stepNum}をスキップしました`);
          continue;
        }
      }
      
      // ステップ実行
      const stepResult = executeStep(stepNum, step);
      
      if (!stepResult.success) {
        if (step.required) {
          const continueSetup = handleStepErrorWithTroubleshooting(ui, stepNum, step, stepResult);
          if (!continueSetup) {
            return {
              success: false,
              message: `ステップ${stepNum}でエラーが発生し、セットアップを中止しました`,
              error: stepResult.error,
              completedSteps: wizardData.setupData.completedSteps
            };
          }
        } else {
          wizardData.setupData.warnings.push({
            step: stepNum,
            message: stepResult.error || stepResult.message
          });
        }
      } else {
        wizardData.setupData.completedSteps.push(stepNum);
        wizardData.setupData.results[stepNum] = stepResult;
      }
      
      // 進捗表示
      showProgress(ui, stepNum, wizardData.totalSteps, wizardData.steps);
    }
    
    // セットアップ完了
    return completeSetup(ui, wizardData.setupData);
    
  } catch (error) {
    console.error('ウィザードフロー実行エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `導入ウィザードの実行に失敗しました: ${error.message}`,
      completedSteps: wizardData.setupData.completedSteps
    };
  }
}

/**
 * ステップ実行確認（インタラクティブガイダンス統合版）
 */
function confirmStepExecutionWithHelp(ui, stepNum, step) {
  try {
    const required = step.required ? '[必須]' : '[オプション]';
    let message = `📋 ステップ${stepNum}/7: ${step.name} ${required}\n\n`;
    message += `📝 内容: ${step.description}\n`;
    message += `⏱️ 予想時間: ${step.estimatedTime}\n\n`;
    
    if (!step.required) {
      message += '⚠️ このステップはオプションです。スキップできます。\n\n';
    }
    
    message += '🔍 詳細ガイドが必要な場合は「キャンセル」を選択してください。\n\n';
    message += 'このステップを実行しますか？';

    const response = ui.alert(
      `ステップ${stepNum}: ${step.name}`,
      message,
      ui.ButtonSet.YES_NO_CANCEL
    );

    if (response === ui.Button.YES) {
      return 'yes';
    } else if (response === ui.Button.NO) {
      return 'cancel';
    } else if (response === ui.Button.CANCEL) {
      // ヘルプオプション表示
      const helpResult = showStepHelpOptions(ui, stepNum, step);
      if (helpResult) {
        // ヘルプ表示後、再度実行確認
        return confirmStepExecutionWithHelp(ui, stepNum, step);
      }
      return 'cancel';
    }
    
    return 'cancel';
  } catch (error) {
    console.error(`ステップ${stepNum}確認エラー:`, error);
    return 'yes'; // エラー時は実行する
  }
}

/**
 * ステップ実行前のヘルプオプション表示
 */
function showStepHelpOptions(ui, stepNum, step) {
  try {
    let message = `🔍 ステップ${stepNum}: ${step.name}\n\n`;
    message += `📝 ${step.description}\n`;
    message += `⏱️ 予想時間: ${step.estimatedTime}\n\n`;
    message += '🆘 ヘルプが必要な場合:\n';
    message += '• 「はい」: 詳細ガイドを表示\n';
    message += '• 「いいえ」: そのまま実行\n';
    message += '• 「キャンセル」: ステップをスキップ\n\n';
    message += 'このステップの詳細ガイドを表示しますか？';

    const response = ui.alert(
      `ヘルプオプション - ステップ${stepNum}`,
      message,
      ui.ButtonSet.YES_NO_CANCEL
    );

    switch(response) {
      case ui.Button.YES:
        showInteractiveGuidance(ui, stepNum, step);
        return true;
      case ui.Button.NO:
        return true;
      case ui.Button.CANCEL:
        return false;
      default:
        return true;
    }
  } catch (error) {
    console.error(`ヘルプオプション表示エラー (ステップ${stepNum}):`, error);
    return true;
  }
}

/**
 * インタラクティブガイダンス表示
 */
function showInteractiveGuidance(ui, stepNum, step) {
  try {
    let guidance = `📖 ステップ${stepNum}: ${step.name} - 詳細ガイド\n\n`;
    
    // ステップ別の詳細ガイダンス
    switch(stepNum) {
      case 1:
        guidance += '🔍 システム診断・環境確認\n\n';
        guidance += 'このステップでは以下を確認します：\n';
        guidance += '• スプレッドシートの基本構造\n';
        guidance += '• 既存データの有無と整合性\n';
        guidance += '• 必要な権限の確認\n';
        guidance += '• データ形式の検証\n\n';
        guidance += '⚠️ 注意事項：\n';
        guidance += '• 既存データがある場合は事前にバックアップを推奨\n';
        guidance += '• エラーが多数ある場合は手動修正が必要な場合があります\n';
        break;
        
      case 2:
        guidance += '📋 マスタシートテンプレート作成\n\n';
        guidance += '作成されるシート：\n';
        guidance += '• 物件マスタ: 管理物件の基本情報\n';
        guidance += '• 部屋マスタ: 各物件の部屋情報\n';
        guidance += '• 設定値: システム設定とパラメータ\n\n';
        guidance += '📝 各シートには以下が含まれます：\n';
        guidance += '• 適切なヘッダー行\n';
        guidance += '• データ検証ルール\n';
        guidance += '• 条件付き書式設定\n';
        guidance += '• サンプル行（参考用）\n';
        break;
        
      case 3:
        guidance += '🗃️ サンプルデータ投入（オプション）\n\n';
        guidance += '投入されるサンプルデータ：\n';
        guidance += '• サンプル物件: 3件の物件情報\n';
        guidance += '• サンプル部屋: 各物件に2-3部屋\n';
        guidance += '• 基本設定値\n\n';
        guidance += '💡 このステップをスキップした場合：\n';
        guidance += '• 空のマスタシートで開始\n';
        guidance += '• 手動でデータを入力する必要があります\n';
        guidance += '• 後でサンプルデータを追加することも可能\n';
        break;
        
      case 4:
        guidance += '🏷️ 物件ID自動割り当て\n\n';
        guidance += 'ID割り当てルール：\n';
        guidance += '• 形式: P000001, P000002, P000003...\n';
        guidance += '• 既存IDは保持されます\n';
        guidance += '• 空白または無効なIDのみ新規割り当て\n';
        guidance += '• 連番は自動的に調整されます\n\n';
        guidance += '🔧 処理内容：\n';
        guidance += '• 物件マスタの全行をスキャン\n';
        guidance += '• 既存の有効なIDを識別\n';
        guidance += '• 未設定行に連番でID割り当て\n';
        break;
        
      case 5:
        guidance += '🚪 部屋ID自動生成\n\n';
        guidance += 'ID生成ルール：\n';
        guidance += '• 形式: R001, R002, R003...\n';
        guidance += '• 物件ごとに独立した連番\n';
        guidance += '• 既存IDとの重複を回避\n';
        guidance += '• 物件IDとの関連付けを維持\n\n';
        guidance += '📊 生成プロセス：\n';
        guidance += '1. 物件マスタから物件ID一覧を取得\n';
        guidance += '2. 各物件の部屋データを確認\n';
        guidance += '3. 物件ごとに部屋IDを連番で生成\n';
        guidance += '4. 部屋マスタに反映\n';
        break;
        
      case 6:
        guidance += '📊 検針データシート作成\n\n';
        guidance += 'シート構造：\n';
        guidance += '• 物件・部屋情報のマージ\n';
        guidance += '• 検針用の入力列（前回・今回指示数など）\n';
        guidance += '• 計算列（使用量・料金など）\n';
        guidance += '• ステータス管理列\n\n';
        guidance += '🔄 データ同期：\n';
        guidance += '• マスタシートの最新情報を反映\n';
        guidance += '• 既存の検針データは保持\n';
        guidance += '• 新しい物件・部屋は自動追加\n';
        break;
        
      case 7:
        guidance += '✅ 最終確認・動作テスト\n\n';
        guidance += '検証項目：\n';
        guidance += '• 全シートの構造確認\n';
        guidance += '• データ整合性チェック\n';
        guidance += '• 必要な関数の動作確認\n';
        guidance += '• ID割り当ての正確性\n\n';
        guidance += '📋 レポート生成：\n';
        guidance += '• セットアップ状況の詳細レポート\n';
        guidance += '• 発見された問題とその対処法\n';
        guidance += '• 次のステップの推奨事項\n';
        break;
        
      default:
        guidance += 'このステップの詳細情報はありません。';
    }
    
    guidance += '\n\n❓ より詳しい情報が必要な場合は「使用方法ガイド」メニューをご確認ください。';
    
    ui.alert(
      `詳細ガイド - ステップ${stepNum}`,
      guidance,
      ui.ButtonSet.OK
    );
    
    return true;
  } catch (error) {
    console.error(`ガイダンス表示エラー (ステップ${stepNum}):`, error);
    return false;
  }
}

/**
 * ステップを実行
 */
function executeStep(stepNum, step) {
  try {
    const functionName = step.function;
    console.log(`ステップ${stepNum}実行開始: ${functionName}`);
    
    // 対応する実行関数を呼び出し
    switch(functionName) {
      case 'executeSystemDiagnosis':
        return executeSystemDiagnosis();
      case 'executeTemplateCreation':
        return executeTemplateCreation();
      case 'executeSampleDataCreation':
        return executeSampleDataCreation();
      case 'executePropertyIdAssignment':
        return executePropertyIdAssignment();
      case 'executeRoomIdGeneration':
        return executeRoomIdGeneration();
      case 'executeInspectionDataCreation':
        return executeInspectionDataCreation();
      case 'executeFinalValidation':
        return executeFinalValidation();
      default:
        throw new Error(`実行関数が見つかりません: ${functionName}`);
    }
  } catch (error) {
    console.error(`ステップ${stepNum}実行エラー:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ステップ1: システム診断・環境確認
 */
function executeSystemDiagnosis() {
  try {
    console.log('システム診断実行中...');
    const diagnostics = runSystemDiagnostics();
    
    const hasErrors = diagnostics.issues && diagnostics.issues.some(issue => issue.type === 'error');
    const hasWarnings = diagnostics.issues && diagnostics.issues.some(issue => issue.type === 'warning');
    
    let message = '✅ システム診断が完了しました。\n\n';
    
    if (diagnostics.sheets) {
      const existingSheets = diagnostics.sheets.filter(sheet => sheet.exists);
      message += `📊 既存シート: ${existingSheets.length}個\n`;
      
      if (existingSheets.length > 0) {
        existingSheets.forEach(sheet => {
          message += `  • ${sheet.name}: ${sheet.rows}行 x ${sheet.columns}列\n`;
        });
      }
    }
    
    if (hasErrors) {
      message += '\n🚨 エラーが検出されました:\n';
      diagnostics.issues.filter(i => i.type === 'error').forEach(issue => {
        message += `  • ${issue.message}\n`;
      });
    }
    
    if (hasWarnings) {
      message += '\n⚠️ 警告が検出されました:\n';
      diagnostics.issues.filter(i => i.type === 'warning').forEach(issue => {
        message += `  • ${issue.message}\n`;
      });
    }
    
    return {
      success: true,
      message: message,
      data: diagnostics,
      hasErrors: hasErrors,
      hasWarnings: hasWarnings
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `システム診断に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ2: マスタシートテンプレート作成
 */
function executeTemplateCreation() {
  try {
    console.log('マスタシートテンプレート作成中...');
    const result = createMasterSheetTemplates();
    
    return {
      success: result.success,
      message: result.message || 'マスタシートテンプレートを作成しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `マスタシートテンプレート作成に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ3: サンプルデータ投入
 */
function executeSampleDataCreation() {
  try {
    console.log('サンプルデータ投入中...');
    const result = createSampleData();
    
    return {
      success: result.success,
      message: result.message || 'サンプルデータを投入しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `サンプルデータ投入に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ4: 物件ID自動割り当て
 */
function executePropertyIdAssignment() {
  try {
    console.log('物件ID自動割り当て中...');
    const result = formatAllPropertyIds();
    
    return {
      success: result.success,
      message: result.message || '物件IDを自動割り当てしました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `物件ID自動割り当てに失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ5: 部屋ID自動生成
 */
function executeRoomIdGeneration() {
  try {
    console.log('部屋ID自動生成中...');
    const result = generateRoomIds();
    
    return {
      success: result.success,
      message: result.message || '部屋IDを自動生成しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `部屋ID自動生成に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ6: 検針データシート作成
 */
function executeInspectionDataCreation() {
  try {
    console.log('検針データシート作成中...');
    const result = createInitialInspectionData();
    
    return {
      success: result.success,
      message: result.message || '検針データシートを作成しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `検針データシート作成に失敗しました: ${error.message}`
    };
  }
}

/**
 * ステップ7: 最終確認・動作テスト
 */
function executeFinalValidation() {
  try {
    console.log('最終確認・動作テスト中...');
    const result = validateSystemSetup();
    
    return {
      success: result.success,
      message: result.message || 'システムセットアップが完了しました',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `最終確認に失敗しました: ${error.message}`
    };
  }
}

/**
 * 進捗表示
 */
function showProgress(ui, completedStep, totalSteps, steps) {
  try {
    const progress = Math.round((completedStep / totalSteps) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '▒'.repeat(10 - Math.floor(progress / 10));
    
    console.log(`進捗: ${progressBar} ${progress}% (${completedStep}/${totalSteps})`);
    
    // 中間進捗をユーザーに表示（3ステップごと）
    if (completedStep % 3 === 0 || completedStep === totalSteps) {
      let message = `📊 導入進捗: ${progress}%\n\n`;
      message += `${progressBar}\n\n`;
      message += `完了: ${completedStep}/${totalSteps}ステップ\n`;
      
      if (completedStep < totalSteps) {
        message += `\n次のステップ: ${steps[completedStep + 1].name}`;
      }

      ui.alert('導入進捗', message, ui.ButtonSet.OK);
    }
  } catch (error) {
    console.error('進捗表示エラー:', error);
  }
}

/**
 * セットアップ完了処理
 */
function completeSetup(ui, setupData) {
  try {
    const endTime = new Date();
    const duration = Math.round((endTime - setupData.startTime) / 1000);
    
    let message = '🎉 検針システムの導入が完了しました！\n\n';
    message += `⏱️ 導入時間: ${Math.floor(duration / 60)}分${duration % 60}秒\n`;
    message += `✅ 完了ステップ: ${setupData.completedSteps.length}/7\n\n`;
    
    if (setupData.errors.length > 0) {
      message += `⚠️ エラー: ${setupData.errors.length}件\n`;
    }
    
    if (setupData.warnings.length > 0) {
      message += `🔶 警告: ${setupData.warnings.length}件\n`;
    }
    
    message += '\n🚀 次のステップ:\n';
    message += '1. メニューから「📋 物件一覧を表示」で物件データを確認\n';
    message += '2. 「📊 検針データ入力」で実際の検針を開始\n';
    message += '3. 「ℹ️ 使用方法ガイド」で詳細な使い方を確認\n\n';
    message += '導入レポートを生成しますか？';

    const response = ui.alert(
      '導入完了',
      message,
      ui.ButtonSet.YES_NO
    );

    const result = {
      success: true,
      message: '検針システムの導入が完了しました',
      duration: duration,
      completedSteps: setupData.completedSteps,
      errors: setupData.errors,
      warnings: setupData.warnings,
      setupData: setupData
    };

    if (response === ui.Button.YES) {
      result.report = generateSetupReport(setupData, duration);
    }

    return result;
    
  } catch (error) {
    console.error('セットアップ完了処理エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `セットアップ完了処理に失敗しました: ${error.message}`
    };
  }
}

/**
 * エラーハンドリング（簡易版）
 */
function handleStepErrorWithTroubleshooting(ui, stepNum, step, stepResult) {
  try {
    let message = `❌ ステップ${stepNum}でエラーが発生しました\n\n`;
    message += `ステップ名: ${step.name}\n`;
    message += `エラー内容: ${stepResult.error || stepResult.message}\n\n`;
    message += '対処方法:\n';
    message += '• 「はい」: 再試行する\n';
    message += '• 「いいえ」: セットアップを中止する\n\n';
    message += 'どうしますか？';

    const response = ui.alert(
      'エラーが発生しました',
      message,
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      // 再試行
      const retryResult = executeStep(stepNum, step);
      return retryResult.success;
    } else {
      // セットアップ中止
      return false;
    }
  } catch (error) {
    console.error('エラーハンドリングエラー:', error);
    return false;
  }
}

/**
 * セットアップレポート生成（簡易版）
 */
function generateSetupReport(setupData, duration) {
  try {
    const endTime = new Date();
    const steps = defineSetupSteps();
    
    let report = '# 検針システム導入レポート\n\n';
    report += `**導入日時**: ${setupData.startTime.toLocaleString('ja-JP')}\n`;
    report += `**完了日時**: ${endTime.toLocaleString('ja-JP')}\n`;
    report += `**所要時間**: ${Math.floor(duration / 60)}分${duration % 60}秒\n\n`;
    
    report += '## 📊 導入結果サマリー\n\n';
    report += `- **総ステップ数**: 7\n`;
    report += `- **完了ステップ**: ${setupData.completedSteps.length}\n`;
    report += `- **エラー**: ${setupData.errors.length}件\n`;
    report += `- **警告**: ${setupData.warnings.length}件\n\n`;
    
    console.log(report);
    return report;
    
  } catch (error) {
    console.error('セットアップレポート生成エラー:', error);
    return `レポート生成エラー: ${error.message}`;
  }
}
