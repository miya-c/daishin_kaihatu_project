<script>
  let isOnline = $state(navigator.onLine);
  let wasOffline = $state(false);
  let showBackOnline = $state(false);

  function handleOnline() {
    isOnline = true;
  }

  function handleOffline() {
    isOnline = false;
  }

  $effect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  $effect(() => {
    if (!isOnline) {
      wasOffline = true;
      showBackOnline = false;
    } else if (wasOffline) {
      showBackOnline = true;
      const timer = setTimeout(() => {
        showBackOnline = false;
        wasOffline = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  });
</script>

{#if showBackOnline && isOnline}
  <div class="network-status-bar network-status-online" role="status" aria-live="polite">
    オンラインに復帰しました
  </div>
{:else if !isOnline}
  <div class="network-status-bar network-status-offline" role="alert" aria-live="assertive">
    オフライン - インターネット接続を確認してください
  </div>
{/if}
