import React, { useCallback } from 'react';
import { formatDateForDisplay } from '../utils/dateUtils';
import { formatReading, formatInspectionStatus, calculateUsageDisplay } from '../utils/formatUtils';
import { getStatusDisplay, getStandardDeviationDisplay } from '../utils/warningFlag';

const ReadingHistoryTable = ({
  meterReadings,
  readingValues,
  inputErrors,
  usageStates,
  onInputChange,
}) => {
  const getPreviousReadingsText = useCallback((r) => {
    let parts = [];
    if (r.previousReading && r.previousReading !== 'N/A') {
      let text = `前回: ${r.previousReading}`;
      if (r.previousPreviousReading && r.previousPreviousReading !== 'N/A') {
        const prev = parseFloat(r.previousReading);
        const prevPrev = parseFloat(r.previousPreviousReading);
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
        const prevPrev = parseFloat(r.previousPreviousReading);
        const prevPrevPrev = parseFloat(r.threeTimesPrevious);
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
  }, []);

  const filteredReadings = meterReadings.filter(
    (reading) =>
      reading.previousReading && reading.previousReading !== '' && reading.previousReading !== 0
  );

  return (
    <table className="mantine-table">
      <thead style={{ display: 'none' }}>
        <tr>
          <th>検針日時</th>
          <th>今回指示数(㎥)</th>
          <th>今回使用量</th>
          <th>状態</th>
          <th>前回履歴</th>
        </tr>
      </thead>
      <tbody>
        {filteredReadings.map((reading, index) => {
          const formattedDate = formatDateForDisplay(reading.date);
          const inspectionStatus = formatInspectionStatus(reading.date);
          const dateForDataAttribute = reading.date;
          const currentReadingDisplay =
            readingValues[dateForDataAttribute] ?? formatReading(reading.currentReading);

          const usageToDisplay =
            usageStates[dateForDataAttribute] !== undefined
              ? usageStates[dateForDataAttribute]
              : calculateUsageDisplay(reading.currentReading, reading.previousReading);

          const usageDisplayString = `${usageToDisplay}${usageToDisplay !== '-' ? '㎥' : ''}`;
          const previousReadingsInfo = getPreviousReadingsText(reading);

          return (
            <tr key={index}>
              <td data-label="検針日時">
                <span
                  style={{
                    color:
                      inspectionStatus.status === '未検針' ? 'var(--mui-palette-red-6)' : 'inherit',
                    fontWeight: inspectionStatus.status === '未検針' ? 'bold' : 'normal',
                  }}
                >
                  最終検針日時:{' '}
                  {inspectionStatus.status === '未検針' ? '未検針' : inspectionStatus.displayDate}
                </span>
              </td>
              <td data-label="今回指示数(㎥)">
                <input
                  type="number"
                  step="any"
                  value={currentReadingDisplay}
                  placeholder="指示数入力"
                  min="0"
                  data-date={dateForDataAttribute}
                  data-original-value={formatReading(reading.currentReading)}
                  data-previous-reading={formatReading(reading.previousReading)}
                  className="mantine-input"
                  aria-label={`${formattedDate || reading.date}の指示数`}
                  aria-describedby={
                    inputErrors[dateForDataAttribute] ? `error-${dateForDataAttribute}` : undefined
                  }
                  onChange={(e) => onInputChange(dateForDataAttribute, e.target.value, reading)}
                />
                {inputErrors[dateForDataAttribute] && (
                  <div
                    id={`error-${dateForDataAttribute}`}
                    role="alert"
                    style={{
                      color: 'var(--mui-palette-red-6)',
                      fontSize: '0.9em',
                      marginTop: '4px',
                    }}
                  >
                    {inputErrors[dateForDataAttribute]}
                  </div>
                )}
              </td>
              <td data-label="今回使用量">{usageDisplayString}</td>
              <td data-label="状態">
                {(() => {
                  const status = getStatusDisplay(reading);
                  const sigma = getStandardDeviationDisplay(reading);
                  return (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        fontSize: '0.9em',
                        fontWeight: 500,
                        backgroundColor:
                          status === '要確認'
                            ? 'var(--mui-palette-red-light)'
                            : status === '正常'
                              ? 'var(--mui-palette-green-light)'
                              : 'var(--mui-palette-grey-2)',
                        color:
                          status === '要確認'
                            ? 'var(--mui-palette-red-8)'
                            : status === '正常'
                              ? 'var(--mui-palette-green-8)'
                              : 'var(--mui-palette-grey-7)',
                        borderRadius: 'var(--mui-radius-sm)',
                      }}
                    >
                      {status}
                      {sigma && (
                        <div style={{ fontSize: '0.7em', marginTop: '2px', opacity: 0.8 }}>
                          σ: {sigma}
                        </div>
                      )}
                    </span>
                  );
                })()}
              </td>
              <td data-label="前回履歴">
                {previousReadingsInfo && previousReadingsInfo.length > 0 ? (
                  <div style={{ lineHeight: '1.6' }}>
                    {previousReadingsInfo.map((info, infoIndex) => (
                      <div
                        key={infoIndex}
                        className="previous-reading-text"
                        style={{
                          marginBottom: infoIndex < previousReadingsInfo.length - 1 ? '6px' : '0',
                        }}
                      >
                        {info}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>-</div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ReadingHistoryTable;
