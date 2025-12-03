import React from 'react';
import { cn } from '../../../utils/utils';

interface IconProps {
  className?: string;
}

// Calendar Days Icon
export const CalendarDays: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

// Pencil Icon
export const EditIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('admin-h-4 admin-w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

// Plus Icon
export const PlusIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('admin-h-4 admin-w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

// X (Close) Icon
export const X: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('admin-h-4 admin-w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// External Link Icon
export const ExternalLink: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

// Chevron Down Icon
export const ChevronDown: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

// Alert Triangle Icon
export const AlertTriangle: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

// Filter Icon
export const FilterIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('admin-h-4 admin-w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
);

// Arrow Up ZA (Sort Ascending)
export const ArrowUpZA: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 11l5-5 5 5M7 21l5-5 5 5"
    />
  </svg>
);

// Arrow Down AZ (Sort Descending)  
export const ArrowDownAZ: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 13l-5 5-5-5M17 3l-5 5-5-5"
    />
  </svg>
);

// Alert Circle Icon (from simpleComponents)
export const AlertCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Check Circle Icon (from simpleComponents)
export const CheckCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('h-4 w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// Info Icon (from simpleComponents)
export const SaveIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={cn('admin-h-4 admin-w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// Alert Triangle Icon (duplicate from simpleComponents, keeping for compatibility)
export const AlertTriangleIcon = AlertTriangle;