/**
 * Toast Notification Component for OMEGA UI
 * @module components/notifications/Toast
 * @description Individual toast notification display
 */

import { useEffect, useState, useCallback } from 'react';

/**
 * Toast notification type
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast notification data
 */
export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

/**
 * Toast props
 */
interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

/**
 * Toast type styles
 */
const toastStyles: Record<ToastType, { bg: string; border: string; icon: JSX.Element }> = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: <InfoIcon />,
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: <SuccessIcon />,
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: <WarningIcon />,
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <ErrorIcon />,
  },
};

/**
 * Toast notification component
 * @param props - Component properties
 * @returns Toast element
 */
export function Toast({ toast, onDismiss }: ToastProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const { type, title, message, duration = 5000, dismissible = true } = toast;
  const style = toastStyles[type];

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [toast.id, onDismiss]);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto dismiss
  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-200 ${
        style.bg
      } ${style.border} ${
        isVisible && !isExiting
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4'
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-omega-text">{title}</p>
        {message && (
          <p className="text-xs text-omega-muted mt-0.5">{message}</p>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-omega-muted hover:text-omega-text transition-colors"
          aria-label="Dismiss"
        >
          <CloseIcon />
        </button>
      )}

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-omega-border rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-omega-primary"
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Icon components
 */
function InfoIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SuccessIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ErrorIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
