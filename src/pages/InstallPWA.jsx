import React, { useEffect } from 'react';

const InstallPWA = () => {
  useEffect(() => {
    // ここにlanding.htmlにあったPWAインストールのロジックを移植します。
    // ただし、Vite環境では動かない可能性のあるコードも含まれるため、
    // 必要な機能を整理・再実装する必要があります。
    console.log('PWAインストールページが表示されました。');
  }, []);

  return (
    <div className="container">
      <h1>水道検針アプリ</h1>
      <p>このアプリはPWAとしてインストールできます。</p>
      <button id="install-btn" style={{ display: 'none' }}>PWAをインストール</button>
    </div>
  );
};

export default InstallPWA;
