import { useState, useCallback, useRef, useEffect } from 'react';

export const useToast = (autoHideMs = 3000) => {
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef(null);

  const displayToast = useCallback(
    (message) => {
      setToastMessage(message);
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
        setToastMessage('');
      }, autoHideMs);
    },
    [autoHideMs]
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return { toastMessage, showToast, displayToast };
};
