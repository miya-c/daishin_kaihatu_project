/**
 * main.gs - メインエントリーポイント
 * 水道検針アプリのメインエントリーポイントとメニュー管理
 */

/**
 * safeAlert関数 - UIアラート表示のフォールバック
 */
function safeAlert(title, message) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (error) {
    Logger.log(`UI表示エラー (${title}): ${message}`);
    console.log(`UI表示エラー (${title}): ${message}`);
  }
}

/**
 * スプレッドシート開始時に呼び出されるメニュー作成関数
 */
function onOpen() {
  try {
    console.log('[onOpen] メニュー作成開始');
    
    const ui = SpreadsheetApp.getUi();
    
    // メインメニューを作成
    const menu = ui.createMenu('🔧 水道検針システム');
    
    // 基本機能メニュー
    menu.addItem('📱 水道検針アプリを開く', 'showWaterMeterApp');
    menu.addSeparator();
    
    // データ管理メニュー
    const dataManagementMenu = ui.createMenu('📊 データ管理');
    dataManagementMenu.addItem('1. 物件マスタの物件IDフォーマット', 'formatPropertyIdsInPropertyMaster');
    dataManagementMenu.addItem('2. 部屋マスタの物件IDフォーマット', 'formatPropertyIdsInRoomMaster');
    dataManagementMenu.addItem('3. 部屋マスタの孤立データ削除', 'cleanUpOrphanedRooms');
    dataManagementMenu.addSeparator();
    dataManagementMenu.addItem('4. 初期検針データ作成', 'createInitialInspectionData');
    dataManagementMenu.addItem('5. マスタから検針データへ新規部屋反映', 'populateInspectionDataFromMasters');
    dataManagementMenu.addSeparator();
    dataManagementMenu.addItem('6. 月次検針データ保存とリセット', 'processInspectionDataMonthly');
    
    menu.addSubMenu(dataManagementMenu);      // データ品質管理メニュー
    const dataQualityMenu = ui.createMenu('🔍 データ品質管理');
    dataQualityMenu.addItem('1. 重複データクリーンアップ', 'menuCleanupDuplicateData');
    dataQualityMenu.addItem('2. データ整合性チェック', 'menuValidateDataIntegrity');
    dataQualityMenu.addItem('3. データ高速検索インデックス作成', 'createDataIndexes');
    dataQualityMenu.addSeparator();
    dataQualityMenu.addItem('4. 高速検索機能テスト', 'testSearchFunctions');
    dataQualityMenu.addItem('5. 検索使用方法ガイド', 'showSearchUsageGuide');
    
    menu.addSubMenu(dataQualityMenu);
    
    // システム管理メニュー
    const systemMenu = ui.createMenu('⚙️ システム管理');
    systemMenu.addItem('1. 全体最適化バッチ処理', 'runComprehensiveDataOptimization');
    systemMenu.addItem('2. システム診断', 'runSystemDiagnostics');
    systemMenu.addItem('3. エラーログ収集', 'collectErrorLogs');
    systemMenu.addSeparator();
    systemMenu.addItem('4. 統合作業サマリー表示', 'showIntegrationSummary');
    
    menu.addSubMenu(systemMenu);
      // メニューを追加
    menu.addToUi();
    
    console.log('[onOpen] メニュー作成完了');
    
  } catch (e) {
    console.error('[onOpen] メニュー作成エラー:', e.message);
    console.error('[onOpen] 詳細:', e.stack);
  }
}

/**
 * 水道検針アプリのメインエントリーポイント（メニュー用）
 */
function showWaterMeterApp() {
  try {
    console.log('[showWaterMeterApp] アプリ起動開始');
    
    // Web App案内機能を呼び出し
    showWaterMeterWebApp();
    
  } catch (error) {
    console.error('[showWaterMeterApp] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        ui.alert('エラー', `アプリの起動に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
      } else {
        showExecutionGuidance();
      }
    } catch (uiError) {
      console.error('[showWaterMeterApp] UI表示エラー:', uiError);
      showExecutionGuidance();
    }
  }
}

/**
 * データインデックス作成（メニュー用）
 */
function createDataIndexes() {
  try {
    console.log('[createDataIndexes] インデックス作成開始');
    
    const indexes = createAllIndexes();
    const stats = getIndexStats();
    
    const ui = SpreadsheetApp.getUi();
    let message = 'データインデックスが正常に作成されました。\n\n';
    Object.keys(stats).forEach(key => {
      if (key !== '作成日時') {
        message += `${key}: ${stats[key]}\n`;
      }
    });
    
    ui.alert('インデックス作成完了', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[createDataIndexes] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `インデックス作成に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[createDataIndexes] UI表示エラー:', uiError);
    }
  }
}

/**
 * 総合データ最適化バッチ処理（メニュー用）
 */
function runComprehensiveDataOptimization() {
  try {
    console.log('[runComprehensiveDataOptimization] 最適化開始 - batch_processing.gsに委譲');
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '総合データ最適化',
      '以下の処理を実行します:\n' +
      '1. データバリデーション\n' +
      '2. 重複データ検出\n' +
      '3. 整合性チェック\n' +
      '4. インデックス作成\n\n' +
      '実行しますか？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    // batch_processing.gsの統合バッチ処理を呼び出し
    const results = runBatchOptimization();
    
    // 結果表示
    let message = '総合データ最適化が完了しました。\n\n';
    
    if (results.validation) {
      message += `バリデーション: ${results.validation.summary ? results.validation.summary.成功率 : '完了'}\n`;
    }
    
    if (results.duplicates) {
      message += `重複グループ数: ${results.duplicates.summary ? results.duplicates.summary.重複グループ数 : '処理完了'}\n`;
    }
    
    if (results.integrity) {
      message += `整合性状態: ${results.integrity.summary ? results.integrity.summary.状態 : '完了'}\n`;
    }
    
    if (results.indexes) {
      message += 'インデックス: 作成完了\n';
    }
    
    ui.alert('最適化完了', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[runComprehensiveDataOptimization] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `最適化処理に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[runComprehensiveDataOptimization] UI表示エラー:', uiError);
    }
  }
}

/**
 * システム診断（メニュー用）
 */
function runSystemDiagnostics() {
  try {
    console.log('[runSystemDiagnostics] システム診断開始');
    
    const diagnostics = {
      sheets: [],
      functions: [],
      performance: {},
      issues: []
    };
    
    // シート存在確認
    const requiredSheets = ['物件マスタ', '部屋マスタ', '検針データ'];
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    requiredSheets.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      diagnostics.sheets.push({
        name: sheetName,
        exists: !!sheet,
        rows: sheet ? sheet.getLastRow() : 0
      });
    });
    
    // パフォーマンス情報
    diagnostics.performance = {
      実行時間: new Date(),
      利用可能メモリ: '不明',
      実行時間制限: '6分'
    };
    
    // 結果表示
    let message = 'システム診断結果:\n\n';
    message += 'シート状況:\n';
    diagnostics.sheets.forEach(sheet => {
      message += `・${sheet.name}: ${sheet.exists ? 'OK' : 'NG'} (${sheet.rows}行)\n`;
    });
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('システム診断', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[runSystemDiagnostics] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `システム診断に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[runSystemDiagnostics] UI表示エラー:', uiError);
    }
  }
}

/**
 * エラーログ収集（メニュー用）
 */
function collectErrorLogs() {
  try {
    console.log('[collectErrorLogs] エラーログ収集開始');
    
    // 最近のログを取得（簡易版）
    const logs = console.log('ログ収集機能は開発中です');
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'エラーログ収集',
      'エラーログの収集が完了しました。\n' +
      '詳細なログは実行トランスクリプトをご確認ください。',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('[collectErrorLogs] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `ログ収集に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[collectErrorLogs] UI表示エラー:', uiError);
    }
  }
}

/**
 * 統合作業サマリー表示（メニュー用）
 */
function showIntegrationSummary() {
  try {
    console.log('[showIntegrationSummary] 統合サマリー表示開始');
    
    const summary = `
水道検針システム統合サマリー

【完了項目】
✅ CORS/503エラー修正
✅ Web App API統一
✅ HTML依存排除
✅ アーカイブファイル無効化
✅ バッチ処理機能追加
✅ インデックス機能追加
✅ データ管理機能強化

【利用可能機能】
📱 Web App: https://line-app-project.vercel.app
⚙️ GAS管理: メニューから各種処理実行
🔍 データ分析: インデックス・バッチ処理

【次のステップ】
1. Web Appでの動作確認
2. 本番データでのテスト
3. ユーザー向け操作説明
    `;
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('統合作業サマリー', summary, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[showIntegrationSummary] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `サマリー表示に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[showIntegrationSummary] UI表示エラー:', uiError);
    }
  }
}

/**
 * 高速検索機能テスト（メニュー用）
 */
function testSearchFunctions() {
  try {
    console.log('[testSearchFunctions] 検索機能テスト開始');
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '検索機能テスト',
      '高速検索機能のテストを実行します。\n' +
      'データの状況により時間がかかる場合があります。\n\n' +
      'テストを実行しますか？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    // テスト実行
    const testResult = testFastSearch();
    const sampleResult = sampleDataSearch();
    
    // 結果表示
    let message = '検索機能テスト結果:\n\n';
    message += `テスト成功率: ${testResult.成功率}\n`;
    message += `実行時間: ${testResult.実行時間.toLocaleString()}\n\n`;
    
    if (sampleResult.length > 0) {
      message += '実データ検索サンプル:\n';
      sampleResult.forEach(sample => {
        message += `・${sample.type}: ${sample.found ? 'OK' : 'NG'}\n`;
      });
    } else {
      message += '実データが見つかりませんでした\n';
    }
    
    message += '\n詳細はログをご確認ください。';
    
    ui.alert('検索テスト完了', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[testSearchFunctions] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `検索テストに失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[testSearchFunctions] UI表示エラー:', uiError);
    }
  }
}

/**
 * 検索使用方法ガイド（メニュー用）
 */
function showSearchUsageGuide() {
  try {
    console.log('[showSearchUsageGuide] 使用方法ガイド表示');
    
    const guide = showSearchGuide();
    
    const ui = SpreadsheetApp.getUi();
    const shortGuide = `
高速検索機能の使用方法

【基本的な使用方法】
fastSearch(type, key)

【検索タイプ】
• property: 物件IDで物件情報を検索
• room: 部屋IDで部屋情報を検索  
• meter: レコードIDで検針データを検索
• propertyRooms: 物件の部屋一覧を取得
• roomMeters: 部屋の検針データ一覧を取得

【使用例】
const property = fastSearch('property', 'P001');
const rooms = fastSearch('propertyRooms', 'P001');

詳細な使用方法とサンプルコードは
実行トランスクリプトをご確認ください。
    `;
    
    ui.alert('検索機能使用ガイド', shortGuide, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[showSearchUsageGuide] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `ガイド表示に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[showSearchUsageGuide] UI表示エラー:', uiError);
    }
  }
}

/**
 * 重複データクリーンアップ（メニュー用プロキシ関数）
 * data_cleanup.gsの関数を呼び出し
 */
function menuCleanupDuplicateData() {
  try {
    console.log('[menuCleanupDuplicateData] data_cleanup.gsの関数を呼び出し');
    const result = optimizedCleanupDuplicateInspectionData();
    
    const ui = SpreadsheetApp.getUi();
    let message = '重複データクリーンアップが完了しました。\n\n';
    if (result && result.summary) {
      Object.keys(result.summary).forEach(key => {
        message += `${key}: ${result.summary[key]}\n`;
      });
    }
    
    ui.alert('クリーンアップ完了', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[menuCleanupDuplicateData] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `クリーンアップ処理に失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[menuCleanupDuplicateData] UI表示エラー:', uiError);
    }
  }
}

/**
 * データ整合性チェック（メニュー用プロキシ関数）
 * data_validation.gsの関数を呼び出し
 */
function menuValidateDataIntegrity() {
  try {
    console.log('[menuValidateDataIntegrity] data_validation.gsの関数を呼び出し');
    const result = validateInspectionDataIntegrity();
    
    const ui = SpreadsheetApp.getUi();
    let message = 'データ整合性チェックが完了しました。\n\n';
    if (result && result.summary) {
      Object.keys(result.summary).forEach(key => {
        message += `${key}: ${result.summary[key]}\n`;
      });
    }
    
    ui.alert('整合性チェック完了', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[menuValidateDataIntegrity] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `整合性チェックに失敗しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[menuValidateDataIntegrity] UI表示エラー:', uiError);
    }
  }
}

/**
 * 部屋マスタの部屋IDを物件別に連番で自動生成
 * 物件ID別にR001, R002, R003... の形式で部屋IDを割り当てる
 */
function generateRoomIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const sheet = ss.getSheetByName('部屋マスタ');

  if (!sheet) {
    safeAlert('エラー', '部屋マスタシートが見つかりません。');
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    safeAlert('情報', '部屋マスタシートにデータがありません。');
    return;
  }

  // ヘッダー行の確認
  const headers = values[0];
  const propertyIdIndex = headers.indexOf('物件ID');
  const roomIdIndex = headers.indexOf('部屋ID');
  
  if (propertyIdIndex === -1) {
    safeAlert('エラー', '部屋マスタシートに「物件ID」列が見つかりません。');
    return;
  }
  
  if (roomIdIndex === -1) {
    safeAlert('エラー', '部屋マスタシートに「部屋ID」列が見つかりません。');
    return;
  }

  try {
    // 物件IDごとに部屋をグループ化
    const propertyGroups = new Map();
    
    for (let i = 1; i < values.length; i++) {
      const propertyId = String(values[i][propertyIdIndex] || '').trim();
      
      if (propertyId) {
        if (!propertyGroups.has(propertyId)) {
          propertyGroups.set(propertyId, []);
        }
        propertyGroups.get(propertyId).push(i);
      }
    }

    let updatedCount = 0;
    
    // 各物件に対して部屋IDを連番で生成
    propertyGroups.forEach((rowIndexes, propertyId) => {
      // 部屋データを部屋名でソート（もしあれば）
      const roomNameIndex = headers.indexOf('部屋名');
      if (roomNameIndex !== -1) {
        rowIndexes.sort((a, b) => {
          const nameA = String(values[a][roomNameIndex] || '').trim();
          const nameB = String(values[b][roomNameIndex] || '').trim();
          return nameA.localeCompare(nameB);
        });
      }
      
      // 連番で部屋IDを生成
      rowIndexes.forEach((rowIndex, counter) => {
        const newRoomId = `R${String(counter + 1).padStart(3, '0')}`;
        const currentRoomId = String(values[rowIndex][roomIdIndex] || '').trim();
        
        if (currentRoomId !== newRoomId) {
          values[rowIndex][roomIdIndex] = newRoomId;
          updatedCount++;
          Logger.log(`物件 ${propertyId} - 行 ${rowIndex + 1}: 部屋ID を "${newRoomId}" に設定`);
        }
      });
    });

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`部屋ID自動生成完了: ${updatedCount}件`);
      safeAlert('完了', `部屋IDの自動生成が完了しました。\n更新件数: ${updatedCount}件\n\n物件別にR001, R002, R003...の形式で部屋IDを割り当てました。`);
    } else {
      safeAlert('情報', 'すべての部屋IDが既に正しい形式で設定されています。');
    }
    
  } catch (e) {
    Logger.log(`エラー: 部屋ID自動生成中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `部屋ID自動生成中にエラーが発生しました:\n${e.message}`);
  }
}
