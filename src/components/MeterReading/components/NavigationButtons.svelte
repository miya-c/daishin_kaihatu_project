<script lang="ts">
  interface Props {
    hasPrevious: boolean;
    hasNext: boolean;
    disabled: boolean;
    onPrevious: () => void;
    onNext: () => void;
    variant?: 'header' | 'footer';
  }

  let { hasPrevious, hasNext, disabled, onPrevious, onNext, variant = 'header' }: Props = $props();

  let prevClassName = $derived(
    variant === 'footer'
      ? `nav-button nav-button-footer prev-room-btn ${!hasPrevious ? 'disabled' : ''}`
      : `nav-button nav-button-large prev-room-btn ${!hasPrevious ? 'disabled' : ''}`
  );

  let nextClassName = $derived(
    variant === 'footer'
      ? `nav-button nav-button-footer next-room-btn ${!hasNext ? 'disabled' : ''}`
      : `nav-button nav-button-large next-room-btn ${!hasNext ? 'disabled' : ''}`
  );
</script>

{#if variant === 'footer'}
  <div class="reading-history-footer">
    <button
      class={prevClassName}
      disabled={!hasPrevious || disabled}
      onclick={onPrevious}
      aria-label="前の部屋に移動"
      title={hasPrevious
        ? '前の部屋に移動（データを保存してから移動します）'
        : '前の部屋がありません'}
    >
      ← 前の部屋へ
    </button>
    <button
      class={nextClassName}
      disabled={!hasNext || disabled}
      onclick={onNext}
      aria-label="次の部屋に移動"
      title={hasNext ? '次の部屋に移動（データを保存してから移動します）' : '次の部屋がありません'}
    >
      次の部屋へ →
    </button>
  </div>
{:else}
  <button
    class={prevClassName}
    disabled={!hasPrevious || disabled}
    onclick={onPrevious}
    aria-label="前の部屋に移動"
    title={hasPrevious
      ? '前の部屋に移動（データを保存してから移動します）'
      : '前の部屋がありません'}
  >
    ← 前の部屋
  </button>

  <h3
    class="mantine-subtitle desktop-only"
    style="text-align: center; margin: 0; font-size: clamp(1.2rem, 3vw, 1.6rem); flex-shrink: 0; white-space: nowrap;"
  >
    検針データ
  </h3>

  <button
    class={nextClassName}
    disabled={!hasNext || disabled}
    onclick={onNext}
    aria-label="次の部屋に移動"
    title={hasNext ? '次の部屋に移動（データを保存してから移動します）' : '次の部屋がありません'}
  >
    次の部屋 →
  </button>
{/if}
