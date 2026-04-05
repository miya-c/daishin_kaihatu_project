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
  <div class="mantine-paper form-section">
    <h4 class="mantine-subtitle" style="margin-bottom: var(--mui-spacing-sm);">初回データ入力</h4>
    <div class="mantine-stack" style="gap: var(--mui-spacing-lg);">
      <div>
        <label for="initialReadingDate" class="mantine-text weight-600 form-label">
          検針日時:
        </label>
        <input
          type="text"
          id="initialReadingDate"
          value="未検針"
          readonly
          class="mantine-input form-input"
        />
      </div>
      <div>
        <label for="initialReadingValue" class="mantine-text weight-600 form-label">
          今回指示数(㎥):
        </label>
        <input
          type="number"
          id="initialReadingValue"
          class="mantine-input form-input"
          placeholder="指示数入力"
          min="0"
          step="any"
          value={readingValue ?? ''}
          aria-required="true"
          aria-invalid={!!inputError}
          aria-describedby={inputError ? 'initial-reading-error' : undefined}
          oninput={(e) => onInputChange((e.target as HTMLInputElement).value)}
        />
        {#if inputError}
          <div id="initial-reading-error" role="alert" class="error-text">
            {inputError}
          </div>
        {/if}
      </div>
      <div>
        <span id="initialUsageLabel" class="mantine-text weight-600 form-label"> 今回使用量: </span>
        <div
          role="textbox"
          aria-readonly="true"
          aria-labelledby="initialUsageLabel"
          class="usage-display"
        >
          {usageState !== undefined ? `${usageState}${usageState !== '-' ? '㎥' : ''}` : '-'}
        </div>
        <div class="usage-hint">※初回検針では、指示数がそのまま使用量になります</div>
      </div>
    </div>
  </div>
</div>
