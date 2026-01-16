/**
 * Toast Container Component for OMEGA UI
 * @module components/notifications/ToastContainer
 * @description Container for managing multiple toast notifications
 */

import { Toast, type ToastData } from './Toast';

/**
 * Toast position options
 */
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

/**
 * Toast container props
 */
interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
  position?: ToastPosition;
  maxVisible?: number;
}

/**
 * Position styles
 */
const positionStyles: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

/**
 * Toast container component
 * @param props - Component properties
 * @returns Container with toast notifications
 */
export function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
  maxVisible = 5,
}: ToastContainerProps): JSX.Element | null {
  const visibleToasts = toasts.slice(0, maxVisible);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 w-80 ${positionStyles[position]}`}
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleToasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}

      {/* Overflow indicator */}
      {toasts.length > maxVisible && (
        <div className="text-center text-xs text-omega-muted py-1">
          +{toasts.length - maxVisible} more notifications
        </div>
      )}
    </div>
  );
}
