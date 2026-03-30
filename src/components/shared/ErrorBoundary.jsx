import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage =
        this.state.error instanceof Error
          ? this.state.error.message
          : String(this.state.error || '不明なエラー');

      return (
        <div
          style={{
            padding: '24px',
            maxWidth: '480px',
            margin: '40px auto',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#b91c1c',
            }}
          >
            エラーが発生しました
          </h2>
          <p
            style={{
              margin: '0 0 24px 0',
              fontSize: '0.875rem',
              color: '#666',
            }}
          >
            予期しないエラーが発生しました。再試行してください。
          </p>

          {this.state.retryCount > 0 && (
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '0.8rem',
                color: '#dc2626',
              }}
            >
              再試行回数: {this.state.retryCount}回
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1976d2',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              再試行
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                color: '#333',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              ページを再読み込み
            </button>
          </div>

          <details
            style={{
              textAlign: 'left',
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '16px',
            }}
          >
            <summary style={{ cursor: 'pointer' }}>エラー詳細</summary>
            <pre
              style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {errorMessage}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
