/**
 * Mock data for the water meter inspection system (水道検針システム)
 *
 * Provides window.__mockData used by the mock dispatcher.
 */

(function () {
  window.__mockData = {
    spreadsheetInfo: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
      spreadsheetName: '水道検針テストデータ',
      sheets: [
        { name: '物件マスタ', rowCount: 4 },
        { name: '部屋マスタ', rowCount: 9 },
        { name: '検針データ', rowCount: 15 },
        { name: '設定', rowCount: 5 },
      ],
    },

    properties: [
      {
        id: 'P001',
        name: 'サンライズマンション',
        roomCount: 3,
        completedCount: 2,
      },
      {
        id: 'P002',
        name: 'グリーンハイツ',
        roomCount: 3,
        completedCount: 0,
      },
      {
        id: 'P003',
        name: 'コーポひまわり',
        roomCount: 2,
        completedCount: 2,
      },
    ],

    rooms: {
      P001: {
        'P001-101': {
          id: 'P001-101',
          name: '101号室',
          isCompleted: true,
          currentReading: 1247,
          previousReading: 1198,
        },
        'P001-102': {
          id: 'P001-102',
          name: '102号室',
          isCompleted: true,
          currentReading: 893,
          previousReading: 845,
        },
        'P001-201': {
          id: 'P001-201',
          name: '201号室',
          isCompleted: false,
          currentReading: null,
          previousReading: 1562,
        },
      },
      P002: {
        'P002-101': {
          id: 'P002-101',
          name: '101号室',
          isCompleted: false,
          currentReading: null,
          previousReading: 2105,
        },
        'P002-102': {
          id: 'P002-102',
          name: '102号室',
          isCompleted: false,
          currentReading: null,
          previousReading: 1876,
        },
        'P002-201': {
          id: 'P002-201',
          name: '201号室',
          isCompleted: false,
          currentReading: null,
          previousReading: 342,
        },
      },
      P003: {
        'P003-101': {
          id: 'P003-101',
          name: '101号室',
          isCompleted: true,
          currentReading: 534,
          previousReading: 498,
        },
        'P003-102': {
          id: 'P003-102',
          name: '102号室',
          isCompleted: true,
          currentReading: 1821,
          previousReading: 1790,
        },
      },
    },

    monthlyPreCheck: {
      checks: [
        {
          type: 'success',
          category: '物件マスタ確認',
          message: '3件の物件が正常に登録されています。',
        },
        {
          type: 'success',
          category: '部屋マスタ確認',
          message: '8件の部屋が正常に登録されています。',
        },
        {
          type: 'warning',
          category: '未検針の部屋があります',
          message:
            'グリーンハイツに3件の未検針部屋があります。月次処理を実行すると未検針の部屋はスキップされます。',
        },
        {
          type: 'info',
          category: '前回処理日',
          message: '前回の月次処理は2026年3月25日に実行されました。',
        },
        {
          type: 'error',
          category: 'データ不整合',
          message: 'サンライズマンション201号室の使用量データに不整合が検出されました。',
        },
      ],
      errorCount: 1,
      warningCount: 1,
      successCount: 2,
      infoCount: 1,
    },

    systemValidation: {
      score: 85,
      status: 'WARNING',
      categories: [
        {
          name: 'スプレッドシート接続',
          passed: true,
          detail: 'スプレッドシートへの接続は正常です。',
        },
        {
          name: 'シート構造',
          passed: true,
          detail: '4つのシートが正常に検出されました。',
        },
        {
          name: 'マスタデータ整合性',
          passed: false,
          detail: '2件のデータ不整合が見つかりました。重複データの可能性があります。',
        },
        {
          name: '検針データ',
          passed: true,
          detail: '検針データに異常は見つかりませんでした。',
        },
        {
          name: '設定シート',
          passed: true,
          detail: '設定シートは正常に読み込まれています。',
        },
      ],
    },

    diagnostics: {
      status: 'WARNING',
      timestamp: new Date().toISOString(),
      sheets: [
        { name: '物件マスタ', healthy: true, rowCount: 4 },
        { name: '部屋マスタ', healthy: true, rowCount: 9 },
        { name: '検針データ', healthy: false, rowCount: 15 },
        { name: '設定', healthy: true, rowCount: 5 },
      ],
      issues: [
        {
          severity: 'warning',
          message: '検針データシートに5件の未検針レコードがあります。',
        },
        {
          severity: 'info',
          message: '最終更新から72時間以上経過しているデータが3件あります。',
        },
      ],
    },
  };
})();
