<script>
  import { saveConfig } from '../../utils/config';

  let url = $state('');
  let key = $state('');
  let saving = $state(false);

  const handleSave = () => {
    if (!url.trim() || !key.trim()) return;
    saving = true;
    saveConfig(url.trim(), key.trim());
    window.location.href = '/property/';
  };
</script>

<div class="setup-container">
  <div class="setup-card">
    <div class="setup-header">
      <div class="setup-icon">🔧</div>
      <h1>初期設定</h1>
      <p>GAS Web Appの接続情報を入力してください</p>
    </div>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      class="setup-form"
    >
      <div class="field">
        <label for="gas-url">GAS Web App URL</label>
        <input
          id="gas-url"
          type="url"
          bind:value={url}
          placeholder="https://script.google.com/macros/s/..."
          required
        />
      </div>

      <div class="field">
        <label for="api-key">APIキー</label>
        <input id="api-key" type="text" bind:value={key} placeholder="APIキーを入力" required />
      </div>

      <button type="submit" disabled={!url.trim() || !key.trim() || saving} class="btn-primary">
        {saving ? '保存中...' : '設定して開始'}
      </button>
    </form>
  </div>
</div>

<style>
  .setup-container {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
  }

  .setup-card {
    width: 100%;
    max-width: 420px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  .setup-header {
    background: #1976d2;
    color: white;
    padding: 32px 24px 24px;
    text-align: center;
  }

  .setup-icon {
    font-size: 2.5rem;
    margin-bottom: 8px;
  }

  .setup-header h1 {
    margin: 0 0 4px;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .setup-header p {
    margin: 0;
    opacity: 0.85;
    font-size: 0.875rem;
  }

  .setup-form {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #333;
  }

  .field input {
    padding: 12px 14px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 1rem;
    transition: border-color 0.2s;
    outline: none;
    background: #fafafa;
  }

  .field input:focus {
    border-color: #1976d2;
    background: white;
  }

  .btn-primary {
    padding: 14px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.2s,
      opacity 0.2s;
    margin-top: 4px;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1565c0;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
