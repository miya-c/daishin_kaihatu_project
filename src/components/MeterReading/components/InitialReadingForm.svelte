<script lang="ts">
  interface Props {
    readingValue: string;
    inputError: string;
    usageState: string;
    onInputChange: (value: string) => void;
  }

  let { readingValue, inputError, usageState, onInputChange }: Props = $props();
</script>

<div class="mantine-stack">
  <div class="mantine-alert info">
    <h3 class="mantine-text weight-600">初回検針</h3>
  </div>
  <div
    class="mantine-paper"
    style="margin-top: var(--mui-spacing-md); padding: var(--mui-spacing-md);"
  >
    <h4 class="mantine-subtitle" style="margin-bottom: var(--mui-spacing-sm);">初回データ入力</h4>
    <div class="mantine-stack" style="gap: var(--mui-spacing-lg);">
      <div>
        <label
          for="initialReadingDate"
          class="mantine-text weight-600"
          style="font-size: 0.9rem; margin-bottom: 4px; display: block;"
        >
          検針日時:
        </label>
        <input
          type="text"
          id="initialReadingDate"
          value="未検針"
          readonly
          class="mantine-input"
          style="font-size: 1rem; padding: 10px;"
        />
      </div>
      <div>
        <label
          for="initialReadingValue"
          class="mantine-text weight-600"
          style="font-size: 0.9rem; margin-bottom: 4px; display: block;"
        >
          今回指示数(㎥):
        </label>
        <input
          type="number"
          id="initialReadingValue"
          class="mantine-input"
          placeholder="指示数入力"
          min="0"
          step="any"
          style="font-size: 1rem; padding: 10px;"
          value={readingValue ?? ''}
          aria-required="true"
          aria-invalid={!!inputError}
          aria-describedby={inputError ? 'initial-reading-error' : undefined}
          oninput={(e) => onInputChange((e.target as HTMLInputElement).value)}
        />
        {#if inputError}
          <div
            id="initial-reading-error"
            role="alert"
            style="color: var(--mui-palette-red-6); font-size: 0.9em; margin-top: 4px;"
          >
            {inputError}
          </div>
        {/if}
      </div>
      <div>
        <span
          id="initialUsageLabel"
          class="mantine-text weight-600"
          style="font-size: 0.9rem; margin-bottom: 4px; display: block;"
        >
          今回使用量:
        </span>
        <div
          role="textbox"
          aria-readonly="true"
          aria-labelledby="initialUsageLabel"
          style="background-color: #e3f2fd; border: 1px solid var(--mui-palette-grey-3); border-radius: var(--mui-radius-sm); padding: 10px; font-size: 1.2rem; font-weight: bold; color: var(--mui-palette-blue-7); min-height: 44px; display: flex; align-items: center;"
        >
          {usageState !== undefined ? `${usageState}${usageState !== '-' ? '㎥' : ''}` : '-'}
        </div>
        <div style="font-size: 0.85em; color: var(--mui-palette-grey-6); margin-top: 4px;">
          ※初回検針では、指示数がそのまま使用量になります
        </div>
      </div>
    </div>
  </div>
</div>
