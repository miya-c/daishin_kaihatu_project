interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay = ({ message = '読み込み中...' }: LoadingOverlayProps) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50000,
    }}
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
    <p
      style={{
        marginTop: '16px',
        color: '#666',
        fontSize: '14px',
        textAlign: 'center',
      }}
    >
      {message}
    </p>
  </div>
);

export default LoadingOverlay;
