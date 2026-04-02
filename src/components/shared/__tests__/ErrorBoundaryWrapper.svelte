<script>
  import ErrorBoundary from '../ErrorBoundary.svelte';
  import ErrorBoundaryTest from './ErrorBoundaryTest.svelte';

  let { shouldCrash = false } = $props();
</script>

<ErrorBoundary>
  <ErrorBoundaryTest {shouldCrash} />
</ErrorBoundary>
