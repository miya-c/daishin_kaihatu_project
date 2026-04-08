<script>
  import { getQueueStatus, registerOnlineListener } from '../utils/offlineQueue';
  import { TOAST_DISPLAY_MS } from '../utils/config';

  let isOnline = $state(navigator.onLine);
  let wasOffline = $state(false);
  let showBackOnline = $state(false);
  let syncing = $state(false);
  let pendingCount = $state(0);

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
      pendingCount = getQueueStatus().pendingCount;
    } else if (wasOffline) {
      showBackOnline = true;
      syncing = true;
      const timer = setTimeout(() => {
        showBackOnline = false;
        wasOffline = false;
        syncing = false;
      }, TOAST_DISPLAY_MS);
      return () => clearTimeout(timer);
    }
  });

  $effect(() => {
    const unregister = registerOnlineListener(() => {
      pendingCount = getQueueStatus().pendingCount;
      syncing = false;
    });

    pendingCount = getQueueStatus().pendingCount;

    return () => {
      unregister();
    };
  });
</script>

{#if showBackOnline && isOnline}
  <div class="network-status-bar network-status-online" role="status" aria-live="polite">
    オンラインに復帰しました{#if syncing}
      — データを同期中...{/if}
  </div>
{:else if !isOnline}
  <div class="network-status-bar network-status-offline" role="alert" aria-live="assertive">
    オフライン中 — データはローカルに保存します
    {#if pendingCount > 0}
      （未送信: {pendingCount}件）
    {/if}
  </div>
{/if}
