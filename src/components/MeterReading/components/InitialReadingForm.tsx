interface InitialReadingFormProps {
  readingValue: string;
  inputError: string;
  usageState: string;
  onInputChange: (value: string) => void;
}

const InitialReadingForm = ({ readingValue, inputError, usageState, onInputChange }: InitialReadingFormProps) => (
  <div className="mantine-stack">
    <div className="mantine-alert info">
      <h3 className="mantine-text weight-600">初回検針</h3>
    </div>
    <div
      className="mantine-paper"
      style={{ marginTop: 'var(--mui-spacing-md)', padding: 'var(--mui-spacing-md)' }}
    >
      <h4 className="mantine-subtitle" style={{ marginBottom: 'var(--mui-spacing-sm)' }}>
        初回データ入力
      </h4>
      <div className="mantine-stack" style={{ gap: 'var(--mui-spacing-lg)' }}>
        <div>
          <label
            htmlFor="initialReadingDate"
            className="mantine-text weight-600"
            style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}
          >
            検針日時:
          </label>
          <input
            type="text"
            id="initialReadingDate"
            value="未検針"
            readOnly
            className="mantine-input"
            style={{ fontSize: '1rem', padding: '10px' }}
          />
        </div>
        <div>
          <label
            htmlFor="initialReadingValue"
            className="mantine-text weight-600"
            style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}
          >
            今回指示数(㎥):
          </label>
          <input
            type="number"
            id="initialReadingValue"
            className="mantine-input"
            placeholder="指示数入力"
            min="0"
            step="any"
            style={{ fontSize: '1rem', padding: '10px' }}
            value={readingValue ?? ''}
            onChange={(e) => onInputChange(e.target.value)}
          />
          {inputError && (
            <div
              role="alert"
              style={{
                color: 'var(--mui-palette-red-6)',
                fontSize: '0.9em',
                marginTop: '4px',
              }}
            >
              {inputError}
            </div>
          )}
        </div>
        <div>
          <label
            className="mantine-text weight-600"
            style={{ fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}
          >
            今回使用量:
          </label>
          <div
            style={{
              backgroundColor: '#e3f2fd',
              border: '1px solid var(--mui-palette-grey-3)',
              borderRadius: 'var(--mui-radius-sm)',
              padding: '10px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: 'var(--mui-palette-blue-7)',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {usageState !== undefined ? `${usageState}${usageState !== '-' ? '㎥' : ''}` : '-'}
          </div>
          <div
            style={{
              fontSize: '0.85em',
              color: 'var(--mui-palette-grey-6)',
              marginTop: '4px',
            }}
          >
            ※初回検針では、指示数がそのまま使用量になります
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default InitialReadingForm;
