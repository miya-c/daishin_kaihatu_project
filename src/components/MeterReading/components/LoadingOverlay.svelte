<script lang="ts">
  interface Props {
    message?: string;
  }

  let { message = '読み込み中...' }: Props = $props();
</script>

<div role="status" aria-live="polite" class="loading-overlay">
  <div class="loading-overlay-spinner"></div>
  <p class="loading-overlay-text">{message}</p>
</div>
