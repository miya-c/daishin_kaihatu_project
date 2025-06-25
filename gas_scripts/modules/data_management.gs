/**
 * data_management.gs - データ管理機能
 * inspection_data の生成・管理に関する機能群
 */

/**
 * inspection_dataを物件マスタと部屋マスタから自動生成
 */
function populateInspectionDataFromMasters() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const propertyMasterSheetName = '物件マスタ';
  const roomMasterSheetName = '部屋マスタ';
  const inspectionDataSheetName = 'inspection_data';

  const propertyMasterSheet = ss.getSheetByName(propertyMasterSheetName);
  const roomMasterSheet = ss.getSheetByName(roomMasterSheetName);
  const inspectionDataSheet = ss.getSheetByName(inspectionDataSheetName);
  
  if (!propertyMasterSheet) {
    safeAlert('エラー', `「${propertyMasterSheetName}」シートが見つかりません。`);
    return;
  }
  if (!roomMasterSheet) {
    safeAlert('エラー', `「${roomMasterSheetName}」シートが見つかりません。`);
    return;
  }
  if (!inspectionDataSheet) {
    safeAlert('エラー', `「${inspectionDataSheetName}」シートが見つかりません。`);
    return;
  }

  try {
    Logger.log('📊 inspection_dataの自動生成を開始します...');

    // 1. 物件マスタのデータを読み込み、物件IDと物件名のマッピングを作成
    const propertyMasterData = propertyMasterSheet.getRange(2, 1, propertyMasterSheet.getLastRow() - 1, 2).getValues();
    const propertyMap = {};
    propertyMasterData.forEach(row => {
      const propertyId = String(row[0]).trim();
      const propertyName = String(row[1]).trim();
      if (propertyId && propertyName) {
        propertyMap[propertyId] = propertyName;
      }
    });
    Logger.log(`物件マスタ読み込み完了: ${Object.keys(propertyMap).length}件`);

    // 2. inspection_dataシートのヘッダーと既存データを読み込み
    const inspectionDataHeaders = inspectionDataSheet.getRange(1, 1, 1, inspectionDataSheet.getLastColumn()).getValues()[0];
    const inspectionDataRange = inspectionDataSheet.getDataRange();
    const inspectionData = inspectionDataSheet.getLastRow() > 1 ? inspectionDataRange.getValues().slice(1) : [];

    const existingInspectionEntries = new Set();
    const propertyIdColIdxInspection = inspectionDataHeaders.indexOf('物件ID');
    const roomIdColIdxInspection = inspectionDataHeaders.indexOf('部屋ID');
    
    if (propertyIdColIdxInspection === -1 || roomIdColIdxInspection === -1) {
      safeAlert('エラー', `「${inspectionDataSheetName}」シートに「物件ID」または「部屋ID」列が見つかりません。`);
      return;
    }

    inspectionData.forEach(row => {
      const propertyId = String(row[propertyIdColIdxInspection]).trim();
      const roomId = String(row[roomIdColIdxInspection]).trim();
      if (propertyId && roomId) {
        existingInspectionEntries.add(`${propertyId}_${roomId}`);
      }
    });
    Logger.log(`inspection_data既存データ読み込み完了: ${existingInspectionEntries.size}件`);

    // 3. 部屋マスタのデータを処理
    const roomMasterData = roomMasterSheet.getRange(2, 1, roomMasterSheet.getLastRow() - 1, 3).getValues();
    const newRowsToInspectionData = [];
    let addedCount = 0;

    roomMasterData.forEach((row, index) => {
      const roomPropertyId = String(row[0]).trim();
      const roomId = String(row[1]).trim();
      const roomName = String(row[2]).trim();

      if (!roomPropertyId || !roomId) {
        Logger.log(`部屋マスタの ${index + 2} 行目は物件IDまたは部屋IDが空のためスキップします。`);
        return;
      }

      if (!existingInspectionEntries.has(`${roomPropertyId}_${roomId}`)) {
        const propertyName = propertyMap[roomPropertyId] || `物件名不明(${roomPropertyId})`;
        const newRowData = [];
        inspectionDataHeaders.forEach(header => {
          switch (header) {
            case '記録ID': newRowData.push(Utilities.getUuid()); break;
            case '物件名': newRowData.push(propertyName); break;
            case '物件ID': newRowData.push(roomPropertyId); break;
            case '部屋ID': newRowData.push(roomId); break;
            case '部屋名': newRowData.push(roomName); break;
            default: newRowData.push(''); break;
          }
        });
        newRowsToInspectionData.push(newRowData);
        addedCount++;
      }
    });

    // 4. 新しいデータをinspection_dataシートに追加
    if (newRowsToInspectionData.length > 0) {
      const nextRow = inspectionDataSheet.getLastRow() + 1;
      inspectionDataSheet.getRange(nextRow, 1, newRowsToInspectionData.length, inspectionDataHeaders.length).setValues(newRowsToInspectionData);
    }

    const endTime = new Date();
    Logger.log(`📊 inspection_data自動生成完了: ${addedCount}件の新しいエントリを追加しました`);
    safeAlert('完了', `✅ inspection_dataの自動生成が完了しました。\n追加されたエントリ: ${addedCount}件`);

  } catch (e) {
    Logger.log(`エラー: inspection_data自動生成中にエラーが発生しました: ${e.message}`);
    safeAlert('エラー', `inspection_data自動生成中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * inspection_dataの初期データ作成（フォーマット設定付き）
 */
function createInitialInspectionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const propertyMasterSheet = ss.getSheetByName('物件マスタ');
  const roomMasterSheet = ss.getSheetByName('部屋マスタ');
  let inspectionDataSheet = ss.getSheetByName('inspection_data');

  if (!propertyMasterSheet) {
    safeAlert('エラー', '物件マスタシートが見つかりません。');
    return;
  }
  if (!roomMasterSheet) {
    safeAlert('エラー', '部屋マスタシートが見つかりません。');
    return;
  }

  try {
    // inspection_dataシートが存在しない場合は作成
    if (!inspectionDataSheet) {
      inspectionDataSheet = ss.insertSheet('inspection_data');
      const headers = [
        '記録ID', '物件名', '物件ID', '部屋ID', '部屋名',
        '検針日時', '警告フラグ', '標準偏差値', '今回使用量',
        '今回の指示数', '前回指示数', '前々回指示数', '前々々回指示数',
        '検針不要'
      ];
      inspectionDataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ========================================
      // 🎨 フォーマット設定
      // ========================================
      
      // ヘッダー行にフィルタを設定
      const headerRange = inspectionDataSheet.getRange(1, 1, 1, headers.length);
      headerRange.createFilter();
      
      // ヘッダー行を中央揃え・太字に設定
      headerRange.setHorizontalAlignment('center')
                 .setFontWeight('bold')
                 .setBackground('#f0f0f0');
      
      // 各列のインデックスを取得
      const propertyNameIndex = headers.indexOf('物件名') + 1;      // 2列目
      const roomNameIndex = headers.indexOf('部屋名') + 1;          // 5列目
      const readingDateIndex = headers.indexOf('検針日時') + 1;     // 6列目
      const warningFlagIndex = headers.indexOf('警告フラグ') + 1;   // 7列目
      const stdDevIndex = headers.indexOf('標準偏差値') + 1;        // 8列目
      const inspectionSkipIndex = headers.indexOf('検針不要') + 1;  // 14列目
      
      // 特定の列を中央揃えに設定（データ行全体）
      const lastRow = 1000; // 十分な行数を設定
      
      if (propertyNameIndex > 0) {
        inspectionDataSheet.getRange(2, propertyNameIndex, lastRow, 1).setHorizontalAlignment('center');
      }
      if (roomNameIndex > 0) {
        inspectionDataSheet.getRange(2, roomNameIndex, lastRow, 1).setHorizontalAlignment('center');
      }
      if (readingDateIndex > 0) {
        inspectionDataSheet.getRange(2, readingDateIndex, lastRow, 1).setHorizontalAlignment('center');
      }
      if (warningFlagIndex > 0) {
        inspectionDataSheet.getRange(2, warningFlagIndex, lastRow, 1).setHorizontalAlignment('center');
      }
      if (stdDevIndex > 0) {
        inspectionDataSheet.getRange(2, stdDevIndex, lastRow, 1).setHorizontalAlignment('center');
      }
      if (inspectionSkipIndex > 0) {
        inspectionDataSheet.getRange(2, inspectionSkipIndex, lastRow, 1).setHorizontalAlignment('center');
      }
      
      // 警告フラグ列の条件付き書式設定（「要確認」の場合オレンジ）
      if (warningFlagIndex > 0) {
        const warningRange = inspectionDataSheet.getRange(2, warningFlagIndex, lastRow, 1);
        const warningRule = SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo('要確認')
          .setBackground('#FFA500') // オレンジ色
          .setFontColor('#FFFFFF')  // 白文字
          .setRanges([warningRange])
          .build();
        
        const conditionalFormatRules = inspectionDataSheet.getConditionalFormatRules();
        conditionalFormatRules.push(warningRule);
        inspectionDataSheet.setConditionalFormatRules(conditionalFormatRules);
      }
    }

    // 物件マスタから物件情報を取得
    const propertyData = propertyMasterSheet.getDataRange().getValues().slice(1);
    const propertyMap = {};
    propertyData.forEach(row => {
      const propertyId = String(row[0]).trim();
      const propertyName = String(row[1]).trim();
      if (propertyId && propertyName) {
        propertyMap[propertyId] = propertyName;
      }
    });

    // 部屋マスタからデータを取得してinspection_dataに追加
    const roomData = roomMasterSheet.getDataRange().getValues().slice(1);
    const newRows = [];

    roomData.forEach((row, index) => {
      const propertyId = String(row[0]).trim();
      const roomId = String(row[1]).trim();
      const roomName = String(row[2]).trim();

      if (propertyId && roomId) {
        const propertyName = propertyMap[propertyId] || '';
        const rowNumber = inspectionDataSheet.getLastRow() + newRows.length + 1;
        
        // STDEV.S関数の数式を作成（標準偏差値列用）
        const stdDevFormula = `=IF(AND(K${rowNumber}<>"",L${rowNumber}<>"",M${rowNumber}<>""),STDEV.S(K${rowNumber}:M${rowNumber}),"")`;
        
        newRows.push([
          Utilities.getUuid(),  // 記録ID
          propertyName,         // 物件名
          propertyId,          // 物件ID
          roomId,              // 部屋ID
          roomName,            // 部屋名
          '',                  // 検針日時
          '',                  // 警告フラグ
          stdDevFormula,       // 標準偏差値（STDEV.S関数）
          '',                  // 今回使用量
          '',                  // 今回の指示数
          '',                  // 前回指示数
          '',                  // 前々回指示数
          '',                  // 前々々回指示数
          ''                   // 検針不要
        ]);
      }
    });

    if (newRows.length > 0) {
      const nextRow = inspectionDataSheet.getLastRow() + 1;
      const targetRange = inspectionDataSheet.getRange(nextRow, 1, newRows.length, 14);
      
      // データを設定
      targetRange.setValues(newRows);
      
      // 追加されたデータ行にも中央揃えを適用
      const headers = [
        '記録ID', '物件名', '物件ID', '部屋ID', '部屋名',
        '検針日時', '警告フラグ', '標準偏差値', '今回使用量',
        '今回の指示数', '前回指示数', '前々回指示数', '前々々回指示数',
        '検針不要'
      ];
      
      const propertyNameIndex = headers.indexOf('物件名') + 1;
      const roomNameIndex = headers.indexOf('部屋名') + 1;
      const readingDateIndex = headers.indexOf('検針日時') + 1;
      const warningFlagIndex = headers.indexOf('警告フラグ') + 1;
      const stdDevIndex = headers.indexOf('標準偏差値') + 1;
      const inspectionSkipIndex = headers.indexOf('検針不要') + 1;
      
      // 新しく追加した行の中央揃え設定
      for (let i = 0; i < newRows.length; i++) {
        const currentRow = nextRow + i;
        
        if (propertyNameIndex > 0) {
          inspectionDataSheet.getRange(currentRow, propertyNameIndex).setHorizontalAlignment('center');
        }
        if (roomNameIndex > 0) {
          inspectionDataSheet.getRange(currentRow, roomNameIndex).setHorizontalAlignment('center');
        }
        if (readingDateIndex > 0) {
          inspectionDataSheet.getRange(currentRow, readingDateIndex).setHorizontalAlignment('center');
        }
        if (warningFlagIndex > 0) {
          inspectionDataSheet.getRange(currentRow, warningFlagIndex).setHorizontalAlignment('center');
        }
        if (stdDevIndex > 0) {
          inspectionDataSheet.getRange(currentRow, stdDevIndex).setHorizontalAlignment('center');
        }
        if (inspectionSkipIndex > 0) {
          inspectionDataSheet.getRange(currentRow, inspectionSkipIndex).setHorizontalAlignment('center');
        }
      }
    }

    Logger.log(`初期検針データ作成完了: ${newRows.length}件`);
    safeAlert('完了', `初期検針データの作成が完了しました。\n作成件数: ${newRows.length}件\n\n設定済み機能:\n• ヘッダーフィルタ\n• 中央揃え\n• 警告フラグ条件付き書式\n• 標準偏差値自動計算`);

  } catch (e) {
    Logger.log(`エラー: 初期検針データ作成中にエラーが発生しました: ${e.message}`);
    safeAlert('エラー', `初期検針データ作成中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 検針データの月次保存処理（リセット機能付き）
 */
function processInspectionDataMonthly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const sourceSheetName = "inspection_data";
  const sourceSheet = ss.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    safeAlert('エラー', `${sourceSheetName} シートが見つかりません。`);
    return;
  }

  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const newSheetName = `検針データ_${currentYear}年${currentMonth}月`;

    // 既存の月次シートがあるかチェック
    if (ss.getSheetByName(newSheetName)) {
      safeAlert('情報', `${newSheetName} は既に存在します。`);
      return;
    }

    // ユーザーに確認ダイアログを表示
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '月次処理の実行確認',
      `以下の処理を実行します:\n\n1. 現在のデータを「${newSheetName}」にアーカイブ保存\n2. inspection_dataシートの検針値をリセット\n   - 今回指示数 → 前回指示数\n   - 前回指示数 → 前々回指示数\n   - 前々回指示数 → 前々々回指示数\n   - 今回指示数・検針日時・今回使用量をクリア\n\n処理を続行しますか？`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      safeAlert('キャンセル', '月次処理をキャンセルしました。');
      return;
    }

    // 新しいシートを作成
    const newSheet = ss.insertSheet(newSheetName);

    // ソースデータを取得
    const sourceValues = sourceSheet.getDataRange().getValues();
    const sourceHeaders = sourceValues[0];

    // 必要な列のインデックスを取得
    const columnsToCopy = [
      "記録ID", "物件名", "物件ID", "部屋ID", "部屋名",
      "検針日時", "今回使用量", "今回の指示数", "前回指示数", "検針不要"
    ];
    const columnIndicesToCopy = columnsToCopy.map(header => sourceHeaders.indexOf(header));

    // 必要な列が見つからない場合はエラー
    if (columnIndicesToCopy.some(index => index === -1)) {
      const missingColumns = columnsToCopy.filter((_, i) => columnIndicesToCopy[i] === -1);
      safeAlert('エラー', `必要な列が見つかりません: ${missingColumns.join(", ")}`);
      if (ss.getSheetByName(newSheetName)) {
        ss.deleteSheet(ss.getSheetByName(newSheetName));
      }
      return;
    }

    // 新しいシートにデータをコピー
    const dataToCopyToNewSheet = sourceValues.map(row => {
      return columnIndicesToCopy.map(index => row[index]);
    });

    if (dataToCopyToNewSheet.length > 0) {
      newSheet.getRange(1, 1, dataToCopyToNewSheet.length, columnsToCopy.length).setValues(dataToCopyToNewSheet);
    }

    // ========================================
    // 🔄 リセット処理を実行
    // ========================================
    
    // 各列のインデックスを取得
    const currentReadingIndex = sourceHeaders.indexOf('今回の指示数');
    const previousReading1Index = sourceHeaders.indexOf('前回指示数');
    const previousReading2Index = sourceHeaders.indexOf('前々回指示数');
    const previousReading3Index = sourceHeaders.indexOf('前々々回指示数');
    const readingDateIndex = sourceHeaders.indexOf('検針日時');
    const currentUsageIndex = sourceHeaders.indexOf('今回使用量');
    const inspectionSkipIndex = sourceHeaders.indexOf('検針不要');

    if (currentReadingIndex === -1 || previousReading1Index === -1 || 
        previousReading2Index === -1 || previousReading3Index === -1) {
      safeAlert('エラー', '検針値の列が見つかりません。リセット処理をスキップします。');
      Logger.log(`月次検針データ保存完了（リセットなし）: ${newSheetName}`);
      safeAlert('完了', `月次検針データの保存が完了しました。\nシート名: ${newSheetName}\n※リセット処理はスキップされました。`);
      return;
    }

    // データ行を更新（ヘッダー行は除く）
    let resetCount = 0;
    for (let rowIndex = 1; rowIndex < sourceValues.length; rowIndex++) {
      const row = sourceValues[rowIndex];
      
      // 「検針不要」がTRUEの場合はスキップ
      const skipInspection = inspectionSkipIndex !== -1 && 
                            (String(row[inspectionSkipIndex]).toLowerCase() === 'true' || 
                             String(row[inspectionSkipIndex]) === '1' ||
                             String(row[inspectionSkipIndex]) === 'はい');
      
      if (skipInspection) {
        Logger.log(`行${rowIndex + 1}: 検針不要のためリセット処理をスキップ`);
        continue;
      }

      // 検針値のシフト処理
      const currentReading = row[currentReadingIndex];
      const previousReading1 = row[previousReading1Index];
      const previousReading2 = row[previousReading2Index];
      
      // 今回指示数が空でない場合のみリセット処理を実行
      if (currentReading && String(currentReading).trim() !== '') {
        // 値をシフト: 今回 → 前回 → 前々回 → 前々々回
        sourceSheet.getRange(rowIndex + 1, previousReading3Index + 1).setValue(previousReading2); // 前々々回
        sourceSheet.getRange(rowIndex + 1, previousReading2Index + 1).setValue(previousReading1); // 前々回
        sourceSheet.getRange(rowIndex + 1, previousReading1Index + 1).setValue(currentReading);   // 前回
        
        // 今回の値をクリア
        sourceSheet.getRange(rowIndex + 1, currentReadingIndex + 1).setValue('');
        
        // 検針日時をクリア
        if (readingDateIndex !== -1) {
          sourceSheet.getRange(rowIndex + 1, readingDateIndex + 1).setValue('');
        }
        
        // 今回使用量をクリア
        if (currentUsageIndex !== -1) {
          sourceSheet.getRange(rowIndex + 1, currentUsageIndex + 1).setValue('');
        }
        
        resetCount++;
      }
    }

    Logger.log(`月次検針データ保存・リセット完了: ${newSheetName}, リセット件数: ${resetCount}`);
    safeAlert('完了', 
      `月次処理が完了しました。\n\n` +
      `📂 アーカイブ: ${newSheetName}\n` +
      `🔄 リセット件数: ${resetCount}件\n\n` +
      `検針値が前月に移行され、新しい月の検針準備が整いました。`
    );

  } catch (e) {
    Logger.log(`エラー: 月次検針データ保存・リセット中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `月次検針データ保存・リセット中にエラーが発生しました:\n${e.message}`);
  }
}

