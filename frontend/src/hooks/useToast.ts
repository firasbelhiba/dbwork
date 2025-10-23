import { useState, useCallback } from 'react';
import { ToastProps } from '@/components/common';

interface Toast extends ToastProps {
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      onClose: () => removeToast(id),
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string) => {
    addToast({ message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message: string) => {
    addToast({ message, type: 'error' });
  }, [addToast]);

  const warning = useCallback((message: string) => {
    addToast({ message, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message: string) => {
    addToast({ message, type: 'info' });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
