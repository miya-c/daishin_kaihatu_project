/**
 * data_management.gs - データ管理機能
 * inspection_data の生成・管理に関する機能群
 * Version: 1.0.0 - Library Edition
 */

/**
 * inspection_dataを物件マスタと部屋マスタから自動生成
 * @param {Object} config - 設定オブジェクト（オプション）
 * @param {Spreadsheet} ss - 対象スプレッドシート（指定しない場合はアクティブシート）
 * @returns {boolean} 成功した場合true
 */
function populateInspectionDataFromMasters(config = {}, ss = null) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    }
    return false;
  }

  const propertyMasterSheetName =
    config.propertyMasterSheetName || CONFIG.SHEET_NAMES.PROPERTY_MASTER;
  const roomMasterSheetName = config.roomMasterSheetName || CONFIG.SHEET_NAMES.ROOM_MASTER;
  const inspectionDataSheetName =
    config.inspectionDataSheetName || CONFIG.SHEET_NAMES.INSPECTION_DATA;

  const propertyMasterSheet = ss.getSheetByName(propertyMasterSheetName);
  const roomMasterSheet = ss.getSheetByName(roomMasterSheetName);
  const inspectionDataSheet = ss.getSheetByName(inspectionDataSheetName);

  if (!propertyMasterSheet) {
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', `「${propertyMasterSheetName}」シートが見つかりません。`);
    }
    return false;
  }
  if (!roomMasterSheet) {
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', `「${roomMasterSheetName}」シートが見つかりません。`);
    }
    return false;
  }
  if (!inspectionDataSheet) {
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', `「${inspectionDataSheetName}」シートが見つかりません。`);
    }
    return false;
  }

  return withScriptLock(function () {
    try {
      Logger.log('📊 inspection_dataの自動生成を開始します...');

      // 1. 物件マスタのデータを読み込み、物件IDと物件名のマッピングを作成
      const propertyMasterData = propertyMasterSheet
        .getRange(2, 1, propertyMasterSheet.getLastRow() - 1, 2)
        .getValues();
      const propertyMap = {};
      propertyMasterData.forEach((row) => {
        const propertyId = String(row[0]).trim();
        const propertyName = String(row[1]).trim();
        if (propertyId && propertyName) {
          propertyMap[propertyId] = propertyName;
        }
      });

      Logger.log(`📋 物件マスタから ${Object.keys(propertyMap).length} 件の物件を取得しました`);

      // 2. 部屋マスタのデータを読み込み
      const roomMasterData = roomMasterSheet
        .getRange(2, 1, roomMasterSheet.getLastRow() - 1, 3)
        .getValues();

      Logger.log(`🏠 部屋マスタから ${roomMasterData.length} 件の部屋データを取得しました`);

      // 3. 既存のinspection_dataをクリア（ヘッダー行は保持）
      const inspectionDataRange = inspectionDataSheet.getDataRange();
      if (inspectionDataRange.getNumRows() > 1) {
        inspectionDataSheet
          .getRange(2, 1, inspectionDataRange.getNumRows() - 1, inspectionDataRange.getNumColumns())
          .clearContent();
      }

      // 4. 新しい検針データを生成（ヘッダー列数に合わせた行を作成）
      var inspHeaders = inspectionDataSheet
        .getRange(1, 1, 1, inspectionDataSheet.getLastColumn())
        .getValues()[0];
      const newInspectionData = [];
      const propIdCol = inspHeaders.indexOf('物件ID');
      const propNameCol = inspHeaders.indexOf('物件名');
      const roomIdCol = inspHeaders.indexOf('部屋ID');
      const roomNameCol = inspHeaders.indexOf('部屋名');

      roomMasterData.forEach((row) => {
        const propertyId = String(row[0]).trim();
        const roomId = String(row[1]).trim();
        const roomName = String(row[2]).trim();

        if (propertyId && roomId && propertyMap[propertyId]) {
          var newRow = new Array(inspHeaders.length).fill('');
          if (propIdCol !== -1) newRow[propIdCol] = propertyId;
          if (propNameCol !== -1) newRow[propNameCol] = propertyMap[propertyId];
          if (roomIdCol !== -1) newRow[roomIdCol] = roomId;
          if (roomNameCol !== -1) newRow[roomNameCol] = roomName;
          newInspectionData.push(newRow);
        }
      });

      // 5. データをシートに書き込み
      if (newInspectionData.length > 0) {
        const targetRange = inspectionDataSheet.getRange(
          2,
          1,
          newInspectionData.length,
          newInspectionData[0].length
        );
        targetRange.setValues(newInspectionData);

        Logger.log(
          `✅ inspection_dataの生成完了: ${newInspectionData.length} 件のレコードを作成しました`
        );

        if (typeof safeAlert === 'function') {
          safeAlert(
            '完了',
            `inspection_dataの自動生成が完了しました。\n作成件数: ${newInspectionData.length} 件`
          );
        }

        return true;
      } else {
        Logger.log('⚠️ 生成するデータがありませんでした');
        if (typeof safeAlert === 'function') {
          safeAlert(
            '情報',
            '生成するデータがありませんでした。物件マスタと部屋マスタの内容を確認してください。'
          );
        }
        return false;
      }
    } catch (error) {
      Logger.log(`❌ エラーが発生しました: ${error.message}`);
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', `処理中にエラーが発生しました: ${error.message}`);
      }
      return false;
    }
  }, 60000);
}

/**
 * 初期検針データを作成
 * 部屋マスタと物件マスタから初期の検針データシートを生成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} 処理結果
 */
function createInitialInspectionData(ss = null) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    }
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const propertyMasterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
  const roomMasterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
  let inspectionDataSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);

  if (!propertyMasterSheet) {
    const error = '物件マスタシートが見つかりません。';
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', error);
    }
    return { success: false, error: error };
  }
  if (!roomMasterSheet) {
    const error = '部屋マスタシートが見つかりません。';
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', error);
    }
    return { success: false, error: error };
  }

  try {
    // inspection_dataシートが存在しない場合は作成
    if (!inspectionDataSheet) {
      inspectionDataSheet = ss.insertSheet('inspection_data');
      const headers = [
        '記録ID',
        '物件名',
        '物件ID',
        '部屋ID',
        '部屋名',
        '検針日時',
        '警告フラグ',
        '標準偏差値',
        '今回使用量',
        '今回の指示数',
        '前回指示数',
        '前々回指示数',
        '前々々回指示数',
        '検針不要',
        '請求不要',
      ];
      inspectionDataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // ========================================
      // 🎨 フォーマット設定（詳細版）
      // ========================================

      // シートの固定行設定
      inspectionDataSheet.setFrozenRows(1);

      // ヘッダー行にフィルタを設定
      const headerRange = inspectionDataSheet.getRange(1, 1, 1, headers.length);
      headerRange.createFilter();

      // ヘッダー行を中央揃え・太字に設定
      headerRange.setHorizontalAlignment('center').setFontWeight('bold').setBackground('#f0f0f0');

      // シート全体にヒラギノ丸ゴ Proフォントを設定
      const wholeSheetRange = inspectionDataSheet.getRange(1, 1, 1000, headers.length);
      wholeSheetRange.setFontFamily('ヒラギノ丸ゴ Pro');

      // 各列のインデックスを取得
      const propertyNameIndex = headers.indexOf('物件名') + 1; // 2列目
      const roomNameIndex = headers.indexOf('部屋名') + 1; // 5列目
      const readingDateIndex = headers.indexOf('検針日時') + 1; // 6列目
      const warningFlagIndex = headers.indexOf('警告フラグ') + 1; // 7列目
      const stdDevIndex = headers.indexOf('標準偏差値') + 1; // 8列目
      const currentUsageIndex = headers.indexOf('今回使用量') + 1; // 9列目
      const currentReadingIndex = headers.indexOf('今回の指示数') + 1; // 10列目
      const previousReading1Index = headers.indexOf('前回指示数') + 1; // 11列目
      const previousReading2Index = headers.indexOf('前々回指示数') + 1; // 12列目
      const previousReading3Index = headers.indexOf('前々々回指示数') + 1; // 13列目
      const inspectionSkipIndex = headers.indexOf('検針不要') + 1; // 14列目
      const billingSkipIndex = headers.indexOf('請求不要') + 1; // 15列目

      // 特定の列を中央揃えに設定（データ行全体）
      const lastRow = 1000; // 十分な行数を設定

      if (propertyNameIndex > 0) {
        inspectionDataSheet
          .getRange(2, propertyNameIndex, lastRow, 1)
          .setHorizontalAlignment('center');
      }
      if (roomNameIndex > 0) {
        inspectionDataSheet.getRange(2, roomNameIndex, lastRow, 1).setHorizontalAlignment('center');
      }
      if (readingDateIndex > 0) {
        const dateRange = inspectionDataSheet.getRange(2, readingDateIndex, lastRow, 1);
        dateRange.setHorizontalAlignment('center');
        // 日付列の書式設定（yyyy-mm-dd形式）
        dateRange.setNumberFormat('yyyy-mm-dd');
      }
      if (warningFlagIndex > 0) {
        inspectionDataSheet
          .getRange(2, warningFlagIndex, lastRow, 1)
          .setHorizontalAlignment('center');
      }
      if (stdDevIndex > 0) {
        const stdDevRange = inspectionDataSheet.getRange(2, stdDevIndex, lastRow, 1);
        stdDevRange.setHorizontalAlignment('center');
        // 標準偏差列を整数表示に設定
        stdDevRange.setNumberFormat('0');
      }
      if (currentUsageIndex > 0) {
        const usageRange = inspectionDataSheet.getRange(2, currentUsageIndex, lastRow, 1);
        usageRange.setHorizontalAlignment('center');
        // 使用量列の書式設定
        usageRange.setNumberFormat('0');
      }
      if (currentReadingIndex > 0) {
        const readingRange = inspectionDataSheet.getRange(2, currentReadingIndex, lastRow, 1);
        readingRange.setHorizontalAlignment('center');
        // 指示数列の書式設定
        readingRange.setNumberFormat('0');
      }
      if (previousReading1Index > 0) {
        const prevRange1 = inspectionDataSheet.getRange(2, previousReading1Index, lastRow, 1);
        prevRange1.setHorizontalAlignment('center');
        prevRange1.setNumberFormat('0');
      }
      if (previousReading2Index > 0) {
        const prevRange2 = inspectionDataSheet.getRange(2, previousReading2Index, lastRow, 1);
        prevRange2.setHorizontalAlignment('center');
        prevRange2.setNumberFormat('0');
      }
      if (previousReading3Index > 0) {
        const prevRange3 = inspectionDataSheet.getRange(2, previousReading3Index, lastRow, 1);
        prevRange3.setHorizontalAlignment('center');
        prevRange3.setNumberFormat('0');
      }
      if (inspectionSkipIndex > 0) {
        const skipRange = inspectionDataSheet.getRange(2, inspectionSkipIndex, lastRow, 1);
        skipRange.setHorizontalAlignment('center');
        // 検針不要列の書式設定
        skipRange.setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(['', 'true', 'false'], true).build()
        );
      }
      if (billingSkipIndex > 0) {
        const billingRange = inspectionDataSheet.getRange(2, billingSkipIndex, lastRow, 1);
        billingRange.setHorizontalAlignment('center');
        // 請求不要列の書式設定（プルダウン）
        billingRange.setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(['', '●'], true).build()
        );
      }

      // 警告フラグ列の条件付き書式設定（「要確認」の場合オレンジ）
      if (warningFlagIndex > 0) {
        const warningRange = inspectionDataSheet.getRange(2, warningFlagIndex, lastRow, 1);
        const warningRule = SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo('要確認')
          .setBackground('#FFA500') // オレンジ色
          .setFontColor('#FFFFFF') // 白文字
          .setRanges([warningRange])
          .build();

        const conditionalFormatRules = inspectionDataSheet.getConditionalFormatRules();
        conditionalFormatRules.push(warningRule);
        inspectionDataSheet.setConditionalFormatRules(conditionalFormatRules);
      }

      // 検針不要列の条件付き書式設定（trueの場合グレー背景）
      if (inspectionSkipIndex > 0) {
        const skipRange = inspectionDataSheet.getRange(2, inspectionSkipIndex, lastRow, 1);
        const skipRule = SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo('true')
          .setBackground('#E0E0E0') // グレー色
          .setFontColor('#666666') // 暗いグレー文字
          .setRanges([skipRange])
          .build();

        const conditionalFormatRules = inspectionDataSheet.getConditionalFormatRules();
        conditionalFormatRules.push(skipRule);
        inspectionDataSheet.setConditionalFormatRules(conditionalFormatRules);
      }

      // 請求不要列の条件付き書式設定（●の場合行全体を薄黄色背景）
      if (billingSkipIndex > 0) {
        const fullRowRange = inspectionDataSheet.getRange(2, 1, lastRow, headers.length);
        const billingRule = SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(`=$O2="●"`) // O列（15列目）が●の場合
          .setBackground('#FFFACD') // 薄黄色
          .setRanges([fullRowRange])
          .build();

        const conditionalFormatRules = inspectionDataSheet.getConditionalFormatRules();
        conditionalFormatRules.push(billingRule);
        inspectionDataSheet.setConditionalFormatRules(conditionalFormatRules);
      }
    }

    // 既存のinspection_dataシートの標準偏差列を整数化する処理
    if (inspectionDataSheet) {
      try {
        const existingData = inspectionDataSheet.getDataRange().getValues();
        if (existingData.length > 1) {
          const headers = existingData[0];
          const stdDevIndex = headers.indexOf('標準偏差値');

          if (stdDevIndex !== -1) {
            Logger.log('既存の標準偏差列を整数化しています...');

            // 既存のデータ行の標準偏差数式を整数化
            for (let rowIndex = 2; rowIndex <= inspectionDataSheet.getLastRow(); rowIndex++) {
              const currentFormula = inspectionDataSheet
                .getRange(rowIndex, stdDevIndex + 1)
                .getFormula();

              // STDEV.S数式があり、まだROUND関数で囲まれていない場合は整数化
              if (
                currentFormula &&
                currentFormula.includes('STDEV.S') &&
                !currentFormula.includes('ROUND(STDEV.S')
              ) {
                const newFormula = currentFormula.replace(
                  /STDEV\.S\(([^)]+)\)/g,
                  'ROUND(STDEV.S($1),0)'
                );
                inspectionDataSheet.getRange(rowIndex, stdDevIndex + 1).setFormula(newFormula);
              }
            }
            Logger.log('既存の標準偏差列の整数化が完了しました');
          }
        }
      } catch (updateError) {
        Logger.log(`既存データの標準偏差列更新でエラー: ${updateError.message}`);
      }
    }

    // 物件マスタから物件情報を取得
    const propertyData = propertyMasterSheet.getDataRange().getValues().slice(1);
    const propertyMap = {};
    propertyData.forEach((row) => {
      const propertyId = String(row[0]).trim();
      const propertyName = String(row[1]).trim();
      if (propertyId && propertyName) {
        propertyMap[propertyId] = propertyName;
      }
    });

    // 部屋マスタからデータを取得してinspection_dataに追加（3列のみ取得）
    const roomData = roomMasterSheet
      .getRange(2, 1, roomMasterSheet.getLastRow() - 1, roomMasterSheet.getLastColumn())
      .getValues();
    const rmHeaders = roomMasterSheet
      .getRange(1, 1, 1, roomMasterSheet.getLastColumn())
      .getValues()[0];
    var rmStatusIdx = rmHeaders.indexOf('部屋ステータス');
    const newRows = [];

    roomData.forEach((row, index) => {
      const propertyId = String(row[0]).trim();
      const roomId = String(row[1]).trim();
      const roomName = String(row[2]).trim();
      var roomStatus =
        rmStatusIdx >= 0 && row[rmStatusIdx] ? String(row[rmStatusIdx]).trim() : 'normal';

      if (propertyId && roomId) {
        const propertyName = propertyMap[propertyId] || '';
        const rowNumber = inspectionDataSheet.getLastRow() + newRows.length + 1;

        // STDEV.S関数の数式を作成（標準偏差値列用、ROUND関数で整数に丸める）
        const stdDevFormula = `=IF(AND(K${rowNumber}<>"",L${rowNumber}<>"",M${rowNumber}<>""),ROUND(STDEV.S(K${rowNumber}:M${rowNumber}),0),"")`;

        // 今回使用量の計算式 = 今回指示数 - 前回指示数
        const usageFormula = `=IF(AND(J${rowNumber}<>"",K${rowNumber}<>""),J${rowNumber}-K${rowNumber},"")`;

        newRows.push([
          Utilities.getUuid(), // 記録ID
          propertyName, // 物件名
          propertyId, // 物件ID
          roomId, // 部屋ID
          roomName, // 部屋名
          '', // 検針日時
          '', // 警告フラグ
          stdDevFormula, // 標準偏差値
          usageFormula, // 今回使用量
          '', // 今回の指示数
          '', // 前回指示数
          '', // 前々回指示数
          '', // 前々々回指示数
          '', // 検針不要
          '', // 請求不要
          roomStatus, // 部屋ステータス
        ]);
      }
    });

    if (newRows.length > 0) {
      const nextRow = inspectionDataSheet.getLastRow() + 1;
      const targetRange = inspectionDataSheet.getRange(
        nextRow,
        1,
        newRows.length,
        newRows[0].length
      );

      // データを設定
      targetRange.setValues(newRows);

      // 追加されたデータ行にも詳細フォーマット設定を適用
      const headers = [
        '記録ID',
        '物件名',
        '物件ID',
        '部屋ID',
        '部屋名',
        '検針日時',
        '警告フラグ',
        '標準偏差値',
        '今回使用量',
        '今回の指示数',
        '前回指示数',
        '前々回指示数',
        '前々々回指示数',
        '検針不要',
        '請求不要',
      ];

      const propertyNameIndex = headers.indexOf('物件名') + 1;
      const roomNameIndex = headers.indexOf('部屋名') + 1;
      const readingDateIndex = headers.indexOf('検針日時') + 1;
      const warningFlagIndex = headers.indexOf('警告フラグ') + 1;
      const stdDevIndex = headers.indexOf('標準偏差値') + 1;
      const currentUsageIndex = headers.indexOf('今回使用量') + 1;
      const currentReadingIndex = headers.indexOf('今回の指示数') + 1;
      const previousReading1Index = headers.indexOf('前回指示数') + 1;
      const previousReading2Index = headers.indexOf('前々回指示数') + 1;
      const previousReading3Index = headers.indexOf('前々々回指示数') + 1;
      const inspectionSkipIndex = headers.indexOf('検針不要') + 1;
      const billingSkipIndex = headers.indexOf('請求不要') + 1;

      // 新しく追加した行の詳細フォーマット設定
      for (let i = 0; i < newRows.length; i++) {
        const currentRow = nextRow + i;

        if (propertyNameIndex > 0) {
          inspectionDataSheet
            .getRange(currentRow, propertyNameIndex)
            .setHorizontalAlignment('center');
        }
        if (roomNameIndex > 0) {
          inspectionDataSheet.getRange(currentRow, roomNameIndex).setHorizontalAlignment('center');
        }
        if (readingDateIndex > 0) {
          const dateCell = inspectionDataSheet.getRange(currentRow, readingDateIndex);
          dateCell.setHorizontalAlignment('center');
          dateCell.setNumberFormat('yyyy-mm-dd');
        }
        if (warningFlagIndex > 0) {
          inspectionDataSheet
            .getRange(currentRow, warningFlagIndex)
            .setHorizontalAlignment('center');
        }
        if (stdDevIndex > 0) {
          const stdDevCell = inspectionDataSheet.getRange(currentRow, stdDevIndex);
          stdDevCell.setHorizontalAlignment('center');
          stdDevCell.setNumberFormat('0');
        }
        if (currentUsageIndex > 0) {
          const usageCell = inspectionDataSheet.getRange(currentRow, currentUsageIndex);
          usageCell.setHorizontalAlignment('center');
          usageCell.setNumberFormat('0');
        }
        if (currentReadingIndex > 0) {
          const readingCell = inspectionDataSheet.getRange(currentRow, currentReadingIndex);
          readingCell.setHorizontalAlignment('center');
          readingCell.setNumberFormat('0');
        }
        if (previousReading1Index > 0) {
          const prevCell1 = inspectionDataSheet.getRange(currentRow, previousReading1Index);
          prevCell1.setHorizontalAlignment('center');
          prevCell1.setNumberFormat('0');
        }
        if (previousReading2Index > 0) {
          const prevCell2 = inspectionDataSheet.getRange(currentRow, previousReading2Index);
          prevCell2.setHorizontalAlignment('center');
          prevCell2.setNumberFormat('0');
        }
        if (previousReading3Index > 0) {
          const prevCell3 = inspectionDataSheet.getRange(currentRow, previousReading3Index);
          prevCell3.setHorizontalAlignment('center');
          prevCell3.setNumberFormat('0');
        }
        if (inspectionSkipIndex > 0) {
          const skipCell = inspectionDataSheet.getRange(currentRow, inspectionSkipIndex);
          skipCell.setHorizontalAlignment('center');
          skipCell.setDataValidation(
            SpreadsheetApp.newDataValidation()
              .requireValueInList(['', 'true', 'false'], true)
              .build()
          );
        }
        if (billingSkipIndex > 0) {
          const billingCell = inspectionDataSheet.getRange(currentRow, billingSkipIndex);
          billingCell.setHorizontalAlignment('center');
          billingCell.setDataValidation(
            SpreadsheetApp.newDataValidation().requireValueInList(['', '●'], true).build()
          );
        }
      }
    }

    Logger.log(`初期検針データ作成完了: ${newRows.length}件`);
    const message = `初期検針データの作成が完了しました。\n作成件数: ${newRows.length}件\n\n設定済み機能:\n• シート固定行設定\n• ヘッダーフィルタ\n• 中央揃え・数値フォーマット\n• 警告フラグ条件付き書式\n• 検針不要列条件付き書式\n• 請求不要列条件付き書式（●選択時に行全体が薄黄色）\n• 標準偏差値自動計算（整数）\n• 今回使用量自動計算\n• 検針不要列のデータ検証\n• 請求不要列のプルダウン（空白・●）\n• 日付・数値列の詳細フォーマット`;
    if (typeof safeAlert === 'function') {
      safeAlert('完了', message);
    }

    return { success: true, createdCount: newRows.length, message: message };
  } catch (error) {
    Logger.log(`❌ 初期検針データ作成中にエラーが発生: ${error.message}`);
    const errorMessage = `初期検針データ作成中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * 月次検針データ処理
 * 現在のデータをアーカイブし、新しい月の検針に向けてデータをリセット
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} 処理結果
 */
function processInspectionDataMonthlyImpl(ss, params) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    }
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const sourceSheetName = 'inspection_data';
  const sourceSheet = ss.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    const error = `${sourceSheetName} シートが見つかりません。`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', error);
    }
    return { success: false, error: error };
  }

  let lockAcquired = false;
  function releaseLockIfHeld() {
    if (!lockAcquired) {
      return;
    }
    try {
      MonthlyProcessLock.releaseLock();
    } catch (lockError) {
      Logger.log(`ロック解除エラー: ${lockError.message}`);
    } finally {
      lockAcquired = false;
    }
  }

  try {
    var targetYear = params && params.targetYear;
    var targetMonth = params && params.targetMonth;
    if (!targetYear || !targetMonth) {
      var fallback = new Date();
      targetYear = fallback.getFullYear();
      targetMonth = String(fallback.getMonth() + 1).padStart(2, '0');
    }
    var newSheetName = '検針データ_' + targetYear + '年';

    // 📝 処理開始ログ
    MonthlyProcessLogger.addLog('INFO', '月次処理を開始しました', {
      targetMonth: targetYear + '年' + targetMonth + '月',
      archiveSheetName: newSheetName,
    });

    // 既存の年次シートがあるかチェックし、月の重複を確認
    var existingYearSheet = ss.getSheetByName(newSheetName);
    var isNewSheet = !existingYearSheet;
    if (existingYearSheet) {
      var yearSheetData = existingYearSheet.getDataRange().getValues();
      var yearSheetHeaders = yearSheetData[0];
      var monthColIdx = yearSheetHeaders.indexOf('月');
      if (monthColIdx !== -1) {
        for (var di = 1; di < yearSheetData.length; di++) {
          if (parseInt(yearSheetData[di][monthColIdx]) === parseInt(targetMonth)) {
            var dupInfo =
              newSheetName + ' に' + parseInt(targetMonth) + '月のデータが既に存在します。';
            if (typeof safeAlert === 'function') {
              safeAlert('情報', dupInfo);
            }
            return { success: false, error: dupInfo };
          }
        }
      }
    }

    // 🔒 重複実行防止チェック
    const lockStatus = MonthlyProcessLock.checkLock();
    if (lockStatus.isLocked) {
      const error =
        `月次処理が既に実行中です。\n\n` +
        `開始時刻: ${lockStatus.startTime}\n` +
        `実行ユーザー: ${lockStatus.user}\n` +
        `経過時間: ${lockStatus.duration}分\n\n` +
        `処理が完了するまでお待ちください。`;

      if (typeof safeAlert === 'function') {
        safeAlert('実行中', error);
      }
      return { success: false, error: '月次処理が既に実行中です' };
    }

    // ロック取得
    if (!MonthlyProcessLock.acquireLock()) {
      const error = 'システムロックの取得に失敗しました。しばらく待ってから再実行してください。';
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }
    lockAcquired = true;

    // 🔍 事前チェック実行
    Logger.log('月次処理事前チェックを実行中...');
    const preCheckResult = preCheckMonthlyProcess(ss);

    if (preCheckResult.error) {
      const error = `事前チェックでエラーが発生しました: ${preCheckResult.error}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      releaseLockIfHeld();
      return { success: false, error: error };
    }

    // 📊 処理詳細情報の表示
    const detailedInfo = generateProcessDetailedInfo(ss, preCheckResult);
    const shouldContinue = displayProcessDetailedInfo(detailedInfo, newSheetName);

    if (!shouldContinue) {
      MonthlyProcessLogger.addLog('INFO', 'ユーザーにより月次処理がキャンセルされました');
      releaseLockIfHeld();
      return { success: false, error: 'ユーザーキャンセル' };
    }

    // 💾 バックアップ推奨ダイアログ
    const backupConfirmed = displayBackupRecommendation(detailedInfo);

    if (!backupConfirmed) {
      MonthlyProcessLogger.addLog('INFO', 'バックアップ未確認により月次処理がキャンセルされました');
      releaseLockIfHeld();
      return { success: false, error: 'バックアップ未確認によるキャンセル' };
    }

    // 事前チェック完了ログ
    MonthlyProcessLogger.addLog('INFO', '事前チェックが完了しました', {
      success: preCheckResult.success,
      errorCount: preCheckResult.errorCount,
      warningCount: preCheckResult.warningCount,
      totalRecords: preCheckResult.detailedInfo?.totalRecords || 0,
      completedRecords: preCheckResult.detailedInfo?.completedRecords || 0,
    });

    // 事前チェックでエラーがある場合は処理を停止
    if (!preCheckResult.success) {
      const errorMessages = preCheckResult.checks
        .filter((check) => check.type === 'error')
        .map((check) => `• ${check.message}`)
        .join('\n');

      MonthlyProcessLogger.addLog('ERROR', '事前チェックで問題が検出されました', {
        errors: preCheckResult.checks.filter((check) => check.type === 'error'),
      });

      const error = `月次処理を実行できません。以下の問題を解決してください:\n\n${errorMessages}`;
      if (typeof safeAlert === 'function') {
        safeAlert('実行不可', error);
      }
      releaseLockIfHeld();
      return { success: false, error: '事前チェックで問題が検出されました' };
    }

    // ユーザーに確認ダイアログを表示（ライブラリでは自動実行）
    let userConfirmed = true; // デフォルトで処理続行
    try {
      // UIが利用可能かチェック
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        // 詳細情報を含む最終確認ダイアログ
        let confirmMessage = '🚀 月次処理 最終確認\n\n';

        // 処理対象データサマリー
        confirmMessage += '📊 処理対象データ:\n';
        confirmMessage += `• 総件数: ${preCheckResult.detailedInfo.totalRecords.toLocaleString()}件\n`;
        confirmMessage += `• 完了済み: ${preCheckResult.detailedInfo.completedRecords.toLocaleString()}件\n`;
        confirmMessage += `• 未完了: ${preCheckResult.detailedInfo.pendingRecords.toLocaleString()}件\n`;
        if (preCheckResult.detailedInfo.skippedRecords > 0) {
          confirmMessage += `• 検針不要: ${preCheckResult.detailedInfo.skippedRecords.toLocaleString()}件\n`;
        }
        confirmMessage += `• データサイズ: ${preCheckResult.detailedInfo.dataSize}MB\n`;
        confirmMessage += `• 推定処理時間: ${preCheckResult.detailedInfo.estimatedProcessingTime}秒\n\n`;

        // 事前チェック結果
        confirmMessage += '✅ 事前チェック結果:\n';
        confirmMessage += `• 成功: ${preCheckResult.successCount}項目\n`;
        if (preCheckResult.warningCount > 0) {
          confirmMessage += `• 警告: ${preCheckResult.warningCount}項目\n`;
        }
        if (preCheckResult.infoCount > 0) {
          confirmMessage += `• 情報: ${preCheckResult.infoCount}項目\n`;
        }

        if (preCheckResult.hasWarnings) {
          confirmMessage += '\n⚠️  注意事項がありますが、実行可能です。\n';
        } else {
          confirmMessage += '\n✅ 全てのチェックに合格しました。\n';
        }

        // 実行処理の詳細
        confirmMessage += '\n🔄 実行される処理:\n';
        confirmMessage += `1. アーカイブ作成: 「${newSheetName}」\n`;
        confirmMessage += '2. 検針データのリセット\n';
        confirmMessage += '   • 今回指示数 → 前回指示数\n';
        confirmMessage += '   • 前回指示数 → 前々回指示数\n';
        confirmMessage += '   • 前々回指示数 → 前々々回指示数\n';
        confirmMessage += '   • 今回指示数・検針日時・使用量・警告フラグクリア\n';
        confirmMessage += '3. 物件マスタの検針完了日クリア\n';
        confirmMessage += '   • 全物件の検針完了日をリセット\n\n';

        // 注意事項
        confirmMessage += '⚠️  重要な注意事項:\n';
        confirmMessage += '• この処理は元に戻すことができません\n';
        confirmMessage += '• 処理中は他の操作を行わないでください\n';
        confirmMessage += '• バックアップが作成されていることを確認済みです\n\n';

        confirmMessage += '🤔 月次処理を実行しますか？';

        const response = ui.alert('月次処理の実行確認', confirmMessage, ui.ButtonSet.YES_NO);
        userConfirmed = response === ui.Button.YES;
      }
    } catch (uiError) {
      // UIが利用できない場合（ライブラリ呼び出し時等）は確認なしで実行
      Logger.log('UI確認ダイアログをスキップしてライブラリ経由で実行');
      userConfirmed = true;
    }

    if (!userConfirmed) {
      MonthlyProcessLogger.addLog('WARN', 'ユーザーが最終確認で処理をキャンセルしました');

      const message = '月次処理をキャンセルしました。';
      if (typeof safeAlert === 'function') {
        safeAlert('キャンセル', message);
      }
      releaseLockIfHeld();
      return { success: false, error: message };
    }

    // 📝 ユーザー確認完了ログ
    MonthlyProcessLogger.addLog('INFO', 'ユーザー確認が完了し、月次処理を開始します');

    // 新しいシートを作成（または既存シートを取得）
    let newSheet;
    try {
      if (isNewSheet) {
        newSheet = ss.insertSheet(newSheetName);
      } else {
        newSheet = existingYearSheet;
      }
    } catch (sheetError) {
      const error = `シート「${newSheetName}」の取得/作成に失敗しました: ${sheetError.message}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      releaseLockIfHeld();
      return { success: false, error: error };
    }

    // ソースデータを取得
    let sourceValues, sourceHeaders;
    try {
      const dataRange = sourceSheet.getDataRange();
      if (dataRange.getNumRows() < 1) {
        const error = 'inspection_dataシートにデータがありません。';
        if (typeof safeAlert === 'function') {
          safeAlert('エラー', error);
        }
        // 作成したシートを削除（新規作成時のみ）
        if (isNewSheet) ss.deleteSheet(newSheet);
        releaseLockIfHeld();
        return { success: false, error: error };
      }

      sourceValues = dataRange.getValues();
      sourceHeaders = sourceValues[0];

      if (!sourceHeaders || sourceHeaders.length === 0) {
        const error = 'inspection_dataシートのヘッダーが見つかりません。';
        if (typeof safeAlert === 'function') {
          safeAlert('エラー', error);
        }
        // 作成したシートを削除（新規作成時のみ）
        if (isNewSheet) ss.deleteSheet(newSheet);
        releaseLockIfHeld();
        return { success: false, error: error };
      }
    } catch (dataError) {
      const error = `データ取得中にエラーが発生しました: ${dataError.message}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      // 作成したシートを削除（新規作成時のみ）
      if (newSheet && isNewSheet) {
        try {
          ss.deleteSheet(newSheet);
        } catch (deleteError) {
          Logger.log(`シート削除エラー: ${deleteError.message}`);
        }
      }
      releaseLockIfHeld();
      return { success: false, error: error };
    }

    // 必要な列のインデックスを取得
    const columnsToCopy = [
      '月',
      '記録ID',
      '物件名',
      '物件ID',
      '部屋ID',
      '部屋名',
      '検針日時',
      '警告フラグ',
      '標準偏差値',
      '今回使用量',
      '今回の指示数',
      '前回指示数',
      '前々回指示数',
      '前々々回指示数',
      '検針不要',
      '請求不要',
      '部屋ステータス',
    ];
    const columnIndicesToCopy = columnsToCopy.map((header) =>
      header === '月' ? -2 : sourceHeaders.indexOf(header)
    );

    // 必要な列が見つからない場合はエラー（'月'はソースに存在しないため除外）
    if (columnIndicesToCopy.some((index, i) => index === -1 && columnsToCopy[i] !== '月')) {
      const missingColumns = columnsToCopy.filter(
        (_, i) => columnIndicesToCopy[i] === -1 && columnsToCopy[i] !== '月'
      );
      const error = `必要な列が見つかりません: ${missingColumns.join(', ')}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      // 作成したシートを削除（新規作成時のみ）
      if (isNewSheet) {
        try {
          ss.deleteSheet(newSheet);
        } catch (deleteError) {
          Logger.log(`シート削除エラー: ${deleteError.message}`);
        }
      }
      releaseLockIfHeld();
      return { success: false, error: error };
    }

    // 新しいシートにデータをコピー
    try {
      var dataToCopyToNewSheet = sourceValues.map(function (row, rowIndex) {
        var mappedRow = columnIndicesToCopy.map(function (index, colIdx) {
          if (columnsToCopy[colIdx] === '月') {
            return rowIndex === 0 ? '月' : parseInt(targetMonth);
          }
          return row[index];
        });
        return mappedRow;
      });

      if (dataToCopyToNewSheet.length > 0) {
        if (isNewSheet) {
          // 新規シート: ヘッダー+データを先頭から書き込み
          var targetRange = newSheet.getRange(
            1,
            1,
            dataToCopyToNewSheet.length,
            columnsToCopy.length
          );
          targetRange.setValues(dataToCopyToNewSheet);
        } else {
          // 既存シート: データ行のみ（ヘッダー除く）を末尾に追記
          var dataRowsOnly = dataToCopyToNewSheet.slice(1);
          if (dataRowsOnly.length > 0) {
            var lastRow = newSheet.getLastRow();
            var appendRange = newSheet.getRange(
              lastRow + 1,
              1,
              dataRowsOnly.length,
              columnsToCopy.length
            );
            appendRange.setValues(dataRowsOnly);
          }
        }

        // ヘッダー行の書式設定
        var headerRange = newSheet.getRange(1, 1, 1, columnsToCopy.length);
        headerRange.setFontWeight('bold').setBackground('#f0f0f0').setHorizontalAlignment('center');

        // 📝 アーカイブ作成完了ログ
        MonthlyProcessLogger.addLog('INFO', 'アーカイブシートの作成が完了しました', {
          sheetName: newSheetName,
          totalRows: dataToCopyToNewSheet.length,
          totalColumns: columnsToCopy.length,
        });
      }
    } catch (copyError) {
      const error = `データコピー中にエラーが発生しました: ${copyError.message}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      // 作成したシートを削除（新規作成時のみ）
      if (isNewSheet) {
        try {
          ss.deleteSheet(newSheet);
        } catch (deleteError) {
          Logger.log(`シート削除エラー: ${deleteError.message}`);
        }
      }
      releaseLockIfHeld();
      return { success: false, error: error };
    }

    // ========================================
    // 🔄 リセット処理を実行
    // ========================================

    // リセット前にバックアップシートを作成
    let preResetBackupSheetName = null;
    try {
      const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
      preResetBackupSheetName = `inspection_data_pre_reset_${timestamp}`;
      const backupSheet = ss.insertSheet(preResetBackupSheetName);
      const sourceDataForBackup = sourceSheet.getDataRange().getValues();
      if (sourceDataForBackup.length > 0) {
        backupSheet
          .getRange(1, 1, sourceDataForBackup.length, sourceDataForBackup[0].length)
          .setValues(sourceDataForBackup);
      }
      // バックアップ成功確認
      const verifyData = backupSheet.getDataRange().getValues();
      if (verifyData.length !== sourceDataForBackup.length) {
        throw new Error(
          `バックアップ検証失敗: 期待行数=${sourceDataForBackup.length}, 実際=${verifyData.length}`
        );
      }
      Logger.log(
        `リセット前バックアップ作成完了: ${preResetBackupSheetName} (${verifyData.length}行)`
      );
    } catch (backupError) {
      Logger.log(`⚠️ リセット前バックアップ作成エラー: ${backupError.message}`);
      // バックアップ失敗時は処理を中止して安全側に倒す
      if (typeof safeAlert === 'function') {
        safeAlert(
          'エラー',
          `バックアップ作成に失敗したためリセットを中止します: ${backupError.message}`
        );
      }
      releaseLockIfHeld();
      return { success: false, error: `バックアップ作成失敗: ${backupError.message}` };
    }

    // 各列のインデックスを取得
    const currentReadingIndex = sourceHeaders.indexOf('今回の指示数');
    const previousReading1Index = sourceHeaders.indexOf('前回指示数');
    const previousReading2Index = sourceHeaders.indexOf('前々回指示数');
    const previousReading3Index = sourceHeaders.indexOf('前々々回指示数');
    const readingDateIndex = sourceHeaders.indexOf('検針日時');
    const currentUsageIndex = sourceHeaders.indexOf('今回使用量');
    const inspectionSkipIndex = sourceHeaders.indexOf('検針不要');
    const warningFlagIndex = sourceHeaders.indexOf('警告フラグ');

    if (
      currentReadingIndex === -1 ||
      previousReading1Index === -1 ||
      previousReading2Index === -1 ||
      previousReading3Index === -1
    ) {
      const error = '検針値の列が見つかりません。リセット処理をスキップします。';
      Logger.log(`月次検針データ保存完了（リセットなし）: ${newSheetName}`);
      const message = `月次検針データの保存が完了しました。\nシート名: ${newSheetName}\n※リセット処理はスキップされました。`;
      if (typeof safeAlert === 'function') {
        safeAlert('完了', message);
      }
      releaseLockIfHeld();
      return { success: true, archiveSheet: newSheetName, resetCount: 0, message: message };
    }

    // データ行を更新（ヘッダー行は除く）
    let resetCount = 0;
    try {
      for (let rowIndex = 1; rowIndex < sourceValues.length; rowIndex++) {
        const row = sourceValues[rowIndex];

        const skipInspection =
          inspectionSkipIndex !== -1 &&
          (String(row[inspectionSkipIndex]).toLowerCase() === 'true' ||
            String(row[inspectionSkipIndex]) === '1' ||
            String(row[inspectionSkipIndex]) === 'はい');

        if (skipInspection) {
          Logger.log(`行${rowIndex + 1}: 検針不要のためリセット処理をスキップ`);
          continue;
        }

        const currentReading = row[currentReadingIndex];
        const previousReading1 = row[previousReading1Index];
        const previousReading2 = row[previousReading2Index];

        if (currentReading && String(currentReading).trim() !== '') {
          sourceValues[rowIndex][previousReading3Index] = previousReading2;
          sourceValues[rowIndex][previousReading2Index] = previousReading1;
          sourceValues[rowIndex][previousReading1Index] = currentReading;
          sourceValues[rowIndex][currentReadingIndex] = '';
          if (readingDateIndex !== -1) sourceValues[rowIndex][readingDateIndex] = '';
          if (currentUsageIndex !== -1) {
            var usageFormula = sourceSheet
              .getRange(rowIndex + 1, currentUsageIndex + 1)
              .getFormula();
            if (!usageFormula) {
              sourceValues[rowIndex][currentUsageIndex] = '';
            }
          }
          if (warningFlagIndex !== -1) {
            sourceValues[rowIndex][warningFlagIndex] = '';
          }

          resetCount++;
        }
      }

      if (resetCount > 0) {
        var writeRange = sourceSheet.getRange(
          2,
          1,
          sourceValues.length - 1,
          sourceValues[0].length
        );
        writeRange.setValues(sourceValues.slice(1));
        Logger.log('バッチ書き込み完了: ' + resetCount + '件のリセット');
      }
    } catch (resetError) {
      const error = `リセット処理中にエラーが発生しました: ${resetError.message}`;
      Logger.log(error);

      // ロールバック: バックアップからデータを復元
      if (preResetBackupSheetName) {
        try {
          Logger.log(`リセット前バックアップからロールバックを試行: ${preResetBackupSheetName}`);
          const backupSheet = ss.getSheetByName(preResetBackupSheetName);
          if (backupSheet) {
            const backupData = backupSheet.getDataRange().getValues();
            if (backupData.length > 0) {
              sourceSheet
                .getRange(1, 1, backupData.length, backupData[0].length)
                .setValues(backupData);
              Logger.log('✅ ロールバック成功: inspection_dataを復元しました');
            }
          }
        } catch (rollbackError) {
          Logger.log(
            `❌ ロールバック失敗: ${rollbackError.message} — バックアップシート ${preResetBackupSheetName} を手動で確認してください`
          );
        }
      }

      // リセット処理でエラーが発生してもアーカイブは成功しているので部分的成功として扱う
      const partialMessage = `月次処理が部分的に完了しました。\n\n📂 アーカイブ: ${newSheetName}\n🔄 リセット件数: ${resetCount}件\n⚠️ 警告: リセット処理中にエラーが発生しました`;
      if (typeof safeAlert === 'function') {
        safeAlert('警告', partialMessage);
      }
      releaseLockIfHeld();
      return {
        success: true,
        archiveSheet: newSheetName,
        resetCount: resetCount,
        message: partialMessage,
        warning: error,
      };
    }

    Logger.log(`月次検針データ保存・リセット完了: ${newSheetName}, リセット件数: ${resetCount}`);

    // ========================================
    // 🏢 物件マスタの検針完了日クリア処理
    // ========================================

    let propertyCompletionClearCount = 0;
    let propertyProcessingError = null;

    try {
      MonthlyProcessLogger.addLog('INFO', '物件マスタの検針完了日クリア処理を開始しました');

      const propertyMasterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);

      if (propertyMasterSheet) {
        const propertyDataRange = propertyMasterSheet.getDataRange();

        if (propertyDataRange.getNumRows() > 1) {
          const propertyData = propertyDataRange.getValues();
          const propertyHeaders = propertyData[0];
          const completionDateIndex = propertyHeaders.indexOf('検針完了日');

          if (completionDateIndex !== -1) {
            // 検針完了日列が存在する場合、全ての物件の検針完了日をクリア
            for (let rowIndex = 1; rowIndex < propertyData.length; rowIndex++) {
              try {
                const currentCompletionDate = propertyData[rowIndex][completionDateIndex];

                // 空でない検針完了日のみクリア対象とする
                if (currentCompletionDate && String(currentCompletionDate).trim() !== '') {
                  propertyMasterSheet.getRange(rowIndex + 1, completionDateIndex + 1).setValue('');
                  propertyCompletionClearCount++;
                }
              } catch (cellError) {
                Logger.log(
                  `物件マスタ行${rowIndex + 1}の検針完了日クリアでエラー: ${cellError.message}`
                );
                // 個別の行でエラーが発生しても処理を続行
              }
            }

            MonthlyProcessLogger.addLog('INFO', '物件マスタの検針完了日クリア処理が完了しました', {
              clearedCount: propertyCompletionClearCount,
              totalRows: propertyData.length - 1,
            });

            Logger.log(`物件マスタ検針完了日クリア完了: ${propertyCompletionClearCount}件`);
          } else {
            Logger.log('物件マスタに「検針完了日」列が見つかりません。スキップします。');
            MonthlyProcessLogger.addLog(
              'WARN',
              '物件マスタに「検針完了日」列が見つかりませんでした'
            );
          }
        } else {
          Logger.log('物件マスタにデータがありません。スキップします。');
          MonthlyProcessLogger.addLog('WARN', '物件マスタにデータがありませんでした');
        }
      } else {
        Logger.log('物件マスタシートが見つかりません。スキップします。');
        MonthlyProcessLogger.addLog('WARN', '物件マスタシートが見つかりませんでした');
      }
    } catch (propertyError) {
      propertyProcessingError = propertyError.message;
      Logger.log(`物件マスタ処理中にエラーが発生: ${propertyError.message}`);
      MonthlyProcessLogger.addLog('ERROR', '物件マスタ処理中にエラーが発生しました', {
        error: propertyError.message,
      });
      // 物件マスタ処理でエラーが発生してもinspection_data処理は成功しているので処理を継続
    }

    // 📝 処理完了ログ
    MonthlyProcessLogger.addLog('INFO', '月次処理が正常に完了しました', {
      archiveSheet: newSheetName,
      resetCount: resetCount,
      totalRecords: preCheckResult.detailedInfo?.totalRecords || 0,
      processingTime: Math.round(
        (new Date().getTime() -
          new Date(preCheckResult.detailedInfo?.startTime || Date.now()).getTime()) /
          1000
      ),
      warningFlagCleared: warningFlagIndex !== -1,
      propertyCompletionDateCleared: propertyCompletionClearCount,
      propertyProcessingError: propertyProcessingError,
    });

    let message =
      `月次処理が完了しました。\n\n` +
      `📂 アーカイブ: ${newSheetName}\n` +
      `🔄 リセット件数: ${resetCount}件\n`;

    if (propertyCompletionClearCount > 0) {
      message += `🏢 検針完了日クリア: ${propertyCompletionClearCount}件\n\n`;
    } else {
      message += `🏢 検針完了日クリア: 0件\n\n`;
    }

    message += `検針値が前月に移行され、警告フラグと検針完了日もクリアされました。\n新しい月の検針準備が整いました。`;

    if (propertyProcessingError) {
      message += `\n\n⚠️ 注意: 物件マスタ処理で問題が発生しました。詳細はログをご確認ください。`;
    }
    if (typeof safeAlert === 'function') {
      safeAlert('完了', message);
    }

    // 🔓 ロック解除（成功時）
    releaseLockIfHeld();

    return {
      success: true,
      archiveSheet: newSheetName,
      resetCount: resetCount,
      message: message,
    };
  } catch (error) {
    Logger.log(`❌ 月次検針データ保存・リセット中にエラーが発生: ${error.message}`);

    // 📝 エラーログ
    MonthlyProcessLogger.addLog('ERROR', '月次処理中に重大なエラーが発生しました', {
      error: error.message,
      stack: error.stack,
      errorType: error.name,
    });

    const errorMessage = `月次検針データ保存・リセット中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }

    // 🔓 ロック解除（エラー時）
    releaseLockIfHeld();

    return { success: false, error: errorMessage };
  }
}

/**
 * 処理詳細情報を生成
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト
 * @param {Object} preCheckResult - 事前チェック結果
 * @returns {Object} 詳細情報オブジェクト
 */
function generateProcessDetailedInfo(ss, preCheckResult, params) {
  try {
    var targetYear = params && params.targetYear;
    var targetMonth = params && params.targetMonth;
    if (!targetYear || !targetMonth) {
      var fallback = new Date();
      targetYear = fallback.getFullYear();
      targetMonth = String(fallback.getMonth() + 1).padStart(2, '0');
    }
    var currentDate = new Date();

    const detailedInfo = {
      processDate: currentDate.toISOString(),
      targetMonth: targetYear + '年' + targetMonth + '月',
      archiveSheetName: '検針データ_' + targetYear + '年 の ' + targetMonth + '月分',
      dataInfo: preCheckResult.detailedInfo || {},
      riskAssessment: calculateProcessRisk(preCheckResult),
      impactAnalysis: analyzeProcessImpact(ss),
      estimatedTime: estimateProcessingTime(preCheckResult.detailedInfo || {}),
      recommendations: generateRecommendations(preCheckResult),
    };

    return detailedInfo;
  } catch (error) {
    console.error('詳細情報生成エラー:', error);
    return {
      error: error.message,
      processDate: new Date().toISOString(),
      targetMonth: 'エラー',
    };
  }
}

/**
 * 処理詳細情報を表示
 * @param {Object} detailedInfo - 詳細情報
 * @param {string} sheetName - 作成予定シート名
 * @returns {boolean} 続行可能か
 */
function displayProcessDetailedInfo(detailedInfo, sheetName) {
  try {
    let message = '📊 月次処理詳細情報\n\n';

    message += `🎯 処理対象: ${detailedInfo.targetMonth}\n`;
    message += `📁 作成シート: ${sheetName}\n`;
    message += `📅 実行予定日時: ${new Date(detailedInfo.processDate).toLocaleString('ja-JP')}\n\n`;

    if (detailedInfo.dataInfo) {
      message += '📈 データ情報:\n';
      message += `• 総件数: ${(detailedInfo.dataInfo.totalRecords || 0).toLocaleString()}件\n`;
      message += `• 完了済み: ${(detailedInfo.dataInfo.completedRecords || 0).toLocaleString()}件\n`;
      message += `• 未完了: ${(detailedInfo.dataInfo.pendingRecords || 0).toLocaleString()}件\n`;
      if (detailedInfo.dataInfo.skippedRecords > 0) {
        message += `• 検針不要: ${detailedInfo.dataInfo.skippedRecords.toLocaleString()}件\n`;
      }
      message += `• データサイズ: ${detailedInfo.dataInfo.dataSize || 0}MB\n\n`;
    }

    if (detailedInfo.riskAssessment) {
      const risk = detailedInfo.riskAssessment;
      message += `⚠️  リスク評価: ${risk.level || 'UNKNOWN'} (スコア: ${risk.score || 0})\n`;
      message += `• データ整合性: ${risk.dataIntegrity || 'UNKNOWN'}\n`;
      message += `• 処理複雑性: ${risk.complexity || 'UNKNOWN'}\n\n`;
    }

    if (detailedInfo.estimatedTime) {
      message += `⏱️  推定処理時間: ${detailedInfo.estimatedTime}秒\n\n`;
    }

    if (detailedInfo.recommendations && detailedInfo.recommendations.length > 0) {
      message += '💡 推奨事項:\n';
      detailedInfo.recommendations.forEach((rec) => {
        message += `• ${rec}\n`;
      });
      message += '\n';
    }

    message += 'この情報を確認して続行しますか？';

    // UI確認（利用可能な場合のみ）
    try {
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert('詳細情報確認', message, ui.ButtonSet.YES_NO);
      return response === ui.Button.YES;
    } catch (uiError) {
      // UIが利用できない場合は続行
      console.log('UI詳細確認をスキップ（ライブラリ呼び出し）');
      return true;
    }
  } catch (error) {
    console.error('詳細情報表示エラー:', error);
    return true; // エラー時は続行
  }
}

/**
 * 処理リスクを計算
 * @param {Object} preCheckResult - 事前チェック結果
 * @returns {Object} リスク評価
 */
function calculateProcessRisk(preCheckResult) {
  try {
    let riskScore = 0;
    let riskFactors = [];

    // エラー件数によるリスク
    if (preCheckResult.errorCount > 0) {
      riskScore += preCheckResult.errorCount * 3;
      riskFactors.push('データエラー検出');
    }

    // 警告件数によるリスク
    if (preCheckResult.warningCount > 0) {
      riskScore += preCheckResult.warningCount * 1;
      riskFactors.push('警告事項あり');
    }

    // データ量によるリスク
    const totalRecords = preCheckResult.detailedInfo?.totalRecords || 0;
    if (totalRecords > 10000) {
      riskScore += 2;
      riskFactors.push('大量データ処理');
    } else if (totalRecords > 5000) {
      riskScore += 1;
      riskFactors.push('中規模データ処理');
    }

    // リスクレベルの決定
    let riskLevel;
    if (riskScore >= 5) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 2) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    return {
      score: riskScore,
      level: riskLevel,
      factors: riskFactors,
      dataIntegrity: preCheckResult.success ? 'GOOD' : 'POOR',
      complexity: totalRecords > 5000 ? 'HIGH' : 'MEDIUM',
    };
  } catch (error) {
    console.error('リスク計算エラー:', error);
    return {
      score: 5,
      level: 'HIGH',
      factors: ['計算エラー'],
      dataIntegrity: 'UNKNOWN',
      complexity: 'UNKNOWN',
    };
  }
}

/**
 * 処理影響を分析
 * @param {Spreadsheet} ss - スプレッドシート
 * @returns {Object} 影響分析
 */
function analyzeProcessImpact(ss) {
  try {
    const analysis = {
      affectedSheets: ['inspection_data'],
      newSheetsCreated: 1,
      dataModified: true,
      backupRecommended: true,
      potentialIssues: [],
    };

    // 既存の月次シートをチェック
    const sheets = ss.getSheets();
    const monthlySheetCount = sheets.filter((sheet) =>
      sheet.getName().includes('検針データ_')
    ).length;

    if (monthlySheetCount > 10) {
      analysis.potentialIssues.push('多数の月次シートが存在（パフォーマンス影響の可能性）');
    }

    return analysis;
  } catch (error) {
    console.error('影響分析エラー:', error);
    return {
      affectedSheets: ['inspection_data'],
      newSheetsCreated: 1,
      dataModified: true,
      backupRecommended: true,
      potentialIssues: ['分析エラーが発生'],
    };
  }
}

/**
 * 処理時間を推定
 * @param {Object} dataInfo - データ情報
 * @returns {number} 推定処理時間（秒）
 */
function estimateProcessingTime(dataInfo) {
  try {
    const totalRecords = dataInfo.totalRecords || 0;

    // レコード数に基づく推定（1000件あたり約3-5秒）
    let baseTime = Math.ceil(totalRecords / 1000) * 4;

    // 最小・最大時間の制限
    if (baseTime < 5) baseTime = 5;
    if (baseTime > 120) baseTime = 120;

    return baseTime;
  } catch (error) {
    console.error('処理時間推定エラー:', error);
    return 30; // デフォルト
  }
}

/**
 * 推奨事項を生成
 * @param {Object} preCheckResult - 事前チェック結果
 * @returns {Array} 推奨事項配列
 */
function generateRecommendations(preCheckResult) {
  const recommendations = [];

  try {
    if (!preCheckResult.success) {
      recommendations.push(
        '事前チェックでエラーが検出されています。修正してから実行してください。'
      );
    }

    if (preCheckResult.warningCount > 0) {
      recommendations.push('警告事項を確認し、必要に応じて対処してください。');
    }

    const totalRecords = preCheckResult.detailedInfo?.totalRecords || 0;
    if (totalRecords > 5000) {
      recommendations.push(
        '大量データのため、処理時間が長くなる可能性があります。時間に余裕をもって実行してください。'
      );
    }

    recommendations.push('処理前にスプレッドシートのバックアップを作成することを強く推奨します。');
    recommendations.push('処理中は他の操作を行わないでください。');

    return recommendations;
  } catch (error) {
    console.error('推奨事項生成エラー:', error);
    return ['エラーが発生しました。注意深く処理を実行してください。'];
  }
}

/**
 * バックアップ推奨ダイアログを表示
 * @param {Object} detailedInfo - 詳細情報
 * @returns {boolean} バックアップ確認済みか
 */
function displayBackupRecommendation(detailedInfo) {
  try {
    let message = '💾 バックアップの推奨\n\n';

    const riskLevel = detailedInfo.riskAssessment?.level || 'MEDIUM';

    if (riskLevel === 'HIGH') {
      message += '🚨 リスクレベル: HIGH\n';
      message += 'この処理は高リスクです。バックアップは必須です。\n\n';
    } else if (riskLevel === 'MEDIUM') {
      message += '⚠️  リスクレベル: MEDIUM\n';
      message += 'バックアップを強く推奨します。\n\n';
    } else {
      message += '✅ リスクレベル: LOW\n';
      message += 'バックアップを推奨します。\n\n';
    }

    message += '📋 バックアップ手順:\n';
    message += '1. ファイル → コピーを作成\n';
    message +=
      '2. 「月次処理前バックアップ_' + new Date().toLocaleDateString('ja-JP') + '」と命名\n';
    message += '3. 適切な場所に保存\n\n';

    message += 'バックアップを作成しましたか？\n';
    message += '（作成していない場合は「いいえ」を選択してバックアップを作成してください）';

    // UI確認（利用可能な場合のみ）
    try {
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert('バックアップ確認', message, ui.ButtonSet.YES_NO);
      return response === ui.Button.YES;
    } catch (uiError) {
      // UIが利用できない場合は確認済みとする
      console.log('UIバックアップ確認をスキップ（ライブラリ呼び出し）');
      return true;
    }
  } catch (error) {
    console.error('バックアップ推奨表示エラー:', error);
    return true; // エラー時は続行
  }
}

/**
 * 月次処理の事前チェックを実行
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト（任意）
 * @returns {Object} チェック結果オブジェクト
 */
function preCheckMonthlyProcess(ss = null) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    return {
      success: false,
      error: 'アクティブなスプレッドシートが見つかりません',
      checks: [],
    };
  }

  const checks = [];
  let hasErrors = false;
  let hasWarnings = false;

  try {
    // 基本シート存在チェック
    const requiredSheets = ['inspection_data', '物件マスタ', '部屋マスタ'];
    const missingSheets = [];

    requiredSheets.forEach((sheetName) => {
      if (!ss.getSheetByName(sheetName)) {
        missingSheets.push(sheetName);
        hasErrors = true;
      }
    });

    if (missingSheets.length > 0) {
      checks.push({
        type: 'error',
        category: 'シート存在確認',
        message: `必須シートが見つかりません: ${missingSheets.join(', ')}`,
        recommendation: 'システム管理者に連絡して、必須シートを復元してください。',
      });
    } else {
      checks.push({
        type: 'success',
        category: 'シート存在確認',
        message: '全ての必須シートが確認されました。',
        recommendation: null,
      });
    }

    // inspection_dataシートの詳細チェック
    const inspectionSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
    if (inspectionSheet) {
      const checkDataRange = inspectionSheet.getDataRange();
      if (checkDataRange.getNumRows() < 2) {
        checks.push({
          type: 'error',
          category: 'データ存在確認',
          message: 'inspection_dataシートにデータがありません。',
          recommendation: 'データ同期処理を実行してデータを生成してください。',
        });
        hasErrors = true;
      } else {
        const totalRecords = checkDataRange.getNumRows() - 1;
        checks.push({
          type: 'success',
          category: 'データ存在確認',
          message: `inspection_dataシートに ${totalRecords} 件のデータがあります。`,
          recommendation: null,
        });

        // 検針完了率チェック
        const values = checkDataRange.getValues();
        const inspectionHeaders = values[0];
        const currentReadingIndex = inspectionHeaders.indexOf('今回の指示数');
        const inspectionSkipIndex = inspectionHeaders.indexOf('検針不要');

        if (currentReadingIndex !== -1) {
          let completedCount = 0;
          let skippedCount = 0;
          let totalActiveRecords = 0;

          for (let i = 1; i < values.length; i++) {
            const row = values[i];

            // 「検針不要」チェック
            const skipInspection =
              inspectionSkipIndex !== -1 &&
              (String(row[inspectionSkipIndex]).toLowerCase() === 'true' ||
                String(row[inspectionSkipIndex]) === '1' ||
                String(row[inspectionSkipIndex]) === 'はい');

            if (skipInspection) {
              skippedCount++;
              continue;
            }

            totalActiveRecords++;
            const currentReading = row[currentReadingIndex];
            if (currentReading && String(currentReading).trim() !== '') {
              completedCount++;
            }
          }

          const completionRate =
            totalActiveRecords > 0 ? Math.round((completedCount / totalActiveRecords) * 100) : 0;

          if (completionRate < 100) {
            const incompleteCount = totalActiveRecords - completedCount;
            if (completionRate < 60) {
              checks.push({
                type: 'error',
                category: '検針完了率',
                message: `検針完了率が低すぎます: ${completionRate}% (${completedCount}/${totalActiveRecords})`,
                recommendation: `残り${incompleteCount}件の検針が必要です。検針不要の見直しやスケジュール調整を行ってください。`,
              });
              hasErrors = true;
            } else {
              checks.push({
                type: 'warning',
                category: '検針完了率',
                message: `一部の検針が未完了です: ${completionRate}% (${completedCount}/${totalActiveRecords})`,
                recommendation: `残り${incompleteCount}件について状況を確認し、問題なければ月次処理を続行できます。`,
              });
              hasWarnings = true;
            }
          } else {
            checks.push({
              type: 'success',
              category: '検針完了率',
              message: `全ての検針が完了しています: 100% (${completedCount}/${totalActiveRecords})`,
              recommendation: null,
            });
          }

          if (skippedCount > 0) {
            checks.push({
              type: 'info',
              category: '検針スキップ',
              message: `検針不要として設定されている件数: ${skippedCount}件`,
              recommendation: null,
            });
          }
        }

        // 必須列存在チェック（最小限のみ）
        const requiredColumns = ['物件ID', '部屋ID', '物件名', '部屋名', '今回の指示数'];

        // オプション列（警告のみ）
        const optionalColumns = [
          '記録ID',
          '検針日時',
          '今回使用量',
          '前回指示数',
          '前々回指示数',
          '前々々回指示数',
        ];

        const columnCheckValues = checkDataRange.getValues();
        const columnHeaders = columnCheckValues[0];
        const missingColumns = requiredColumns.filter((col) => columnHeaders.indexOf(col) === -1);

        // 必須列チェック
        if (missingColumns.length > 0) {
          checks.push({
            type: 'error',
            category: '必須列確認',
            message: `必須列が見つかりません: ${missingColumns.join(', ')}`,
            recommendation: 'システム管理者に連絡して、不足している列を追加してください。',
          });
          hasErrors = true;
        } else {
          checks.push({
            type: 'success',
            category: '必須列確認',
            message: '全ての必須列が確認されました。',
            recommendation: null,
          });
        }

        // オプション列チェック（警告のみ）
        const missingOptionalColumns = optionalColumns.filter(
          (col) => columnHeaders.indexOf(col) === -1
        );
        if (missingOptionalColumns.length > 0) {
          checks.push({
            type: 'info',
            category: 'オプション列確認',
            message: `推奨列が見つかりません: ${missingOptionalColumns.join(', ')}`,
            recommendation:
              '機能向上のため、これらの列の追加を検討してください。処理は続行可能です。',
          });
        }

        // データ整合性検証（緩和版）
        if (missingColumns.length === 0) {
          // 必須列が全て存在する場合のみチェック
          const propertyIdIndex = inspectionHeaders.indexOf('物件ID');
          const roomIdIndex = inspectionHeaders.indexOf('部屋ID');

          if (propertyIdIndex !== -1 && roomIdIndex !== -1) {
            let criticalErrorCount = 0;
            let warningCount = 0;
            const criticalRows = [];

            // 全行チェック
            const checkLimit = values.length;

            for (let i = 1; i < checkLimit; i++) {
              const row = values[i];
              const propertyId = String(row[propertyIdIndex]).trim();
              const roomId = String(row[roomIdIndex]).trim();

              // 空データのチェックのみ（必須）
              if (!propertyId || propertyId === '') {
                criticalErrorCount++;
                criticalRows.push(`行${i + 1}: 物件IDが空です`);
              }

              if (!roomId || roomId === '') {
                criticalErrorCount++;
                criticalRows.push(`行${i + 1}: 部屋IDが空です`);
              }

              // 形式チェックは警告のみに変更（処理続行可能）
              if (propertyId && !propertyId.startsWith('P')) {
                warningCount++;
              }

              if (roomId && !roomId.startsWith('R')) {
                warningCount++;
              }

              // 上限チェック（ログが長くなりすぎないよう）
              if (criticalRows.length >= 5) {
                if (i < checkLimit - 1) {
                  criticalRows.push('...(他にも問題が存在する可能性があります)');
                }
                break;
              }
            }

            // 重要なエラーがある場合のみエラーとする
            if (criticalErrorCount > 0) {
              checks.push({
                type: 'error',
                category: 'データ整合性',
                message: `必須データが不足している行が ${criticalErrorCount} 件見つかりました`,
                recommendation: '物件IDまたは部屋IDが空の行を修正してから再実行してください。',
                details: criticalRows,
              });
              hasErrors = true;
            }

            // 形式チェックは情報表示のみ
            if (warningCount > 0) {
              checks.push({
                type: 'info',
                category: 'データ形式情報',
                message: `ID形式が標準と異なる行が ${warningCount} 件あります（処理は継続可能）`,
                recommendation:
                  '標準形式（物件ID: P000001、部屋ID: R001）への統一を推奨しますが、処理は可能です。',
              });
            }

            // 問題がない場合
            if (criticalErrorCount === 0) {
              checks.push({
                type: 'success',
                category: 'データ整合性',
                message: '必須データは正常に設定されています。',
                recommendation: null,
              });
            }
          }
        }
      }
    }

    // 月次アーカイブシート重複チェック（年次シートの月列で判定）
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const yearSheetName = '検針データ_' + currentYear + '年';
    const yearSheet = ss.getSheetByName(yearSheetName);

    let monthAlreadyExists = false;
    if (yearSheet) {
      const yearSheetData = yearSheet.getDataRange().getValues();
      const yearHeaders = yearSheetData[0];
      const monthColIdx = yearHeaders.indexOf('月');
      if (monthColIdx !== -1) {
        for (let ri = 1; ri < yearSheetData.length; ri++) {
          if (parseInt(yearSheetData[ri][monthColIdx]) === currentMonth) {
            monthAlreadyExists = true;
            break;
          }
        }
      }
    }

    if (monthAlreadyExists) {
      checks.push({
        type: 'warning',
        category: 'アーカイブ重複',
        message: `当月のアーカイブデータが「${yearSheetName}」に既に存在します。`,
        recommendation:
          '重複実行の可能性があります。本当に月次処理を実行する必要があるか確認してください。',
      });
      hasWarnings = true;
    } else {
      checks.push({
        type: 'success',
        category: 'アーカイブ重複',
        message: '当月のアーカイブデータは存在しません。',
        recommendation: null,
      });
    }

    // 詳細情報の収集
    const detailedInfo = {
      totalRecords: 0,
      completedRecords: 0,
      skippedRecords: 0,
      pendingRecords: 0,
      dataSize: 0,
      estimatedProcessingTime: 0,
    };

    const detailInspectionSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
    if (detailInspectionSheet) {
      const detailDataRange = detailInspectionSheet.getDataRange();
      const detailInfoValues = detailDataRange.getValues();
      const detailHeaders = detailInfoValues[0];

      detailedInfo.totalRecords = detailInfoValues.length - 1; // ヘッダー行を除く
      detailedInfo.dataSize =
        Math.round((JSON.stringify(detailInfoValues).length / 1024 / 1024) * 100) / 100; // MB単位

      const currentReadingIndex = detailHeaders.indexOf('今回の指示数');
      const inspectionSkipIndex = detailHeaders.indexOf('検針不要');

      if (currentReadingIndex !== -1) {
        for (let i = 1; i < detailInfoValues.length; i++) {
          const row = detailInfoValues[i];
          const skipInspection =
            inspectionSkipIndex !== -1 &&
            (String(row[inspectionSkipIndex]).toLowerCase() === 'true' ||
              String(row[inspectionSkipIndex]) === '1' ||
              String(row[inspectionSkipIndex]) === 'はい');

          if (skipInspection) {
            detailedInfo.skippedRecords++;
          } else {
            const currentReading = row[currentReadingIndex];
            if (currentReading && String(currentReading).trim() !== '') {
              detailedInfo.completedRecords++;
            } else {
              detailedInfo.pendingRecords++;
            }
          }
        }
      }

      // 処理時間の推定（レコード数に基づく概算）
      detailedInfo.estimatedProcessingTime = Math.ceil(detailedInfo.totalRecords / 100) * 2; // 100件あたり2秒の概算
    }

    return {
      success: !hasErrors,
      hasWarnings: hasWarnings,
      totalChecks: checks.length,
      errorCount: checks.filter((c) => c.type === 'error').length,
      warningCount: checks.filter((c) => c.type === 'warning').length,
      successCount: checks.filter((c) => c.type === 'success').length,
      infoCount: checks.filter((c) => c.type === 'info').length,
      checks: checks,
      detailedInfo: detailedInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: `事前チェック中にエラーが発生しました: ${error.message}`,
      checks: [
        {
          type: 'error',
          category: 'システムエラー',
          message: error.message,
          recommendation: 'システム管理者に連絡してください。',
        },
      ],
    };
  }
}

/**
 * 月次処理事前チェック結果を表示する（内部実装）
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト（任意）
 */
function displayPreCheckResultsInternal(ss = null) {
  try {
    const checkResult = preCheckMonthlyProcess(ss);

    if (checkResult.error) {
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', checkResult.error);
      }
      return;
    }

    // 結果の整理
    const {
      success,
      hasWarnings,
      totalChecks,
      errorCount,
      warningCount,
      successCount,
      infoCount,
      checks,
      detailedInfo,
    } = checkResult;

    // メッセージの作成
    let message = `📋 月次処理事前チェック結果\n\n`;

    // 詳細情報の表示
    if (detailedInfo) {
      message += `📊 処理対象データ情報:\n`;
      message += `• 総レコード数: ${detailedInfo.totalRecords.toLocaleString()}件\n`;
      message += `• 検針完了: ${detailedInfo.completedRecords.toLocaleString()}件\n`;
      message += `• 検針未完了: ${detailedInfo.pendingRecords.toLocaleString()}件\n`;
      if (detailedInfo.skippedRecords > 0) {
        message += `• 検針不要: ${detailedInfo.skippedRecords.toLocaleString()}件\n`;
      }
      message += `• データサイズ: ${detailedInfo.dataSize}MB\n`;
      message += `• 推定処理時間: ${detailedInfo.estimatedProcessingTime}秒\n\n`;
    }

    message += `🔍 実行チェック項目: ${totalChecks}項目\n`;
    message += `✅ 成功: ${successCount}項目\n`;
    if (errorCount > 0) message += `❌ エラー: ${errorCount}項目\n`;
    if (warningCount > 0) message += `⚠️  警告: ${warningCount}項目\n`;
    if (infoCount > 0) message += `ℹ️  情報: ${infoCount}項目\n`;
    message += `\n`;

    // 総合判定
    if (success && !hasWarnings) {
      message += `✅ 総合判定: 月次処理を安全に実行できます\n\n`;
    } else if (success && hasWarnings) {
      message += `⚠️  総合判定: 注意事項がありますが実行可能です\n\n`;
    } else {
      message += `❌ 総合判定: エラーがあるため実行できません\n\n`;
    }

    // 詳細結果
    message += `📝 詳細結果:\n`;
    checks.forEach((check, index) => {
      const icon =
        check.type === 'error'
          ? '❌'
          : check.type === 'warning'
            ? '⚠️ '
            : check.type === 'success'
              ? '✅'
              : 'ℹ️ ';
      message += `${icon} [${check.category}] ${check.message}\n`;
      if (check.recommendation) {
        message += `   → ${check.recommendation}\n`;
      }
      if (check.details && check.details.length > 0) {
        message += `   詳細: ${check.details.join(', ')}\n`;
      }
      message += `\n`;
    });

    // アラート表示
    if (typeof safeAlert === 'function') {
      const title = success
        ? hasWarnings
          ? '事前チェック完了(警告あり)'
          : '事前チェック完了'
        : '事前チェック失敗';
      safeAlert(title, message);
    }

    return checkResult;
  } catch (error) {
    const errorMessage = `事前チェック表示中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }
    Logger.log(errorMessage);
  }
}

/**
 * 月次処理ログ管理クラス
 * 詳細なログ出力機能とパフォーマンス記録機能を提供
 */
class MonthlyProcessLogger {
  /**
   * ログエントリを追加
   * @param {string} level - ログレベル (INFO, WARN, ERROR, PERF)
   * @param {string} message - メッセージ
   * @param {Object} details - 詳細情報（オプション）
   */
  static addLog(level, message, details = {}) {
    try {
      const timestamp = new Date();
      const sessionId =
        PropertiesService.getScriptProperties().getProperty('monthly_process_session') ||
        Utilities.getUuid().substring(0, 8);

      const logEntry = {
        timestamp: timestamp.toISOString(),
        level: level,
        message: message,
        details: details,
        sessionId: sessionId,
        scriptId: ScriptApp.getScriptId(),
        user: Session.getActiveUser().getEmail() || 'unknown',
        executionContext: {
          timezone: Session.getScriptTimeZone(),
          locale: Session.getLocale(),
          authMode: ScriptApp.getAuthMode().toString(),
          triggerUid: ScriptApp.getTriggerUid() || null,
        },
      };

      // 既存のログを取得
      const existingLogs = this.getLogHistory(100) || [];

      // 新しいログを追加
      existingLogs.unshift(logEntry);

      // 最新100件のみ保持
      const trimmedLogs = existingLogs.slice(0, 100);

      // PropertiesServiceに保存
      PropertiesService.getScriptProperties().setProperty(
        'monthly_process_logs',
        JSON.stringify(trimmedLogs)
      );

      // 標準ログにも出力
      console.log(`[${level}] ${message}`, details);
    } catch (error) {
      console.error('ログ記録中にエラーが発生:', error.message);
    }
  }

  /**
   * ログ履歴を取得
   * @param {number} limit - 取得件数制限
   * @returns {Array} ログエントリの配列
   */
  static getLogHistory(limit = 50) {
    try {
      const logsJson = PropertiesService.getScriptProperties().getProperty('monthly_process_logs');
      if (!logsJson) return [];

      const logs = JSON.parse(logsJson);
      return limit > 0 ? logs.slice(0, limit) : logs;
    } catch (error) {
      console.error('ログ履歴取得中にエラーが発生:', error.message);
      return [];
    }
  }

  /**
   * ログ履歴をクリア
   */
  static clearLogHistory() {
    try {
      PropertiesService.getScriptProperties().deleteProperty('monthly_process_logs');
      this.addLog('INFO', 'ログ履歴がクリアされました');
      return true;
    } catch (error) {
      console.error('ログ履歴クリア中にエラーが発生:', error.message);
      return false;
    }
  }

  /**
   * パフォーマンス統計を生成
   * @param {number} limit - 対象ログ件数
   * @returns {Object} パフォーマンス統計
   */
  static generatePerformanceStats(limit = 100) {
    try {
      const logs = this.getLogHistory(limit);
      const perfLogs = logs.filter((log) => log.level === 'PERF');

      if (perfLogs.length === 0) {
        return {
          totalLogs: logs.length,
          perfLogs: 0,
          message: 'パフォーマンスログがありません',
        };
      }

      const stats = {
        totalLogs: logs.length,
        perfLogs: perfLogs.length,
        timeRange: {
          start: perfLogs[perfLogs.length - 1]?.timestamp || null,
          end: perfLogs[0]?.timestamp || null,
        },
        levelDistribution: {},
        averageMemoryUsage: 0,
        totalProcessingTime: 0,
        errorCount: logs.filter((log) => log.level === 'ERROR').length,
        warningCount: logs.filter((log) => log.level === 'WARN').length,
      };

      // レベル別分布
      logs.forEach((log) => {
        stats.levelDistribution[log.level] = (stats.levelDistribution[log.level] || 0) + 1;
      });

      // パフォーマンス指標の計算
      let totalMemory = 0;
      let totalTime = 0;
      let memoryCount = 0;
      let timeCount = 0;

      perfLogs.forEach((log) => {
        if (log.details?.memoryUsage) {
          totalMemory += log.details.memoryUsage;
          memoryCount++;
        }
        if (log.details?.duration) {
          totalTime += log.details.duration;
          timeCount++;
        }
      });

      stats.averageMemoryUsage =
        memoryCount > 0 ? Math.round((totalMemory / memoryCount) * 100) / 100 : 0;
      stats.totalProcessingTime = Math.round(totalTime * 100) / 100;

      return stats;
    } catch (error) {
      console.error('パフォーマンス統計生成中にエラーが発生:', error.message);
      return {
        error: error.message,
        totalLogs: 0,
        perfLogs: 0,
      };
    }
  }

  /**
   * メモリ使用量を推定
   * @returns {number} 推定メモリ使用量（MB）
   */
  static estimateMemoryUsage() {
    try {
      // Google Apps Scriptのメモリ使用量を推定（近似値）
      const logs = this.getLogHistory(10);
      const logDataSize = JSON.stringify(logs).length;
      const estimatedTotalMemory = logDataSize / 1024 / 1024; // MB単位

      return Math.round(estimatedTotalMemory * 100) / 100;
    } catch (error) {
      console.error('メモリ使用量推定中にエラーが発生:', error.message);
      return 0;
    }
  }
}

/**
 * 月次処理ロック管理クラス
 * 重複実行防止とロック状態管理機能を提供
 */
class MonthlyProcessLock {
  /**
   * ロックを取得
   * @returns {boolean} ロック取得成功
   */
  static acquireLock() {
    try {
      const currentTime = new Date();
      const sessionId = Utilities.getUuid().substring(0, 8);

      // ユーザー情報を安全に取得
      let user = 'unknown';
      try {
        user = Session.getActiveUser().getEmail() || 'unknown';
      } catch (userError) {
        console.log('ユーザー情報取得エラー（継続）:', userError.message);
      }

      // 既存ロックをチェックして自動解除処理
      const existingLock = this.checkLock();
      if (existingLock.isLocked) {
        const lockAge =
          (currentTime.getTime() - new Date(existingLock.startTime).getTime()) / (1000 * 60);
        if (lockAge > 60) {
          console.log('古いロックを自動解除します:', lockAge, '分経過');
          const releaseSuccess = this.releaseLock();
          if (!releaseSuccess) {
            console.error('古いロック解除に失敗');
            return false;
          }
          // 解除成功後、新しいロック取得処理に進む
        } else {
          // 有効なロックが存在するため取得失敗
          console.log('有効なロックが存在:', lockAge, '分経過, ユーザー:', existingLock.user);
          return false;
        }
      }

      // 環境情報を安全に取得
      const environment = {};
      try {
        environment.timezone = Session.getScriptTimeZone();
        environment.locale = Session.getLocale();
        environment.scriptId = ScriptApp.getScriptId();
        environment.authMode = ScriptApp.getAuthMode().toString();
      } catch (envError) {
        console.log('環境情報取得エラー（継続）:', envError.message);
      }

      const lockInfo = {
        isLocked: true,
        sessionId: sessionId,
        startTime: currentTime.toISOString(),
        user: user,
        environment: environment,
      };

      // PropertiesServiceに安全に書き込み
      try {
        PropertiesService.getScriptProperties().setProperty(
          'monthly_process_lock',
          JSON.stringify(lockInfo)
        );
        PropertiesService.getScriptProperties().setProperty('monthly_process_session', sessionId);
      } catch (propertiesError) {
        console.error('プロパティ設定エラー:', propertiesError.message);
        return false;
      }

      // ロック取得成功後にログ記録（循環依存回避）
      try {
        console.log('プロセスロックを取得しました:', sessionId);
        // MonthlyProcessLoggerへの依存を避けて直接ログ
      } catch (logError) {
        // ログエラーは無視してロック取得は成功とする
        console.log('ログ記録エラー（無視）:', logError.message);
      }

      return true;
    } catch (error) {
      console.error('ロック取得中に予期しないエラーが発生:', error.message);
      return false;
    }
  }

  /**
   * ロック状態をチェック
   * @returns {Object} ロック状態情報
   */
  static checkLock() {
    try {
      const lockJson = PropertiesService.getScriptProperties().getProperty('monthly_process_lock');
      if (!lockJson) {
        return { isLocked: false };
      }

      const lockInfo = JSON.parse(lockJson);
      const currentTime = new Date();
      const startTime = new Date(lockInfo.startTime);
      const duration = Math.round((currentTime.getTime() - startTime.getTime()) / (1000 * 60)); // 分

      return {
        isLocked: lockInfo.isLocked || false,
        sessionId: lockInfo.sessionId || null,
        startTime: lockInfo.startTime || null,
        user: lockInfo.user || 'unknown',
        duration: duration,
        environment: lockInfo.environment || {},
      };
    } catch (error) {
      console.error('ロック状態確認中にエラーが発生:', error.message);
      return { isLocked: false, error: error.message };
    }
  }

  /**
   * ロックを解除
   * @returns {boolean} ロック解除成功
   */
  static releaseLock() {
    try {
      const lockStatus = this.checkLock();

      // PropertiesServiceから安全に削除
      const scriptProperties = PropertiesService.getScriptProperties();
      try {
        scriptProperties.deleteProperty('monthly_process_lock');
        scriptProperties.deleteProperty('monthly_process_session');
      } catch (propertiesError) {
        console.error('プロパティ削除エラー:', propertiesError.message);
        return false;
      }

      // ログ記録（循環依存回避）
      if (lockStatus.isLocked) {
        console.log(
          'プロセスロックを解除しました:',
          lockStatus.sessionId,
          '経過時間:',
          lockStatus.duration,
          '分'
        );
        // MonthlyProcessLoggerへの依存を避けて直接ログ
      }

      return true;
    } catch (error) {
      console.error('ロック解除中に予期しないエラーが発生:', error.message);
      return false;
    }
  }

  /**
   * 詳細なロック状態を表示
   * @returns {Object} 表示結果
   */
  static displayDetailedLockStatus() {
    try {
      const lockStatus = this.checkLock();

      let message = '🔒 月次処理ロック状態\n\n';

      if (lockStatus.isLocked) {
        message += '❌ ロック中\n\n';
        message += `📅 開始時刻: ${new Date(lockStatus.startTime).toLocaleString('ja-JP')}\n`;
        message += `⏱️  経過時間: ${lockStatus.duration}分\n`;
        message += `👤 実行ユーザー: ${lockStatus.user}\n`;
        message += `🆔 セッションID: ${lockStatus.sessionId}\n`;

        if (lockStatus.environment) {
          message += `🌐 環境情報:\n`;
          message += `  • タイムゾーン: ${lockStatus.environment.timezone}\n`;
          message += `  • ロケール: ${lockStatus.environment.locale}\n`;
        }

        // リスクレベル評価
        const riskLevel =
          lockStatus.duration > 30 ? 'HIGH' : lockStatus.duration > 15 ? 'MEDIUM' : 'LOW';
        message += `⚠️  リスクレベル: ${riskLevel}\n`;

        if (lockStatus.duration > 60) {
          message += `\n🚨 注意: 古いロック（${lockStatus.duration}分）が検出されました。\n`;
          message += `強制解除を検討してください。`;
        }
      } else {
        message += '✅ ロックされていません\n\n';
        message += '月次処理を安全に実行できます。';
      }

      if (typeof safeAlert === 'function') {
        safeAlert('ロック状態確認', message);
      }

      return {
        success: true,
        isLocked: lockStatus.isLocked,
        details: lockStatus,
        message: message,
      };
    } catch (error) {
      const errorMessage = `ロック状態表示中にエラーが発生: ${error.message}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', errorMessage);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * 安全な強制ロック解除
   * @returns {Object} 解除結果
   */
  static safeForceReleaseLock() {
    try {
      const lockStatus = this.checkLock();

      if (!lockStatus.isLocked) {
        const message = 'ロックされていないため、解除の必要がありません。';
        if (typeof safeAlert === 'function') {
          safeAlert('情報', message);
        }
        return { success: true, message: message, action: 'no_action_needed' };
      }

      // リスク評価
      const riskLevel =
        lockStatus.duration > 30 ? 'HIGH' : lockStatus.duration > 15 ? 'MEDIUM' : 'LOW';

      let confirmMessage = '🚨 強制ロック解除の確認\n\n';
      confirmMessage += `現在のロック情報:\n`;
      confirmMessage += `• 開始時刻: ${new Date(lockStatus.startTime).toLocaleString('ja-JP')}\n`;
      confirmMessage += `• 経過時間: ${lockStatus.duration}分\n`;
      confirmMessage += `• 実行ユーザー: ${lockStatus.user}\n`;
      confirmMessage += `• リスクレベル: ${riskLevel}\n\n`;

      if (riskLevel === 'HIGH') {
        confirmMessage += '⚠️  古いロックのため、安全に解除できます。\n\n';
      } else if (riskLevel === 'MEDIUM') {
        confirmMessage += '⚠️  実行中の可能性があります。注意が必要です。\n\n';
      } else {
        confirmMessage += '⚠️  最近開始されたロックです。実行中の可能性が高いです。\n\n';
      }

      confirmMessage += '強制解除しますか？\n';
      confirmMessage += '（実行中の処理がある場合、データの不整合が発生する可能性があります）';

      // UI確認（利用可能な場合のみ）
      let userConfirmed = false;
      try {
        const ui = SpreadsheetApp.getUi();
        const response = ui.alert('強制ロック解除の確認', confirmMessage, ui.ButtonSet.YES_NO);
        userConfirmed = response === ui.Button.YES;
      } catch (uiError) {
        // UIが利用できない場合は、リスクレベルに基づいて自動判断
        userConfirmed = riskLevel === 'HIGH';
      }

      if (!userConfirmed) {
        const message = 'ユーザーにより強制解除がキャンセルされました。';
        return { success: false, message: message, action: 'user_cancelled' };
      }

      // 強制解除実行
      const releaseSuccess = this.releaseLock();

      if (releaseSuccess) {
        const message = '✅ ロックが正常に解除されました。';
        console.log(
          '強制ロック解除が実行されました - リスクレベル:',
          riskLevel,
          '前回ロック:',
          lockStatus.sessionId
        );
        // MonthlyProcessLoggerへの依存を避けて直接ログ

        if (typeof safeAlert === 'function') {
          safeAlert('解除完了', message);
        }

        return {
          success: true,
          message: message,
          action: 'force_released',
          previousLock: lockStatus,
        };
      } else {
        const message = 'ロック解除に失敗しました。システム管理者に連絡してください。';
        if (typeof safeAlert === 'function') {
          safeAlert('エラー', message);
        }
        return { success: false, message: message, action: 'release_failed' };
      }
    } catch (error) {
      const errorMessage = `強制ロック解除中にエラーが発生: ${error.message}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', errorMessage);
      }
      return { success: false, error: error.message, action: 'error_occurred' };
    }
  }
}

/**
 * 月次処理進捗管理クラス
 * リアルタイム進捗表示とステータス管理機能を提供
 */
class MonthlyProcessProgress {
  constructor() {
    this.sessionId = Utilities.getUuid();
    this.startTime = new Date();
    this.steps = [
      {
        id: 'precheck',
        name: '事前チェック',
        status: 'pending',
        progress: 0,
        startTime: null,
        endTime: null,
        duration: 0,
      },
      {
        id: 'backup',
        name: 'バックアップ確認',
        status: 'pending',
        progress: 0,
        startTime: null,
        endTime: null,
        duration: 0,
      },
      {
        id: 'archive',
        name: 'データアーカイブ',
        status: 'pending',
        progress: 0,
        startTime: null,
        endTime: null,
        duration: 0,
      },
      {
        id: 'reset',
        name: 'データリセット',
        status: 'pending',
        progress: 0,
        startTime: null,
        endTime: null,
        duration: 0,
      },
      {
        id: 'finalize',
        name: '処理完了',
        status: 'pending',
        progress: 0,
        startTime: null,
        endTime: null,
        duration: 0,
      },
    ];
    this.currentStepIndex = 0;
    this.overallProgress = 0;
    this.estimatedTotalTime = 0;
    this.isCompleted = false;
    this.hasErrors = false;
    this.errorMessage = '';
  }

  /**
   * 現在のステップを開始
   * @param {string} stepId - ステップID
   * @param {number} estimatedDuration - 推定所要時間（秒）
   */
  startStep(stepId, estimatedDuration = 0) {
    const step = this.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'running';
      step.startTime = new Date();
      step.estimatedDuration = estimatedDuration;
      this.currentStepIndex = this.steps.indexOf(step);

      // ログに記録
      MonthlyProcessLogger.addLog('PERF', `ステップ開始: ${step.name}`, {
        stepId: stepId,
        stepIndex: this.currentStepIndex,
        estimatedDuration: estimatedDuration,
        sessionId: this.sessionId,
      });

      this.updateOverallProgress();
      this.displayProgress();
    }
  }

  /**
   * 現在のステップの進捗を更新
   * @param {number} progress - 進捗（0-100）
   * @param {string} subStatus - サブステータスメッセージ
   */
  updateStepProgress(progress, subStatus = '') {
    if (this.currentStepIndex < this.steps.length) {
      const step = this.steps[this.currentStepIndex];
      step.progress = Math.max(0, Math.min(100, progress));
      step.subStatus = subStatus;

      this.updateOverallProgress();
      this.displayProgress();
    }
  }

  /**
   * 現在のステップを完了
   * @param {string} stepId - ステップID
   * @param {Object} result - 処理結果
   */
  completeStep(stepId, result = {}) {
    const step = this.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'completed';
      step.endTime = new Date();
      step.duration = (step.endTime.getTime() - step.startTime.getTime()) / 1000;
      step.progress = 100;
      step.result = result;

      // ログに記録
      MonthlyProcessLogger.addLog('PERF', `ステップ完了: ${step.name}`, {
        stepId: stepId,
        duration: step.duration,
        result: result,
        sessionId: this.sessionId,
      });

      this.updateOverallProgress();
      this.displayProgress();
    }
  }

  /**
   * ステップでエラーが発生
   * @param {string} stepId - ステップID
   * @param {string} errorMessage - エラーメッセージ
   */
  errorStep(stepId, errorMessage) {
    const step = this.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'error';
      step.endTime = new Date();
      step.duration = (step.endTime.getTime() - step.startTime.getTime()) / 1000;
      step.errorMessage = errorMessage;

      this.hasErrors = true;
      this.errorMessage = errorMessage;

      // エラーログに記録
      MonthlyProcessLogger.addLog('ERROR', `ステップエラー: ${step.name}`, {
        stepId: stepId,
        duration: step.duration,
        errorMessage: errorMessage,
        sessionId: this.sessionId,
      });

      this.displayProgress();
    }
  }

  /**
   * 全体の進捗を更新
   */
  updateOverallProgress() {
    const totalSteps = this.steps.length;
    let totalProgress = 0;

    this.steps.forEach((step, index) => {
      if (step.status === 'completed') {
        totalProgress += 100 / totalSteps;
      } else if (step.status === 'running') {
        totalProgress += step.progress / totalSteps;
      }
    });

    this.overallProgress = Math.round(totalProgress);
  }

  /**
   * 残り時間を推定
   * @returns {number} 推定残り時間（秒）
   */
  getEstimatedRemainingTime() {
    const completedSteps = this.steps.filter((s) => s.status === 'completed');
    const runningStep = this.steps.find((s) => s.status === 'running');

    if (completedSteps.length === 0 && !runningStep) {
      return this.estimatedTotalTime;
    }

    // 完了ステップの平均時間から推定
    const avgCompletedDuration =
      completedSteps.length > 0
        ? completedSteps.reduce((sum, step) => sum + step.duration, 0) / completedSteps.length
        : 30; // デフォルト30秒

    const remainingSteps = this.steps.filter((s) => s.status === 'pending').length;
    let remainingTime = remainingSteps * avgCompletedDuration;

    // 実行中ステップの残り時間
    if (runningStep && runningStep.estimatedDuration > 0) {
      const elapsed = (new Date().getTime() - runningStep.startTime.getTime()) / 1000;
      const stepRemaining = Math.max(0, runningStep.estimatedDuration - elapsed);
      remainingTime += stepRemaining;
    }

    return Math.round(remainingTime);
  }

  /**
   * 進捗を表示
   */
  displayProgress() {
    try {
      const currentStep = this.steps[this.currentStepIndex];
      const completedCount = this.steps.filter((s) => s.status === 'completed').length;
      const totalSteps = this.steps.length;
      const remainingTime = this.getEstimatedRemainingTime();

      // プログレスバーの作成
      const progressBarLength = 20;
      const filledLength = Math.round((this.overallProgress / 100) * progressBarLength);
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);

      let message = '🚀 月次処理実行中\n\n';
      message += `📊 全体進捗: ${this.overallProgress}% [${progressBar}]\n`;
      message += `⏱️  推定残り時間: ${remainingTime > 60 ? Math.round(remainingTime / 60) + '分' : remainingTime + '秒'}\n`;
      message += `📋 完了ステップ: ${completedCount}/${totalSteps}\n\n`;

      // 各ステップの状態表示
      message += '📝 処理段階:\n';
      this.steps.forEach((step, index) => {
        let icon;
        switch (step.status) {
          case 'completed':
            icon = '✅';
            break;
          case 'running':
            icon = '⏳';
            break;
          case 'error':
            icon = '❌';
            break;
          default:
            icon = '⏸️ ';
            break;
        }

        message += `${icon} ${step.name}`;

        if (step.status === 'running') {
          message += ` (${step.progress}%)`;
          if (step.subStatus) {
            message += ` - ${step.subStatus}`;
          }
        } else if (step.status === 'completed' && step.duration > 0) {
          message += ` (${step.duration.toFixed(1)}秒)`;
        } else if (step.status === 'error') {
          message += ` - エラー: ${step.errorMessage}`;
        }

        message += '\n';
      });

      // 現在の処理詳細
      if (currentStep && currentStep.status === 'running') {
        message += `\n🔄 現在の処理: ${currentStep.name}\n`;
        if (currentStep.subStatus) {
          message += `   ${currentStep.subStatus}\n`;
        }
      }

      // 注意事項
      message += '\n⚠️  処理中は他の操作を行わないでください';

      Logger.log(message);

      // UIが利用可能な場合はトーストで表示
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        if (ss && currentStep && currentStep.status === 'running') {
          ss.toast(
            `${currentStep.name} (${this.overallProgress}%) - 残り約${remainingTime > 60 ? Math.round(remainingTime / 60) + '分' : remainingTime + '秒'}`,
            '月次処理実行中',
            5
          );
        }
      } catch (e) {
        // トースト表示に失敗した場合は無視
      }
    } catch (error) {
      Logger.log(`進捗表示エラー: ${error.message}`);
    }
  }

  /**
   * 処理完了
   * @param {Object} finalResult - 最終結果
   */
  complete(finalResult = {}) {
    this.isCompleted = true;
    this.endTime = new Date();
    this.totalDuration = (this.endTime.getTime() - this.startTime.getTime()) / 1000;
    this.finalResult = finalResult;

    // 最終ログ
    MonthlyProcessLogger.addLog('INFO', '月次処理が完了しました', {
      totalDuration: this.totalDuration,
      overallProgress: this.overallProgress,
      completedSteps: this.steps.filter((s) => s.status === 'completed').length,
      hasErrors: this.hasErrors,
      finalResult: finalResult,
      sessionId: this.sessionId,
    });

    this.displayFinalResult();
  }

  /**
   * 最終結果を表示
   */
  displayFinalResult() {
    const completedSteps = this.steps.filter((s) => s.status === 'completed').length;
    const totalSteps = this.steps.length;
    const successRate = Math.round((completedSteps / totalSteps) * 100);

    let message = '🎉 月次処理完了レポート\n\n';
    message += `✅ 処理結果: ${this.hasErrors ? 'エラーあり' : '正常完了'}\n`;
    message += `📊 成功率: ${successRate}% (${completedSteps}/${totalSteps})\n`;
    message += `⏱️  総処理時間: ${this.totalDuration.toFixed(1)}秒\n\n`;

    message += '📋 各ステップの結果:\n';
    this.steps.forEach((step) => {
      const icon = step.status === 'completed' ? '✅' : step.status === 'error' ? '❌' : '⏸️';
      message += `${icon} ${step.name}`;
      if (step.duration > 0) {
        message += ` (${step.duration.toFixed(1)}秒)`;
      }
      if (step.status === 'error') {
        message += ` - ${step.errorMessage}`;
      }
      message += '\n';
    });

    if (this.finalResult.summary) {
      message += `\n📈 処理サマリー:\n${this.finalResult.summary}`;
    }

    Logger.log(message);

    // UIが利用可能な場合は結果ダイアログを表示
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        const title = this.hasErrors ? '月次処理完了（エラーあり）' : '月次処理正常完了';
        ui.alert(title, message, ui.ButtonSet.OK);
      }
    } catch (e) {
      // UI表示に失敗した場合はログのみ
    }
  }

  /**
   * 進捗状況を取得
   * @returns {Object} 進捗状況
   */
  getStatus() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      currentStep:
        this.currentStepIndex < this.steps.length ? this.steps[this.currentStepIndex] : null,
      steps: this.steps,
      overallProgress: this.overallProgress,
      estimatedRemainingTime: this.getEstimatedRemainingTime(),
      isCompleted: this.isCompleted,
      hasErrors: this.hasErrors,
      errorMessage: this.errorMessage,
      totalDuration: this.totalDuration || 0,
    };
  }
}

/**
 * 月次処理結果レポート生成クラス
 * 詳細な処理結果レポートとエクスポート機能を提供
 */
class MonthlyProcessReportGenerator {
  constructor() {
    this.reportData = {};
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * レポートデータを設定
   * @param {Object} processResult - 処理結果
   * @param {Object} preCheckResult - 事前チェック結果
   * @param {Object} performanceData - パフォーマンスデータ
   */
  setReportData(processResult, preCheckResult = {}, performanceData = {}) {
    this.reportData = {
      processResult: processResult,
      preCheckResult: preCheckResult,
      performanceData: performanceData,
      timestamp: new Date(),
      reportId: Utilities.getUuid().substr(0, 8),
    };
  }

  /**
   * 包括的結果レポートを生成
   * @returns {Object} レポートオブジェクト
   */
  generateComprehensiveReport() {
    const report = {
      header: this.generateReportHeader(),
      summary: this.generateExecutionSummary(),
      dataStatistics: this.generateDataStatistics(),
      performanceMetrics: this.generatePerformanceMetrics(),
      stepDetails: this.generateStepDetails(),
      errors: this.generateErrorReport(),
      recommendations: this.generateRecommendations(),
      footer: this.generateReportFooter(),
    };

    return report;
  }

  /**
   * レポートヘッダーを生成
   * @returns {Object} ヘッダー情報
   */
  generateReportHeader() {
    const currentDate = new Date();
    return {
      title: '📊 月次処理実行レポート',
      reportId: this.reportData.reportId,
      generatedAt: currentDate.toLocaleString('ja-JP'),
      targetMonth: `${currentDate.getFullYear()}年${String(currentDate.getMonth() + 1).padStart(2, '0')}月`,
      version: 'v1.1.0-monthly-execution',
    };
  }

  /**
   * 実行サマリーを生成
   * @returns {Object} サマリー情報
   */
  generateExecutionSummary() {
    const result = this.reportData.processResult || {};
    const performance = this.reportData.performanceData || {};

    return {
      executionStatus: result.success ? '正常完了' : 'エラー/不完全',
      totalDuration: performance.totalDuration || 0,
      overallSuccess: result.success || false,
      errorCount: result.errorCount || 0,
      warningCount: result.warningCount || 0,
      processedRecords: result.processedRecords || 0,
      archivedRecords: result.archivedRecords || 0,
      resetRecords: result.resetRecords || 0,
    };
  }

  /**
   * データ統計を生成
   * @returns {Object} データ統計
   */
  generateDataStatistics() {
    const preCheck = this.reportData.preCheckResult.detailedInfo || {};
    const result = this.reportData.processResult || {};

    return {
      beforeProcess: {
        totalRecords: preCheck.totalRecords || 0,
        completedRecords: preCheck.completedRecords || 0,
        pendingRecords: preCheck.pendingRecords || 0,
        skippedRecords: preCheck.skippedRecords || 0,
        dataSize: preCheck.dataSize || 0,
      },
      afterProcess: {
        archivedRecords: result.archivedRecords || 0,
        resetRecords: result.resetRecords || 0,
        newDataSize: result.newDataSize || 0,
        archiveSize: result.archiveSize || 0,
      },
      changes: {
        recordReduction: (preCheck.totalRecords || 0) - (result.resetRecords || 0),
        sizeReduction: (preCheck.dataSize || 0) - (result.newDataSize || 0),
        compressionRatio: this.calculateCompressionRatio(preCheck.dataSize, result.archiveSize),
      },
    };
  }

  /**
   * パフォーマンス指標を生成
   * @returns {Object} パフォーマンス指標
   */
  generatePerformanceMetrics() {
    const performance = this.reportData.performanceData || {};
    const result = this.reportData.processResult || {};

    return {
      timeMetrics: {
        totalDuration: performance.totalDuration || 0,
        averageStepDuration: performance.averageStepDuration || 0,
        fastestStep: performance.fastestStep || null,
        slowestStep: performance.slowestStep || null,
      },
      throughputMetrics: {
        recordsPerSecond: this.calculateRecordsPerSecond(
          result.processedRecords,
          performance.totalDuration
        ),
        mbPerSecond: this.calculateMBPerSecond(
          performance.processedDataSize,
          performance.totalDuration
        ),
        efficiency: this.calculateEfficiencyScore(performance),
      },
      resourceUsage: {
        estimatedMemoryUsage: performance.estimatedMemoryUsage || 0,
        scriptRuntime: performance.scriptRuntime || 0,
        apiCalls: performance.apiCalls || 0,
        quotaUsage: performance.quotaUsage || 0,
      },
    };
  }

  /**
   * ステップ詳細を生成
   * @returns {Array} ステップ詳細配列
   */
  generateStepDetails() {
    const steps = this.reportData.performanceData?.steps || [];

    return steps.map((step) => ({
      stepName: step.name,
      status: step.status,
      duration: step.duration || 0,
      startTime: step.startTime,
      endTime: step.endTime,
      progress: step.progress || 0,
      result: step.result || {},
      errorMessage: step.errorMessage || null,
      subStatus: step.subStatus || null,
    }));
  }

  /**
   * エラーレポートを生成
   * @returns {Object} エラーレポート
   */
  generateErrorReport() {
    const result = this.reportData.processResult || {};
    const steps = this.reportData.performanceData?.steps || [];

    const errors = [];
    const warnings = [];

    // 処理結果のエラー
    if (result.errors) {
      errors.push(...result.errors);
    }

    // ステップのエラー
    steps.forEach((step) => {
      if (step.status === 'error' && step.errorMessage) {
        errors.push({
          step: step.name,
          message: step.errorMessage,
          timestamp: step.endTime,
        });
      }
    });

    // 警告
    if (result.warnings) {
      warnings.push(...result.warnings);
    }

    return {
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors,
      warnings: warnings,
      criticalErrors: errors.filter((e) => e.critical === true),
      recoverableErrors: errors.filter((e) => e.recoverable === true),
    };
  }

  /**
   * 推奨事項を生成
   * @returns {Array} 推奨事項配列
   */
  generateRecommendations() {
    const recommendations = [];
    const performance = this.reportData.performanceData || {};
    const errors = this.generateErrorReport();
    const summary = this.generateExecutionSummary();

    // パフォーマンス関連の推奨事項
    if (performance.totalDuration > 300) {
      // 5分以上
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: '処理時間の最適化',
        description:
          '処理時間が5分を超えています。データ量を確認し、必要に応じてデータのクリーンアップを検討してください。',
        action: 'データクリーンアップの実行、古いデータの定期削除',
      });
    }

    // エラー関連の推奨事項
    if (errors.errorCount > 0) {
      recommendations.push({
        type: 'error',
        priority: 'high',
        title: 'エラーの解決',
        description: `${errors.errorCount}件のエラーが発生しました。詳細を確認し、必要な修正を行ってください。`,
        action: 'エラーログの確認、システム管理者への連絡',
      });
    }

    // データ関連の推奨事項
    const dataStats = this.generateDataStatistics();
    if (dataStats.beforeProcess.totalRecords > 10000) {
      recommendations.push({
        type: 'data',
        priority: 'low',
        title: 'データ量の監視',
        description: 'データ量が多くなっています。定期的なデータアーカイブを検討してください。',
        action: '古いデータの定期アーカイブ、不要データの削除',
      });
    }

    // 成功時の推奨事項
    if (summary.overallSuccess && errors.errorCount === 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'low',
        title: '定期メンテナンス',
        description:
          '月次処理が正常に完了しました。次回実行に向けて定期メンテナンスを実行することを推奨します。',
        action: 'システムヘルスチェックの実行、データ整合性の確認',
      });
    }

    return recommendations;
  }

  /**
   * レポートフッターを生成
   * @returns {Object} フッター情報
   */
  generateReportFooter() {
    return {
      generatedBy: 'Monthly Process Report Generator v1.1.0',
      contactInfo: 'システムに関するお問い合わせは管理者まで',
      nextExecution: this.calculateNextExecutionDate(),
      backupRecommendation: '重要: このレポートと処理結果のバックアップを取得することを推奨します',
    };
  }

  /**
   * 圧縮率を計算
   * @param {number} originalSize - 元のサイズ
   * @param {number} compressedSize - 圧縮後のサイズ
   * @returns {number} 圧縮率（パーセント）
   */
  calculateCompressionRatio(originalSize, compressedSize) {
    if (!originalSize || originalSize === 0) return 0;
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }

  /**
   * 1秒あたりのレコード処理数を計算
   * @param {number} records - 処理レコード数
   * @param {number} duration - 処理時間（秒）
   * @returns {number} レコード/秒
   */
  calculateRecordsPerSecond(records, duration) {
    if (!duration || duration === 0) return 0;
    return Math.round(records / duration);
  }

  /**
   * 1秒あたりのMB処理量を計算
   * @param {number} sizeInMB - 処理サイズ（MB）
   * @param {number} duration - 処理時間（秒）
   * @returns {number} MB/秒
   */
  calculateMBPerSecond(sizeInMB, duration) {
    if (!duration || duration === 0) return 0;
    return Math.round((sizeInMB / duration) * 100) / 100;
  }

  /**
   * 効率スコアを計算
   * @param {Object} performance - パフォーマンスデータ
   * @returns {number} 効率スコア（0-100）
   */
  calculateEfficiencyScore(performance) {
    let score = 100;

    // 処理時間による減点
    if (performance.totalDuration > 180) score -= 20; // 3分以上
    if (performance.totalDuration > 300) score -= 30; // 5分以上

    // メモリ使用量による減点
    if (performance.estimatedMemoryUsage > 50) score -= 10; // 50MB以上
    if (performance.estimatedMemoryUsage > 100) score -= 20; // 100MB以上

    // エラー数による減点
    if (performance.errorCount > 0) score -= performance.errorCount * 15;

    return Math.max(0, score);
  }

  /**
   * 次回実行日を計算
   * @returns {string} 次回実行推奨日
   */
  calculateNextExecutionDate() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1); // 翌月1日
    return nextMonth.toLocaleDateString('ja-JP');
  }

  /**
   * レポートをテキスト形式で出力
   * @param {Object} report - レポートオブジェクト
   * @returns {string} テキスト形式レポート
   */
  exportToText(report) {
    let text = '';

    // ヘッダー
    text += `${report.header.title}\n`;
    text += `${'='.repeat(report.header.title.length)}\n\n`;
    text += `レポートID: ${report.header.reportId}\n`;
    text += `生成日時: ${report.header.generatedAt}\n`;
    text += `対象月: ${report.header.targetMonth}\n`;
    text += `バージョン: ${report.header.version}\n\n`;

    // サマリー
    text += '📋 実行サマリー\n';
    text += `実行結果: ${report.summary.executionStatus}\n`;
    text += `総処理時間: ${report.summary.totalDuration}秒\n`;
    text += `処理レコード数: ${report.summary.processedRecords.toLocaleString()}件\n`;
    text += `アーカイブレコード数: ${report.summary.archivedRecords.toLocaleString()}件\n`;
    text += `リセットレコード数: ${report.summary.resetRecords.toLocaleString()}件\n`;
    if (report.summary.errorCount > 0) {
      text += `エラー数: ${report.summary.errorCount}件\n`;
    }
    if (report.summary.warningCount > 0) {
      text += `警告数: ${report.summary.warningCount}件\n`;
    }
    text += '\n';

    // データ統計
    text += '📊 データ統計\n';
    text += `処理前総レコード: ${report.dataStatistics.beforeProcess.totalRecords.toLocaleString()}件\n`;
    text += `処理前データサイズ: ${report.dataStatistics.beforeProcess.dataSize}MB\n`;
    text += `処理後アーカイブサイズ: ${report.dataStatistics.afterProcess.archiveSize}MB\n`;
    text += `レコード削減数: ${report.dataStatistics.changes.recordReduction.toLocaleString()}件\n`;
    text += `データサイズ削減: ${report.dataStatistics.changes.sizeReduction}MB\n`;
    text += '\n';

    // パフォーマンス指標
    text += '⚡ パフォーマンス指標\n';
    text += `レコード処理速度: ${report.performanceMetrics.throughputMetrics.recordsPerSecond}件/秒\n`;
    text += `データ処理速度: ${report.performanceMetrics.throughputMetrics.mbPerSecond}MB/秒\n`;
    text += `効率スコア: ${report.performanceMetrics.throughputMetrics.efficiency}/100\n`;
    text += `推定メモリ使用量: ${report.performanceMetrics.resourceUsage.estimatedMemoryUsage}MB\n`;
    text += '\n';

    // ステップ詳細
    text += '📝 処理ステップ詳細\n';
    report.stepDetails.forEach((step) => {
      const status = step.status === 'completed' ? '✅' : step.status === 'error' ? '❌' : '⏸️';
      text += `${status} ${step.stepName}: ${step.duration}秒\n`;
      if (step.errorMessage) {
        text += `   エラー: ${step.errorMessage}\n`;
      }
    });
    text += '\n';

    // エラーレポート
    if (report.errors.errorCount > 0) {
      text += '❌ エラー詳細\n';
      report.errors.errors.forEach((error, index) => {
        text += `${index + 1}. ${error.message}\n`;
        if (error.step) {
          text += `   発生ステップ: ${error.step}\n`;
        }
      });
      text += '\n';
    }

    // 推奨事項
    if (report.recommendations.length > 0) {
      text += '💡 推奨事項\n';
      report.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        text += `${priority} ${rec.title}\n`;
        text += `   ${rec.description}\n`;
        text += `   推奨アクション: ${rec.action}\n\n`;
      });
    }

    // フッター
    text += `${report.footer.generatedBy}\n`;
    text += `次回実行推奨日: ${report.footer.nextExecution}\n`;
    text += `${report.footer.backupRecommendation}\n`;

    return text;
  }

  /**
   * レポートをCSV形式で出力（統計データのみ）
   * @param {Object} report - レポートオブジェクト
   * @returns {string} CSV形式データ
   */
  exportToCSV(report) {
    let csv = '';

    // ヘッダー
    csv += 'カテゴリ,項目,値,単位\n';

    // サマリーデータ
    csv += `サマリー,実行結果,${report.summary.executionStatus},\n`;
    csv += `サマリー,総処理時間,${report.summary.totalDuration},秒\n`;
    csv += `サマリー,処理レコード数,${report.summary.processedRecords},件\n`;
    csv += `サマリー,アーカイブレコード数,${report.summary.archivedRecords},件\n`;
    csv += `サマリー,リセットレコード数,${report.summary.resetRecords},件\n`;
    csv += `サマリー,エラー数,${report.summary.errorCount},件\n`;
    csv += `サマリー,警告数,${report.summary.warningCount},件\n`;

    // データ統計
    csv += `データ統計,処理前総レコード,${report.dataStatistics.beforeProcess.totalRecords},件\n`;
    csv += `データ統計,処理前データサイズ,${report.dataStatistics.beforeProcess.dataSize},MB\n`;
    csv += `データ統計,処理後アーカイブサイズ,${report.dataStatistics.afterProcess.archiveSize},MB\n`;
    csv += `データ統計,レコード削減数,${report.dataStatistics.changes.recordReduction},件\n`;
    csv += `データ統計,データサイズ削減,${report.dataStatistics.changes.sizeReduction},MB\n`;

    // パフォーマンス指標
    csv += `パフォーマンス,レコード処理速度,${report.performanceMetrics.throughputMetrics.recordsPerSecond},件/秒\n`;
    csv += `パフォーマンス,データ処理速度,${report.performanceMetrics.throughputMetrics.mbPerSecond},MB/秒\n`;
    csv += `パフォーマンス,効率スコア,${report.performanceMetrics.throughputMetrics.efficiency},点\n`;
    csv += `パフォーマンス,推定メモリ使用量,${report.performanceMetrics.resourceUsage.estimatedMemoryUsage},MB\n`;

    return csv;
  }
}

/**
 * 月次処理復旧ガイド機能クラス
 * エラー診断、復旧手順、自動修復機能を提供
 */
class MonthlyProcessRecoveryGuide {
  constructor() {
    this.diagnosticResults = {};
    this.recoverySteps = [];
    this.autoRecoveryOptions = [];
  }

  /**
   * エラー別自動診断を実行
   * @param {Object} error - エラーオブジェクト
   * @param {Object} context - 処理コンテキスト
   * @returns {Object} 診断結果
   */
  diagnoseError(error, context = {}) {
    const diagnosis = {
      errorType: this.classifyError(error),
      severity: this.assessSeverity(error),
      cause: this.identifyRootCause(error, context),
      impact: this.assessImpact(error, context),
      recoveryComplexity: this.assessRecoveryComplexity(error),
      autoRecoverable: this.isAutoRecoverable(error),
      estimatedRecoveryTime: this.estimateRecoveryTime(error),
      requiredActions: this.getRequiredActions(error),
    };

    this.diagnosticResults = diagnosis;
    return diagnosis;
  }

  /**
   * エラーを分類
   * @param {Object} error - エラーオブジェクト
   * @returns {string} エラー分類
   */
  classifyError(error) {
    const message = error.message || error.toString().toLowerCase();
    const stack = error.stack || '';

    // データ関連エラー
    if (message.includes('sheet') || message.includes('シート')) {
      return 'data_access_error';
    }

    // 権限関連エラー
    if (message.includes('permission') || message.includes('権限')) {
      return 'permission_error';
    }

    // タイムアウト関連エラー
    if (message.includes('timeout') || message.includes('タイムアウト')) {
      return 'timeout_error';
    }

    // メモリ関連エラー
    if (message.includes('memory') || message.includes('メモリ')) {
      return 'memory_error';
    }

    // API関連エラー
    if (message.includes('api') || message.includes('quota')) {
      return 'api_quota_error';
    }

    // ロック関連エラー
    if (message.includes('lock') || message.includes('ロック')) {
      return 'lock_error';
    }

    // データ整合性エラー
    if (message.includes('integrity') || message.includes('整合性')) {
      return 'data_integrity_error';
    }

    return 'unknown_error';
  }

  /**
   * エラーの重要度を評価
   * @param {Object} error - エラーオブジェクト
   * @returns {string} 重要度 (critical, high, medium, low)
   */
  assessSeverity(error) {
    const errorType = this.classifyError(error);
    const message = error.message || error.toString().toLowerCase();

    // クリティカルレベル
    if (
      errorType === 'data_integrity_error' ||
      message.includes('corruption') ||
      message.includes('破損')
    ) {
      return 'critical';
    }

    // 高レベル
    if (
      errorType === 'permission_error' ||
      errorType === 'data_access_error' ||
      message.includes('fatal')
    ) {
      return 'high';
    }

    // 中レベル
    if (errorType === 'timeout_error' || errorType === 'api_quota_error') {
      return 'medium';
    }

    // 低レベル
    return 'low';
  }

  /**
   * 根本原因を特定
   * @param {Object} error - エラーオブジェクト
   * @param {Object} context - 処理コンテキスト
   * @returns {Object} 原因分析
   */
  identifyRootCause(error, context) {
    const errorType = this.classifyError(error);
    const analysis = {
      primary: '',
      secondary: [],
      contributing: [],
    };

    switch (errorType) {
      case 'data_access_error':
        analysis.primary = 'スプレッドシートまたはシートへのアクセスに失敗';
        analysis.secondary = ['シートの削除または名前変更', '権限の変更', 'ファイルの移動'];
        analysis.contributing = ['同時アクセス', 'ネットワーク問題'];
        break;

      case 'permission_error':
        analysis.primary = 'スプレッドシートまたは関数の実行権限が不足';
        analysis.secondary = ['共有設定の変更', 'オーナー権限の変更'];
        analysis.contributing = ['組織ポリシーの変更', 'アカウント権限の変更'];
        break;

      case 'timeout_error':
        analysis.primary = 'データ量が多すぎるか処理時間が制限を超過';
        analysis.secondary = ['大量データの処理', '複雑な計算処理'];
        analysis.contributing = ['サーバー負荷', 'ネットワーク遅延'];
        break;

      case 'memory_error':
        analysis.primary = 'メモリ使用量がGoogle Apps Scriptの制限を超過';
        analysis.secondary = ['大量データの読み込み', '効率的でないデータ処理'];
        analysis.contributing = ['データ量の急増', 'メモリリークの可能性'];
        break;

      case 'api_quota_error':
        analysis.primary = 'Google Apps ScriptのAPI使用制限を超過';
        analysis.secondary = ['頻繁なAPI呼び出し', '他のスクリプトとの競合'];
        analysis.contributing = ['使用量の急増', '同時実行スクリプト'];
        break;

      case 'lock_error':
        analysis.primary = '月次処理の重複実行またはロック機能の問題';
        analysis.secondary = ['前回処理の異常終了', 'ロック解除の失敗'];
        analysis.contributing = ['スクリプトのクラッシュ', 'システム障害'];
        break;

      case 'data_integrity_error':
        analysis.primary = 'データの整合性または形式に問題';
        analysis.secondary = ['不正なデータ形式', '参照整合性の違反'];
        analysis.contributing = ['手動でのデータ編集', '他システムからのデータ更新'];
        break;

      default:
        analysis.primary = '未分類のエラーが発生';
        analysis.secondary = ['予期しない処理状況'];
        analysis.contributing = ['システム環境の変更', '新しい種類の問題'];
    }

    return analysis;
  }

  /**
   * エラーの影響を評価
   * @param {Object} error - エラーオブジェクト
   * @param {Object} context - 処理コンテキスト
   * @returns {Object} 影響評価
   */
  assessImpact(error, context) {
    const errorType = this.classifyError(error);
    const severity = this.assessSeverity(error);

    return {
      dataIntegrity: this.assessDataIntegrityImpact(errorType, severity),
      systemAvailability: this.assessAvailabilityImpact(errorType, severity),
      userExperience: this.assessUserExperienceImpact(errorType, severity),
      businessContinuity: this.assessBusinessImpact(errorType, severity),
      recoveryEffort: this.assessRecoveryEffort(errorType, severity),
    };
  }

  /**
   * データ整合性への影響を評価
   */
  assessDataIntegrityImpact(errorType, severity) {
    if (errorType === 'data_integrity_error') return 'high';
    if (severity === 'critical') return 'medium';
    return 'low';
  }

  /**
   * システム可用性への影響を評価
   */
  assessAvailabilityImpact(errorType, severity) {
    if (errorType === 'permission_error' || errorType === 'data_access_error') return 'high';
    if (severity === 'critical' || severity === 'high') return 'medium';
    return 'low';
  }

  /**
   * ユーザーエクスペリエンスへの影響を評価
   */
  assessUserExperienceImpact(errorType, severity) {
    if (errorType === 'timeout_error' || errorType === 'api_quota_error') return 'high';
    if (severity === 'high') return 'medium';
    return 'low';
  }

  /**
   * ビジネス継続性への影響を評価
   */
  assessBusinessImpact(errorType, severity) {
    if (severity === 'critical') return 'high';
    if (errorType === 'data_integrity_error' || errorType === 'lock_error') return 'medium';
    return 'low';
  }

  /**
   * 復旧作業量への影響を評価
   */
  assessRecoveryEffort(errorType, severity) {
    if (errorType === 'data_integrity_error') return 'high';
    if (severity === 'critical') return 'high';
    if (errorType === 'permission_error') return 'medium';
    return 'low';
  }

  /**
   * 復旧の複雑さを評価
   * @param {Object} error - エラーオブジェクト
   * @returns {string} 複雑さレベル
   */
  assessRecoveryComplexity(error) {
    const errorType = this.classifyError(error);

    switch (errorType) {
      case 'data_integrity_error':
        return 'complex';
      case 'permission_error':
        return 'medium';
      case 'lock_error':
        return 'simple';
      case 'timeout_error':
        return 'medium';
      case 'api_quota_error':
        return 'simple';
      case 'memory_error':
        return 'medium';
      default:
        return 'unknown';
    }
  }

  /**
   * 自動復旧可能かを判定
   * @param {Object} error - エラーオブジェクト
   * @returns {boolean} 自動復旧可能性
   */
  isAutoRecoverable(error) {
    const errorType = this.classifyError(error);
    const autoRecoverableTypes = ['lock_error', 'timeout_error', 'api_quota_error'];
    return autoRecoverableTypes.includes(errorType);
  }

  /**
   * 復旧時間を推定
   * @param {Object} error - エラーオブジェクト
   * @returns {Object} 推定時間
   */
  estimateRecoveryTime(error) {
    const complexity = this.assessRecoveryComplexity(error);
    const isAuto = this.isAutoRecoverable(error);

    if (isAuto) {
      return {
        automatic: '1-5分',
        manual: '10-30分',
        withSupport: '30-60分',
      };
    }

    switch (complexity) {
      case 'simple':
        return {
          automatic: '不可',
          manual: '10-30分',
          withSupport: '30-60分',
        };
      case 'medium':
        return {
          automatic: '不可',
          manual: '30-60分',
          withSupport: '1-2時間',
        };
      case 'complex':
        return {
          automatic: '不可',
          manual: '1-3時間',
          withSupport: '2-4時間',
        };
      default:
        return {
          automatic: '不可',
          manual: '調査が必要',
          withSupport: '1-8時間',
        };
    }
  }

  /**
   * 必要なアクションを取得
   * @param {Object} error - エラーオブジェクト
   * @returns {Array} 必要なアクション
   */
  getRequiredActions(error) {
    const errorType = this.classifyError(error);
    const actions = [];

    switch (errorType) {
      case 'data_access_error':
        actions.push('スプレッドシートとシートの存在確認');
        actions.push('ファイルの共有設定確認');
        actions.push('シート名の確認と修正');
        break;

      case 'permission_error':
        actions.push('スプレッドシートの権限確認');
        actions.push('スクリプトの実行権限確認');
        actions.push('組織ポリシーの確認');
        break;

      case 'timeout_error':
        actions.push('データ量の確認と削減');
        actions.push('処理の分割実行');
        actions.push('不要なデータの事前削除');
        break;

      case 'memory_error':
        actions.push('メモリ使用量の最適化');
        actions.push('バッチサイズの縮小');
        actions.push('データ処理方法の見直し');
        break;

      case 'api_quota_error':
        actions.push('API使用量の確認');
        actions.push('処理間隔の調整');
        actions.push('他のスクリプトとの調整');
        break;

      case 'lock_error':
        actions.push('ロック状態の確認');
        actions.push('強制ロック解除の検討');
        actions.push('処理状況の確認');
        break;

      case 'data_integrity_error':
        actions.push('データ整合性チェックの実行');
        actions.push('破損データの特定');
        actions.push('データのバックアップ確認');
        actions.push('手動修正の実施');
        break;

      default:
        actions.push('エラーログの詳細確認');
        actions.push('システム状態の確認');
        actions.push('管理者への連絡');
    }

    return actions;
  }

  /**
   * 自動復旧オプションを取得
   * @param {Object} error - エラーオブジェクト
   * @returns {Array} 自動復旧オプション
   */
  getAutoRecoveryOptions(error) {
    const errorType = this.classifyError(error);
    const options = [];

    switch (errorType) {
      case 'lock_error':
        options.push({
          action: 'forceLockRelease',
          description: 'ロックを強制解除して処理を再開',
          riskLevel: 'low',
          successRate: '95%',
          sideEffects: '同時実行中の処理がある場合は注意が必要',
        });
        break;

      case 'timeout_error':
        options.push({
          action: 'retryWithBatching',
          description: 'バッチサイズを縮小して再実行',
          riskLevel: 'low',
          successRate: '80%',
          sideEffects: '処理時間が長くなる可能性',
        });
        break;

      case 'api_quota_error':
        options.push({
          action: 'delayedRetry',
          description: '待機時間を設けて再実行',
          riskLevel: 'very_low',
          successRate: '90%',
          sideEffects: '処理完了が遅延する',
        });
        break;
    }

    return options;
  }

  /**
   * ステップバイステップの復旧手順を生成
   * @param {Object} error - エラーオブジェクト
   * @param {Object} context - 処理コンテキスト
   * @returns {Array} 復旧手順
   */
  generateRecoverySteps(error, context = {}) {
    const diagnosis = this.diagnoseError(error, context);
    const steps = [];
    let stepNumber = 1;

    // 緊急対応ステップ
    steps.push({
      step: stepNumber++,
      category: 'immediate',
      title: '緊急対応',
      description: '被害の拡大を防ぐための即座の対応',
      actions: ['月次処理の停止確認', 'システムの現在状態記録', '関係者への状況連絡'],
      timeEstimate: '5-10分',
      priority: 'high',
    });

    // 診断ステップ
    steps.push({
      step: stepNumber++,
      category: 'diagnosis',
      title: '詳細診断',
      description: 'エラーの詳細な原因調査',
      actions: ['エラーログの詳細確認', 'システム状態の点検', 'データ整合性の確認'],
      timeEstimate: '10-20分',
      priority: 'high',
    });

    // エラータイプ別の復旧ステップ
    const errorType = this.classifyError(error);
    const recoveryActions = this.getRecoveryActions(errorType);

    recoveryActions.forEach((action) => {
      steps.push({
        step: stepNumber++,
        category: 'recovery',
        title: action.title,
        description: action.description,
        actions: action.actions,
        timeEstimate: action.timeEstimate,
        priority: action.priority,
        riskLevel: action.riskLevel || 'medium',
        prerequisites: action.prerequisites || [],
        validation: action.validation || [],
      });
    });

    // 検証ステップ
    steps.push({
      step: stepNumber++,
      category: 'validation',
      title: '復旧検証',
      description: '修復が正常に完了したことの確認',
      actions: ['エラーの解消確認', 'システム機能の動作確認', 'データ整合性の最終確認'],
      timeEstimate: '10-15分',
      priority: 'high',
    });

    // 予防策ステップ
    steps.push({
      step: stepNumber++,
      category: 'prevention',
      title: '再発防止',
      description: '同様のエラーの再発を防ぐための対策',
      actions: this.getPreventionActions(errorType),
      timeEstimate: '15-30分',
      priority: 'medium',
    });

    return steps;
  }

  /**
   * エラータイプ別の復旧アクションを取得
   */
  getRecoveryActions(errorType) {
    const actions = [];

    switch (errorType) {
      case 'data_access_error':
        actions.push({
          title: 'アクセス権限の確認と修正',
          description: 'スプレッドシートとシートへのアクセス権限を確認し修正',
          actions: [
            'スプレッドシートの共有設定確認',
            'シート名の存在確認',
            '必要に応じてシート名の修正',
            'アクセス権限の再設定',
          ],
          timeEstimate: '10-20分',
          priority: 'high',
          riskLevel: 'low',
        });
        break;

      case 'lock_error':
        actions.push({
          title: 'ロック状態の解決',
          description: '月次処理のロック状態を解消',
          actions: [
            'ロック状態の詳細確認',
            '実行中プロセスの確認',
            '安全確認後のロック強制解除',
            '処理の再開',
          ],
          timeEstimate: '5-15分',
          priority: 'high',
          riskLevel: 'low',
        });
        break;

      case 'data_integrity_error':
        actions.push({
          title: 'データ整合性の修復',
          description: 'データの整合性問題を特定し修復',
          actions: [
            'バックアップデータの確認',
            '破損データの特定',
            'データの手動修正または復元',
            '整合性チェックの再実行',
          ],
          timeEstimate: '30-60分',
          priority: 'high',
          riskLevel: 'high',
        });
        break;
    }

    return actions;
  }

  /**
   * 予防策アクションを取得
   */
  getPreventionActions(errorType) {
    const commonActions = [
      '定期的なシステムヘルスチェック',
      'エラー監視の強化',
      '処理ログの定期確認',
    ];

    const specificActions = {
      data_access_error: ['アクセス権限の定期監視', 'シート構造の変更管理強化'],
      lock_error: ['ロック機能の改善', '異常終了検知の強化'],
      data_integrity_error: ['データ整合性チェックの頻度向上', 'バックアップ戦略の見直し'],
      timeout_error: ['データ量監視の実装', '処理効率の定期見直し'],
    };

    return [...commonActions, ...(specificActions[errorType] || [])];
  }

  /**
   * 復旧ガイドを表示
   * @param {Object} error - エラーオブジェクト
   * @param {Object} context - 処理コンテキスト
   */
  displayRecoveryGuide(error, context = {}) {
    const diagnosis = this.diagnoseError(error, context);
    const steps = this.generateRecoverySteps(error, context);
    const autoOptions = this.getAutoRecoveryOptions(error);

    let message = '🛠️  月次処理復旧ガイド\n\n';

    // エラー診断サマリー
    message += '📋 エラー診断結果:\n';
    message += `• エラー分類: ${this.getErrorTypeDisplayName(diagnosis.errorType)}\n`;
    message += `• 重要度: ${this.getSeverityDisplayName(diagnosis.severity)}\n`;
    message += `• 根本原因: ${diagnosis.cause.primary}\n`;
    message += `• 復旧複雑度: ${this.getComplexityDisplayName(diagnosis.recoveryComplexity)}\n`;
    message += `• 推定復旧時間: ${diagnosis.estimatedRecoveryTime.manual}\n\n`;

    // 自動復旧オプション
    if (autoOptions.length > 0) {
      message += '🤖 自動復旧オプション:\n';
      autoOptions.forEach((option, index) => {
        message += `${index + 1}. ${option.description}\n`;
        message += `   成功率: ${option.successRate} | リスク: ${option.riskLevel}\n`;
        if (option.sideEffects) {
          message += `   注意: ${option.sideEffects}\n`;
        }
      });
      message += '\n';
    }

    // 復旧手順
    message += '📝 復旧手順:\n\n';
    steps.forEach((step) => {
      const icon =
        step.category === 'immediate'
          ? '🚨'
          : step.category === 'diagnosis'
            ? '🔍'
            : step.category === 'recovery'
              ? '🔧'
              : step.category === 'validation'
                ? '✅'
                : '🛡️';

      message += `${icon} ステップ${step.step}: ${step.title}\n`;
      message += `${step.description}\n`;
      message += `推定時間: ${step.timeEstimate} | 優先度: ${step.priority}\n`;

      step.actions.forEach((action) => {
        message += `  • ${action}\n`;
      });

      if (step.riskLevel) {
        message += `  ⚠️  リスクレベル: ${step.riskLevel}\n`;
      }
      message += '\n';
    });

    // 緊急連絡先
    message += '📞 サポートが必要な場合:\n';
    message += '• 重要度がCriticalまたはHighの場合は即座にシステム管理者に連絡\n';
    message += '• 自動復旧に失敗した場合は技術サポートに連絡\n';
    message += '• データ整合性に関わる問題は必ず専門家の確認を受ける\n\n';

    message +=
      '💡 このガイドは診断結果に基づく推奨事項です。実際の復旧作業前に必ずバックアップの確認を行ってください。';

    // UIが利用可能な場合はダイアログ表示
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        ui.alert('月次処理復旧ガイド', message, ui.ButtonSet.OK);
      }
    } catch (e) {
      // UI利用不可の場合はログ出力
    }

    Logger.log(message);
    return { diagnosis, steps, autoOptions, message };
  }

  /**
   * エラータイプの表示名を取得
   */
  getErrorTypeDisplayName(errorType) {
    const names = {
      data_access_error: 'データアクセスエラー',
      permission_error: '権限エラー',
      timeout_error: 'タイムアウトエラー',
      memory_error: 'メモリエラー',
      api_quota_error: 'API制限エラー',
      lock_error: 'ロックエラー',
      data_integrity_error: 'データ整合性エラー',
      unknown_error: '不明なエラー',
    };
    return names[errorType] || errorType;
  }

  /**
   * 重要度の表示名を取得
   */
  getSeverityDisplayName(severity) {
    const names = {
      critical: 'クリティカル',
      high: '高',
      medium: '中',
      low: '低',
    };
    return names[severity] || severity;
  }

  /**
   * 複雑度の表示名を取得
   */
  getComplexityDisplayName(complexity) {
    const names = {
      simple: '低',
      medium: '中',
      complex: '高',
      unknown: '不明',
    };
    return names[complexity] || complexity;
  }
}

/**
 * 月次処理操作ガイダンス機能クラス
 * 初回利用者向けガイド、ヘルプシステム、チュートリアル機能を提供
 */
class MonthlyProcessOperationGuide {
  constructor() {
    this.currentTutorialStep = 0;
    this.tutorialMode = false;
    this.userLevel = 'beginner'; // beginner, intermediate, advanced
  }

  /**
   * 初回利用者向けガイドを表示
   * @returns {Object} ガイド表示結果
   */
  showFirstTimeUserGuide() {
    let message = '👋 水道検針システム 月次処理 初回ガイド\n\n';

    message += '🎯 月次処理とは？\n';
    message += '毎月末に実行する重要な作業で、以下の処理を行います：\n';
    message += '• 今月の検針データを月別アーカイブに保存\n';
    message += '• 来月の検針に向けてデータをリセット\n';
    message += '• システムの整合性を保持\n\n';

    message += '⏰ 実行タイミング\n';
    message += '• 推奨：毎月最終営業日の業務終了後\n';
    message += '• 条件：全物件の検針が完了している状態\n';
    message += '• 頻度：月に1回のみ（重複実行は自動防止）\n\n';

    message += '🔄 処理の流れ\n';
    message += '1. 📋 事前チェック - データの状態確認\n';
    message += '2. 💾 バックアップ推奨 - 安全性の確保\n';
    message += '3. 📦 データアーカイブ - 今月分の保存\n';
    message += '4. 🔄 データリセット - 来月への準備\n';
    message += '5. ✅ 処理完了 - 結果確認\n\n';

    message += '⚠️  重要な注意事項\n';
    message += '• 月次処理は取り消しできません\n';
    message += '• 実行前に必ずバックアップを取得してください\n';
    message += '• 処理中は他の操作を行わないでください\n';
    message += '• エラーが発生した場合は復旧ガイドを参照してください\n\n';

    message += '🚀 準備が整ったら\n';
    message += '「🔧 高度機能」メニューから「📊 月次処理事前チェック」を実行して\n';
    message += 'システムの状態を確認してから月次処理を開始してください。\n\n';

    message += '❓ 不明な点がある場合は「📖 操作ヘルプ」をご利用ください。';

    this.displayMessage('月次処理 初回ガイド', message);
    return { success: true, action: 'first_time_guide_shown' };
  }

  /**
   * インタラクティブヘルプシステムを表示
   * @param {string} context - ヘルプのコンテキスト
   * @returns {Object} ヘルプ表示結果
   */
  showInteractiveHelp(context = 'general') {
    const helpContent = this.getHelpContent(context);
    let message = `📖 月次処理ヘルプ - ${helpContent.title}\n\n`;

    message += `${helpContent.description}\n\n`;

    if (helpContent.steps && helpContent.steps.length > 0) {
      message += '📝 手順:\n';
      helpContent.steps.forEach((step, index) => {
        message += `${index + 1}. ${step}\n`;
      });
      message += '\n';
    }

    if (helpContent.tips && helpContent.tips.length > 0) {
      message += '💡 コツとヒント:\n';
      helpContent.tips.forEach((tip) => {
        message += `• ${tip}\n`;
      });
      message += '\n';
    }

    if (helpContent.troubleshooting && helpContent.troubleshooting.length > 0) {
      message += '❓ よくある問題と解決方法:\n';
      helpContent.troubleshooting.forEach((item) => {
        message += `Q: ${item.question}\n`;
        message += `A: ${item.answer}\n\n`;
      });
    }

    if (helpContent.relatedTopics && helpContent.relatedTopics.length > 0) {
      message += '🔗 関連トピック:\n';
      helpContent.relatedTopics.forEach((topic) => {
        message += `• ${topic}\n`;
      });
      message += '\n';
    }

    message += '💬 他にご不明な点がございましたら、システム管理者にお問い合わせください。';

    this.displayMessage('月次処理ヘルプ', message);
    return { success: true, action: 'interactive_help_shown', context: context };
  }

  /**
   * ヘルプコンテンツを取得
   * @param {string} context - コンテキスト
   * @returns {Object} ヘルプコンテンツ
   */
  getHelpContent(context) {
    const helpContents = {
      general: {
        title: '月次処理について',
        description: '月次処理は、毎月の検針作業完了後に実行する重要なシステム処理です。',
        steps: [
          'メニューから「月次処理事前チェック」を実行',
          'チェック結果を確認し、問題があれば解決',
          '「月次処理実行」を選択',
          '処理の進行状況を確認',
          '完了レポートを確認',
        ],
        tips: [
          '必ず全物件の検針完了後に実行してください',
          '処理前にバックアップを取得することを強く推奨します',
          '処理中は他の操作を控えてください',
        ],
        relatedTopics: [
          '事前チェック機能の使い方',
          'バックアップの作成方法',
          'エラーが発生した場合の対処法',
        ],
      },

      precheck: {
        title: '事前チェック機能',
        description: '月次処理実行前にシステムの状態を確認する機能です。',
        steps: [
          '「月次処理事前チェック」を実行',
          'チェック結果を詳細に確認',
          'エラーや警告がある場合は対処',
          '全てのチェックが合格するまで修正を繰り返す',
        ],
        tips: [
          'エラーがある場合は月次処理を実行しないでください',
          '警告がある場合でも実行は可能ですが、確認してから進めてください',
        ],
        troubleshooting: [
          {
            question: 'チェックでエラーが表示される',
            answer:
              'エラーの内容を確認し、推奨アクションに従って修正してください。データ整合性の問題の場合は、データクリーンアップ機能を使用してください。',
          },
        ],
      },

      execution: {
        title: '月次処理の実行',
        description: '実際に月次処理を実行する手順と注意事項です。',
        steps: [
          '事前チェックが全て合格していることを確認',
          'バックアップの作成を確認',
          '「月次処理実行」を選択',
          '確認ダイアログの内容を慎重に確認',
          '「実行」を選択して処理開始',
          '進行状況を監視',
          '完了まで待機',
        ],
        tips: [
          '処理時間は通常5-15分程度です',
          '処理中はスプレッドシートを編集しないでください',
          '完了レポートは必ず確認してください',
        ],
        troubleshooting: [
          {
            question: '処理が長時間終わらない',
            answer:
              'データ量が多い場合は時間がかかることがあります。30分以上経過してもの進展がない場合は、システム管理者に連絡してください。',
          },
          {
            question: 'エラーで処理が停止した',
            answer:
              '復旧ガイド機能を使用してエラーの詳細を確認し、推奨される復旧手順に従ってください。',
          },
        ],
      },

      recovery: {
        title: 'エラー復旧について',
        description: '月次処理でエラーが発生した場合の対処方法です。',
        steps: [
          'エラーメッセージの内容を記録',
          '復旧ガイド機能を実行',
          '自動診断結果を確認',
          '推奨される復旧手順に従って対処',
          '必要に応じてシステム管理者に連絡',
        ],
        tips: [
          'パニックにならず、落ち着いて対処してください',
          'エラーメッセージの詳細は重要な情報です',
          '自動復旧オプションがある場合は検討してください',
        ],
      },

      maintenance: {
        title: 'メンテナンスと最適化',
        description: 'システムの性能維持とトラブル予防のための定期メンテナンス。',
        steps: [
          '週次でシステムヘルスチェックを実行',
          '月次でパフォーマンス統計を確認',
          '四半期でデータクリーンアップを実行',
          '年次でシステム全体の見直し',
        ],
        tips: [
          '定期的なメンテナンスでトラブルを予防できます',
          'パフォーマンスの低下を感じたら早めに対処してください',
          'ログファイルは定期的にクリーンアップしてください',
        ],
      },
    };

    return helpContents[context] || helpContents.general;
  }

  /**
   * チュートリアル機能を開始
   * @returns {Object} チュートリアル開始結果
   */
  startTutorial() {
    this.tutorialMode = true;
    this.currentTutorialStep = 0;

    const welcomeMessage =
      '🎓 月次処理チュートリアル\n\n' +
      '実際の操作を通じて月次処理の手順を学習します。\n' +
      'このチュートリアルは安全なテスト環境で実行されます。\n\n' +
      '所要時間: 約10-15分\n' +
      '学習内容:\n' +
      '• 事前チェックの実行方法\n' +
      '• 月次処理の実行手順\n' +
      '• 結果の確認方法\n' +
      '• エラー時の対処法\n\n' +
      'チュートリアルを開始しますか？';

    this.displayMessage('チュートリアル開始', welcomeMessage);
    return { success: true, action: 'tutorial_started' };
  }

  /**
   * 次のチュートリアルステップを実行
   * @returns {Object} ステップ実行結果
   */
  nextTutorialStep() {
    if (!this.tutorialMode) {
      return { success: false, error: 'チュートリアルが開始されていません' };
    }

    const steps = this.getTutorialSteps();
    if (this.currentTutorialStep >= steps.length) {
      return this.completeTutorial();
    }

    const currentStep = steps[this.currentTutorialStep];
    let message = `🎓 チュートリアル - ステップ ${this.currentTutorialStep + 1}/${steps.length}\n\n`;
    message += `📋 ${currentStep.title}\n\n`;
    message += `${currentStep.description}\n\n`;

    if (currentStep.actions && currentStep.actions.length > 0) {
      message += '👆 実行してみてください:\n';
      currentStep.actions.forEach((action, index) => {
        message += `${index + 1}. ${action}\n`;
      });
      message += '\n';
    }

    if (currentStep.explanation) {
      message += `💡 解説:\n${currentStep.explanation}\n\n`;
    }

    if (currentStep.tips && currentStep.tips.length > 0) {
      message += '🔍 ポイント:\n';
      currentStep.tips.forEach((tip) => {
        message += `• ${tip}\n`;
      });
      message += '\n';
    }

    message += 'このステップを完了したら、次のステップに進んでください。';

    this.displayMessage(currentStep.title, message);
    this.currentTutorialStep++;

    return {
      success: true,
      action: 'tutorial_step_shown',
      step: this.currentTutorialStep,
      totalSteps: steps.length,
    };
  }

  /**
   * チュートリアルステップを取得
   * @returns {Array} チュートリアルステップ配列
   */
  getTutorialSteps() {
    return [
      {
        title: 'システム状態の確認',
        description: 'まず、現在のシステム状態を確認しましょう。',
        actions: [
          '「🔧 高度機能」メニューを開く',
          '「🩺 システムヘルスチェック」を実行',
          '結果を確認',
        ],
        explanation: 'システムヘルスチェックにより、システムが正常に動作しているかを確認できます。',
        tips: [
          'システムの基本状態を把握することが重要です',
          '問題がある場合は先に解決してください',
        ],
      },

      {
        title: '事前チェックの実行',
        description: '月次処理を実行する前に、データの状態をチェックします。',
        actions: [
          '「🔧 高度機能」メニューから「📊 月次処理事前チェック」を選択',
          'チェック結果を詳細に確認',
          'エラーや警告の内容を理解',
        ],
        explanation: '事前チェックは月次処理の成功を保証する重要なステップです。',
        tips: [
          'エラーがある場合は月次処理を実行しないでください',
          '警告がある場合でも実行可能ですが、内容を理解してから進めてください',
        ],
      },

      {
        title: 'バックアップの重要性',
        description: 'データの安全性を確保するためのバックアップについて学習します。',
        actions: [
          'スプレッドシートのコピーを作成',
          'バックアップの保存場所を確認',
          'バックアップの命名規則を理解',
        ],
        explanation: '月次処理は取り消しできないため、バックアップは必須です。',
        tips: [
          '「ファイル」→「コピーを作成」でバックアップ可能',
          'バックアップには日付を含めた名前を付けてください',
        ],
      },

      {
        title: '月次処理の実行（デモ）',
        description: '実際の月次処理の流れを確認します（テストモード）。',
        actions: ['テストモードで月次処理を開始', '進行状況の表示を確認', '各ステップの内容を理解'],
        explanation: 'テストモードでは実際のデータは変更されません。',
        tips: [
          '実際の処理では進行状況が表示されます',
          '各ステップの意味を理解しておくことが重要です',
        ],
      },

      {
        title: '結果の確認とレポート',
        description: '処理完了後の結果確認方法を学習します。',
        actions: ['処理結果レポートを確認', '統計情報を理解', 'エラーの有無を確認'],
        explanation: '処理結果は今後の運用改善に活用できます。',
        tips: ['レポートは保存しておくことを推奨します', '異常な数値がある場合は調査してください'],
      },

      {
        title: 'エラー対応の練習',
        description: 'エラーが発生した場合の対処方法を学習します。',
        actions: [
          '意図的にエラーを発生させる（テスト）',
          '復旧ガイドを実行',
          '診断結果を確認',
          '復旧手順を理解',
        ],
        explanation: 'エラーが発生しても適切に対処できるようになることが重要です。',
        tips: [
          'パニックにならず、システムのガイドに従ってください',
          '自動復旧オプションがある場合は活用してください',
        ],
      },
    ];
  }

  /**
   * チュートリアルを完了
   * @returns {Object} 完了結果
   */
  completeTutorial() {
    this.tutorialMode = false;
    this.currentTutorialStep = 0;

    const completionMessage =
      '🎉 チュートリアル完了！\n\n' +
      'お疲れ様でした！月次処理の基本的な操作を学習しました。\n\n' +
      '📚 学習した内容:\n' +
      '✅ システム状態の確認方法\n' +
      '✅ 事前チェックの重要性と実行方法\n' +
      '✅ バックアップの作成方法\n' +
      '✅ 月次処理の実行手順\n' +
      '✅ 結果の確認とレポートの読み方\n' +
      '✅ エラー時の対処方法\n\n' +
      '🌟 次のステップ:\n' +
      '• 実際の月次処理を実行する前に、必ず事前チェックを行ってください\n' +
      '• 不明な点がある場合は、いつでもヘルプ機能をご利用ください\n' +
      '• 定期的なメンテナンスを心がけてください\n\n' +
      '🎯 これで安全に月次処理を実行できるようになりました！';

    this.displayMessage('チュートリアル完了', completionMessage);
    return { success: true, action: 'tutorial_completed' };
  }

  /**
   * FAQを表示
   * @returns {Object} FAQ表示結果
   */
  showFAQ() {
    const faqs = [
      {
        question: '月次処理はいつ実行すれば良いですか？',
        answer: '毎月最終営業日の業務終了後、全物件の検針が完了した時点で実行してください。',
      },
      {
        question: '月次処理を間違って2回実行してしまいました',
        answer:
          'システムが自動的に重複実行を防止するため、2回目は実行されません。もし実行された場合は、システム管理者に連絡してください。',
      },
      {
        question: '処理中にエラーが発生した場合はどうすれば良いですか？',
        answer:
          '復旧ガイド機能を使用してエラーの診断を行い、推奨される復旧手順に従ってください。重要度が高いエラーの場合は、システム管理者に連絡してください。',
      },
      {
        question: '月次処理にどのくらい時間がかかりますか？',
        answer:
          'データ量により異なりますが、通常5-15分程度です。大量のデータがある場合は30分程度かかる場合があります。',
      },
      {
        question: 'バックアップは必須ですか？',
        answer:
          '月次処理は取り消しできないため、バックアップの作成を強く推奨します。「ファイル」→「コピーを作成」で簡単に作成できます。',
      },
      {
        question: '事前チェックで警告が出た場合、処理を実行してもよいですか？',
        answer:
          '警告の内容を確認し、問題ないと判断できる場合は実行可能です。不明な場合は、警告の内容をシステム管理者に相談してください。',
      },
    ];

    let message = '❓ よくある質問（FAQ）\n\n';

    faqs.forEach((faq, index) => {
      message += `Q${index + 1}: ${faq.question}\n`;
      message += `A${index + 1}: ${faq.answer}\n\n`;
    });

    message += '💬 他にご不明な点がございましたら、「📖 操作ヘルプ」または\n';
    message += 'システム管理者にお問い合わせください。';

    this.displayMessage('よくある質問', message);
    return { success: true, action: 'faq_shown' };
  }

  /**
   * メッセージを表示
   * @param {string} title - タイトル
   * @param {string} message - メッセージ
   */
  displayMessage(title, message) {
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        ui.alert(title, message, ui.ButtonSet.OK);
      }
    } catch (e) {
      // UI利用不可の場合はログ出力
    }

    Logger.log(`[${title}]\n${message}`);
  }

  /**
   * ユーザーレベルを設定
   * @param {string} level - ユーザーレベル (beginner, intermediate, advanced)
   */
  setUserLevel(level) {
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (validLevels.includes(level)) {
      this.userLevel = level;
    }
  }

  /**
   * 操作チェックリストを表示
   * @returns {Object} チェックリスト表示結果
   */
  showOperationChecklist() {
    let message = '📋 月次処理実行前チェックリスト\n\n';

    message += '🔍 実行前の確認事項:\n';
    message += '□ 全物件の検針が完了している\n';
    message += '□ データに明らかな異常がない\n';
    message += '□ スプレッドシートのバックアップを作成済み\n';
    message += '□ 他のユーザーがスプレッドシートを編集していない\n';
    message += '□ 事前チェックを実行し、エラーが発生していない\n';
    message += '□ 十分な時間的余裕がある（15-30分程度）\n\n';

    message += '⚡ 実行中の注意事項:\n';
    message += '□ 他の作業は一時停止する\n';
    message += '□ スプレッドシートを編集しない\n';
    message += '□ ブラウザを閉じたり、他のページに移動しない\n';
    message += '□ 進行状況を監視する\n\n';

    message += '✅ 完了後の確認事項:\n';
    message += '□ 処理が正常完了した\n';
    message += '□ エラーが発生していない\n';
    message += '□ 完了レポートを確認した\n';
    message += '□ アーカイブシートが作成されている\n';
    message += '□ 検針データがリセットされている\n';
    message += '□ システムが正常に動作している\n\n';

    message += '💡 このチェックリストを印刷または保存して、\n';
    message += '毎回の月次処理で確認することを推奨します。';

    this.displayMessage('月次処理チェックリスト', message);
    return { success: true, action: 'checklist_shown' };
  }
}

function getAvailableYears() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, error: 'スプレッドシートが見つかりません' };

  var sheets = ss.getSheets();
  var yearMap = {};
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    var match = name.match(/^検針データ_(\d{4})年$/);
    if (match) {
      var dataYear = parseInt(match[1]);
      yearMap[dataYear] = true;
    }
  }
  var years = Object.keys(yearMap)
    .map(Number)
    .sort(function (a, b) {
      return b - a;
    });
  return { success: true, years: years };
}

function getAnnualReport(params) {
  var propertyId = params.propertyId;
  var year = parseInt(params.year);
  if (!propertyId) return { success: false, error: '物件IDが必要です' };
  if (!year || isNaN(year)) return { success: false, error: '年度が必要です' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, error: 'スプレッドシートが見つかりません' };

  var propertySheet = ss.getSheetByName('物件マスタ');
  var propertyName = '';
  if (propertySheet) {
    var propHeaders = propertySheet.getRange(1, 1, 1, propertySheet.getLastColumn()).getValues()[0];
    var propIdIdx = propHeaders.indexOf('物件ID');
    var propNameIdx = propHeaders.indexOf('物件名');
    var propData = propertySheet.getDataRange().getValues();
    for (var p = 1; p < propData.length; p++) {
      if (String(propData[p][propIdIdx]).trim() === propertyId) {
        propertyName = propNameIdx >= 0 ? String(propData[p][propNameIdx]).trim() : propertyId;
        break;
      }
    }
  }

  var roomMasterSheet = ss.getSheetByName('部屋マスタ');
  var currentStatusMap = {};
  if (roomMasterSheet) {
    var rmHeaders = roomMasterSheet
      .getRange(1, 1, 1, roomMasterSheet.getLastColumn())
      .getValues()[0];
    var rmStatusIdx = rmHeaders.indexOf('部屋ステータス');
    var rmPropIdIdx = rmHeaders.indexOf('物件ID');
    var rmRoomIdIdx = rmHeaders.indexOf('部屋ID');
    var rmRoomNameIdx = rmHeaders.indexOf('部屋名');
    var rmNotesIdx = rmHeaders.indexOf('備考');
    var rmData = roomMasterSheet.getDataRange().getValues();
    for (var r = 1; r < rmData.length; r++) {
      if (String(rmData[r][rmPropIdIdx]).trim() === propertyId) {
        var rKey = String(rmData[r][rmRoomIdIdx]).trim();
        currentStatusMap[rKey] = {
          roomName: rmRoomNameIdx >= 0 ? String(rmData[r][rmRoomNameIdx]).trim() : rKey,
          status:
            rmStatusIdx >= 0 && rmData[r][rmStatusIdx]
              ? String(rmData[r][rmStatusIdx]).trim()
              : 'normal',
          notes:
            rmNotesIdx >= 0 && rmData[r][rmNotesIdx] ? String(rmData[r][rmNotesIdx]).trim() : '',
        };
      }
    }
  }

  var months = [];
  for (var m = 1; m <= 12; m++) {
    months.push({ year: year, month: m, label: m + '月' });
  }

  var yearSheetName = '検針データ_' + year + '年';
  var yearSheet = ss.getSheetByName(yearSheetName);
  if (!yearSheet) {
    return {
      success: true,
      data: {
        propertyName: propertyName,
        year: year,
        months: months.map(function (mo) {
          return { month: mo.month, label: mo.label };
        }),
        rooms: [],
      },
    };
  }

  var yearHeaders = yearSheet.getRange(1, 1, 1, yearSheet.getLastColumn()).getValues()[0];
  var monthColIdx = yearHeaders.indexOf('月');
  var archPropIdIdx = yearHeaders.indexOf('物件ID');
  var archRoomIdIdx = yearHeaders.indexOf('部屋ID');
  var archReadingIdx = yearHeaders.indexOf('今回の指示数');
  var archUsageIdx = yearHeaders.indexOf('今回使用量');
  var archWarningIdx = yearHeaders.indexOf('警告フラグ');
  var archStatusIdx = yearHeaders.indexOf('部屋ステータス');
  var yearData = yearSheet.getDataRange().getValues();

  var roomMap = {};
  for (var yi = 1; yi < yearData.length; yi++) {
    var rowMonth = monthColIdx >= 0 ? parseInt(yearData[yi][monthColIdx]) : 0;
    if (String(yearData[yi][archPropIdIdx]).trim() !== propertyId) continue;
    var yRoomId = String(yearData[yi][archRoomIdIdx]).trim();
    if (!roomMap[yRoomId]) {
      roomMap[yRoomId] = {
        roomId: yRoomId,
        roomName: currentStatusMap[yRoomId] ? currentStatusMap[yRoomId].roomName : yRoomId,
        roomStatus: currentStatusMap[yRoomId] ? currentStatusMap[yRoomId].status : 'normal',
        roomNotes: currentStatusMap[yRoomId] ? currentStatusMap[yRoomId].notes : '',
        monthlyData: {},
      };
    }
    var yStatus =
      archStatusIdx >= 0 && yearData[yi][archStatusIdx]
        ? String(yearData[yi][archStatusIdx]).trim()
        : '';
    var monthEntry = {
      month: rowMonth,
      reading:
        archReadingIdx >= 0 && yearData[yi][archReadingIdx] !== ''
          ? _safeInt(yearData[yi][archReadingIdx])
          : null,
      usage:
        archUsageIdx >= 0 && yearData[yi][archUsageIdx] !== ''
          ? _safeInt(yearData[yi][archUsageIdx])
          : null,
      warningFlag: archWarningIdx >= 0 ? String(yearData[yi][archWarningIdx] || '').trim() : '',
      roomStatus:
        yStatus || (currentStatusMap[yRoomId] ? currentStatusMap[yRoomId].status : 'normal'),
    };
    roomMap[yRoomId].monthlyData[rowMonth] = monthEntry;
  }

  var rooms = [];
  var roomIds = Object.keys(roomMap);
  for (var ri = 0; ri < roomIds.length; ri++) {
    var room = roomMap[roomIds[ri]];
    var monthlyArray = [];
    for (var mj = 0; mj < months.length; mj++) {
      monthlyArray.push(
        room.monthlyData[months[mj].month] || {
          month: months[mj].month,
          reading: null,
          usage: null,
          warningFlag: '',
          roomStatus: room.roomStatus,
        }
      );
    }
    rooms.push({
      roomId: room.roomId,
      roomName: room.roomName,
      roomStatus: room.roomStatus,
      roomNotes: room.roomNotes,
      monthlyData: monthlyArray,
    });
  }

  return {
    success: true,
    data: {
      propertyName: propertyName,
      year: year,
      months: months.map(function (m) {
        return { month: m.month, label: m.label };
      }),
      rooms: rooms,
    },
  };
}

function migrateMonthlyToYearlySheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, error: 'スプレッドシートが見つかりません' };

  try {
    var sheets = ss.getSheets();
    var monthlyPattern = /^検針データ_(\d{4})年(\d{2})月$/;
    var grouped = {};

    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName();
      var match = name.match(monthlyPattern);
      if (match) {
        var yr = parseInt(match[1]);
        var mo = parseInt(match[2]);
        if (!grouped[yr]) grouped[yr] = [];
        grouped[yr].push({ month: mo, sheetName: name, sheet: sheets[i] });
      }
    }

    var yearKeys = Object.keys(grouped)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    var migrated = {};
    var errors = [];

    for (var yi = 0; yi < yearKeys.length; yi++) {
      var year = yearKeys[yi];
      var monthlyEntries = grouped[year].sort(function (a, b) {
        return a.month - b.month;
      });
      var yearSheetName = '検針データ_' + year + '年';

      var yearHeaders = [
        '月',
        '記録ID',
        '物件名',
        '物件ID',
        '部屋ID',
        '部屋名',
        '検針日時',
        '警告フラグ',
        '標準偏差値',
        '今回使用量',
        '今回の指示数',
        '前回指示数',
        '前々回指示数',
        '前々々回指示数',
        '検針不要',
        '請求不要',
        '部屋ステータス',
      ];

      var yearSheet = null;
      var allRows = [];
      var expectedTotalRows = 0;

      for (var mi = 0; mi < monthlyEntries.length; mi++) {
        var entry = monthlyEntries[mi];
        var mSheet = entry.sheet;
        var mData = mSheet.getDataRange().getValues();
        var mHeaders = mData[0];
        expectedTotalRows += mData.length - 1;

        for (var ri = 1; ri < mData.length; ri++) {
          var mappedRow = [];
          for (var ci = 0; ci < yearHeaders.length; ci++) {
            if (yearHeaders[ci] === '月') {
              mappedRow.push(entry.month);
            } else {
              var srcIdx = mHeaders.indexOf(yearHeaders[ci]);
              mappedRow.push(srcIdx >= 0 ? mData[ri][srcIdx] : '');
            }
          }
          allRows.push(mappedRow);
        }
      }

      var existingYearSheet = ss.getSheetByName(yearSheetName);
      if (existingYearSheet) {
        ss.deleteSheet(existingYearSheet);
      }
      yearSheet = ss.insertSheet(yearSheetName);

      if (allRows.length > 0) {
        var writeData = [yearHeaders].concat(allRows);
        yearSheet.getRange(1, 1, writeData.length, yearHeaders.length).setValues(writeData);
      } else {
        yearSheet.getRange(1, 1, 1, yearHeaders.length).setValues([yearHeaders]);
      }

      var verifyData = yearSheet.getDataRange().getValues();
      var actualDataRows = verifyData.length - 1;

      if (actualDataRows !== expectedTotalRows) {
        ss.deleteSheet(yearSheet);
        errors.push(
          year + '年: 行数不一致 (期待=' + expectedTotalRows + ', 実際=' + actualDataRows + ')'
        );
        continue;
      }

      for (var di = 0; di < monthlyEntries.length; di++) {
        ss.deleteSheet(monthlyEntries[di].sheet);
      }

      migrated[year] = { sheets: monthlyEntries.length, rows: actualDataRows };
    }

    if (errors.length > 0) {
      return { success: false, migrated: migrated, errors: errors };
    }
    return { success: true, migrated: migrated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function _safeInt(val) {
  if (val === '' || val === null || val === undefined) return null;
  var num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}
