import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';

function IndexPage() {
  return (
    <div className="container">
      <h1>水道検針アプリ</h1>
      <p>このアプリはPWAとしてインストールできます。</p>
      <button id="install-btn" style={{display:'none'}}>PWAをインストール</button>
      <br/><br/>
      <a href="/property/" style={{padding:'12px 24px',backgroundColor:'#1976d2',color:'white',textDecoration:'none',borderRadius:'4px',fontSize:'16px',display:'inline-block'}}>
        アプリを開始
      </a>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<IndexPage />);
