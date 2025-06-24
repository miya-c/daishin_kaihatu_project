// 部屋マスタ物件IDフォーマット.gs

const ROOM_MASTER_FORMAT_TARGET_SHEET_NAME = '部屋マスタ'; // 対象のシート名
const PROPERTY_ID_COLUMN_INDEX_IN_ROOM_MASTER = 0; // 物件IDの列インデックス (A列なので0)
const HEADER_ROWS_IN_ROOM_MASTER = 1; // ヘッダー行の数

/**
 * 部屋マスタシートの物件IDを指定されたフォーマット（P + 6桁の数字、ゼロ埋め）に変換する関数。
 * この関数をGoogle Apps Scriptエディタから実行します。
 */
function formatPropertyIdsInRoomMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ROOM_MASTER_FORMAT_TARGET_SHEET_NAME);

  if (!sheet) {
    Logger.log(`エラー: "${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートが見つかりません。`);
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= HEADER_ROWS_IN_ROOM_MASTER) {
    Logger.log(`"${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートに処理対象のデータがありません（ヘッダー行のみ、または空）。`);
    return;
  }

  // ヘッダー行を除いたデータを処理
  for (let i = HEADER_ROWS_IN_ROOM_MASTER; i < values.length; i++) {
    const originalValue = values[i][PROPERTY_ID_COLUMN_INDEX_IN_ROOM_MASTER];
    
    if (originalValue === null || originalValue === '') {
      Logger.log(`行 ${i + 1}: 物件IDが空のためスキップします。`);
      continue;
    }

    const valStr = String(originalValue);

    // Pで始まらない純粋な数値（整数または数値文字列）であるか、またはPで始まるが6桁でないものを対象とする
    if (/^P\d{6}$/.test(valStr)) {
      Logger.log(`行 ${i + 1}: 値 "${originalValue}" は既に正しいP+6桁形式です。スキップします。`);
      continue;
    }
    
    let numericPartStr;
    if (valStr.startsWith('P')) {
        numericPartStr = valStr.substring(1);
    } else {
        numericPartStr = valStr;
    }

    if (!isNaN(Number(numericPartStr)) && Number.isInteger(Number(numericPartStr))) {
      // 先頭の不要なゼロを除去するために一度Numberに変換
      const numericValue = Number(numericPartStr);
      const formattedId = 'P' + String(numericValue).padStart(6, '0');

      if (valStr !== formattedId) {
        values[i][PROPERTY_ID_COLUMN_INDEX_IN_ROOM_MASTER] = formattedId;
        updatedCount++;
        Logger.log(`行 ${i + 1}: "${originalValue}" を "${formattedId}" に更新しました。`);
      } else {
        // このケースは上記の test(valStr) で既にキャッチされているはずだが念のため
        Logger.log(`行 ${i + 1}: 値 "${originalValue}" は変換後も同じ "${formattedId}" です。実質的に正しい形式です。`);
      }
    } else {
      Logger.log(`行 ${i + 1}: 値 "${originalValue}" は純粋な整数またはP+数値の形式ではないためスキップします。`);
    }
  }

  if (updatedCount > 0) {
    dataRange.setValues(values);
    Logger.log(`${updatedCount} 件の物件IDを "${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートでフォーマットしました。`);
  } else {
    Logger.log(`"${ROOM_MASTER_FORMAT_TARGET_SHEET_NAME}" シートで更新対象の物件IDはありませんでした。`);
  }
}

/**
 * スクリプト実行時にカスタムメニューをエディタに追加する関数
 */
function onOpenRoomMasterFormat() { // Renamed to avoid conflict if other onOpen exists
  SpreadsheetApp.getUi()
      .createMenu('カスタムフォーマット (部屋マスタ)')
      .addItem('物件IDフォーマット実行 (部屋マスタ)', 'formatPropertyIdsInRoomMaster')
      .addToUi();
}
