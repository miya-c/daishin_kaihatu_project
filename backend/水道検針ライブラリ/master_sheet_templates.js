/**
 * master_sheet_templates.gs - マスタシートテンプレート機能
 *
 * システム導入時に必要な基本シートテンプレートを作成
 * 物件マスタ・部屋マスタ・設定値シートの初期構造を提供
 */

/**
 * マスタシートテンプレートを作成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} options - 作成オプション
 * @returns {Object} 作成結果
 */
function createMasterSheetTemplates(ss = null, options = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    return {
      success: false,
      error: 'アクティブなスプレッドシートが見つかりません',
    };
  }

  try {
    console.log('=== マスタシートテンプレート作成開始 ===');

    const results = {
      propertyMaster: null,
      roomMaster: null,
      configSheet: null,
      created: [],
      updated: [],
      skipped: [],
    };

    // 物件マスタテンプレート作成
    const propertyMasterResult = createPropertyMasterTemplate(ss, options);
    results.propertyMaster = propertyMasterResult;

    if (propertyMasterResult.created) {
      results.created.push('物件マスタ');
    } else if (propertyMasterResult.updated) {
      results.updated.push('物件マスタ');
    } else if (propertyMasterResult.skipped) {
      results.skipped.push('物件マスタ');
    }

    // 部屋マスタテンプレート作成
    const roomMasterResult = createRoomMasterTemplate(ss, options);
    results.roomMaster = roomMasterResult;

    if (roomMasterResult.created) {
      results.created.push('部屋マスタ');
    } else if (roomMasterResult.updated) {
      results.updated.push('部屋マスタ');
    } else if (roomMasterResult.skipped) {
      results.skipped.push('部屋マスタ');
    }

    // 設定値シートテンプレート作成
    const configResult = createConfigSheetTemplate(ss, options);
    results.configSheet = configResult;

    if (configResult.created) {
      results.created.push('設定値');
    } else if (configResult.updated) {
      results.updated.push('設定値');
    } else if (configResult.skipped) {
      results.skipped.push('設定値');
    }

    // 結果サマリー作成
    let message = 'マスタシートテンプレート作成が完了しました。\n\n';

    if (results.created.length > 0) {
      message += `✅ 新規作成: ${results.created.join(', ')}\n`;
    }

    if (results.updated.length > 0) {
      message += `🔄 更新: ${results.updated.join(', ')}\n`;
    }

    if (results.skipped.length > 0) {
      message += `⏭️ スキップ: ${results.skipped.join(', ')}\n`;
    }

    console.log('=== マスタシートテンプレート作成完了 ===');

    return {
      success: true,
      message: message,
      results: results,
    };
  } catch (error) {
    console.error('マスタシートテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `マスタシートテンプレート作成に失敗しました: ${error.message}`,
    };
  }
}

/**
 * 物件マスタテンプレートを作成
 */
function createPropertyMasterTemplate(ss, options = {}) {
  try {
    const sheetName = '物件マスタ';
    let sheet = ss.getSheetByName(sheetName);
    let created = false;
    let updated = false;

    if (!sheet) {
      // 新規作成
      sheet = ss.insertSheet(sheetName);
      created = true;
      console.log(`${sheetName}シートを新規作成しました`);
    } else if (options.overwrite || sheet.getLastRow() <= 1) {
      // 既存シートの更新（データがない場合または上書き指定）
      sheet.clear();
      updated = true;
      console.log(`${sheetName}シートを更新しました`);
    } else {
      // 既存データがある場合はスキップ
      return {
        success: true,
        skipped: true,
        message: `${sheetName}は既存データがあるためスキップしました`,
      };
    }

    // ヘッダー行を設定
    const headers = [
      '物件ID', // A列: P000001形式
      '物件名', // B列: マンション名など
      '検針完了日', // C列: 月次処理で使用
    ];

    // ヘッダーを設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダーのスタイル設定
    headerRange
      .setFontWeight('bold')
      .setBackground('#e1f5fe')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);

    // 列幅の自動調整
    headers.forEach((header, index) => {
      sheet.autoResizeColumn(index + 1);

      // 最小幅設定
      const currentWidth = sheet.getColumnWidth(index + 1);
      if (currentWidth < 100) {
        sheet.setColumnWidth(index + 1, 100);
      }
    });

    // サンプル行を追加（オプション）
    if (options.includeSample) {
      const sampleData = [
        ['P000001', 'サンプル物件A', ''],
        ['P000002', 'サンプル物件B', ''],
        ['P000003', 'サンプル物件C', ''],
      ];

      const sampleRange = sheet.getRange(2, 1, sampleData.length, headers.length);
      sampleRange.setValues(sampleData);

      // サンプルデータのスタイル設定
      sampleRange.setFontColor('#666666').setFontStyle('italic');
    }

    // データ入力規則の設定
    if (options.addValidation) {
      // 物件ID列にフォーマット制限を設定（P000001形式）
      const idRange = sheet.getRange(2, 1, 1000, 1);
      const idRule = SpreadsheetApp.newDataValidation()
        .requireFormulaSatisfied('=REGEXMATCH(A2,"^P\\d{6}$")')
        .setAllowInvalid(false)
        .setHelpText('物件IDはP000001の形式で入力してください')
        .build();
      idRange.setDataValidation(idRule);
    }

    // 条件付き書式の設定
    if (options.addConditionalFormatting) {
      // 検針完了日があるセルに色付け
      const completionDateRange = sheet.getRange(2, 3, 1000, 1);
      const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=NOT(ISBLANK(C2))')
        .setBackground('#c8e6c9')
        .setRanges([completionDateRange])
        .build();

      sheet.setConditionalFormatRules([rule]);
    }

    return {
      success: true,
      created: created,
      updated: updated,
      sheet: sheet,
      message: `${sheetName}テンプレートを${created ? '作成' : '更新'}しました`,
    };
  } catch (error) {
    console.error('物件マスタテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 部屋マスタテンプレートを作成
 */
function createRoomMasterTemplate(ss, options = {}) {
  try {
    const sheetName = '部屋マスタ';
    let sheet = ss.getSheetByName(sheetName);
    let created = false;
    let updated = false;

    if (!sheet) {
      // 新規作成
      sheet = ss.insertSheet(sheetName);
      created = true;
      console.log(`${sheetName}シートを新規作成しました`);
    } else if (options.overwrite || sheet.getLastRow() <= 1) {
      // 既存シートの更新
      sheet.clear();
      updated = true;
      console.log(`${sheetName}シートを更新しました`);
    } else {
      // 既存データがある場合はスキップ
      return {
        success: true,
        skipped: true,
        message: `${sheetName}は既存データがあるためスキップしました`,
      };
    }

    // ヘッダー行を設定
    const headers = [
      '物件ID', // A列: 物件マスタと連携
      '部屋ID', // B列: R001形式
      '部屋名', // C列: 部屋番号など
    ];

    // ヘッダーを設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダーのスタイル設定
    headerRange
      .setFontWeight('bold')
      .setBackground('#fff3e0')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);

    // 列幅の自動調整
    headers.forEach((header, index) => {
      sheet.autoResizeColumn(index + 1);

      // 最小幅設定
      const currentWidth = sheet.getColumnWidth(index + 1);
      if (currentWidth < 100) {
        sheet.setColumnWidth(index + 1, 100);
      }
    });

    // サンプル行を追加（オプション）
    if (options.includeSample) {
      const sampleData = [
        ['P000001', 'R001', '101号室'],
        ['P000001', 'R002', '102号室'],
        ['P000001', 'R003', '201号室'],
        ['P000002', 'R001', 'A棟101'],
        ['P000002', 'R002', 'A棟102'],
      ];

      const sampleRange = sheet.getRange(2, 1, sampleData.length, headers.length);
      sampleRange.setValues(sampleData);

      // サンプルデータのスタイル設定
      sampleRange.setFontColor('#666666').setFontStyle('italic');
    }

    // データ入力規則の設定
    if (options.addValidation) {
      // 物件ID列にフォーマット制限を設定
      const propertyIdRange = sheet.getRange(2, 1, 1000, 1);
      const propertyIdRule = SpreadsheetApp.newDataValidation()
        .requireFormulaSatisfied('=REGEXMATCH(A2,"^P\\d{6}$")')
        .setAllowInvalid(false)
        .setHelpText('物件IDはP000001の形式で入力してください')
        .build();
      propertyIdRange.setDataValidation(propertyIdRule);

      // 部屋ID列にフォーマット制限を設定
      const roomIdRange = sheet.getRange(2, 2, 1000, 1);
      const roomIdRule = SpreadsheetApp.newDataValidation()
        .requireFormulaSatisfied('=REGEXMATCH(B2,"^R\\d{3}$")')
        .setAllowInvalid(false)
        .setHelpText('部屋IDはR001の形式で入力してください')
        .build();
      roomIdRange.setDataValidation(roomIdRule);
    }

    // 条件付き書式の設定（削除：検針不要列がないため不要）

    return {
      success: true,
      created: created,
      updated: updated,
      sheet: sheet,
      message: `${sheetName}テンプレートを${created ? '作成' : '更新'}しました`,
    };
  } catch (error) {
    console.error('部屋マスタテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 設定値シートテンプレートを作成
 */
function createConfigSheetTemplate(ss, options = {}) {
  try {
    const sheetName = '設定値';
    let sheet = ss.getSheetByName(sheetName);
    let created = false;
    let updated = false;

    if (!sheet) {
      // 新規作成
      sheet = ss.insertSheet(sheetName);
      created = true;
      console.log(`${sheetName}シートを新規作成しました`);
    } else if (options.overwrite || sheet.getLastRow() <= 1) {
      // 既存シートの更新
      sheet.clear();
      updated = true;
      console.log(`${sheetName}シートを更新しました`);
    } else {
      // 既存データがある場合はスキップ
      return {
        success: true,
        skipped: true,
        message: `${sheetName}は既存データがあるためスキップしました`,
      };
    }

    // ヘッダー行を設定
    const headers = ['設定項目', '設定値', '説明'];

    // ヘッダーを設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダーのスタイル設定
    headerRange
      .setFontWeight('bold')
      .setBackground('#f3e5f5')
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);

    // 設定データを作成
    const configData = [
      ['システム名', '水道検針管理システム', 'システムの名称'],
      ['バージョン', 'v3.0.0-library', 'システムバージョン'],
      ['導入日', new Date().toLocaleDateString('ja-JP'), 'システム導入日'],
      ['月次処理日', '', '月次処理実行日（自動設定）'],
      ['バックアップ推奨', 'TRUE', 'バックアップ推奨表示'],
      ['自動ID生成', 'TRUE', 'ID自動生成機能'],
      ['検針完了通知', 'FALSE', '検針完了時の通知機能'],
      ['データ保持期間', '36', 'アーカイブデータ保持期間（月）'],
      ['警告フラグ閾値', '30', '使用量警告の閾値（％）'],
      ['パフォーマンス監視', 'TRUE', 'パフォーマンス監視機能'],
    ];

    // データを設定
    const dataRange = sheet.getRange(2, 1, configData.length, 3);
    dataRange.setValues(configData);

    // 列幅の調整
    sheet.setColumnWidth(1, 200); // 設定項目
    sheet.setColumnWidth(2, 150); // 設定値
    sheet.setColumnWidth(3, 300); // 説明

    // スタイル設定
    dataRange.setBorder(true, true, true, true, true, true);

    // 設定値列の背景色
    const valueRange = sheet.getRange(2, 2, configData.length, 1);
    valueRange.setBackground('#f8f9fa');

    // 説明の追加
    const noteRange = sheet.getRange(configData.length + 4, 1, 5, 3);
    const notes = [
      ['', '', ''],
      ['注意事項', '', ''],
      ['• このシートはシステム設定を管理します', '', ''],
      ['• 設定値を変更する場合は慎重に行ってください', '', ''],
      ['• バックアップを取ってから変更することを推奨します', '', ''],
    ];
    noteRange.setValues(notes);

    // 注意事項のスタイル
    const noteTitleRange = sheet.getRange(configData.length + 5, 1, 1, 1);
    noteTitleRange.setFontWeight('bold').setBackground('#fff3e0');

    return {
      success: true,
      created: created,
      updated: updated,
      sheet: sheet,
      message: `${sheetName}テンプレートを${created ? '作成' : '更新'}しました`,
    };
  } catch (error) {
    console.error('設定値シートテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * サンプルデータを作成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} options - 作成オプション
 * @returns {Object} 作成結果
 */
function createSampleData(ss = null, options = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    return {
      success: false,
      error: 'アクティブなスプレッドシートが見つかりません',
    };
  }

  try {
    console.log('=== サンプルデータ作成開始 ===');

    const results = {
      propertyData: null,
      roomData: null,
      created: 0,
      message: '',
    };

    // 物件マスタサンプルデータ
    const propertyMasterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
    if (propertyMasterSheet && propertyMasterSheet.getLastRow() <= 1) {
      const propertyData = [
        ['P000001', 'グリーンハイツA棟', ''],
        ['P000002', 'グリーンハイツB棟', ''],
        ['P000003', 'サンシャインマンション', ''],
        ['P000004', 'リバーサイドコート', ''],
        ['P000005', 'パークビュー南青山', ''],
      ];

      const propertyRange = propertyMasterSheet.getRange(2, 1, propertyData.length, 3);
      propertyRange.setValues(propertyData);
      results.propertyData = propertyData.length;
      results.created += propertyData.length;
    }

    // 部屋マスタサンプルデータ
    const roomMasterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
    if (roomMasterSheet && roomMasterSheet.getLastRow() <= 1) {
      const roomData = [
        // グリーンハイツA棟
        ['P000001', 'R001', '101号室'],
        ['P000001', 'R002', '102号室'],
        ['P000001', 'R003', '201号室'],
        ['P000001', 'R004', '202号室'],

        // グリーンハイツB棟
        ['P000002', 'R001', '101号室'],
        ['P000002', 'R002', '102号室'],
        ['P000002', 'R003', '201号室'],

        // サンシャインマンション
        ['P000003', 'R001', 'A-101'],
        ['P000003', 'R002', 'A-102'],
        ['P000003', 'R003', 'B-101'],
        ['P000003', 'R004', 'B-102'],

        // リバーサイドコート
        ['P000004', 'R001', '1階テナント'],
        ['P000004', 'R002', '301号室'],

        // パークビュー南青山
        ['P000005', 'R001', 'ペントハウス'],
      ];

      const roomRange = roomMasterSheet.getRange(2, 1, roomData.length, 3);
      roomRange.setValues(roomData);
      results.roomData = roomData.length;
      results.created += roomData.length;
    }

    if (results.created > 0) {
      results.message = `サンプルデータを作成しました。\n物件: ${results.propertyData || 0}件\n部屋: ${results.roomData || 0}件`;
    } else {
      results.message = 'サンプルデータは既存データがあるためスキップされました';
    }

    console.log('=== サンプルデータ作成完了 ===');

    return {
      success: true,
      message: results.message,
      results: results,
    };
  } catch (error) {
    console.error('サンプルデータ作成エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `サンプルデータ作成に失敗しました: ${error.message}`,
    };
  }
}
