// GAS API テストユーティリティ
const gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbxo-Zij6If9eSFO-hB2bC_mvYtEGFxaUdwsngqGKcygh2GTHWqHPDrdHSJVC_JTpq2KSw/exec';

// GAS接続テスト
export async function testGASConnection() {
  console.log('🧪 GAS接続テスト開始');
  console.log('GAS URL:', gasWebAppUrl);
  
  try {
    // 基本的な接続テスト
    const basicResponse = await fetch(gasWebAppUrl, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('基本接続レスポンス:', {
      status: basicResponse.status,
      statusText: basicResponse.statusText,
      headers: Object.fromEntries(basicResponse.headers.entries())
    });
    
    const basicText = await basicResponse.text();
    console.log('基本接続レスポンステキスト:', basicText);
    
  } catch (error) {
    console.error('基本接続エラー:', error);
  }
  
  try {
    // プロパティ取得テスト
    const propertiesUrl = `${gasWebAppUrl}?action=getProperties&cache=${Date.now()}`;
    console.log('プロパティ取得URL:', propertiesUrl);
    
    const propertiesResponse = await fetch(propertiesUrl, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('プロパティ取得レスポンス:', {
      status: propertiesResponse.status,
      statusText: propertiesResponse.statusText,
      headers: Object.fromEntries(propertiesResponse.headers.entries())
    });
    
    const propertiesText = await propertiesResponse.text();
    console.log('プロパティ取得レスポンステキスト:', propertiesText);
    
    // JSONパース試行
    try {
      const propertiesData = JSON.parse(propertiesText);
      console.log('プロパティJSONデータ:', propertiesData);
      console.log('データ型:', typeof propertiesData);
      console.log('配列か:', Array.isArray(propertiesData));
      if (propertiesData && typeof propertiesData === 'object') {
        console.log('オブジェクトキー:', Object.keys(propertiesData));
      }
    } catch (jsonError) {
      console.error('JSONパースエラー:', jsonError);
      console.log('レスポンスはJSONではありません');
    }
    
  } catch (error) {
    console.error('プロパティ取得エラー:', error);
  }
  
  try {
    // CORS プリフライトテスト
    const corsResponse = await fetch(gasWebAppUrl, {
      method: 'OPTIONS',
    });
    
    console.log('CORS プリフライトレスポンス:', {
      status: corsResponse.status,
      statusText: corsResponse.statusText,
      headers: Object.fromEntries(corsResponse.headers.entries())
    });
    
  } catch (error) {
    console.error('CORS プリフライトエラー:', error);
  }
}

// ダミーデータでフォールバック
export const mockPropertiesData = [
  {
    id: '001',
    name: 'テスト物件A',
    completionDate: '2024-01-15'
  },
  {
    id: '002', 
    name: 'テスト物件B',
    completionDate: ''
  },
  {
    id: '003',
    name: 'テスト物件C',
    completionDate: '2024-01-10'
  }
];

// フォールバック付きプロパティ取得
export async function fetchPropertiesWithFallback() {
  try {
    console.log('🔄 プロパティ取得（フォールバック付き）開始');
    
    const requestUrl = `${gasWebAppUrl}?action=getProperties&cache=${Date.now()}`;
    const response = await fetch(requestUrl, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('GASレスポンステキスト:', text);
    
    // JSONパース試行
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.warn('JSONパースに失敗、HTMLレスポンスの可能性:', parseError);
      throw new Error('GASからのレスポンスがJSON形式ではありません');
    }
    
    // データ形式の検証
    if (!data) {
      throw new Error('GASからのレスポンスが空です');
    }
    
    // 統一レスポンス形式の処理
    let actualData = null;
    if (data.success === true && data.data) {
      actualData = data.data;
    } else if (Array.isArray(data)) {
      actualData = data;
    } else if (data.properties && Array.isArray(data.properties)) {
      actualData = data.properties;
    } else {
      throw new Error('GASレスポンスの形式が不正です');
    }
    
    if (!Array.isArray(actualData)) {
      throw new Error('プロパティデータが配列ではありません');
    }
    
    console.log('✅ GASから正常にデータ取得:', actualData.length, '件');
    return actualData;
    
  } catch (error) {
    console.error('❌ GAS取得エラー:', error.message);
    console.log('🔄 ダミーデータにフォールバック');
    return mockPropertiesData;
  }
}

// 部屋データ取得テスト
export async function testRoomsFetch(propertyId = '001') {
  try {
    const requestUrl = `${gasWebAppUrl}?action=getRooms&propertyId=${propertyId}&cache=${Date.now()}`;
    console.log('部屋データ取得URL:', requestUrl);
    
    const response = await fetch(requestUrl);
    console.log('部屋データレスポンス:', {
      status: response.status,
      statusText: response.statusText
    });
    
    const text = await response.text();
    console.log('部屋データレスポンステキスト:', text);
    
    try {
      const data = JSON.parse(text);
      console.log('部屋データ:', data);
      return data;
    } catch (parseError) {
      console.error('部屋データJSONパースエラー:', parseError);
      return null;
    }
    
  } catch (error) {
    console.error('部屋データ取得エラー:', error);
    return null;
  }
}