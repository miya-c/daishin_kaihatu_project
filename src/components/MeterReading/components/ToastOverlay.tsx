interface ToastOverlayProps {
  show: boolean;
  message: string;
}

const ToastOverlay = ({ show, message }: ToastOverlayProps) => {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--mui-palette-blue-6)',
          color: 'white',
          padding: '24px 32px',
          borderRadius: 'var(--mui-radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          fontSize: '1.2rem',
          fontWeight: '600',
          textAlign: 'center',
          minWidth: '240px',
          animation: 'fadeInScale 0.3s ease-out',
        }}
      >
        {message}
      </div>
    </div>
  );
};

export default ToastOverlay;
