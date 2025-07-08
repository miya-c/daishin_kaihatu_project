import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { testGASConnection, fetchPropertiesWithFallback, testRoomsFetch } from './utils/gasTest.js';
import './styles/main.css';

// GAS接続テストコンポーネント
const GASTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const runBasicTest = async () => {
    setLoading(true);
    setTestResults([]);
    addResult('GAS基本接続テスト開始', 'info');
    
    // コンソールログをキャプチャ
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      addResult(args.join(' '), 'log');
      originalLog(...args);
    };
    
    console.error = (...args) => {
      addResult(args.join(' '), 'error');
      originalError(...args);
    };
    
    console.warn = (...args) => {
      addResult(args.join(' '), 'warn');
      originalWarn(...args);
    };
    
    try {
      await testGASConnection();
      addResult('基本接続テスト完了', 'success');
    } catch (error) {
      addResult(`基本接続テストエラー: ${error.message}`, 'error');
    }
    
    // コンソールログを元に戻す
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    
    setLoading(false);
  };

  const runPropertiesTest = async () => {
    setLoading(true);
    addResult('プロパティ取得テスト開始', 'info');
    
    try {
      const data = await fetchPropertiesWithFallback();
      addResult(`プロパティデータ取得成功: ${data.length}件`, 'success');
      addResult(`サンプルデータ: ${JSON.stringify(data.slice(0, 2), null, 2)}`, 'log');
    } catch (error) {
      addResult(`プロパティ取得エラー: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };

  const runRoomsTest = async () => {
    setLoading(true);
    addResult('部屋データ取得テスト開始', 'info');
    
    try {
      const data = await testRoomsFetch('001');
      if (data) {
        addResult('部屋データ取得成功', 'success');
        addResult(`部屋データ: ${JSON.stringify(data, null, 2)}`, 'log');
      } else {
        addResult('部屋データ取得失敗', 'error');
      }
    } catch (error) {
      addResult(`部屋データテストエラー: ${error.message}`, 'error');
    }
    
    setLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getResultColor = (type) => {
    switch (type) {
      case 'error': return '#f44336';
      case 'warn': return '#ff9800';
      case 'success': return '#4caf50';
      case 'log': return '#2196f3';
      default: return '#333';
    }
  };

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '20px auto', 
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <div className="MuiAppBar-root">
        <div className="MuiToolbar-root">
          <div className="app-title">GAS接続テスト</div>
        </div>
      </div>
      
      <div style={{ 
        background: '#fff', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={runBasicTest}
            disabled={loading}
            style={{
              margin: '5px',
              padding: '10px 20px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            基本接続テスト
          </button>
          
          <button 
            onClick={runPropertiesTest}
            disabled={loading}
            style={{
              margin: '5px',
              padding: '10px 20px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            プロパティ取得テスト
          </button>
          
          <button 
            onClick={runRoomsTest}
            disabled={loading}
            style={{
              margin: '5px',
              padding: '10px 20px',
              background: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            部屋データテスト
          </button>
          
          <button 
            onClick={clearResults}
            disabled={loading}
            style={{
              margin: '5px',
              padding: '10px 20px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            結果クリア
          </button>
        </div>
        
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            margin: '20px 0',
            color: '#1976d2',
            fontSize: '16px'
          }}>
            テスト実行中...
          </div>
        )}
        
        <div style={{
          background: '#f5f5f5',
          padding: '15px',
          borderRadius: '4px',
          maxHeight: '500px',
          overflowY: 'auto',
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          {testResults.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center' }}>
              テスト結果がここに表示されます
            </div>
          ) : (
            testResults.map((result, index) => (
              <div 
                key={index}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  borderLeft: `4px solid ${getResultColor(result.type)}`,
                  background: 'white',
                  borderRadius: '2px'
                }}
              >
                <span style={{ 
                  color: '#666', 
                  fontSize: '12px',
                  marginRight: '10px'
                }}>
                  [{result.timestamp}]
                </span>
                <span style={{ 
                  color: getResultColor(result.type),
                  fontWeight: result.type === 'error' ? 'bold' : 'normal'
                }}>
                  {result.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// テストページをレンダリング
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GASTest />
  </React.StrictMode>
);