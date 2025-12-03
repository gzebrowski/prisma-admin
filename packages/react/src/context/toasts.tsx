import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { X } from '../components/ui/icons';
import { cn } from '../utils/utils';

// Toast types and interfaces
export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  autoClose?: boolean;
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook to use toast context
export const useToasts = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};

// Toast component
interface ToastComponentProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastComponentProps> = ({ toast, onClose }) => {
  const { id, title, message, variant, duration = 5000, autoClose = true } = toast;

  // Auto-close functionality
  useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, autoClose, onClose]);

  // Variant-specific styles
  const getVariantClasses = (variant: ToastVariant): string => {
    const baseClasses = 'admin-toast-item';
    
    switch (variant) {
      case 'success':
        return `${baseClasses} admin-toast-success`;
      case 'error':
        return `${baseClasses} admin-toast-error`;
      case 'warning':
        return `${baseClasses} admin-toast-warning`;
      case 'info':
        return `${baseClasses} admin-toast-info`;
      default:
        return `${baseClasses} admin-toast-info`;
    }
  };

  // Get icon for variant
  const getVariantIcon = (variant: ToastVariant): ReactNode => {
    const iconClasses = 'admin-h-5 admin-w-5 admin-toast-icon';
    
    switch (variant) {
      case 'success':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn(getVariantClasses(variant))}>
      <div className="admin-flex admin-items-start admin-gap-3">
        <div className="admin-flex-shrink-0">
          {getVariantIcon(variant)}
        </div>
        
        <div className="admin-flex-1">
          {title && (
            <h4 className="admin-toast-title admin-font-medium admin-text-sm admin-mb-1">
              {title}
            </h4>
          )}
          <p className="admin-toast-message admin-text-sm">
            {message}
          </p>
        </div>
        
        <button
          onClick={() => onClose(id)}
          className="admin-toast-close admin-flex-shrink-0 admin-p-1 admin-rounded admin-transition-colors admin-hover:bg-opacity-20"
          aria-label="Close notification"
        >
          <X className="admin-h-4 admin-w-4" />
        </button>
      </div>
    </div>
  );
};

// Toast container component
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="admin-toast-container admin-fixed admin-top-4 admin-right-4 admin-z-50 admin-flex admin-flex-col admin-gap-3 admin-max-w-sm">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Toast provider component
interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Generate unique ID for toasts
  const generateId = useCallback((): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }, []);

  // Add toast
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = {
      ...toast,
      id: generateId(),
      autoClose: toast.autoClose !== undefined ? toast.autoClose : true,
      duration: toast.duration || 5000,
    };

    setToasts(prev => [...prev, newToast]);
  }, [generateId]);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Clear all toasts
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for different variants
  const showSuccess = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, variant: 'success', duration });
  }, [addToast]);

  const showError = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, variant: 'error', duration, autoClose: false }); // Errors don't auto-close by default
  }, [addToast]);

  const showWarning = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, variant: 'warning', duration });
  }, [addToast]);

  const showInfo = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, variant: 'info', duration });
  }, [addToast]);

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

// Export default hook for convenience
export default useToasts;
