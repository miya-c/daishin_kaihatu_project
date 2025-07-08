import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { fetchPropertiesWithFallback, fetchRoomsWithFallback } from './utils/api.js';
import './styles/main.css';

const DebugPage = () => {
  const [logs, setLogs] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setLogs([]);
    
    addLog('🔧 GAS接続診断開始', 'info');
    
    try {
      addLog('📡 プロパティデータ取得テスト開始', 'info');
      const propertiesData = await fetchPropertiesWithFallback();
      
      if (propertiesData && propertiesData.length > 0) {
        addLog(`✅ プロパティデータ取得成功: ${propertiesData.length}件`, 'success');
        setProperties(propertiesData);
        
        // サンプルプロパティで部屋データテスト
        const firstProperty = propertiesData[0];
        addLog(`🏠 部屋データテスト開始 - 物件: ${firstProperty.name} (ID: ${firstProperty.id})`, 'info');
        
        const roomsData = await fetchRoomsWithFallback(firstProperty.id);
        addLog(`✅ 部屋データ取得成功: ${roomsData.length}件`, 'success');
        
        if (roomsData.length > 0) {
          addLog(`サンプル部屋: ${JSON.stringify(roomsData[0], null, 2)}`, 'log');
        }
        
      } else {
        addLog('⚠️ プロパティデータが空です', 'warning');
      }
      
      addLog('🎉 診断完了', 'success');
      
    } catch (error) {
      addLog(`❌ 診断エラー: ${error.message}`, 'error');
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    testConnection();
  }, []);

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'success': return '#4caf50';
      case 'log': return '#2196f3';
      default: return '#666';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      <div className="MuiAppBar-root">
        <div className="MuiToolbar-root">
          <div className="app-title">GAS接続診断</div>
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
            onClick={testConnection}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              fontSize: '16px'
            }}
          >
            {isLoading ? '診断中...' : '再診断実行'}
          </button>
        </div>
        
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '6px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{
              marginBottom: '8px',
              padding: '8px',
              borderLeft: `4px solid ${getLogColor(log.type)}`,
              background: 'white',
              borderRadius: '4px'
            }}>
              <span style={{ color: '#666', fontSize: '12px' }}>
                [{log.timestamp}]
              </span>
              {' '}
              <span style={{ color: getLogColor(log.type) }}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
        
        {properties.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>取得されたプロパティデータ:</h3>
            <div style={{ 
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {properties.map((property, index) => (
                <div key={property.id || index} style={{
                  background: 'white',
                  margin: '8px 0',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0'
                }}>
                  <strong>ID:</strong> {property.id} <br/>
                  <strong>名前:</strong> {property.name} <br/>
                  <strong>完了日:</strong> {property.completionDate || 'なし'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DebugPage />
  </React.StrictMode>
);