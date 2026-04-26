<script>
  import { getConfig, saveConfig, clearConfig, generateSetupLink } from '../../utils/config';

  let config = $state(getConfig());
  let url = $state(config.url);
  let key = $state(config.key);
  let saved = $state(false);
  let cleared = $state(false);
  let showLink = $state(false);
  let setupLink = $state('');

  const handleSave = () => {
    if (!url.trim() || !key.trim()) return;
    saveConfig(url.trim(), key.trim());
    saved = true;
    cleared = false;
    setTimeout(() => { saved = false; }, 2000);
  };

  const handleClear = () => {
    clearConfig();
    url = '';
    key = '';
    cleared = true;
    saved = false;
    showLink = false;
    setTimeout(() => { window.location.href = '/'; }, 1000);
  };

  const handleGenerateLink = () => {
    const base = window.location.origin;
    setupLink = generateSetupLink(base);
    showLink = true;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(setupLink);
  };
</script>

<div class="settings-page">
  <div class="settings-header">
    <a href="/" class="back-link">← 戻る</a>
    <h1>設定</h1>
  </div>

  <div class="settings-card">
    <div class="section">
      <h2>接続設定</h2>

      <div class="field">
        <label for="gas-url">GAS Web App URL</label>
        <input
          id="gas-url"
          type="url"
          bind:value={url}
          placeholder="https://script.google.com/macros/s/..."
        />
      </div>

      <div class="field">
        <label for="api-key">APIキー</label>
        <input
          id="api-key"
          type="text"
          bind:value={key}
          placeholder="APIキーを入力"
        />
      </div>

      <button
        onclick={handleSave}
        disabled={!url.trim() || !key.trim()}
        class="btn btn-primary"
      >
        {saved ? '✓ 保存しました' : '保存'}
      </button>
    </div>

    <div class="divider"></div>

    <div class="section">
      <h2>セットアップリンク</h2>
      <p class="hint">設定情報を含めたURLを生成して、他の端末と共有できます。</p>
      <button onclick={handleGenerateLink} disabled={!url.trim() || !key.trim()} class="btn btn-secondary">
        リンクを生成
      </button>

      {#if showLink}
        <div class="link-box">
          <input type="text" readonly value={setupLink} class="link-input" />
          <button onclick={handleCopyLink} class="btn btn-small">コピー</button>
        </div>
      {/if}
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #555;
  }

  .field input {
    padding: 10px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 0.95rem;
    outline: none;
    background: #fafafa;
    transition: border-color 0.2s;
  }

  .field input:focus {
    border-color: #1976d2;
    background: white;
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
    transition: background 0.2s, opacity 0.2s;
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

  .btn-secondary {
    background: #e3f2fd;
    color: #1976d2;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #bbdefb;
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
    font-size: 0.8rem;
    background: #fafafa;
    color: #333;
    min-width: 0;
  }
</style>
