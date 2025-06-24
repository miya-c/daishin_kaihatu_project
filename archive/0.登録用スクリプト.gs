/* 物件登録用のスクリプト
   物件の追加登録が発生する際に実行してください
*/
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId(); // 現在のスプレッドシートID
const PROPERTY_MASTER_SHEET_NAME = '物件マスタ';
const ROOM_MASTER_SHEET_NAME = '部屋マスタ';
const INSPECTION_DATA_SHEET_NAME = 'inspection_data'; 

// 検針データシートのヘッダー（新しい列順）
const INSPECTION_DATA_HEADERS = [
  '記録ID', '物件名', '物件ID', '部屋ID', '部屋名', // ← '部屋名' を追加
  '検針日時', '警告フラグ', '写真URL', '標準偏差値', 
  '今回使用量', '今回の指示数', '前回指示数', '前々回指示数'
];

/**
 * 物件マスタと部屋マスタの情報を関連付け、検針データシートに初期データを生成する関数。
 * この関数をGoogle Apps Scriptエディタから実行します。
 */
function createInitialInspectionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const propertyMasterSheet = ss.getSheetByName(PROPERTY_MASTER_SHEET_NAME);
  const roomMasterSheet = ss.getSheetByName(ROOM_MASTER_SHEET_NAME);
  let inspectionDataSheet = ss.getSheetByName(INSPECTION_DATA_SHEET_NAME);

  if (!propertyMasterSheet) {
    Logger.log(`エラー: "${PROPERTY_MASTER_SHEET_NAME}" シートが見つかりません。`); // MODIFIED
    return;
  }
  if (!roomMasterSheet) {
    Logger.log(`エラー: "${ROOM_MASTER_SHEET_NAME}" シートが見つかりません。`); // MODIFIED
    return;
  }
  // 検針データシートの存在確認・自動作成
  if (!inspectionDataSheet) {
    Logger.log(`"${INSPECTION_DATA_SHEET_NAME}" シートが見つかりません。新規作成します。`);
    // inspection_dataシートを新規作成
    inspectionDataSheet = ss.insertSheet(INSPECTION_DATA_SHEET_NAME);
    Logger.log(`"${INSPECTION_DATA_SHEET_NAME}" シートを新規作成しました。`);
  }

  // ヘッダー行を設定 (まだ設定されていない場合、またはシートが空の場合)
  const headerRange = inspectionDataSheet.getRange(1, 1, 1, INSPECTION_DATA_HEADERS.length);
  if (headerRange.getValues()[0].join('') === '') { // ヘッダーが空の場合
    headerRange.setValues([INSPECTION_DATA_HEADERS]);
    inspectionDataSheet.setFrozenRows(1); // ヘッダー行を固定
    Logger.log(`'${INSPECTION_DATA_SHEET_NAME}' シートにヘッダーを設定しました。`);
  }

  // 既存の部屋IDを検針データシートから取得 (ヘッダー行を除く)
  const existingRoomIds = new Set();
  const inspectionDataValues = inspectionDataSheet.getDataRange().getValues();
  if (inspectionDataValues.length > 1) { // ヘッダー行以外にデータがある場合
    for (let j = 1; j < inspectionDataValues.length; j++) {
      const existingRoomIdCell = inspectionDataValues[j][3]; // 部屋IDはINSPECTION_DATA_HEADERSの4番目 (0-indexedで3)
      if (existingRoomIdCell) {
        existingRoomIds.add(existingRoomIdCell.toString().trim());
      }
    }
  }
  Logger.log('既存の部屋ID (inspection_dataより): ' + JSON.stringify(Array.from(existingRoomIds)));

  // 物件マスタのデータを取得 (ヘッダー行を除く)
  // 物件IDをキー、物件名を値とするオブジェクトを作成
  const propertyData = propertyMasterSheet.getDataRange().getValues();
  const propertyMap = {};
  if (propertyData.length > 1) {
    for (let i = 1; i < propertyData.length; i++) {
      const propertyId = propertyData[i][0]; // 物件IDが1列目
      const propertyName = propertyData[i][1]; // 物件名が2列目
      if (propertyId) {
        propertyMap[propertyId.toString().trim()] = propertyName ? propertyName.toString().trim() : '';
      }
    }
  }
  Logger.log('物件マスタデータ raw: ' + JSON.stringify(propertyMap)); // 既存のログの前に "raw" を追加して区別
  Logger.log('propertyMap のキーと値詳細:');
  for (const key in propertyMap) {
    if (propertyMap.hasOwnProperty(key)) {
      Logger.log(`  Map Key: "${key}", Map Value: "${propertyMap[key]}"`);
    }
  }


  // 部屋マスタのデータを取得 (ヘッダー行を除く)
  const roomData = roomMasterSheet.getDataRange().getValues();
  const newInspectionEntries = [];

  if (roomData.length > 1) {
    for (let i = 1; i < roomData.length; i++) {
      const propertyIdFk = roomData[i][0]; // 物件ID(FK)が1列目
      const roomId = roomData[i][1];       // 部屋IDが2列目
      const roomName = roomData[i][2];     // 部屋名（部屋番号）が3列目

      if (!roomId || !propertyIdFk) {
        Logger.log(`部屋マスタの ${i + 1} 行目は部屋IDまたは物件IDが空のためスキップします。`);
        continue;
      }

      const currentRoomIdTrimmed = roomId.toString().trim();
      // 既存データチェック: currentRoomIdTrimmed が existingRoomIds に存在すればスキップ
      if (existingRoomIds.has(currentRoomIdTrimmed)) {
        Logger.log(`部屋マスタの ${i + 1} 行目: 部屋ID '${currentRoomIdTrimmed}' は既に検針データに存在するためスキップします。`);
        continue; // 次の部屋の処理へ
      }
      
      const propertyIdFkTrimmed = propertyIdFk.toString().trim();
      Logger.log(`部屋マスタ処理中: 行 ${i + 1}, propertyIdFk元値: "${propertyIdFk}", propertyIdFkTrimmed: "${propertyIdFkTrimmed}"`); // 詳細ログ追加

      let propertyNameResult;
      if (propertyMap.hasOwnProperty(propertyIdFkTrimmed)) {
        propertyNameResult = propertyMap[propertyIdFkTrimmed];
        Logger.log(`  -> 物件マスタにキー発見。物件名: "${propertyNameResult}"`);
      } else {
        propertyNameResult = '物件名不明'; // マップにキーが存在しない場合
        Logger.log(`  -> 物件マスタにキー "${propertyIdFkTrimmed}" が見つかりません。`); // メッセージを少し簡潔に
        if (propertyIdFkTrimmed.startsWith('R')) {
          Logger.log(`     備考: 物件ID列の値が \'${propertyIdFkTrimmed}\' (部屋ID形式) です。`);
        }
      }
      const roomNameTrimmed = roomName ? roomName.toString().trim() : '部屋名不明';

      // 新しい検針データエントリを作成
      const recordId = Utilities.getUuid(); // ユニークな記録IDを生成
      const entry = [
        recordId,                     // 1. 記録ID
        propertyNameResult,           // 2. 物件名 (物件マスタから)
        propertyIdFkTrimmed,          // 3. 物件ID (部屋マスタから、物件マスタと共通)
        currentRoomIdTrimmed,         // 4. 部屋ID (部屋マスタから) <- roomId.toString().trim() を currentRoomIdTrimmed に変更
        roomNameTrimmed,              // 5. 部屋名 (部屋マスタから) << NEW
        null,                         // 6. 検針日時 (初期値は空)
        false,                        // 7. 警告フラグ (初期値はfalse)
        null,                         // 8. 写真URL (初期値は空)
        null,                         // 9. 標準偏差値 (初期値は空)
        null,                         // 10. 今回使用量 (初期値は空)
        null,                         // 11. 今回の指示数 (初期値は空)
        null,                         // 12. 前回指示数 (初期値は空)
        null                          // 13. 前々回指示数 (初期値は空)
      ];
      newInspectionEntries.push(entry);
    }
  }

  // 検針データシートに新しいエントリを追記 (データがある場合のみ)
  if (newInspectionEntries.length > 0) {
    // 既存のデータと重複しないように追記する前に、既存の部屋IDのリストを取得することも検討できます。
    // ここでは単純に追記します。
    const lastRow = inspectionDataSheet.getLastRow();
    inspectionDataSheet.getRange(lastRow + 1, 1, newInspectionEntries.length, INSPECTION_DATA_HEADERS.length)
                       .setValues(newInspectionEntries);
    Logger.log(`${newInspectionEntries.length} 件の初期検針データを生成しました。`); // MODIFIED
    Logger.log(`${newInspectionEntries.length} 件の初期検針データを "${INSPECTION_DATA_SHEET_NAME}" に生成しました。`); // MODIFIED
  } else {
    Logger.log('部屋マスタに有効なデータがないため、検針データは生成されませんでした。');
    Logger.log('部屋マスタに有効なデータがないか、既に処理済みのため、検針データは生成されませんでした。'); // MODIFIED
  }
}

/**
 * スクリプト実行時にカスタムメニューをエディタに追加する関数
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('カスタム連携機能')
      .addItem('初期検針データ生成', 'createInitialInspectionData')
      .addToUi();
}
