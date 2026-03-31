import { useState, useCallback, useRef, useEffect } from 'react';

interface UseToastReturn {
  toastMessage: string;
  showToast: boolean;
  displayToast: (message: string) => void;
}

export const useToast = (autoHideMs: number = 3000): UseToastReturn => {
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayToast = useCallback(
    (message: string) => {
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
