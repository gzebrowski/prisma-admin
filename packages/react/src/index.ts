// Export core functionality
export * from '../../core/src';

// Main Admin Panel component
export { AdminPanel } from './AdminPanel';

// Export individual components for custom implementations
export { default as AdminPanelBody } from './components/AdminPanelBody';

// Export UI components
export * from './components/ui';

// Export specialized components
export { ModelObjectForm } from './components/modelObjectForm';
export { DatetimePicker } from './components/datetimePicker';
export { LoadingSpinner } from './components/loadingSpinner';
export { AutoComplete } from './components/autocomplete';

// Export contexts
export { ToastProvider, useToasts } from './context/toasts';
export type { Toast, ToastVariant, ToastContextType } from './context/toasts';

export { AdminAlertProvider, useAdminAlert } from './context/adminAlerts';

// Export services
export { AdminService } from './services/admin.services';

// Export utilities
export { cn } from './utils/utils';

// Export types for frontend
export type { ErrorData } from './models';

// Re-export commonly used types for convenience
export type {
  CommonReturnModelItemType,
  CommonPostResult,
  FieldDefinition,
  InlineDefinition,
  ExistingFormData,
  NewFormData
} from '../../core/src';