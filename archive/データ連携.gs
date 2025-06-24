function populateInspectionDataFromMasters() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const propertyMasterSheetName = '物件マスタ';
  const roomMasterSheetName = '部屋マスタ';
  const inspectionDataSheetName = 'inspection_data';

  const propertyMasterSheet = ss.getSheetByName(propertyMasterSheetName);
  const roomMasterSheet = ss.getSheetByName(roomMasterSheetName);
  const inspectionDataSheet = ss.getSheetByName(inspectionDataSheetName);

  const ui = SpreadsheetApp.getUi();

  if (!propertyMasterSheet) {
    ui.alert('エラー', `シート「${propertyMasterSheetName}」が見つかりません。`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  if (!roomMasterSheet) {
    ui.alert('エラー', `シート「${roomMasterSheetName}」が見つかりません。`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  if (!inspectionDataSheet) {
    ui.alert('エラー', `シート「${inspectionDataSheetName}」が見つかりません。`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  try {
    // 1. 物件マスタのデータを読み込み、物件IDをキーとするオブジェクトを作成
    //    ヘッダー行を考慮し、物件ID (A列), 物件名 (B列) を取得
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
    // データがヘッダー行のみの場合、getValues()はnullを返すことがあるため、getLastRowで判定
    const inspectionData = inspectionDataSheet.getLastRow() > 1 ? inspectionDataRange.getValues().slice(1) : []; // ヘッダーを除外

    const existingInspectionEntries = new Set();
    const propertyIdColIdxInspection = inspectionDataHeaders.indexOf('物件ID');
    const roomIdColIdxInspection = inspectionDataHeaders.indexOf('部屋ID');

    if (propertyIdColIdxInspection === -1 || roomIdColIdxInspection === -1) {
      ui.alert('エラー', `「${inspectionDataSheetName}」シートに「物件ID」または「部屋ID」列が見つかりません。`, SpreadsheetApp.getUi().ButtonSet.OK);
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
    //    ヘッダー行を考慮し、物件ID (A列), 部屋ID (B列), 部屋名 (C列) を取得
    const roomMasterData = roomMasterSheet.getRange(2, 1, roomMasterSheet.getLastRow() - 1, 3).getValues();
    const newRowsToInspectionData = [];
    let addedCount = 0;

    roomMasterData.forEach((row, index) => {
      const roomPropertyId = String(row[0]).trim();
      const roomId = String(row[1]).trim();
      const roomName = String(row[2]).trim();

      if (!roomPropertyId || !roomId) {
        Logger.log(`部屋マスタの ${index + 2} 行目は物件IDまたは部屋IDが空のためスキップします。`);
        return; // continue相当
      }

      // 4. inspection_dataに存在しない組み合わせか確認
      if (!existingInspectionEntries.has(`${roomPropertyId}_${roomId}`)) {
        const propertyName = propertyMap[roomPropertyId] || `物件名不明(${roomPropertyId})`;

        const newRowData = [];
        inspectionDataHeaders.forEach(header => {
          switch (header) {
            case '記録ID':
              newRowData.push(Utilities.getUuid());
              break;
            case '物件名':
              newRowData.push(propertyName);
              break;
            case '物件ID':
              newRowData.push(roomPropertyId);
              break;
            case '部屋ID':
              newRowData.push(roomId);
              break;
            case '部屋名':
              newRowData.push(roomName);
              break;
            // '検針日時', '警告フラグ', '標準偏差値', '今回使用量', '今回の指示数', '前回指示数', '前々回指示数', '写真URL'
            // これらの列は初期状態では空欄またはデフォルト値を設定
            default:
              newRowData.push(''); // 基本は空欄
              break;
          }
        });
        newRowsToInspectionData.push(newRowData);
        addedCount++;
        Logger.log(`追加対象: 物件ID=${roomPropertyId}, 部屋ID=${roomId}, 物件名=${propertyName}, 部屋名=${roomName}`);
      }
    });

    // 5. 新しい行をinspection_dataシートに追加
    if (newRowsToInspectionData.length > 0) {
      inspectionDataSheet.getRange(inspectionDataSheet.getLastRow() + 1, 1, newRowsToInspectionData.length, newRowsToInspectionData[0].length).setValues(newRowsToInspectionData);
      ui.alert('完了', `${addedCount} 件の新しい部屋情報を「${inspectionDataSheetName}」シートに追加しました。`, SpreadsheetApp.getUi().ButtonSet.OK);
      Logger.log(`${addedCount} 件の新しい部屋情報を「${inspectionDataSheetName}」シートに追加しました。`);
    } else {
      ui.alert('情報', '追加する新しい部屋情報はありませんでした。', SpreadsheetApp.getUi().ButtonSet.OK);
      Logger.log('追加する新しい部屋情報はありませんでした。');
    }

  } catch (e) {
    Logger.log(`エラーが発生しました: ${e.message}\\n${e.stack}`);
    ui.alert('スクリプト実行エラー', `エラーが発生しました: ${e.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// スクリプトエディタからこの関数を実行できるように、グローバルスコープに関数を定義します。
// 必要に応じて、カスタムメニューに追加することもできます。
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('カスタム処理')
      .addItem('マスタから検針データへ反映', 'populateInspectionDataFromMasters')
      .addToUi();
}
