<script>
  let { shouldCrash = false } = $props();
</script>

{#if shouldCrash}
  <!-- This will throw because undefinedProperty doesn't exist -->
  {@const crashResult = undefined.notAProperty.access}
{:else}
  <p data-testid="child-content">正常なコンテンツ</p>
{/if}
