<div class="setup-container">
  <div class="setup-card">
    <div class="setup-header">
      <div class="setup-icon">💧</div>
      <h1>水道検針アプリ</h1>
      <p>初期設定が必要です</p>
    </div>

    <div class="setup-body">
      <p>このアプリを利用するには、管理者からのセットアップURLが必要です。</p>

      <div class="steps">
        <h3>セットアップ手順</h3>
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">管理者から送付されたURLを受信する</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">URLをタップしてアプリを開く</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">設定が自動的に完了します</div>
        </div>
      </div>

      <div class="contact-box">
        <div class="contact-label">お問い合わせ</div>
        <p>セットアップURLをお持ちでない場合は、管理者にお問い合わせください。</p>
      </div>
    </div>
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

  .setup-body {
    padding: 24px;
    text-align: center;
  }

  .setup-body > p {
    color: #555;
    font-size: 0.95rem;
    line-height: 1.7;
    margin-bottom: 16px;
  }

  .steps {
    text-align: left;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }

  .steps h3 {
    font-size: 0.85rem;
    color: #1976d2;
    margin: 0 0 12px;
    text-align: center;
  }

  .step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .step:last-child {
    margin-bottom: 0;
  }

  .step-num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    background: #1976d2;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .step-text {
    font-size: 0.85rem;
    color: #444;
    line-height: 1.5;
    padding-top: 2px;
  }

  .contact-box {
    background: #e3f2fd;
    border-radius: 10px;
    padding: 16px;
  }

  .contact-label {
    font-weight: 600;
    font-size: 0.75rem;
    color: #1976d2;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .contact-box p {
    font-size: 0.8rem;
    color: #1565c0;
    margin: 0;
  }
</style>
