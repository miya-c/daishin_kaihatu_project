// 改良されたGAS API通信ユーティリティ

const gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbxo-Zij6If9eSFO-hB2bC_mvYtEGFxaUdwsngqGKcygh2GTHWqHPDrdHSJVC_JTpq2KSw/exec';

// Alternative approach: use a proxy or direct connection method
async function tryDirectConnection(url) {
  const maxRetries = 3;
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 直接接続試行 ${i + 1}/${maxRetries}: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors', // CORS問題を回避
        cache: 'no-cache',
        redirect: 'follow'
      });
      
      console.log('直接接続レスポンス:', {
        status: response.status,
        type: response.type,
        ok: response.ok
      });
      
      if (response.type === 'opaque') {
        console.log('⚠️ Opaqueレスポンス: データを読み取れませんが、リクエストは送信されました');
        throw new Error('CORS制限によりレスポンスを読み取れません');
      }
      
      return response;
      
    } catch (error) {
      console.warn(`直接接続試行 ${i + 1} 失敗:`, error.message);
      lastError = error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 指数バックオフ
      }
    }
  }
  
  throw lastError;
}

// 堅牢なfetch実装
async function robustFetch(url, options = {}) {
  const defaultOptions = {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'omit',
    headers: {
      'Accept': 'application/json'
    },
    redirect: 'follow',
    ...options
  };

  console.log(`🌐 API リクエスト: ${url}`);
  console.log('リクエストオプション:', defaultOptions);

  // タイムアウト付きfetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
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
    clearTimeout(timeoutId);
    console.error('❌ ネットワークエラー:', networkError);
    console.error('エラーの詳細:', {
      name: networkError.name,
      message: networkError.message,
      stack: networkError.stack
    });
    
    // より具体的なエラーメッセージ
    if (networkError.name === 'AbortError') {
      throw new Error('タイムアウトエラー: GASスクリプトからの応答が15秒以内に返されませんでした。');
    }
    
    if (networkError.name === 'TypeError' && networkError.message === 'Failed to fetch') {
      throw new Error('ネットワーク接続エラー: GASスクリプトへの接続に失敗しました。インターネット接続またはGASデプロイ設定を確認してください。');
    }
    
    if (networkError.message.includes('CORS')) {
      throw new Error('CORS エラー: GASスクリプトでCORS設定が正しく構成されていません。');
    }
    
    throw new Error(`ネットワークエラー: ${networkError.message}`);
  }
}

// JSONP fallback for CORS issues
function fetchWithJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    
    // Clean up function
    const cleanup = () => {
      document.head.removeChild(script);
      delete window[callbackName];
    };
    
    // Set up callback
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    
    // Handle errors
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };
    
    // Create script tag
    script.src = `${url}&callback=${callbackName}`;
    document.head.appendChild(script);
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (window[callbackName]) {
        cleanup();
        reject(new Error('JSONP request timed out'));
      }
    }, 15000);
  });
}

// プロパティデータ取得
export async function fetchProperties() {
  const url = `${gasWebAppUrl}?action=getProperties&cache=${Date.now()}`;
  
  try {
    console.log('🌐 標準CORS APIリクエストを試行...');
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
    console.error('❌ CORS APIリクエスト失敗:', error.message);
    
    // CORS失敗時にJSONPを試行
    try {
      console.log('🔄 JSONPフォールバックを試行...');
      const jsonpData = await fetchWithJsonp(url);
      
      // JSONPデータの正規化
      let actualData = null;
      if (jsonpData.success === true && Array.isArray(jsonpData.data)) {
        actualData = jsonpData.data;
        console.log('✅ JSONP形式のプロパティデータ:', actualData.length, '件');
      } else if (Array.isArray(jsonpData)) {
        actualData = jsonpData;
        console.log('✅ JSONP直接配列形式のプロパティデータ:', actualData.length, '件');
      } else {
        throw new Error('JSONPデータの形式が認識できません');
      }
      
      return actualData;
      
    } catch (jsonpError) {
      console.error('❌ JSONPフォールバックも失敗:', jsonpError.message);
      throw error; // 元のエラーを投げる
    }
  }
}

// 部屋データ取得
export async function fetchRooms(propertyId) {
  const url = `${gasWebAppUrl}?action=getRooms&propertyId=${encodeURIComponent(propertyId)}&cache=${Date.now()}`;
  
  try {
    const data = await robustFetch(url);
    
    // データ形式の検証と正規化
    let actualData = null;
    
    if (data.success === true && data.data) {
      // GAS APIの実際のレスポンス形式: {success: true, data: {property: {...}, rooms: [...]}}
      if (data.data.rooms && Array.isArray(data.data.rooms)) {
        actualData = data.data.rooms;
        console.log('✅ GAS形式の部屋データ:', actualData.length, '件');
        console.log('✅ 物件情報:', data.data.property);
      } else if (Array.isArray(data.data)) {
        // 統一レスポンス形式: {success: true, data: [...]}
        actualData = data.data;
        console.log('✅ 統一形式の部屋データ:', actualData.length, '件');
      } else {
        console.warn('⚠️ data.dataの形式が不明:', data.data);
        actualData = [];
      }
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