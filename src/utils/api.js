// 改良されたGAS API通信ユーティリティ

const gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbxo-Zij6If9eSFO-hB2bC_mvYtEGFxaUdwsngqGKcygh2GTHWqHPDrdHSJVC_JTpq2KSw/exec';

// 堅牢なfetch実装
async function robustFetch(url, options = {}) {
  const defaultOptions = {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    redirect: 'follow',
    ...options
  };

  console.log(`🌐 API リクエスト: ${url}`);
  console.log('リクエストオプション:', defaultOptions);

  try {
    const response = await fetch(url, defaultOptions);
    
    console.log('レスポンス情報:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url,
      redirected: response.redirected
    });

    // レスポンステキストを取得
    const responseText = await response.text();
    console.log('レスポンステキスト（最初の500文字）:', responseText.substring(0, 500));

    // HTTPエラーの場合
    if (!response.ok) {
      console.error(`HTTP エラー ${response.status}:`, responseText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // JSONパースを試行
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ JSONパース成功');
      return data;
    } catch (parseError) {
      console.error('❌ JSONパースエラー:', parseError);
      
      // HTMLレスポンスかチェック
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('HTMLレスポンスを受信しました - GASスクリプトが正しくデプロイされていない可能性があります');
        throw new Error('GASからHTMLレスポンスを受信しました。スクリプトの設定を確認してください。');
      }
      
      // その他のテキストレスポンス
      if (responseText.trim()) {
        console.error('予期しないレスポンス形式:', responseText);
        throw new Error('GASからのレスポンスがJSON形式ではありません');
      }
      
      throw new Error('空のレスポンスを受信しました');
    }
  } catch (networkError) {
    console.error('❌ ネットワークエラー:', networkError);
    
    // CORS エラーの特別処理
    if (networkError.message.includes('CORS') || networkError.message.includes('fetch')) {
      throw new Error('ネットワーク接続エラー: GASスクリプトへの接続に失敗しました。CORS設定またはネットワーク接続を確認してください。');
    }
    
    throw networkError;
  }
}

// プロパティデータ取得
export async function fetchProperties() {
  const url = `${gasWebAppUrl}?action=getProperties&cache=${Date.now()}`;
  
  try {
    const data = await robustFetch(url);
    
    // データ形式の検証と正規化
    let actualData = null;
    
    if (data.success === true && Array.isArray(data.data)) {
      // 統一レスポンス形式: {success: true, data: [...]}
      actualData = data.data;
      console.log('✅ 統一形式のプロパティデータ:', actualData.length, '件');
    } else if (Array.isArray(data)) {
      // 直接配列形式: [...]
      actualData = data;
      console.log('✅ 直接配列形式のプロパティデータ:', actualData.length, '件');
    } else if (data.properties && Array.isArray(data.properties)) {
      // 旧形式: {properties: [...]}
      actualData = data.properties;
      console.log('✅ 旧形式のプロパティデータ:', actualData.length, '件');
    } else if (data.success === false) {
      // エラーレスポンス
      console.error('❌ GAS エラー:', data.error);
      throw new Error(`GAS エラー: ${data.error || '不明なエラー'}`);
    } else {
      console.error('❌ 予期しないデータ形式:', data);
      throw new Error('プロパティデータの形式が認識できません');
    }
    
    if (!Array.isArray(actualData)) {
      throw new Error('プロパティデータが配列形式ではありません');
    }
    
    return actualData;
    
  } catch (error) {
    console.error('❌ プロパティ取得エラー:', error.message);
    throw error;
  }
}

// 部屋データ取得
export async function fetchRooms(propertyId) {
  const url = `${gasWebAppUrl}?action=getRooms&propertyId=${encodeURIComponent(propertyId)}&cache=${Date.now()}`;
  
  try {
    const data = await robustFetch(url);
    
    // データ形式の検証と正規化
    let actualData = null;
    
    if (data.success === true && Array.isArray(data.data)) {
      // 統一レスポンス形式
      actualData = data.data;
      console.log('✅ 統一形式の部屋データ:', actualData.length, '件');
    } else if (Array.isArray(data)) {
      // 直接配列形式
      actualData = data;
      console.log('✅ 直接配列形式の部屋データ:', actualData.length, '件');
    } else if (data.success === false) {
      // エラーレスポンス
      console.error('❌ 部屋データ取得エラー:', data.error);
      throw new Error(`部屋データ取得エラー: ${data.error || '不明なエラー'}`);
    } else {
      console.warn('⚠️ 予期しない部屋データ形式:', data);
      actualData = [];
    }
    
    return actualData || [];
    
  } catch (error) {
    console.error('❌ 部屋データ取得エラー:', error.message);
    throw error;
  }
}

// ダミーデータ（開発・テスト用）
export const mockData = {
  properties: [
    {
      id: 'P001',
      name: 'サンプル物件A',
      completionDate: '2024-01-15'
    },
    {
      id: 'P002', 
      name: 'サンプル物件B',
      completionDate: ''
    },
    {
      id: 'P003',
      name: 'サンプル物件C（長い名前のテスト用物件）',
      completionDate: '2024-01-10'
    }
  ],
  rooms: [
    {
      id: 'R001',
      name: '101号室',
      propertyId: 'P001',
      hasActualReading: false
    },
    {
      id: 'R002',
      name: '102号室', 
      propertyId: 'P001',
      hasActualReading: true
    }
  ]
};

// フォールバック付きプロパティ取得
export async function fetchPropertiesWithFallback() {
  try {
    return await fetchProperties();
  } catch (error) {
    console.warn('🔄 GAS接続に失敗、ダミーデータを使用:', error.message);
    return mockData.properties;
  }
}

// フォールバック付き部屋データ取得
export async function fetchRoomsWithFallback(propertyId) {
  try {
    return await fetchRooms(propertyId);
  } catch (error) {
    console.warn('🔄 部屋データ取得に失敗、ダミーデータを使用:', error.message);
    return mockData.rooms.filter(room => room.propertyId === propertyId);
  }
}