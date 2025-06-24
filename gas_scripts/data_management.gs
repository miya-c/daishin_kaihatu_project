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
 * inspection_dataの初期データ作成
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
        '今回の指示数', '前回指示数', '前々回指示数', '前々々回指示数'
      ];
      inspectionDataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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

    roomData.forEach(row => {
      const propertyId = String(row[0]).trim();
      const roomId = String(row[1]).trim();
      const roomName = String(row[2]).trim();

      if (propertyId && roomId) {
        const propertyName = propertyMap[propertyId] || '';
        newRows.push([
          Utilities.getUuid(),  // 記録ID
          propertyName,         // 物件名
          propertyId,          // 物件ID
          roomId,              // 部屋ID
          roomName,            // 部屋名
          '',                  // 検針日時
          '',                  // 警告フラグ
          '',                  // 標準偏差値
          '',                  // 今回使用量
          '',                  // 今回の指示数
          '',                  // 前回指示数
          '',                  // 前々回指示数
          ''                   // 前々々回指示数
        ]);
      }
    });

    if (newRows.length > 0) {
      const nextRow = inspectionDataSheet.getLastRow() + 1;
      inspectionDataSheet.getRange(nextRow, 1, newRows.length, 13).setValues(newRows);
    }

    Logger.log(`初期検針データ作成完了: ${newRows.length}件`);
    safeAlert('完了', `初期検針データの作成が完了しました。\n作成件数: ${newRows.length}件`);

  } catch (e) {
    Logger.log(`エラー: 初期検針データ作成中にエラーが発生しました: ${e.message}`);
    safeAlert('エラー', `初期検針データ作成中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 検針データの月次保存処理
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

    // 新しいシートを作成
    const newSheet = ss.insertSheet(newSheetName);

    // ソースデータを取得
    const sourceValues = sourceSheet.getDataRange().getValues();
    const sourceHeaders = sourceValues[0];

    // 必要な列のインデックスを取得
    const columnsToCopy = [
      "記録ID", "物件名", "物件ID", "部屋ID", "部屋名",
      "検針日時", "今回使用量", "今回の指示数", "前回指示数", "写真URL"
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

    Logger.log(`月次検針データ保存完了: ${newSheetName}`);
    safeAlert('完了', `月次検針データの保存が完了しました。\nシート名: ${newSheetName}`);

  } catch (e) {
    Logger.log(`エラー: 月次検針データ保存中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `月次検針データ保存中にエラーが発生しました:\n${e.message}`);
  }
}

