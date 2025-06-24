function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('カスタム処理')
      .addItem('検針データ保存処理を実行', 'processInspectionData')
      .addToUi();
}

function processInspectionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheetName = "inspection_data"; // 元データのシート名
  const sourceSheet = ss.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    SpreadsheetApp.getUi().alert(`シート "${sourceSheetName}" が見つかりません。`);
    return;
  }

  // 1. スクリプト実行の年月を取得し、新しいシート名を作成
  const now = new Date();
  const year = now.getFullYear();
  const month = ("0" + (now.getMonth() + 1)).slice(-2); // 月を2桁表示 (01, 02, ..., 12)
  const newSheetName = `${year}年${month}月`;

  // 2. 新しいシートを作成（既に存在する場合は確認）
  let targetSheet = ss.getSheetByName(newSheetName);
  if (targetSheet) {
    // 同名のシートが既に存在する場合の処理（例：上書きするか、別名にするかなど）
    // ここでは、既存のシートを一度削除して再作成する（または追記するなどの仕様に応じて変更）
    // SpreadsheetApp.getUi().alert(`シート "${newSheetName}" は既に存在します。処理を中断します。`);
    // return;
    ss.deleteSheet(targetSheet); // 既存のシートを削除する場合
  }
  targetSheet = ss.insertSheet(newSheetName);

  // 3. inspection_dataシートからデータを取得
  const sourceDataRange = sourceSheet.getDataRange();
  const sourceValues = sourceDataRange.getValues();
  const sourceHeaders = sourceValues[0];

  // コピーする列のインデックスを特定
  const columnsToCopy = [
    "記録ID", "物件名", "物件ID", "部屋ID", "部屋名",
    "検針日時", "今回使用量", "今回の指示数", "前回指示数", "写真URL"
  ];
  const columnIndicesToCopy = columnsToCopy.map(header => sourceHeaders.indexOf(header));

  // 必要な列が見つからない場合はエラー
  if (columnIndicesToCopy.some(index => index === -1)) {
    const missingColumns = columnsToCopy.filter((_, i) => columnIndicesToCopy[i] === -1);
    SpreadsheetApp.getUi().alert(`必要な列が見つかりません: ${missingColumns.join(", ")}`);
    // 作成したシートを削除
    if (ss.getSheetByName(newSheetName)) {
        ss.deleteSheet(ss.getSheetByName(newSheetName));
    }
    return;
  }

  // 4. 新しいシートにデータをコピー
  const dataToCopyToNewSheet = sourceValues.map(row => {
    return columnIndicesToCopy.map(index => row[index]);
  });
  targetSheet.getRange(1, 1, dataToCopyToNewSheet.length, dataToCopyToNewSheet[0].length).setValues(dataToCopyToNewSheet);
  
  // 新しく作成したシートの1行目にフィルタを設定
  if (dataToCopyToNewSheet.length > 0) { // データが存在する場合のみフィルタを設定
    targetSheet.getRange(1, 1, dataToCopyToNewSheet.length, dataToCopyToNewSheet[0].length).createFilter();
  }
  
  SpreadsheetApp.getUi().alert(`データがシート "${newSheetName}" にコピーされ、フィルタが設定されました。`);

  // 5. inspection_dataシート内の指示数をシフト
  const currentReadingIndex = sourceHeaders.indexOf("今回の指示数");
  const previousReadingIndex = sourceHeaders.indexOf("前回指示数");
  const prevPrevReadingIndex = sourceHeaders.indexOf("前々回指示数");
  const threeTimesPreviousReadingIndex = sourceHeaders.indexOf("前々々回指示数");
  const photoUrlIndex = sourceHeaders.indexOf("写真URL"); // 写真URL列のインデックスを取得

  if (currentReadingIndex === -1 || previousReadingIndex === -1 || prevPrevReadingIndex === -1 || threeTimesPreviousReadingIndex === -1 || photoUrlIndex === -1) {
    SpreadsheetApp.getUi().alert("指示数関連の列（今回の指示数, 前回指示数, 前々回指示数, 前々々回指示数）または写真URL列のいずれかが見つかりません。");
    return;
  }

  // ヘッダー行を除いたデータ行を処理
  for (let i = 1; i < sourceValues.length; i++) {
    const row = sourceValues[i];
    // 「前々々回指示数」に「前々回指示数」の値を設定
    sourceSheet.getRange(i + 1, threeTimesPreviousReadingIndex + 1).setValue(row[prevPrevReadingIndex]);
    // 「前々回指示数」に「前回指示数」の値を設定
    sourceSheet.getRange(i + 1, prevPrevReadingIndex + 1).setValue(row[previousReadingIndex]);
    // 「前回指示数」に「今回の指示数」の値を設定
    sourceSheet.getRange(i + 1, previousReadingIndex + 1).setValue(row[currentReadingIndex]);
    // 「今回の指示数」を空にする
    sourceSheet.getRange(i + 1, currentReadingIndex + 1).setValue("");
    // 「写真URL」を空にする
    sourceSheet.getRange(i + 1, photoUrlIndex + 1).setValue("");
  }

  SpreadsheetApp.getUi().alert(`シート "${sourceSheetName}" の指示数データと写真URLが更新されました。`);
}
