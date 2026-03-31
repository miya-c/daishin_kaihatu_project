interface NavigationButtonsProps {
  hasPrevious: boolean;
  hasNext: boolean;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  variant?: 'header' | 'footer';
}

const NavigationButtons = ({
  hasPrevious,
  hasNext,
  disabled,
  onPrevious,
  onNext,
  variant = 'header',
}: NavigationButtonsProps) => {
  const prevClassName =
    variant === 'footer'
      ? `nav-button nav-button-footer prev-room-btn ${!hasPrevious ? 'disabled' : ''}`
      : `nav-button nav-button-large prev-room-btn ${!hasPrevious ? 'disabled' : ''}`;

  const nextClassName =
    variant === 'footer'
      ? `nav-button nav-button-footer next-room-btn ${!hasNext ? 'disabled' : ''}`
      : `nav-button nav-button-large next-room-btn ${!hasNext ? 'disabled' : ''}`;

  if (variant === 'footer') {
    return (
      <div className="reading-history-footer">
        <button
          className={prevClassName}
          disabled={!hasPrevious || disabled}
          onClick={onPrevious}
          aria-label="前の部屋に移動"
          title={
            hasPrevious
              ? '前の部屋に移動（データを保存してから移動します）'
              : '前の部屋がありません'
          }
        >
          ← 前の部屋へ
        </button>
        <button
          className={nextClassName}
          disabled={!hasNext || disabled}
          onClick={onNext}
          aria-label="次の部屋に移動"
          title={
            hasNext ? '次の部屋に移動（データを保存してから移動します）' : '次の部屋がありません'
          }
        >
          次の部屋へ →
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        className={prevClassName}
        disabled={!hasPrevious || disabled}
        onClick={onPrevious}
        aria-label="前の部屋に移動"
        title={
          hasPrevious ? '前の部屋に移動（データを保存してから移動します）' : '前の部屋がありません'
        }
      >
        ← 前の部屋
      </button>

      <h3
        className="mantine-subtitle desktop-only"
        style={{
          textAlign: 'center',
          margin: '0',
          fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        検針データ
      </h3>

      <button
        className={nextClassName}
        disabled={!hasNext || disabled}
        onClick={onNext}
        aria-label="次の部屋に移動"
        title={
          hasNext ? '次の部屋に移動（データを保存してから移動します）' : '次の部屋がありません'
        }
      >
        次の部屋 →
      </button>
    </>
  );
};

export default NavigationButtons;
