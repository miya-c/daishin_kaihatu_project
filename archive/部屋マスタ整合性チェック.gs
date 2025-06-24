// 部屋マスタ整合性チェック.gs

const ROOM_MASTER_SHEET_FOR_CLEANUP = '部屋マスタ';
const PROPERTY_MASTER_SHEET_FOR_CLEANUP = '物件マスタ';
const PROP_ID_COL_ROOM_MASTER_CLEANUP = 0; // 物件IDの列インデックス (A列)
const PROP_ID_COL_PROPERTY_MASTER_CLEANUP = 0; // 物件IDの列インデックス (A列)
const HEADER_ROWS_CLEANUP = 1; // ヘッダー行の数

/**
 * 部屋マスタシートの物件IDを物件マスタシートの物件IDと比較し、
 * 物件マスタに存在しない物件IDを持つ部屋マスタの行を削除する関数。
 */
function cleanUpOrphanedRooms() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const roomSheet = ss.getSheetByName(ROOM_MASTER_SHEET_FOR_CLEANUP);
  const propertySheet = ss.getSheetByName(PROPERTY_MASTER_SHEET_FOR_CLEANUP);

  if (!roomSheet) {
    Logger.log(`エラー: "${ROOM_MASTER_SHEET_FOR_CLEANUP}" シートが見つかりません。処理を中止します。`);
    return;
  }
  if (!propertySheet) {
    Logger.log(`エラー: "${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" シートが見つかりません。処理を中止します。`);
    return;
  }

  // 1. 物件マスタから有効な物件IDのセットを取得
  const propertyMasterValues = propertySheet.getDataRange().getValues();
  const validPropertyIds = new Set();
  for (let i = HEADER_ROWS_CLEANUP; i < propertyMasterValues.length; i++) {
    const propId = propertyMasterValues[i][PROP_ID_COL_PROPERTY_MASTER_CLEANUP];
    if (propId !== null && String(propId).trim() !== '') {
      validPropertyIds.add(String(propId).trim());
    }
  }

  if (validPropertyIds.size === 0) {
    Logger.log(`"${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" シートに有効な物件IDが見つかりませんでした。処理を中止します。`);
    return;
  }
  Logger.log(`"${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" から ${validPropertyIds.size} 件の有効な物件IDを読み込みました。`);

  // 2. 部屋マスタのデータを取得し、存在しない物件IDの行を特定して削除
  // 注意: 行を削除するとインデックスが変わるため、逆順（下から上へ）処理する
  const roomSheetValues = roomSheet.getDataRange().getValues(); // 削除操作前に最新のデータを取得
  let deletedRowCount = 0;

  // ヘッダー行を除き、最終行から処理 (iは0-based index)
  for (let i = roomSheetValues.length - 1; i >= HEADER_ROWS_CLEANUP; i--) {
    const propertyIdInRoomCell = roomSheetValues[i][PROP_ID_COL_ROOM_MASTER_CLEANUP];
    
    // 物件IDが空またはnullの場合はスキップ
    if (propertyIdInRoomCell === null || String(propertyIdInRoomCell).trim() === '') {
      Logger.log(`行 ${i + 1} (${ROOM_MASTER_SHEET_FOR_CLEANUP}): 物件IDが空のためスキップします。`);
      continue;
    }
    const propertyIdInRoom = String(propertyIdInRoomCell).trim();

    if (!validPropertyIds.has(propertyIdInRoom)) {
      Logger.log(`行 ${i + 1} (${ROOM_MASTER_SHEET_FOR_CLEANUP}): 物件ID "${propertyIdInRoom}" は "${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" に存在しません。この行を削除します。`);
      roomSheet.deleteRow(i + 1); // deleteRowは1-based index
      deletedRowCount++;
    }
  }

  if (deletedRowCount > 0) {
    Logger.log(`${deletedRowCount} 件の行を "${ROOM_MASTER_SHEET_FOR_CLEANUP}" シートから削除しました。`);
  } else {
    Logger.log(`"${ROOM_MASTER_SHEET_FOR_CLEANUP}" シートに、"${PROPERTY_MASTER_SHEET_FOR_CLEANUP}" に存在しない物件IDを持つ行はありませんでした。`);
  }
}

/**
 * スクリプト実行時にカスタムメニューをエディタに追加する関数
 */
function onOpenCleanupMenu() {
  SpreadsheetApp.getUi()
    .createMenu('データ整合性')
    .addItem('部屋マスタの孤立データ削除', 'cleanUpOrphanedRooms')
    .addToUi();
}
