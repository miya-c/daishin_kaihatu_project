/*
=================================================================
🗂️ アーカイブファイル: 総合カスタム処理.gs
=================================================================
このファイルの全機能は以下のアクティブファイルに移行済み：

📋 移行先マッピング:
├── main.gs                    → onOpen, showWaterMeterApp
├── data_validation.gs         → validateInspectionDataIntegrity
├── data_cleanup.gs           → optimizedCleanupDuplicateInspectionData
├── data_management.gs        → データ管理機能
├── batch_processing.gs       → バッチ処理機能
├── data_indexes.gs           → インデックス作成
└── dialog_functions.gs       → ダイアログ機能

🚫 このファイルは完全に無効化されています
=================================================================
*/

// 以下、全ての関数定義をコメントアウト

/*
// 総合カスタム処理.gs
// 複数のGoogle Apps Scriptファイルの機能を統合したカスタム処理スクリプト

// UI操作を安全に処理するためのグローバルヘルパー関数
function safeAlert(title, message) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (e) {
    Logger.log(`${title}: ${message}`);
    console.log(`${title}: ${message}`);
  }
}

// --- データ連携.gs の内容 ---
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
    safeAlert('エラー', `シート「${propertyMasterSheetName}」が見つかりません。`);
    return;
  }
  if (!roomMasterSheet) {
    safeAlert('エラー', `シート「${roomMasterSheetName}」が見つかりません。`);
    return;
  }
  if (!inspectionDataSheet) {
    safeAlert('エラー', `シート「${inspectionDataSheetName}」が見つかりません。`);
    return;
  }

  try {
    // 1. 物件マスタのデータを読み込み、物件IDをキーとするオブジェクトを作成
    const propertyMasterData = propertyMasterSheet.getRange(2, 1, propertyMasterSheet.getLastRow() - 1, 2).getValues();
    const propertyMap = {};
    propertyMasterData.forEach(row => {
      const propertyId = String(row[0]).trim();
      const propertyName = String(row[1]).trim();
      if (propertyId) {
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
    const roomIdColIdxInspection = inspectionDataHeaders.indexOf('部屋ID');    if (propertyIdColIdxInspection === -1 || roomIdColIdxInspection === -1) {
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
        Logger.log(`追加対象: 物件ID=${roomPropertyId}, 部屋ID=${roomId}, 物件名=${propertyName}, 部屋名=${roomName}`);
      }
    });    if (newRowsToInspectionData.length > 0) {
      inspectionDataSheet.getRange(inspectionDataSheet.getLastRow() + 1, 1, newRowsToInspectionData.length, newRowsToInspectionData[0].length).setValues(newRowsToInspectionData);
      safeAlert('完了', `${addedCount} 件の新しい部屋情報を「${inspectionDataSheetName}」シートに追加しました。`);
      Logger.log(`${addedCount} 件の新しい部屋情報を「${inspectionDataSheetName}」シートに追加しました。`);
    } else {
      safeAlert('情報', '追加する新しい部屋情報はありませんでした。');
      Logger.log('追加する新しい部屋情報はありませんでした。');
    }

  } catch (e) {
    Logger.log(`エラーが発生しました: ${e.message}\n${e.stack}`);
    safeAlert('スクリプト実行エラー', `データ連携処理中にエラーが発生しました: ${e.message}`);
  }
}

// --- 物件IDフォーマット変更.gs の内容 ---
const PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING = '物件マスタ';
const PROPERTY_ID_COLUMN_INDEX_FOR_FORMATTING = 0;
const HEADER_ROWS_FOR_FORMATTING = 1;

function formatPropertyIdsInPropertyMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  const sheet = ss.getSheetByName(PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING);

  if (!sheet) {
    Logger.log(`エラー: "${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}" シートが見つかりません。`);
    safeAlert('エラー', `"${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}" シートが見つかりません。`);
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= HEADER_ROWS_FOR_FORMATTING) {
    Logger.log(`"${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}" シートに処理対象のデータがありません。`);
    safeAlert('情報', `"${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}" シートに処理対象のデータがありません。`);
    return;
  }

  try {
    for (let i = HEADER_ROWS_FOR_FORMATTING; i < values.length; i++) {
      const originalValue = values[i][PROPERTY_ID_COLUMN_INDEX_FOR_FORMATTING];
      let numericStringPart = '';
      let needsFormatting = false;

      if (originalValue !== null && originalValue !== '') {
        const valStr = String(originalValue);
        if (valStr.startsWith('P')) {
          numericStringPart = valStr.substring(1);
          if (!isNaN(Number(numericStringPart))) {
            needsFormatting = true;
          } else {
            Logger.log(`行 ${i + 1} (${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}): 値 "${originalValue}" はPで始まりますが、続く部分が数値ではないためスキップします。`);
            continue;
          }
        } else if (!isNaN(Number(valStr))) {
          numericStringPart = valStr;
          needsFormatting = true;
        } else {
          Logger.log(`行 ${i + 1} (${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}): 値 "${originalValue}" は処理対象の形式ではないためスキップします。`);
          continue;
        }

        if (needsFormatting) {
          const numericValue = Number(numericStringPart);
          const formattedId = 'P' + String(numericValue).padStart(6, '0');
          if (valStr !== formattedId) {
            values[i][PROPERTY_ID_COLUMN_INDEX_FOR_FORMATTING] = formattedId;
            updatedCount++;
            Logger.log(`行 ${i + 1} (${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}): "${originalValue}" を "${formattedId}" に更新しました。`);
          }
        }
      }
    }    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`${updatedCount} 件の物件IDを「${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}」でフォーマットしました。`);
      safeAlert('完了', `${updatedCount} 件の物件IDを「${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}」でフォーマットしました。`);
    } else {
      Logger.log(`「${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}」で更新対象の物件IDはありませんでした。`);
      safeAlert('情報', `「${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}」で更新対象の物件IDはありませんでした。`);
    }
  } catch (e) {
    Logger.log(`物件IDフォーマット変更処理中にエラーが発生しました: ${e.message}\n${e.stack}`);
    safeAlert('スクリプト実行エラー', `物件IDフォーマット変更処理中にエラーが発生しました: ${e.message}`);
  }
}

// --- 部屋マスタ物件IDフォーマット.gs の内容 ---
const ROOM_MASTER_FORMAT_TARGET_SHEET_NAME = '部屋マスタ';
const PROPERTY_ID_COLUMN_INDEX_IN_ROOM_MASTER_FOR_FORMATTING = 0;
const HEADER_ROWS_IN_ROOM_MASTER_FOR_FORMATTING = 1;

function formatPropertyIdsInRoomMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  const sheet = ss.getSheetByName(ROOM_MASTER_FORMAT_TARGET_SHEET_NAME);

  if (!sheet) {
    Logger.log(`エラー: "${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートが見つかりません。`);
    safeAlert('エラー', `"${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートが見つかりません。`);
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= HEADER_ROWS_IN_ROOM_MASTER_FOR_FORMATTING) {
    Logger.log(`"${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートに処理対象のデータがありません。`);
    safeAlert('情報', `"${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートに処理対象のデータがありません。`);
    return;
  }

  try {
    for (let i = HEADER_ROWS_IN_ROOM_MASTER_FOR_FORMATTING; i < values.length; i++) {
      const originalValue = values[i][PROPERTY_ID_COLUMN_INDEX_IN_ROOM_MASTER_FOR_FORMATTING];
      if (originalValue === null || originalValue === '') {
        Logger.log(`行 ${i + 1} (${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}): 物件IDが空のためスキップします。`);
        continue;
      }
      const valStr = String(originalValue);
      if (/^P\d{6}$/.test(valStr)) {
        Logger.log(`行 ${i + 1} (${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}): 値 "${originalValue}" は既に正しいP+6桁形式です。`);
        continue;
      }
      let numericPartStr;
      if (valStr.startsWith('P')) {
        numericPartStr = valStr.substring(1);
      } else {
        numericPartStr = valStr;
      }
      if (!isNaN(Number(numericPartStr)) && Number.isInteger(Number(numericPartStr))) {
        const numericValue = Number(numericPartStr);
        const formattedId = 'P' + String(numericValue).padStart(6, '0');
        if (valStr !== formattedId) {
          values[i][PROPERTY_ID_COLUMN_INDEX_IN_ROOM_MASTER_FOR_FORMATTING] = formattedId;
          updatedCount++;
          Logger.log(`行 ${i + 1} (${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}): "${originalValue}" を "${formattedId}" に更新しました。`);
        }
      } else {
        Logger.log(`行 ${i + 1} (${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}): 値 "${originalValue}" は純粋な整数またはP+数値の形式ではないためスキップします。`);
      }
    }    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`${updatedCount} 件の物件IDを「${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}」でフォーマットしました。`);
      safeAlert('完了', `${updatedCount} 件の物件IDを「${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}」でフォーマットしました。`);
    } else {
      Logger.log(`「${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}」で更新対象の物件IDはありませんでした。`);
      safeAlert('情報', `「${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}」で更新対象の物件IDはありませんでした。`);
    }
  } catch (e) {
    Logger.log(`部屋マスタ物件IDフォーマット処理中にエラーが発生しました: ${e.message}\n${e.stack}`);
    safeAlert('スクリプト実行エラー', `部屋マスタ物件IDフォーマット処理中にエラーが発生しました: ${e.message}`);
  }
}

// --- 部屋マスタ整合性チェック.gs の内容 ---
const ROOM_MASTER_SHEET_FOR_CLEANUP = '部屋マスタ';
const PROPERTY_MASTER_SHEET_FOR_CLEANUP = '物件マスタ';
const PROP_ID_COL_ROOM_MASTER_CLEANUP = 0;
const PROP_ID_COL_PROPERTY_MASTER_CLEANUP = 0;
const HEADER_ROWS_CLEANUP = 1;

function cleanUpOrphanedRooms() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  const roomSheet = ss.getSheetByName(ROOM_MASTER_SHEET_FOR_CLEANUP);
  const propertySheet = ss.getSheetByName(PROPERTY_MASTER_SHEET_FOR_CLEANUP);

  if (!roomSheet) {
    Logger.log(`エラー: "${ROOM_MASTER_SHEET_FOR_CLEANUP}" シートが見つかりません。`);
    safeAlert('エラー', `"${ROOM_MASTER_SHEET_FOR_CLEANUP}" シートが見つかりません。`);
    return;
  }
  if (!propertySheet) {
    Logger.log(`エラー: "${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" シートが見つかりません。`);
    safeAlert('エラー', `"${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" シートが見つかりません。`);
    return;
  }

  try {
    const propertyMasterValues = propertySheet.getDataRange().getValues();
    const validPropertyIds = new Set();
    for (let i = HEADER_ROWS_CLEANUP; i < propertyMasterValues.length; i++) {
      const propId = propertyMasterValues[i][PROP_ID_COL_PROPERTY_MASTER_CLEANUP];
      if (propId !== null && String(propId).trim() !== '') {
        validPropertyIds.add(String(propId).trim());
      }
    }    if (validPropertyIds.size === 0) {
      Logger.log(`"${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" シートに有効な物件IDが見つかりませんでした。`);
      safeAlert('情報', `"${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" シートに有効な物件IDが見つかりませんでした。`);
      return;
    }
    Logger.log(`"${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" から ${validPropertyIds.size} 件の有効な物件IDを読み込みました。`);

    const roomSheetValues = roomSheet.getDataRange().getValues();
    let deletedRowCount = 0;

    for (let i = roomSheetValues.length - 1; i >= HEADER_ROWS_CLEANUP; i--) {
      const propertyIdInRoomCell = roomSheetValues[i][PROP_ID_COL_ROOM_MASTER_CLEANUP];
      if (propertyIdInRoomCell === null || String(propertyIdInRoomCell).trim() === '') {
        Logger.log(`行 ${i + 1} (${ROOM_MASTER_SHEET_FOR_CLEANUP}): 物件IDが空のためスキップします。`);
        continue;
      }
      const propertyIdInRoom = String(propertyIdInRoomCell).trim();
      if (!validPropertyIds.has(propertyIdInRoom)) {
        Logger.log(`行 ${i + 1} (${ROOM_MASTER_SHEET_FOR_CLEANUP}): 物件ID "${propertyIdInRoom}" は "${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" に存在しません。この行を削除します。`);
        roomSheet.deleteRow(i + 1);
        deletedRowCount++;
      }
    }    if (deletedRowCount > 0) {
      Logger.log(`${deletedRowCount} 件の行を「${ROOM_MASTER_SHEET_FOR_CLEANUP}」から削除しました。`);
      safeAlert('完了', `${deletedRowCount} 件の孤立した部屋情報を「${ROOM_MASTER_SHEET_FOR_CLEANUP}」から削除しました。`);
    } else {
      Logger.log(`「${ROOM_MASTER_SHEET_FOR_CLEANUP}」に孤立した部屋情報はありませんでした。`);
      safeAlert('情報', `「${ROOM_MASTER_SHEET_FOR_CLEANUP}」に孤立した部屋情報はありませんでした。`);
    }
  } catch (e) {
    Logger.log(`部屋マスタ整合性チェック処理中にエラーが発生しました: ${e.message}\n${e.stack}`);
    safeAlert('スクリプト実行エラー', `部屋マスタ整合性チェック処理中にエラーが発生しました: ${e.message}`);
  }
}

// --- 検針データ保存.gs の内容 ---
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
    safeAlert('エラー', `シート "${sourceSheetName}" が見つかりません。`);
    return;
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = ("0" + (now.getMonth() + 1)).slice(-2);
    const newSheetName = `${year}年${month}月`;

    let targetSheet = ss.getSheetByName(newSheetName);
    if (targetSheet) {
      try {
        const ui = SpreadsheetApp.getUi();
        const response = ui.alert(
          '確認',
          `シート "${newSheetName}" は既に存在します。上書きしますか？\n（「いいえ」を選択すると処理を中断します）`,
          ui.ButtonSet.YES_NO
        );
        if (response == ui.Button.NO || response == ui.Button.CLOSE) {
          safeAlert('情報', '処理を中断しました。');
          Logger.log(`シート "${newSheetName}" が既に存在するため、ユーザーが処理を中断しました。`);
          return;
        }
      } catch (e) {
        // UIが使用できない場合は、既存シートを削除して続行
        Logger.log(`UIが使用できません。既存のシート "${newSheetName}" を削除して続行します。`);
      }
      ss.deleteSheet(targetSheet);
      Logger.log(`既存のシート "${newSheetName}" を削除しました。`);
    }
    targetSheet = ss.insertSheet(newSheetName);
    Logger.log(`新しいシート "${newSheetName}" を作成しました。`);

    const sourceDataRange = sourceSheet.getDataRange();
    const sourceValues = sourceDataRange.getValues();
    const sourceHeaders = sourceValues[0];

    const columnsToCopy = [
      "記録ID", "物件名", "物件ID", "部屋ID", "部屋名",
      "検針日時", "今回使用量", "今回の指示数", "前回指示数"
    ];
    const columnIndicesToCopy = columnsToCopy.map(header => sourceHeaders.indexOf(header));    if (columnIndicesToCopy.some(index => index === -1)) {
      const missingColumns = columnsToCopy.filter((_, i) => columnIndicesToCopy[i] === -1);
      safeAlert('エラー', `必要な列が見つかりません: ${missingColumns.join(", ")}`);
      if (ss.getSheetByName(newSheetName)) {
        ss.deleteSheet(ss.getSheetByName(newSheetName));
      }
      return;
    }

    const dataToCopyToNewSheet = sourceValues.map(row => {
      return columnIndicesToCopy.map(index => row[index]);
    });
    targetSheet.getRange(1, 1, dataToCopyToNewSheet.length, dataToCopyToNewSheet[0].length).setValues(dataToCopyToNewSheet);
    if (dataToCopyToNewSheet.length > 0) {
      targetSheet.getRange(1, 1, dataToCopyToNewSheet.length, dataToCopyToNewSheet[0].length).createFilter();
    }    safeAlert('完了', `データがシート "${newSheetName}" にコピーされ、フィルタが設定されました。`);
    Logger.log(`データがシート "${newSheetName}" にコピーされ、フィルタが設定されました。`);

    const currentReadingIndex = sourceHeaders.indexOf("今回の指示数");
    const previousReadingIndex = sourceHeaders.indexOf("前回指示数");
    const prevPrevReadingIndex = sourceHeaders.indexOf("前々回指示数");
    const threeTimesPreviousReadingIndex = sourceHeaders.indexOf("前々々回指示数");

    if ([currentReadingIndex, previousReadingIndex, prevPrevReadingIndex, threeTimesPreviousReadingIndex].some(index => index === -1)) {
      safeAlert('エラー', "指示数関連の列のいずれかが見つかりません。");
      return;
    }

    for (let i = 1; i < sourceValues.length; i++) {
      const row = sourceValues[i];
      sourceSheet.getRange(i + 1, threeTimesPreviousReadingIndex + 1).setValue(row[prevPrevReadingIndex]);
      sourceSheet.getRange(i + 1, prevPrevReadingIndex + 1).setValue(row[previousReadingIndex]);
      sourceSheet.getRange(i + 1, previousReadingIndex + 1).setValue(row[currentReadingIndex]);
      sourceSheet.getRange(i + 1, currentReadingIndex + 1).setValue("");
    }
    safeAlert('完了', `シート "${sourceSheetName}" の指示数データが更新されました。`);
    Logger.log(`シート "${sourceSheetName}" の指示数データが更新されました。`);

  } catch (e) {
    Logger.log(`検針データ保存処理中にエラーが発生しました: ${e.message}\n${e.stack}`);
    safeAlert('スクリプト実行エラー', `検針データ保存処理中にエラーが発生しました: ${e.message}`);
  }
}

// --- 0.登録用スクリプト.gs の内容 ---
// スプレッドシートIDを安全に取得する関数（設定ファイル統合版）
function getSpreadsheetId() {
  try {
    // 設定ファイルからIDを取得を試行
    if (typeof getConfigSpreadsheetId === 'function') {
      const configId = getConfigSpreadsheetId();
      if (configId) {
        return configId;
      }
    }
    
    // フォールバック: アクティブなスプレッドシートから取得
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      return activeSpreadsheet.getId();
    } else {
      throw new Error('アクティブなスプレッドシートが見つかりません');
    }
  } catch (e) {
    Logger.log(`スプレッドシートID取得エラー: ${e.message}`);
    throw new Error(`スプレッドシートIDが取得できません。spreadsheet_config.gs を確認してください: ${e.message}`);
  }
}

// const SPREADSHEET_ID = getSpreadsheetId(); // ← 他ファイルで定義済みのため重複宣言を削除
const PROPERTY_MASTER_SHEET_NAME = '物件マスタ';
const ROOM_MASTER_SHEET_NAME = '部屋マスタ';
const INSPECTION_DATA_SHEET_NAME = 'inspection_data';

const INSPECTION_DATA_HEADERS = [
  '記録ID', '物件名', '物件ID', '部屋ID', '部屋名',
  '検針日時', '警告フラグ', '標準偏差値', '今回使用量',
  '今回の指示数', '前回指示数', '前々回指示数', '前々々回指示数'
];

function createInitialInspectionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  const propertyMasterSheet = ss.getSheetByName(PROPERTY_MASTER_SHEET_NAME);
  const roomMasterSheet = ss.getSheetByName(ROOM_MASTER_SHEET_NAME);
  let inspectionDataSheet = ss.getSheetByName(INSPECTION_DATA_SHEET_NAME);

  if (!propertyMasterSheet) {
    safeAlert('エラー', `"${PROPERTY_MASTER_SHEET_NAME}" シートが見つかりません。`);
    return;
  }
  if (!roomMasterSheet) {
    safeAlert('エラー', `"${ROOM_MASTER_SHEET_NAME}" シートが見つかりません。`);
    return;
  }

  try {
    if (!inspectionDataSheet) {
      inspectionDataSheet = ss.insertSheet(INSPECTION_DATA_SHEET_NAME);
      Logger.log(`"${INSPECTION_DATA_SHEET_NAME}" シートを新規作成しました。`);
    }

    const headerRange = inspectionDataSheet.getRange(1, 1, 1, INSPECTION_DATA_HEADERS.length);
    if (headerRange.getValues()[0].join('') === '') {
      headerRange.setValues([INSPECTION_DATA_HEADERS]);
      Logger.log(`"${INSPECTION_DATA_SHEET_NAME}" にヘッダーを設定しました。`);
    }

    const existingRoomIds = new Set();
    const inspectionDataValues = inspectionDataSheet.getDataRange().getValues();
    if (inspectionDataValues.length > 1) {
      const roomIdColIndex = INSPECTION_DATA_HEADERS.indexOf('部屋ID');
      for (let i = 1; i < inspectionDataValues.length; i++) {
        const roomId = String(inspectionDataValues[i][roomIdColIndex]).trim();
        if (roomId) {
          existingRoomIds.add(roomId);
        }
      }
    }
    Logger.log('既存の部屋ID (inspection_dataより): ' + JSON.stringify(Array.from(existingRoomIds)));

    const propertyData = propertyMasterSheet.getDataRange().getValues();
    const propertyMap = {};
    if (propertyData.length > 1) {
      for (let i = 1; i < propertyData.length; i++) {
        const propertyId = String(propertyData[i][0]).trim();
        const propertyName = String(propertyData[i][1]).trim();
        if (propertyId && propertyName) {
          propertyMap[propertyId] = propertyName;
        }
      }
    }
    Logger.log('物件マスタデータ: ' + JSON.stringify(propertyMap));

    const roomData = roomMasterSheet.getDataRange().getValues();
    const newInspectionEntries = [];

    if (roomData.length > 1) {
      for (let i = 1; i < roomData.length; i++) {
        const roomPropertyId = String(roomData[i][0]).trim();
        const roomId = String(roomData[i][1]).trim();
        const roomName = String(roomData[i][2]).trim();

        if (roomPropertyId && roomId && !existingRoomIds.has(roomId)) {
          const propertyName = propertyMap[roomPropertyId] || `物件名不明(${roomPropertyId})`;
          const newEntry = [];
          INSPECTION_DATA_HEADERS.forEach(header => {
            switch (header) {
              case '記録ID': newEntry.push(Utilities.getUuid()); break;
              case '物件名': newEntry.push(propertyName); break;
              case '物件ID': newEntry.push(roomPropertyId); break;
              case '部屋ID': newEntry.push(roomId); break;
              case '部屋名': newEntry.push(roomName); break;
              default: newEntry.push(''); break;
            }
          });
          newInspectionEntries.push(newEntry);
          Logger.log(`新規追加対象: 物件ID=${roomPropertyId}, 部屋ID=${roomId}, 物件名=${propertyName}, 部屋名=${roomName}`);
        }
      }
    }    if (newInspectionEntries.length > 0) {
      const startRow = inspectionDataSheet.getLastRow() + 1;
      inspectionDataSheet.getRange(startRow, 1, newInspectionEntries.length, newInspectionEntries[0].length).setValues(newInspectionEntries);
      safeAlert('完了', `${newInspectionEntries.length} 件の新しい部屋情報を「${INSPECTION_DATA_SHEET_NAME}」に追加しました。`);
      Logger.log(`${newInspectionEntries.length} 件の新しい部屋情報を「${INSPECTION_DATA_SHEET_NAME}」に追加しました。`);
    } else {
      safeAlert('情報', '追加する新しい部屋情報はありませんでした。');
      Logger.log('追加する新しい部屋情報はありませんでした。');
    }

  } catch (e) {
    Logger.log(`初期検針データ作成処理中にエラーが発生しました: ${e.message}\n${e.stack}`);
    safeAlert('スクリプト実行エラー', `初期検針データ作成処理中にエラーが発生しました: ${e.message}`);
  }
}

// --- パフォーマンス改善機能（Phase 1）---

// データ高速検索用のインデックスを作成する関数
function createDataIndexes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return null;
  }

  try {
    Logger.log('🔍 データインデックス作成を開始します...');
    const startTime = new Date();
    
    // inspection_dataシートからデータを読み込み
    const inspectionDataSheet = ss.getSheetByName('inspection_data');
    if (!inspectionDataSheet) {
      safeAlert('エラー', 'inspection_dataシートが見つかりません');
      return null;
    }

    const inspectionData = inspectionDataSheet.getDataRange().getValues();
    if (inspectionData.length <= 1) {
      safeAlert('情報', 'inspection_dataシートにデータがありません');
      return null;
    }

    const headers = inspectionData[0];
    const recordIdIndex = headers.indexOf('記録ID');
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');
    const propertyNameIndex = headers.indexOf('物件名');
    const roomNameIndex = headers.indexOf('部屋名');
    const inspectionDateIndex = headers.indexOf('検針日時');
    const currentReadingIndex = headers.indexOf('今回の指示数');
    const previousReadingIndex = headers.indexOf('前回指示数');
    const usageIndex = headers.indexOf('今回使用量');

    if ([recordIdIndex, propertyIdIndex, roomIdIndex].includes(-1)) {
      safeAlert('エラー', '必要な列（記録ID、物件ID、部屋ID）が見つかりません');
      return null;
    }

    // 各種インデックスマップを作成
    const indexes = {
      byRecordId: new Map(),           // 記録ID → 行データ
      byPropertyId: new Map(),         // 物件ID → 行データ配列
      byRoomId: new Map(),             // 部屋ID → 行データ
      byPropertyRoom: new Map(),       // 物件ID_部屋ID → 行データ
      duplicateRecordIds: new Set(),   // 重複した記録ID
      properties: new Set(),           // ユニークな物件ID一覧
      rooms: new Set()                 // ユニークな部屋ID一覧
    };

    // データをスキャンしてインデックスを構築
    for (let i = 1; i < inspectionData.length; i++) {
      const row = inspectionData[i];
      const recordId = String(row[recordIdIndex]).trim();
      const propertyId = String(row[propertyIdIndex]).trim();
      const roomId = String(row[roomIdIndex]).trim();
      const propertyName = String(row[propertyNameIndex] || '').trim();
      const roomName = String(row[roomNameIndex] || '').trim();
      const inspectionDate = String(row[inspectionDateIndex] || '').trim();
      const currentReading = String(row[currentReadingIndex] || '').trim();
      const previousReading = String(row[previousReadingIndex] || '').trim();
      const usage = String(row[usageIndex] || '').trim();

      const rowData = {
        rowIndex: i,
        recordId,
        propertyId,
        roomId,
        propertyName,
        roomName,
        inspectionDate,
        currentReading,
        previousReading,
        usage,
        rawData: row
      };

      // 記録IDインデックス（重複チェック付き）
      if (recordId) {
        if (indexes.byRecordId.has(recordId)) {
          indexes.duplicateRecordIds.add(recordId);
          Logger.log(`⚠️ 重複記録ID発見: ${recordId} (行 ${i + 1})`);
        } else {
          indexes.byRecordId.set(recordId, rowData);
        }
      }

      // 物件IDインデックス
      if (propertyId) {
        indexes.properties.add(propertyId);
        if (!indexes.byPropertyId.has(propertyId)) {
          indexes.byPropertyId.set(propertyId, []);
        }
        indexes.byPropertyId.get(propertyId).push(rowData);
      }

      // 部屋IDインデックス
      if (roomId) {
        indexes.rooms.add(roomId);
        if (indexes.byRoomId.has(roomId)) {
          Logger.log(`⚠️ 重複部屋ID発見: ${roomId} (行 ${i + 1})`);
        } else {
          indexes.byRoomId.set(roomId, rowData);
        }
      }

      // 物件-部屋組み合わせインデックス
      if (propertyId && roomId) {
        const key = `${propertyId}_${roomId}`;
        if (indexes.byPropertyRoom.has(key)) {
          Logger.log(`⚠️ 重複物件-部屋組み合わせ発見: ${key} (行 ${i + 1})`);
        } else {
          indexes.byPropertyRoom.set(key, rowData);
        }
      }
    }

    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;

    // インデックス統計をログ出力
    Logger.log('✅ データインデックス作成完了');
    Logger.log(`📊 処理時間: ${processingTime}秒`);
    Logger.log(`📈 総レコード数: ${inspectionData.length - 1}`);
    Logger.log(`🏢 ユニーク物件数: ${indexes.properties.size}`);
    Logger.log(`🏠 ユニーク部屋数: ${indexes.rooms.size}`);
    Logger.log(`⚠️ 重複記録ID数: ${indexes.duplicateRecordIds.size}`);

    safeAlert('完了', `データインデックス作成完了\n処理時間: ${processingTime}秒\n総レコード数: ${inspectionData.length - 1}`);

    return indexes;

  } catch (e) {
    Logger.log(`❌ データインデックス作成エラー: ${e.message}\n${e.stack}`);
    safeAlert('エラー', `データインデックス作成中にエラーが発生しました: ${e.message}`);
    return null;
  }
}

// データ整合性チェック関数
function validateInspectionDataIntegrity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🔍 データ整合性チェックを開始します...');
    const startTime = new Date();

    // 各マスタシートを取得
    const propertyMasterSheet = ss.getSheetByName('物件マスタ');
    const roomMasterSheet = ss.getSheetByName('部屋マスタ');
    const inspectionDataSheet = ss.getSheetByName('inspection_data');

    if (!propertyMasterSheet || !roomMasterSheet || !inspectionDataSheet) {
      safeAlert('エラー', '必要なシート（物件マスタ、部屋マスタ、inspection_data）が見つかりません');
      return;
    }

    // 物件マスタから有効な物件IDを取得
    const propertyMasterData = propertyMasterSheet.getDataRange().getValues();
    const validPropertyIds = new Set();
    for (let i = 1; i < propertyMasterData.length; i++) {
      const propertyId = String(propertyMasterData[i][0]).trim();
      if (propertyId) {
        validPropertyIds.add(propertyId);
      }
    }

    // 部屋マスタから有効な部屋IDと物件-部屋の組み合わせを取得
    const roomMasterData = roomMasterSheet.getDataRange().getValues();
    const validRoomIds = new Set();
    const validPropertyRoomCombinations = new Set();
    for (let i = 1; i < roomMasterData.length; i++) {
      const propertyId = String(roomMasterData[i][0]).trim();
      const roomId = String(roomMasterData[i][1]).trim();
      if (propertyId && roomId) {
        validRoomIds.add(roomId);
        validPropertyRoomCombinations.add(`${propertyId}_${roomId}`);
      }
    }

    // データインデックスを作成
    const indexes = createDataIndexes();
    if (!indexes) {
      return;
    }

    // 整合性チェック結果
    const issues = {
      invalidPropertyIds: [],
      invalidRoomIds: [],
      invalidCombinations: [],
      duplicateRecordIds: Array.from(indexes.duplicateRecordIds),
      missingRecordIds: [],
      inconsistentPropertyNames: []
    };

    // 検針データの各レコードをチェック
    indexes.byRecordId.forEach((rowData, recordId) => {
      const { propertyId, roomId, propertyName } = rowData;

      // 記録IDチェック
      if (!recordId || recordId === '') {
        issues.missingRecordIds.push(`行 ${rowData.rowIndex + 1}`);
      }

      // 物件IDチェック
      if (propertyId && !validPropertyIds.has(propertyId)) {
        issues.invalidPropertyIds.push(`行 ${rowData.rowIndex + 1}: ${propertyId}`);
      }

      // 部屋IDチェック
      if (roomId && !validRoomIds.has(roomId)) {
        issues.invalidRoomIds.push(`行 ${rowData.rowIndex + 1}: ${roomId}`);
      }

      // 物件-部屋組み合わせチェック
      if (propertyId && roomId) {
        const combination = `${propertyId}_${roomId}`;
        if (!validPropertyRoomCombinations.has(combination)) {
          issues.invalidCombinations.push(`行 ${rowData.rowIndex + 1}: ${combination}`);
        }
      }

      // 物件名の整合性チェック（物件マスタと比較）
      if (propertyId && validPropertyIds.has(propertyId)) {
        const masterPropertyName = propertyMasterData.find(row => 
          String(row[0]).trim() === propertyId
        )?.[1];
        if (masterPropertyName && String(masterPropertyName).trim() !== propertyName) {
          issues.inconsistentPropertyNames.push(
            `行 ${rowData.rowIndex + 1}: 検針データ="${propertyName}" vs マスタ="${masterPropertyName}"`
          );
        }
      }
    });

    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;

    // 結果をレポート
    Logger.log('✅ データ整合性チェック完了');
    Logger.log(`📊 処理時間: ${processingTime}秒`);
    Logger.log(`📈 チェック対象レコード数: ${indexes.byRecordId.size}`);

    let alertMessage = `データ整合性チェック完了\n処理時間: ${processingTime}秒\n\n`;
    let hasIssues = false;

    if (issues.invalidPropertyIds.length > 0) {
      hasIssues = true;
      Logger.log(`❌ 無効な物件ID: ${issues.invalidPropertyIds.length}件`);
      alertMessage += `❌ 無効な物件ID: ${issues.invalidPropertyIds.length}件\n`;
      issues.invalidPropertyIds.slice(0, 3).forEach(issue => Logger.log(`  ${issue}`));
    }

    if (issues.invalidRoomIds.length > 0) {
      hasIssues = true;
      Logger.log(`❌ 無効な部屋ID: ${issues.invalidRoomIds.length}件`);
      alertMessage += `❌ 無効な部屋ID: ${issues.invalidRoomIds.length}件\n`;
      issues.invalidRoomIds.slice(0, 3).forEach(issue => Logger.log(`  ${issue}`));
    }

    if (issues.invalidCombinations.length > 0) {
      hasIssues = true;
      Logger.log(`❌ 無効な物件-部屋組み合わせ: ${issues.invalidCombinations.length}件`);
      alertMessage += `❌ 無効な物件-部屋組み合わせ: ${issues.invalidCombinations.length}件\n`;
      issues.invalidCombinations.slice(0, 3).forEach(issue => Logger.log(`  ${issue}`));
    }

    if (issues.duplicateRecordIds.length > 0) {
      hasIssues = true;
      Logger.log(`❌ 重複記録ID: ${issues.duplicateRecordIds.length}件`);
      alertMessage += `❌ 重複記録ID: ${issues.duplicateRecordIds.length}件\n`;
      issues.duplicateRecordIds.slice(0, 3).forEach(id => Logger.log(`  ${id}`));
    }

    if (issues.missingRecordIds.length > 0) {
      hasIssues = true;
      Logger.log(`❌ 記録ID未設定: ${issues.missingRecordIds.length}件`);
      alertMessage += `❌ 記録ID未設定: ${issues.missingRecordIds.length}件\n`;
    }

    if (issues.inconsistentPropertyNames.length > 0) {
      hasIssues = true;
      Logger.log(`⚠️ 物件名不整合: ${issues.inconsistentPropertyNames.length}件`);
      alertMessage += `⚠️ 物件名不整合: ${issues.inconsistentPropertyNames.length}件\n`;
      issues.inconsistentPropertyNames.slice(0, 2).forEach(issue => Logger.log(`  ${issue}`));
    }

    if (!hasIssues) {
      alertMessage += '✅ データ整合性に問題はありませんでした';
      Logger.log('✅ データ整合性に問題はありませんでした');
    } else {
      alertMessage += '\n詳細はログを確認してください';
    }

    safeAlert('整合性チェック結果', alertMessage);

    return issues;

  } catch (e) {
    Logger.log(`❌ データ整合性チェックエラー: ${e.message}\n${e.stack}`);
    safeAlert('エラー', `データ整合性チェック中にエラーが発生しました: ${e.message}`);
    return null;
  }
}

// --- Phase 2: 重複データクリーンアップ機能 ---

// 重複データクリーンアップ機能（最適化版）
function optimizedCleanupDuplicateInspectionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🧹 重複データクリーンアップを開始します...');
    const startTime = new Date();

    // データインデックスを作成して重複を検出
    const indexes = createDataIndexes();
    if (!indexes) {
      return;
    }

    const inspectionDataSheet = ss.getSheetByName('inspection_data');
    if (!inspectionDataSheet) {
      safeAlert('エラー', 'inspection_dataシートが見つかりません');
      return;
    }

    // バックアップの作成
    Logger.log('💾 データのバックアップを作成しています...');
    try {
      const backupSheetName = `inspection_data_backup_${Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss')}`;
      const backupSheet = ss.insertSheet(backupSheetName);
      const sourceRange = inspectionDataSheet.getDataRange();
      const sourceValues = sourceRange.getValues();
      if (sourceValues.length > 0) {
        backupSheet.getRange(1, 1, sourceValues.length, sourceValues[0].length).setValues(sourceValues);
        Logger.log(`✅ バックアップシート「${backupSheetName}」を作成しました`);
      }
    } catch (backupError) {
      Logger.log(`⚠️ バックアップ作成エラー: ${backupError.message}`);
      // バックアップが失敗した場合は処理を中断
      safeAlert('警告', 'バックアップの作成に失敗しました。安全のため処理を中断します。');
      return;
    }

    // 重複パターンの検出（仕様による重複は除外）
    const duplicatePatterns = {
      duplicateRecordIds: Array.from(indexes.duplicateRecordIds),  // 記録IDの重複のみチェック
      emptyDataRows: []               // 空のデータ行のみ削除対象
    };

    indexes.byRecordId.forEach((rowData, recordId) => {
      // 空のデータ行を検出（必須項目が全て空の場合のみ削除対象とする）
      // 注意：記録ID、物件ID、部屋IDが存在する場合は削除しない（仕様上の未処理データ）
      const hasEssentialData = rowData.recordId && rowData.propertyId && rowData.roomId;
      const hasOptionalData = rowData.inspectionDate || 
                            rowData.currentReading || 
                            rowData.previousReading ||
                            rowData.usage;
      
      // 必須項目も任意項目も空の場合のみ削除対象とする
      if (!hasEssentialData && !hasOptionalData) {
        duplicatePatterns.emptyDataRows.push({
          recordId,
          rowIndex: rowData.rowIndex,
          propertyId: rowData.propertyId,
          roomId: rowData.roomId,
          roomName: rowData.roomName
        });
      }
    });

    // クリーンアップ実行の確認と結果の準備
    const cleanupResults = {
      emptyRowsCleaned: 0,
      duplicateRecordIdsFound: 0,
      totalRowsDeleted: 0,
      errors: []
    };

    // 1. 記録IDの重複を報告（削除はしない、警告のみ）
    if (duplicatePatterns.duplicateRecordIds.length > 0) {
      Logger.log(`⚠️ 記録IDの重複が検出されました: ${duplicatePatterns.duplicateRecordIds.length}件`);
      cleanupResults.duplicateRecordIdsFound = duplicatePatterns.duplicateRecordIds.length;
      duplicatePatterns.duplicateRecordIds.forEach(recordId => {
        Logger.log(`  重複記録ID: ${recordId}`);
      });
    }

    // 2. 完全に空のデータ行を削除
    if (duplicatePatterns.emptyDataRows.length > 0) {
      Logger.log(`🗑️ 完全に空のデータ行: ${duplicatePatterns.emptyDataRows.length}件`);
      Logger.log(`⚠️ 注意: 記録ID・物件ID・部屋IDがある未処理データは削除しません`);
      
      // 行番号の大きい順にソートして削除（インデックスのずれを防ぐ）
      const sortedEmptyRows = duplicatePatterns.emptyDataRows.sort((a, b) => b.rowIndex - a.rowIndex);
      
      sortedEmptyRows.forEach(emptyRow => {
        try {
          inspectionDataSheet.deleteRow(emptyRow.rowIndex + 1);
          cleanupResults.emptyRowsCleaned++;
          cleanupResults.totalRowsDeleted++;
          Logger.log(`    削除: 行${emptyRow.rowIndex + 1} (記録ID: ${emptyRow.recordId})`);
        } catch (error) {
          cleanupResults.errors.push(`空行${emptyRow.rowIndex + 1}の削除エラー: ${error.message}`);
        }
      });
    }

    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;

    // 結果をレポート
    Logger.log('✅ 重複データクリーンアップ完了');
    Logger.log(`📊 処理時間: ${processingTime}秒`);
    Logger.log(`🧹 削除された行数: ${cleanupResults.totalRowsDeleted}`);
    Logger.log(`  - 空のデータ行: ${cleanupResults.emptyRowsCleaned}件`);
    if (cleanupResults.duplicateRecordIdsFound > 0) {
      Logger.log(`⚠️ 記録ID重複（警告のみ）: ${cleanupResults.duplicateRecordIdsFound}件`);
    }

    let alertMessage = `重複データクリーンアップ完了\n処理時間: ${processingTime}秒\n\n`;
    alertMessage += `🧹 削除された行数: ${cleanupResults.totalRowsDeleted}\n`;
    
    if (cleanupResults.emptyRowsCleaned > 0) {
      alertMessage += `  - 空のデータ行: ${cleanupResults.emptyRowsCleaned}件\n`;
    }
    
    if (cleanupResults.duplicateRecordIdsFound > 0) {
      alertMessage += `\n⚠️ 記録ID重複（警告のみ）: ${cleanupResults.duplicateRecordIdsFound}件\n`;
      alertMessage += `※記録IDの重複は手動で確認してください\n`;
    }

    if (cleanupResults.errors.length > 0) {
      alertMessage += `\n⚠️ エラー: ${cleanupResults.errors.length}件\n詳細はログを確認してください`;
      cleanupResults.errors.forEach(error => Logger.log(`❌ ${error}`));
    }

    if (cleanupResults.totalRowsDeleted === 0 && cleanupResults.duplicateRecordIdsFound === 0) {
      alertMessage += '\n✅ クリーンアップが必要なデータはありませんでした';
    } else {
      alertMessage += '\n\n✅ データベースのクリーンアップが完了しました';
      alertMessage += '\n※同一物件・同一部屋名の重複は仕様として保持されています';
      alertMessage += '\n※未処理のメーター読み取りデータは保護されています';
    }

    safeAlert('クリーンアップ完了', alertMessage);

    return cleanupResults;

  } catch (e) {
    Logger.log(`❌ 重複データクリーンアップエラー: ${e.message}\n${e.stack}`);
    safeAlert('エラー', `重複データクリーンアップ中にエラーが発生しました: ${e.message}`);
    return null;
  }
}

// --- Phase 3: バッチ処理機能 ---

// 全体最適化バッチ処理（全機能を順次実行）
function runComprehensiveDataOptimization() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🚀 総合データ最適化バッチ処理を開始します...');
    const overallStartTime = new Date();
    
    const batchResults = {
      steps: [],
      totalProcessingTime: 0,
      overallSuccess: true
    };

    safeAlert('開始', '総合データ最適化を開始します。この処理には数分かかる場合があります。');

    // Step 1: 物件マスタIDフォーマット
    Logger.log('📋 Step 1: 物件マスタIDフォーマット実行中...');
    try {
      const step1Start = new Date();
      formatPropertyIdsInPropertyMaster();
      const step1Time = (new Date() - step1Start) / 1000;
      batchResults.steps.push({ name: '物件マスタIDフォーマット', success: true, time: step1Time });
      Logger.log(`✅ Step 1完了 (${step1Time}秒)`);
    } catch (e) {
      batchResults.steps.push({ name: '物件マスタIDフォーマット', success: false, error: e.message });
      batchResults.overallSuccess = false;
      Logger.log(`❌ Step 1エラー: ${e.message}`);
    }

    // Step 2: 部屋マスタIDフォーマット
    Logger.log('📋 Step 2: 部屋マスタIDフォーマット実行中...');
    try {
      const step2Start = new Date();
      formatPropertyIdsInRoomMaster();
      const step2Time = (new Date() - step2Start) / 1000;
      batchResults.steps.push({ name: '部屋マスタIDフォーマット', success: true, time: step2Time });
      Logger.log(`✅ Step 2完了 (${step2Time}秒)`);
    } catch (e) {
      batchResults.steps.push({ name: '部屋マスタIDフォーマット', success: false, error: e.message });
      batchResults.overallSuccess = false;
      Logger.log(`❌ Step 2エラー: ${e.message}`);
    }

    // Step 3: 部屋マスタ孤立データ削除
    Logger.log('📋 Step 3: 部屋マスタ孤立データ削除実行中...');
    try {
      const step3Start = new Date();
      cleanUpOrphanedRooms();
      const step3Time = (new Date() - step3Start) / 1000;
      batchResults.steps.push({ name: '部屋マスタ孤立データ削除', success: true, time: step3Time });
      Logger.log(`✅ Step 3完了 (${step3Time}秒)`);
    } catch (e) {
      batchResults.steps.push({ name: '部屋マスタ孤立データ削除', success: false, error: e.message });
      batchResults.overallSuccess = false;
      Logger.log(`❌ Step 3エラー: ${e.message}`);
    }

    // Step 4: 新規部屋反映
    Logger.log('📋 Step 4: 新規部屋反映実行中...');
    try {
      const step4Start = new Date();
      populateInspectionDataFromMasters();
      const step4Time = (new Date() - step4Start) / 1000;
      batchResults.steps.push({ name: '新規部屋反映', success: true, time: step4Time });
      Logger.log(`✅ Step 4完了 (${step4Time}秒)`);
    } catch (e) {
      batchResults.steps.push({ name: '新規部屋反映', success: false, error: e.message });
      batchResults.overallSuccess = false;
      Logger.log(`❌ Step 4エラー: ${e.message}`);
    }

    // Step 5: データ整合性チェック
    Logger.log('📋 Step 5: データ整合性チェック実行中...');
    try {
      const step5Start = new Date();
      const integrityResults = validateInspectionDataIntegrity();
      const step5Time = (new Date() - step5Start) / 1000;
      batchResults.steps.push({ 
        name: 'データ整合性チェック', 
        success: true, 
        time: step5Time,
        details: integrityResults 
      });
      Logger.log(`✅ Step 5完了 (${step5Time}秒)`);
    } catch (e) {
      batchResults.steps.push({ name: 'データ整合性チェック', success: false, error: e.message });
      batchResults.overallSuccess = false;
      Logger.log(`❌ Step 5エラー: ${e.message}`);
    }

    // Step 6: 重複データクリーンアップ
    Logger.log('📋 Step 6: 重複データクリーンアップ実行中...');
    try {
      const step6Start = new Date();
      const cleanupResults = optimizedCleanupDuplicateInspectionData();
      const step6Time = (new Date() - step6Start) / 1000;
      batchResults.steps.push({ 
        name: '重複データクリーンアップ', 
        success: true, 
        time: step6Time,
        details: cleanupResults 
      });
      Logger.log(`✅ Step 6完了 (${step6Time}秒)`);
    } catch (e) {
      batchResults.steps.push({ name: '重複データクリーンアップ', success: false, error: e.message });
      batchResults.overallSuccess = false;
      Logger.log(`❌ Step 6エラー: ${e.message}`);
    }

    const overallEndTime = new Date();
    batchResults.totalProcessingTime = (overallEndTime - overallStartTime) / 1000;

    // 結果サマリー
    const successfulSteps = batchResults.steps.filter(step => step.success).length;
    const failedSteps = batchResults.steps.filter(step => !step.success).length;
    
    Logger.log('🎯 総合データ最適化バッチ処理完了');
    Logger.log(`📊 総処理時間: ${batchResults.totalProcessingTime}秒`);
    Logger.log(`✅ 成功: ${successfulSteps}件`);
    Logger.log(`❌ 失敗: ${failedSteps}件`);

    let alertMessage = `総合データ最適化完了\n総処理時間: ${batchResults.totalProcessingTime}秒\n\n`;
    alertMessage += `✅ 成功: ${successfulSteps}件\n`;
    
    if (failedSteps > 0) {
      alertMessage += `❌ 失敗: ${failedSteps}件\n\n`;
      alertMessage += '失敗した処理:\n';
      batchResults.steps.filter(step => !step.success).forEach(step => {
        alertMessage += `  - ${step.name}\n`;
      });
      alertMessage += '\n詳細はログを確認してください';
    } else {
      alertMessage += '\n🎉 すべての最適化処理が正常に完了しました！';
      alertMessage += '\n\n✨ データベースの品質と性能が向上しました';
    }

    safeAlert('バッチ処理完了', alertMessage);

    return batchResults;

  } catch (e) {
    Logger.log(`❌ 総合データ最適化バッチ処理エラー: ${e.message}\n${e.stack}`);
    safeAlert('エラー', `総合データ最適化バッチ処理中にエラーが発生しました: ${e.message}`);
    return null;
  }
}

// --- 統合された onOpen 関数 ---
function onOpen() {
  // スプレッドシートが開かれた時に自動実行される関数
  try {
    Logger.log('📋 onOpen関数が実行されました');
    
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('総合カスタム処理');

    menu.addItem('1. 物件マスタの物件IDフォーマット', 'formatPropertyIdsInPropertyMaster');
    menu.addItem('2. 部屋マスタの物件IDフォーマット', 'formatPropertyIdsInRoomMaster');
    menu.addItem('3. 部屋マスタの孤立データ削除', 'cleanUpOrphanedRooms');
    menu.addSeparator();
    menu.addItem('4. 初期検針データ作成', 'createInitialInspectionData');
    menu.addItem('5. マスタから検針データへ新規部屋反映', 'populateInspectionDataFromMasters');
    menu.addSeparator();
    menu.addItem('6. 月次検針データ保存とリセット', 'processInspectionDataMonthly');
    menu.addSeparator();
    menu.addItem('🔍 データ整合性チェック', 'validateInspectionDataIntegrity');
    menu.addItem('🧹 重複データクリーンアップ', 'optimizedCleanupDuplicateInspectionData');
    menu.addItem('⚡ データインデックス作成', 'createDataIndexes');
    menu.addSeparator();
    menu.addItem('🚀 総合データ最適化（全実行）', 'runComprehensiveDataOptimization');

    menu.addToUi();
    Logger.log('✅ 総合カスタム処理メニューが正常に作成されました');
  } catch (e) {
    Logger.log(`❌ onOpen関数内でメニュー作成エラー: ${e.message}`);
    Logger.log(`📋 詳細: ${e.stack}`);
  }
}

// 安全なメニュー作成関数（手動実行およびデバッグ用）
function createCustomMenu() {
  try {
    Logger.log('🔄 createCustomMenu関数が実行されました');
    
    // コンテキストチェック
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      Logger.log('❌ アクティブなスプレッドシートが見つかりません');
      Logger.log('💡 対処法1: スプレッドシートを開いてから実行してください');
      Logger.log('💡 対処法2: setupMenuTrigger()関数を実行してトリガーを設定してください');
      return 'エラー: スプレッドシートコンテキストなし';
    }

    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('総合カスタム処理');

    menu.addItem('1. 物件マスタの物件IDフォーマット', 'formatPropertyIdsInPropertyMaster');
    menu.addItem('2. 部屋マスタの物件IDフォーマット', 'formatPropertyIdsInRoomMaster');
    menu.addItem('3. 部屋マスタの孤立データ削除', 'cleanUpOrphanedRooms');
    menu.addSeparator();
    menu.addItem('4. 初期検針データ作成', 'createInitialInspectionData');
    menu.addItem('5. マスタから検針データへ新規部屋反映', 'populateInspectionDataFromMasters');
    menu.addSeparator();
    menu.addItem('6. 月次検針データ保存とリセット', 'processInspectionDataMonthly');
    menu.addSeparator();
    menu.addItem('🔍 データ整合性チェック', 'validateInspectionDataIntegrity');
    menu.addItem('🧹 重複データクリーンアップ', 'optimizedCleanupDuplicateInspectionData');
    menu.addItem('⚡ データインデックス作成', 'createDataIndexes');
    menu.addSeparator();
    menu.addItem('🚀 総合データ最適化（全実行）', 'runComprehensiveDataOptimization');

    menu.addToUi();
    Logger.log('✅ 総合カスタム処理メニューが正常に作成されました');
    safeAlert('完了', '総合カスタム処理メニューが作成されました。スプレッドシートのメニューバーを確認してください。');
    return '成功: メニュー作成完了';
  } catch (e) {
    Logger.log(`❌ メニュー作成エラー: ${e.message}`);
    Logger.log(`📋 詳細: ${e.stack}`);
    Logger.log('💡 注意: この関数はスプレッドシートのコンテキストから実行する必要があります');
    Logger.log('💡 推奨: setupMenuTrigger()関数を実行してください');
    return `エラー: ${e.message}`;
  }
}

// スクリプトエディタから安全に実行できるメニュー作成用の情報表示関数
function setupMenuTrigger() {
  try {
    Logger.log('📋 Google Apps Scriptのトリガー設定について');
    Logger.log('');
    Logger.log('⚠️  注意: onOpenトリガーは自動的に動作します');
    Logger.log('🔧 現在のスクリプトには既にonOpen関数が含まれています');
    Logger.log('');
    Logger.log('✅ 以下の手順でカスタムメニューを表示してください:');
    Logger.log('1. このGoogle Apps Scriptプロジェクトが関連付けられたスプレッドシートを開く');
    Logger.log('2. スプレッドシートを再読み込み（F5キー）する');
    Logger.log('3. メニューバーに「総合カスタム処理」が自動表示される');
    Logger.log('');
    Logger.log('🔍 既存のトリガーを確認します...');
    
    // 既存のトリガーを確認
    const triggers = ScriptApp.getProjectTriggers();
    Logger.log(`📊 現在設定されているトリガー数: ${triggers.length}`);
    
    triggers.forEach((trigger, index) => {
      const handlerFunction = trigger.getHandlerFunction();
      const eventType = trigger.getEventType();
      Logger.log(`${index + 1}. 関数: ${handlerFunction}, イベント: ${eventType}`);
    });
    
    Logger.log('');
    Logger.log('💡 もしメニューが表示されない場合:');
    Logger.log('   - ブラウザのキャッシュをクリア');
    Logger.log('   - 別のブラウザで試す');
    Logger.log('   - checkSpreadsheetInfo()関数で診断を実行');
    
    return 'トリガー情報確認完了';
  } catch (e) {
    Logger.log(`❌ 情報確認エラー: ${e.message}`);
    Logger.log(`📋 詳細: ${e.stack}`);
    return `エラー: ${e.message}`;
  }
}

// スプレッドシートの情報を確認する診断関数（スクリプトエディタから安全に実行可能）
function checkSpreadsheetInfo() {
  try {
    // 現在のプロジェクトに関連付けられたスプレッドシートを探す
    const files = DriveApp.getFiles();
    let spreadsheetFound = false;
    
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        try {
          const spreadsheet = SpreadsheetApp.openById(file.getId());
          const script = spreadsheet.getScriptId();
          
          if (script) {
            Logger.log(`📊 発見されたスプレッドシート: ${file.getName()}`);
            Logger.log(`🔗 URL: ${file.getUrl()}`);
            Logger.log(`📝 ID: ${file.getId()}`);
            spreadsheetFound = true;
            break;
          }
        } catch (e) {
          // このスプレッドシートはスクリプトが関連付けられていない
        }
      }
    }
    
    if (!spreadsheetFound) {
      Logger.log('❌ スクリプトに関連付けられたスプレッドシートが見つかりません');
      Logger.log('💡 対処法: 新しいGoogle Sheetsを作成し、拡張機能 > Apps Script でこのスクリプトを貼り付けてください');
    }
    
    return spreadsheetFound ? 'スプレッドシート発見' : 'スプレッドシート未発見';
  } catch (e) {
    Logger.log(`診断エラー: ${e.message}`);
    return `エラー: ${e.message}`;
  }
}

// onOpenトリガー用のメニュー作成関数
function createCustomMenuOnOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('総合カスタム処理');

    menu.addItem('1. 物件マスタの物件IDフォーマット', 'formatPropertyIdsInPropertyMaster');
    menu.addItem('2. 部屋マスタの物件IDフォーマット', 'formatPropertyIdsInRoomMaster');
    menu.addItem('3. 部屋マスタの孤立データ削除', 'cleanUpOrphanedRooms');
    menu.addSeparator();
    menu.addItem('4. 初期検針データ作成', 'createInitialInspectionData');
    menu.addItem('5. マスタから検針データへ新規部屋反映', 'populateInspectionDataFromMasters');
    menu.addSeparator();
    menu.addItem('6. 月次検針データ保存とリセット', 'processInspectionDataMonthly');
    menu.addSeparator();
    menu.addItem('🔍 データ整合性チェック', 'validateInspectionDataIntegrity');
    menu.addItem('🧹 重複データクリーンアップ', 'optimizedCleanupDuplicateInspectionData');
    menu.addItem('⚡ データインデックス作成', 'createDataIndexes');
    menu.addSeparator();
    menu.addItem('🚀 総合データ最適化（全実行）', 'runComprehensiveDataOptimization');

    menu.addToUi();
    Logger.log('総合カスタム処理メニューが正常に作成されました。');
  } catch (e) {
    Logger.log(`onOpenメニュー作成エラー: ${e.message}`);
  }
}

// onEditトリガー対応のメニュー自動作成（より安全）
function onEdit(e) {
  // 編集イベント発生時に1回だけメニュー作成を試行
  try {
    const properties = PropertiesService.getDocumentProperties();
    const menuCreated = properties.getProperty('customMenuCreated');
    
    if (!menuCreated) {
      // まだメニューが作成されていない場合のみ実行
      setTimeout(() => {
        try {
          createCustomMenu();
          properties.setProperty('customMenuCreated', 'true');
        } catch (e) {
          Logger.log(`onEdit内でのメニュー作成に失敗: ${e.message}`);
        }
      }, 1000); // 1秒遅延して実行
    }
  } catch (e) {
    // エラーが発生してもonEditの処理は継続
    Logger.log(`onEdit関数内でエラーが発生: ${e.message}`);
  }
}

// 直接的なメニュー作成のための簡単な指示関数
function showMenuInstructions() {
  Logger.log('🎯 総合カスタム処理メニューを表示する方法');
  Logger.log('');
  Logger.log('✅ 最も簡単な方法:');
  Logger.log('1. このスクリプトが含まれているGoogle Sheetsを開く');
  Logger.log('2. スプレッドシートで「拡張機能」→「Apps Script」を選択');
  Logger.log('3. 関数選択で「forceCreateMenu」を選び、実行ボタンをクリック');
  Logger.log('4. スプレッドシートに戻ると「総合カスタム処理」メニューが表示される');
  Logger.log('');
  Logger.log('🔄 または、スプレッドシートを再読み込み（F5）すれば自動的にメニューが表示されます');
  
  return '手順説明完了';
}

// スプレッドシートのコンテキストで強制的にメニューを作成
function forceCreateMenu() {
  try {
    Logger.log('🔄 強制メニュー作成を開始します...');
    
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('総合カスタム処理');

    menu.addItem('1. 物件マスタの物件IDフォーマット', 'formatPropertyIdsInPropertyMaster');
    menu.addItem('2. 部屋マスタの物件IDフォーマット', 'formatPropertyIdsInRoomMaster');
    menu.addItem('3. 部屋マスタの孤立データ削除', 'cleanUpOrphanedRooms');
    menu.addSeparator();
    menu.addItem('4. 初期検針データ作成', 'createInitialInspectionData');
    menu.addItem('5. マスタから検針データへ新規部屋反映', 'populateInspectionDataFromMasters');
    menu.addSeparator();
    menu.addItem('6. 月次検針データ保存とリセット', 'processInspectionDataMonthly');
    menu.addSeparator();
    menu.addItem('🔍 データ整合性チェック', 'validateInspectionDataIntegrity');
    menu.addItem('🧹 重複データクリーンアップ', 'optimizedCleanupDuplicateInspectionData');
    menu.addItem('⚡ データインデックス作成', 'createDataIndexes');
    menu.addSeparator();
    menu.addItem('🚀 総合データ最適化（全実行）', 'runComprehensiveDataOptimization');

    menu.addToUi();
    
    Logger.log('✅ 総合カスタム処理メニューが正常に作成されました！');
    Logger.log('📋 スプレッドシートのメニューバーを確認してください');
      // Toastメッセージでユーザーに通知
    try {
      const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSpreadsheet) {
        activeSpreadsheet.toast(
          '総合カスタム処理メニューが作成されました！メニューバーを確認してください。', 
          '成功', 
          5
        );
      }
    } catch (toastError) {
      Logger.log(`Toast通知エラー: ${toastError.message}`);
    }
    
    return '成功: メニュー作成完了';
  } catch (e) {
    Logger.log(`❌ 強制メニュー作成エラー: ${e.message}`);
    Logger.log(`📋 詳細: ${e.stack}`);    // エラーの場合もToastで通知
    try {
      const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSpreadsheet) {
        activeSpreadsheet.toast(
          `メニュー作成エラー: ${e.message}`, 
          'エラー', 
          5
        );
      }
    } catch (toastError) {
      Logger.log(`Toast通知エラー: ${toastError.message}`);
    }
    
    return `エラー: ${e.message}`;
  }
}

// ======= 以上、すべてアーカイブファイルです =======
// 使用しないでください。アクティブファイルを使用してください。