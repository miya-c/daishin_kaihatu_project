/**
 * data_formatting.gs - データフォーマット機能
 * ID フォーマットの統一とデータクリーンアップ
 */

/**
 * 物件マスタの物件IDフォーマット変更
 */
function formatPropertyIdsInPropertyMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const sheet = ss.getSheetByName('物件マスタ');

  if (!sheet) {
    safeAlert('エラー', '物件マスタシートが見つかりません。');
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    safeAlert('情報', '物件マスタシートにデータがありません。');
    return;
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentId = String(values[i][0]).trim();
      
      if (currentId && !currentId.startsWith('P')) {
        const formattedId = `P${currentId.padStart(6, '0')}`;
        values[i][0] = formattedId;
        updatedCount++;
        Logger.log(`行 ${i + 1}: ${currentId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`物件マスタのフォーマット変更完了: ${updatedCount}件`);
      safeAlert('完了', `物件マスタのIDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`);
    } else {
      safeAlert('情報', '更新が必要な物件IDはありませんでした。');
    }
  } catch (e) {
    Logger.log(`エラー: 物件マスタフォーマット変更中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `物件マスタフォーマット変更中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 部屋マスタの物件IDフォーマット変更
 */
function formatPropertyIdsInRoomMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const sheet = ss.getSheetByName('部屋マスタ');

  if (!sheet) {
    safeAlert('エラー', '部屋マスタシートが見つかりません。');
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    safeAlert('情報', '部屋マスタシートにデータがありません。');
    return;
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentId = String(values[i][0]).trim();
      
      if (currentId && !currentId.startsWith('P')) {
        const formattedId = `P${currentId.padStart(6, '0')}`;
        values[i][0] = formattedId;
        updatedCount++;
        Logger.log(`行 ${i + 1}: ${currentId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`部屋マスタのフォーマット変更完了: ${updatedCount}件`);
      safeAlert('完了', `部屋マスタのIDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`);
    } else {
      safeAlert('情報', '更新が必要な物件IDはありませんでした。');
    }
  } catch (e) {
    Logger.log(`エラー: 部屋マスタフォーマット変更中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `部屋マスタフォーマット変更中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 部屋マスタの部屋IDを物件別に連番で自動生成
 * 物件ID別にR001, R002, R003... の形式で部屋IDを割り当てる
 */
function generateRoomIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const sheet = ss.getSheetByName('部屋マスタ');

  if (!sheet) {
    safeAlert('エラー', '部屋マスタシートが見つかりません。');
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    safeAlert('情報', '部屋マスタシートにデータがありません。');
    return;
  }

  // ヘッダー行の確認
  const headers = values[0];
  const propertyIdIndex = headers.indexOf('物件ID');
  const roomIdIndex = headers.indexOf('部屋ID');
  
  if (propertyIdIndex === -1) {
    safeAlert('エラー', '部屋マスタシートに「物件ID」列が見つかりません。');
    return;
  }
  
  if (roomIdIndex === -1) {
    safeAlert('エラー', '部屋マスタシートに「部屋ID」列が見つかりません。');
    return;
  }

  try {
    // 物件IDごとに部屋をグループ化
    const propertyGroups = new Map();
    
    for (let i = 1; i < values.length; i++) {
      const propertyId = String(values[i][propertyIdIndex] || '').trim();
      
      if (propertyId) {
        if (!propertyGroups.has(propertyId)) {
          propertyGroups.set(propertyId, []);
        }
        propertyGroups.get(propertyId).push(i);
      }
    }

    let updatedCount = 0;
    
    // 各物件に対して部屋IDを連番で生成
    propertyGroups.forEach((rowIndexes, propertyId) => {
      // 部屋データを部屋名でソート（もしあれば）
      const roomNameIndex = headers.indexOf('部屋名');
      if (roomNameIndex !== -1) {
        rowIndexes.sort((a, b) => {
          const nameA = String(values[a][roomNameIndex] || '').trim();
          const nameB = String(values[b][roomNameIndex] || '').trim();
          return nameA.localeCompare(nameB);
        });
      }
      
      // 連番で部屋IDを生成
      rowIndexes.forEach((rowIndex, counter) => {
        const newRoomId = `R${String(counter + 1).padStart(3, '0')}`;
        const currentRoomId = String(values[rowIndex][roomIdIndex] || '').trim();
        
        if (currentRoomId !== newRoomId) {
          values[rowIndex][roomIdIndex] = newRoomId;
          updatedCount++;
          Logger.log(`物件 ${propertyId} - 行 ${rowIndex + 1}: 部屋ID を "${newRoomId}" に設定`);
        }
      });
    });

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`部屋ID自動生成完了: ${updatedCount}件`);
      safeAlert('完了', `部屋IDの自動生成が完了しました。\n更新件数: ${updatedCount}件\n\n物件別にR001, R002, R003...の形式で部屋IDを割り当てました。`);
    } else {
      safeAlert('情報', 'すべての部屋IDが既に正しい形式で設定されています。');
    }
    
  } catch (e) {
    Logger.log(`エラー: 部屋ID自動生成中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `部屋ID自動生成中にエラーが発生しました:\n${e.message}`);
  }
}
