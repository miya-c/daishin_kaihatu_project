function collectRoomData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const propertyMasterSheet = ss.getSheetByName("物件マスタ");
  const roomMasterSheet = ss.getSheetByName("部屋マスタ");
  const dataSheet = ss.getSheetByName("データ");

  // データシートをクリア (必要に応じて)
  dataSheet.clearContents();
  dataSheet.appendRow(["物件ID", "部屋ID", "部屋名", /* その他の部屋情報 */]); // ヘッダー行

  // 物件マスタのデータを取得 (例: 1列目が物件ID)
  const propertyData = propertyMasterSheet.getDataRange().getValues();
  // ヘッダー行をスキップする場合
  for (let i = 1; i < propertyData.length; i++) {
    const propertyId = propertyData[i][0]; // 例: 物件IDが1列目

    // 部屋マスタから該当する物件IDの部屋情報を取得 (例: 2列目が物件ID)
    const roomData = roomMasterSheet.getDataRange().getValues();
    for (let j = 1; j < roomData.length; j++) {
      if (roomData[j][1] === propertyId) { // 例: 部屋マスタの2列目が物件ID
        const roomId = roomData[j][0];     // 例: 部屋IDが1列目
        const roomName = roomData[j][2];   // 例: 部屋名が3列目
        // その他の部屋情報を取得

        dataSheet.appendRow([propertyId, roomId, roomName, /* その他の部屋情報 */]);
      }
    }
  }
  Logger.log("部屋情報の収集が完了しました。");
}