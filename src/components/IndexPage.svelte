<script>
  import '../styles/index.css';

  let showResume = false;
  let resumePropertyId = '';
  let resumePropertyName = '';

  try {
    const lastPropertyId = localStorage.getItem('last_property_id');
    const lastPropertyName = localStorage.getItem('last_property_name');
    if (lastPropertyId) {
      resumePropertyId = lastPropertyId;
      resumePropertyName = lastPropertyName || '';
      showResume = true;
    }
  } catch {}
</script>

<div class="container">
  <h1>水道検針アプリ</h1>
  <p>このアプリはPWAとしてインストールできます。</p>
  <button id="pwa-install-button" style="display: none">PWAをインストール</button>
  <br />
  <br />
  {#if showResume}
    <div style="margin-bottom: 16px;">
      <a
        href="/room/?propertyId={encodeURIComponent(resumePropertyId)}"
        style="padding: 14px 24px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block; min-height: 44px; box-sizing: border-box;"
      >
        前回の続きから（{resumePropertyName || resumePropertyId}）
      </a>
    </div>
  {/if}
  <a
    href="/property/"
    style="padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px; font-size: 16px; display: inline-block;"
  >
    アプリを開始
  </a>
</div>
