<script lang="ts">
  import { formatDateForDisplay } from '../utils/dateUtils';
  import {
    formatReading,
    formatInspectionStatus,
    calculateUsageDisplay,
  } from '../utils/formatUtils';
  import { getStatusDisplay, getStandardDeviationDisplay } from '../utils/warningFlag';

  import type { MeterReading } from '../../../types';

  interface Props {
    meterReadings: MeterReading[];
    readingValues: Record<string, string>;
    inputErrors: Record<string, string>;
    usageStates: Record<string, string>;
    onInputChange: (date: string, value: string, reading: MeterReading) => void;
  }

  let { meterReadings, readingValues, inputErrors, usageStates, onInputChange }: Props = $props();

  function getPreviousReadingsText(r: MeterReading): string[] {
    const parts: string[] = [];
    if (r.previousReading && r.previousReading !== 'N/A') {
      let text = `前回: ${r.previousReading}`;
      if (r.previousPreviousReading && r.previousPreviousReading !== 'N/A') {
        const prev = parseFloat(String(r.previousReading));
        const prevPrev = parseFloat(String(r.previousPreviousReading));
        if (!isNaN(prev) && !isNaN(prevPrev)) {
          const diff = prev - prevPrev;
          text += ` [${diff >= 0 ? '+' : ''}${diff}]`;
        }
      }
      parts.push(text);
    }
    if (r.previousPreviousReading && r.previousPreviousReading !== 'N/A') {
      let text = `前々回: ${r.previousPreviousReading}`;
      if (r.threeTimesPrevious && r.threeTimesPrevious !== 'N/A') {
        const prevPrev = parseFloat(String(r.previousPreviousReading));
        const prevPrevPrev = parseFloat(String(r.threeTimesPrevious));
        if (!isNaN(prevPrev) && !isNaN(prevPrevPrev)) {
          const diff = prevPrev - prevPrevPrev;
          text += ` [${diff >= 0 ? '+' : ''}${diff}]`;
        }
      }
      parts.push(text);
    }
    if (r.threeTimesPrevious && r.threeTimesPrevious !== 'N/A') {
      parts.push(`前々々回: ${r.threeTimesPrevious}`);
    }
    return parts;
  }

  let filteredReadings = $derived(
    meterReadings.filter(
      (reading) =>
        reading.previousReading && reading.previousReading !== '' && reading.previousReading !== 0
    )
  );
</script>

<table class="mantine-table">
  <thead
    style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;"
  >
    <tr>
      <th scope="col">検針日時</th>
      <th scope="col">今回指示数(㎥)</th>
      <th scope="col">今回使用量</th>
      <th scope="col">状態</th>
      <th scope="col">前回履歴</th>
    </tr>
  </thead>
  <tbody>
    {#each filteredReadings as reading, index (index)}
      {@const formattedDate = formatDateForDisplay(reading.date)}
      {@const inspectionStatus = formatInspectionStatus(reading.date)}
      {@const dateForDataAttribute = reading.date}
      {@const currentReadingDisplay =
        readingValues[dateForDataAttribute] ?? formatReading(reading.currentReading)}
      {@const usageToDisplay =
        usageStates[dateForDataAttribute] !== undefined
          ? usageStates[dateForDataAttribute]
          : calculateUsageDisplay(reading.currentReading, reading.previousReading)}
      {@const usageDisplayString = `${usageToDisplay}${usageToDisplay !== '-' ? '㎥' : ''}`}
      {@const previousReadingsInfo = getPreviousReadingsText(reading)}
      {@const status = getStatusDisplay(reading)}
      {@const sigma = getStandardDeviationDisplay(reading)}
      <tr>
        <td data-label="検針日時">
          <span
            class={inspectionStatus.status === '未検針'
              ? 'inspection-uninspected'
              : 'inspection-inspected'}
          >
            最終検針日時:
            {inspectionStatus.status === '未検針' ? '未検針' : inspectionStatus.displayDate}
          </span>
        </td>
        <td data-label="今回指示数(㎥)">
          <input
            type="number"
            step="1"
            value={currentReadingDisplay}
            placeholder="指示数入力"
            min="0"
            data-date={dateForDataAttribute}
            data-original-value={formatReading(reading.currentReading)}
            data-previous-reading={formatReading(reading.previousReading)}
            class="mantine-input"
            aria-label={`${formattedDate || reading.date}の指示数`}
            aria-required="true"
            aria-invalid={!!inputErrors[dateForDataAttribute]}
            aria-describedby={inputErrors[dateForDataAttribute]
              ? `error-${dateForDataAttribute}`
              : undefined}
            oninput={(e) =>
              onInputChange(dateForDataAttribute, (e.target as HTMLInputElement).value, reading)}
          />
          {#if inputErrors[dateForDataAttribute]}
            <div id={`error-${dateForDataAttribute}`} role="alert" class="error-text">
              {inputErrors[dateForDataAttribute]}
            </div>
          {/if}
        </td>
        <td data-label="今回使用量">{usageDisplayString}</td>
        <td data-label="状態">
          <span
            class={`status-badge ${status === '要確認' ? 'status-badge--warning' : status === '正常' ? 'status-badge--normal' : 'status-badge--default'}`}
          >
            {status}
            {#if sigma}
              <div style="font-size: 0.7em; margin-top: 2px; opacity: 0.8;">
                σ: {sigma}
              </div>
            {/if}
          </span>
        </td>
        <td data-label="前回履歴">
          {#if previousReadingsInfo && previousReadingsInfo.length > 0}
            <div style="line-height: 1.6;">
              {#each previousReadingsInfo as info, infoIndex (infoIndex)}
                <div
                  class="previous-reading-text"
                  style="margin-bottom: {infoIndex < previousReadingsInfo.length - 1
                    ? '6px'
                    : '0'};"
                >
                  {info}
                </div>
              {/each}
            </div>
          {:else}
            <div>-</div>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>
