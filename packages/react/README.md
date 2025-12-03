# @prisma-admin/react

React components and hooks for Prisma Admin.

## Installation

```bash
npm install @prisma-admin/react @prisma-admin/core
npm install react react-dom luxon uuid axios
```

## Quick Start

### 1. Basic Setup

```tsx
// App.tsx
import { AdminPanel } from '@prisma-admin/react';

function App() {
  return (
    <div className=\"App\">
      <AdminPanel />
    </div>
  );
}
```

### 2. Import Styles

```tsx
// Import the default styles
import '@prisma-admin/react/dist/styles.css';

// Or import SCSS for customization
import '@prisma-admin/react/src/styles.scss';
```

### 3. With Toast Notifications

```tsx
import { AdminPanel, ToastProvider } from '@prisma-admin/react';

function App() {
  return (
    <ToastProvider>
      <AdminPanel />
    </ToastProvider>
  );
}
```

## Components

### AdminPanel

Main admin panel component that renders the full interface.

```tsx
import { AdminPanel } from '@prisma-admin/react';

<AdminPanel />
```

### Individual Components

For custom implementations, you can use individual components:

```tsx
import { 
  AdminPanelBody,
  ModelObjectForm,
  LoadingSpinner,
  ToastProvider,
  useToasts 
} from '@prisma-admin/react';

function CustomAdmin() {
  const { showSuccess, showError } = useToasts();
  
  return (
    <div>
      <AdminPanelBody />
    </div>
  );
}
```

### UI Components

The package includes a complete set of UI components:

```tsx
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Card,
  Badge,
  Switch,
  Checkbox
} from '@prisma-admin/react';
```

## Hooks

### useToasts

For displaying notifications:

```tsx
import { useToasts } from '@prisma-admin/react';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useToasts();
  
  const handleSave = () => {
    showSuccess('Data saved successfully!');
  };
  
  return <button onClick={handleSave}>Save</button>;
}
```

### useAdminAlerts

For confirmation dialogs:

```tsx
import { useAdminAlerts } from '@prisma-admin/react';

function MyComponent() {
  const { showConfirm } = useAdminAlerts();
  
  const handleDelete = async () => {
    const confirmed = await showConfirm('Are you sure?');
    if (confirmed) {
      // Delete logic
    }
  };
  
  return <button onClick={handleDelete}>Delete</button>;
}
```

## Styling

### Default Styles

The package uses SCSS with CSS custom properties for theming:

```scss
// Customize admin colors
:root {
  --admin-primary-color: #1e40af;
  --admin-success-color: #16a34a;
  --admin-warning-color: #ca8a04;
  --admin-danger-color: #dc2626;
}
```

### Custom Styling

All components use CSS classes with the `admin-` prefix:

```scss
.admin-panel {
  // Customize the main panel
}

.admin-table {
  // Customize tables
}

.admin-btn {
  // Customize buttons
  
  &.btn-primary {
    // Primary button variant
  }
}
```

## Configuration

### API Endpoint

Configure the API endpoint for your backend:

```tsx
// Set the base URL for admin API calls
// This is typically done in your app's configuration
const adminApiUrl = 'http://localhost:3000/admin';
```

### Custom Components

You can replace any component with your own implementation:

```tsx
import { AdminPanel } from '@prisma-admin/react';

// Use your own loading component
const CustomLoadingSpinner = () => <div>Loading...</div>;

<AdminPanel 
  components={{
    LoadingSpinner: CustomLoadingSpinner
  }}
/>
```

## TypeScript

The package is fully typed. Import types as needed:

```tsx
import type { 
  Toast, 
  ToastVariant, 
  ErrorData,
  AdminFieldDefinition 
} from '@prisma-admin/react';
```