// 物件IDフォーマット変更.gs

const PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING = '物件マスタ'; // 対象のシート名
const PROPERTY_ID_COLUMN_INDEX = 0; // 物件IDの列インデックス (A列なので0)
const HEADER_ROWS = 1; // ヘッダー行の数

/**
 * 物件マスタシートの物件IDを指定されたフォーマットに変換する関数。
 * この関数をGoogle Apps Scriptエディタから実行します。
 */
function formatPropertyIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING);

  if (!sheet) {
    Logger.log(`エラー: "${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}" シートが見つかりません。`);
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= HEADER_ROWS) {
    Logger.log(`"${PROPERTY_MASTER_SHEET_NAME_FOR_FORMATTING}" シートに処理対象のデータがありません（ヘッダー行のみ、または空）。`);
    return;
  }

  // ヘッダー行を除いたデータを処理
  for (let i = HEADER_ROWS; i < values.length; i++) {
    const originalValue = values[i][PROPERTY_ID_COLUMN_INDEX];
    let numericStringPart = '';
    let needsFormatting = false;

    if (originalValue !== null && originalValue !== '') {
      const valStr = String(originalValue);

      if (valStr.startsWith('P')) {
        numericStringPart = valStr.substring(1);
        if (!isNaN(Number(numericStringPart))) {
          // "P"で始まり、残りが数値の場合 (例: P123, P00123, P000001)
          needsFormatting = true;
        } else {
          // "P"で始まるが、残りが数値ではない場合 (例: Pabc) - スキップ
          Logger.log(`行 ${i + 1}: 値 "${originalValue}" はPで始まりますが、続く部分が数値ではないためスキップします。`);
          continue;
        }
      } else if (!isNaN(Number(valStr))) {
        // 純粋な数値の場合 (例: 123, 00123)
        numericStringPart = valStr;
        needsFormatting = true;
      } else {
        // "P"始まりでも純粋な数値でもない場合 (例: abc) - スキップ
        Logger.log(`行 ${i + 1}: 値 "${originalValue}" は処理対象の形式ではないためスキップします。`);
        continue;
      }

      if (needsFormatting) {
        // padStartは文字列に対して作用するため、一度Numberに変換して先頭の不要なゼロを除去し、再度Stringに変換する
        const numericValue = Number(numericStringPart); 
        const formattedId = 'P' + String(numericValue).padStart(6, '0');

        if (valStr !== formattedId) {
          values[i][PROPERTY_ID_COLUMN_INDEX] = formattedId;
          updatedCount++;
          Logger.log(`行 ${i + 1}: "${originalValue}" を "${formattedId}" に更新しました。`);
        } else {
          // 既にP+6桁形式の場合
          Logger.log(`行 ${i + 1}: "${originalValue}" は既に正しいP+6桁形式です。スキップします。`);
        }
      }
    }
  }

  if (updatedCount > 0) {
    dataRange.setValues(values);
    Logger.log(`${updatedCount} 件の物件IDをフォーマットしました。`);
  } else {
    Logger.log('更新対象の物件IDはありませんでした。全てのIDが既に正しい形式であるか、処理対象外です。');
  }
}

/**
 * スクリプト実行時にカスタムメニューをエディタに追加する関数
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('カスタムフォーマット')
      .addItem('物件IDフォーマット実行', 'formatPropertyIds')
      .addToUi();
}
