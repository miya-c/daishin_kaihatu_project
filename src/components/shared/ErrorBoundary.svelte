<script>
  let { children } = $props();
</script>

<svelte:boundary onerror={(error) => console.error('ErrorBoundary caught:', error)}>
  {@render children()}
  {#snippet failed(error, reset)}
    <div
      role="alert"
      style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background-color: #fafafa;"
    >
      <div style="max-width: 480px; width: 100%; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;" aria-hidden="true">⚠️</div>
        <h1 style="font-size: 1.25rem; font-weight: 600; color: #b91c1c; margin: 0 0 8px 0;">
          エラーが発生しました
        </h1>
        <p style="font-size: 0.875rem; color: #666; margin: 0 0 24px 0;">
          予期しないエラーが発生しました。再試行するか、ホーム画面に戻ってください。
        </p>

        {#if error?.message}
          <div
            style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: left;"
          >
            <p style="font-size: 0.875rem; color: #b91c1c; margin: 0; word-break: break-word;">
              {error.message}
            </p>
          </div>
        {/if}

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button
            onclick={reset}
            style="padding: 10px 24px; border-radius: 8px; border: none; background-color: #1976d2; color: white; font-size: 0.875rem; font-weight: 600; cursor: pointer;"
          >
            再試行
          </button>
          <button
            onclick={() => (window.location.href = '/property/')}
            style="padding: 10px 24px; border-radius: 8px; border: 1px solid #ccc; background-color: white; color: #333; font-size: 0.875rem; cursor: pointer;"
          >
            ホームに戻る
          </button>
        </div>

        {#if import.meta.env.DEV}
          <details style="margin-top: 24px; text-align: left;">
            <summary style="font-size: 0.8rem; color: #999; cursor: pointer;">
              エラー詳細（開発者向け）
            </summary>
            <pre
              style="font-size: 0.75rem; color: #666; background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">{error?.stack ||
                'スタックトレースなし'}</pre>
          </details>
        {/if}
      </div>
    </div>
  {/snippet}
</svelte:boundary>
