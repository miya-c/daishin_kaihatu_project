import { useState, useEffect } from 'react';
import useNetworkStatus from '../hooks/useNetworkStatus';

const NetworkStatusBar = () => {
  const { isOnline } = useNetworkStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBackOnline(false);
    } else if (wasOffline) {
      setShowBackOnline(true);
      const timer = setTimeout(() => {
        setShowBackOnline(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Show back-online message temporarily
  if (showBackOnline && isOnline) {
    return (
      <div
        className="network-status-bar network-status-online"
        role="status"
        aria-live="polite"
      >
        オンラインに復帰しました
      </div>
    );
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <div
        className="network-status-bar network-status-offline"
        role="alert"
        aria-live="assertive"
      >
        オフライン - インターネット接続を確認してください
      </div>
    );
  }

  return null;
};

export default NetworkStatusBar;
