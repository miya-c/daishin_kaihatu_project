import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>エラーが発生しました</h2>
          <button onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
