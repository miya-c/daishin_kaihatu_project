import React from 'react'
import ReactDOM from 'react-dom/client'
import { initializePWA } from './utils/pwa.js'
import './styles/main.css'

// PWA Installation Component
const PWAInstallPage = () => {
  React.useEffect(() => {
    initializePWA();
  }, []);

  return (
    <div className="container">
      <h1>水道検針アプリ</h1>
      <p>このアプリはPWAとしてインストールできます。</p>
      <button 
        id="install-btn" 
        style={{display: 'none'}}
        onClick={() => window.installPWA()}
      >
        PWAをインストール
      </button>
    </div>
  );
};

// Create root and render app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PWAInstallPage />
  </React.StrictMode>
)