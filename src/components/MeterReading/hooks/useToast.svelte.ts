// Svelte 5 reactive toast module
// Uses .svelte.ts extension for runes support

export function createToast(autoHideMs: number = 3000) {
  let toastMessage = $state('');
  let showToast = $state(false);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function displayToast(message: string) {
    toastMessage = message;
    showToast = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      showToast = false;
      toastMessage = '';
    }, autoHideMs);
  }

  // Cleanup on module disposal
  $effect(() => {
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
    };
  });

  return {
    get toastMessage() { return toastMessage; },
    get showToast() { return showToast; },
    displayToast,
  };
}
