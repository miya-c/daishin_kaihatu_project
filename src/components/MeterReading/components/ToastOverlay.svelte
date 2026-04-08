<script lang="ts">
  interface Props {
    show: boolean;
    message: string;
  }

  let { show, message }: Props = $props();
</script>

{#if show}
  <div role="status" aria-live="polite" class="toast-inline">{message}</div>
{/if}
