<script>
  import { getConfig, getSetupUrl, clearConfig } from '../../utils/config';
  import qrcode from 'qrcode-generator';

  let config = $state(getConfig());
  let setupUrl = $state(getSetupUrl());
  let showQr = $state(false);
  let qrSvg = $state('');
  let cleared = $state(false);

  const generateQr = () => {
    if (!setupUrl) return;
    const qr = qrcode(0, 'M');
    qr.addData(setupUrl);
    qr.make();
    qrSvg = qr.createSvgTag({ cellSize: 4, margin: 2 });
    showQr = true;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(setupUrl);
  };

  const handleClear = () => {
    clearConfig();
    cleared = true;
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };
</script>

<div class="settings-page">
  <div class="settings-header">
    <a href="/" class="back-link">← 戻る</a>
    <h1>設定</h1>
  </div>

  <div class="settings-card">
    {#if setupUrl}
      <div class="section">
        <h2>📱 インストールQRコード</h2>
        <p class="hint">このQRコードを他の端末でスキャンすると、アプリをインストールできます。7日間有効です。</p>
        <button onclick={generateQr} class="btn btn-primary">
          QRコードを表示
        </button>

        {#if showQr}
          <div class="qr-container">
            <div class="qr-wrapper">
              {@html qrSvg}
            </div>
            <p class="qr-note">📱 カメラでスキャンしてください</p>
          </div>
          <div class="link-box">
            <input type="text" readonly value={setupUrl} class="link-input" />
            <button onclick={handleCopyUrl} class="btn btn-small">コピー</button>
          </div>
        {/if}
      </div>

      <div class="divider"></div>
    {/if}

    <div class="section">
      <h2>接続情報</h2>
      <div class="info-row">
        <span class="info-label">URL</span>
        <span class="info-value">{config.url || '未設定'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">APIキー</span>
        <span class="info-value">{config.key ? '••••••••' : '未設定'}</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <h2 class="danger">データ削除</h2>
      <p class="hint">接続設定を削除して、初期設定画面に戻ります。</p>
      <button onclick={handleClear} class="btn btn-danger">
        {cleared ? '削除中...' : '設定をクリア'}
      </button>
    </div>
  </div>
</div>

<style>
  .settings-page {
    min-height: 100dvh;
    background: #f5f5f5;
  }

  .settings-header {
    background: #1976d2;
    color: white;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .settings-header h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .back-link {
    color: white;
    text-decoration: none;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .settings-card {
    max-width: 600px;
    margin: 16px auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  .section {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .section h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #333;
  }

  .section h2.danger {
    color: #d32f2f;
  }

  .hint {
    margin: 0;
    font-size: 0.8rem;
    color: #888;
  }

  .divider {
    height: 1px;
    background: #eee;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 0.2s,
      opacity 0.2s;
    align-self: flex-start;
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #1976d2;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1565c0;
  }

  .btn-danger {
    background: #ffebee;
    color: #d32f2f;
  }

  .btn-danger:hover:not(:disabled) {
    background: #ffcdd2;
  }

  .btn-small {
    padding: 6px 14px;
    font-size: 0.8rem;
    background: #1976d2;
    color: white;
  }

  .qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .qr-wrapper {
    background: white;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  .qr-wrapper :global(svg) {
    display: block;
  }

  .qr-note {
    margin: 12px 0 0;
    font-size: 0.8rem;
    color: #666;
  }

  .link-box {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .link-input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.75rem;
    background: #fafafa;
    color: #333;
    min-width: 0;
  }

  .info-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .info-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .info-value {
    font-size: 0.85rem;
    color: #333;
    word-break: break-all;
  }
</style>
