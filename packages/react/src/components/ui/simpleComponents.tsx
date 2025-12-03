import React, { forwardRef, useState, ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from "../../utils/utils";

// ===== TABLE COMPONENTS =====
export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table
      ref={ref}
      className={cn("admin-w-full admin-text-sm", className)}
      {...props}
    />
  )
);
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("admin-table-header", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("admin-table-body", className)}
      {...props}
    />
  )
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "admin-border-b admin-transition-colors admin-hover:bg-muted-50",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "admin-h-12 admin-px-4 admin-text-left admin-align-middle admin-font-medium admin-text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  colSpan?: number;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, colSpan, ...props }, ref) => (
    <td
      ref={ref}
      colSpan={colSpan}
      className={cn("admin-p-4 admin-align-middle", className)}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

// ===== SEPARATOR =====
export const Separator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("admin-shrink-0 admin-border admin-w-full", className)}
      style={{ height: '1px' }}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

// ===== CARD COMPONENTS =====
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "admin-rounded-lg admin-border admin-bg-card admin-text-card-foreground admin-shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "admin-text-2xl admin-font-semibold admin-leading-none admin-tracking-tight",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("admin-p-6 admin-pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

// ===== BADGE =====
interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline' | 'ghost';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'admin-border-transparent admin-bg-primary admin-text-white',
      secondary: 'admin-border-transparent admin-text-white',
      success: 'admin-border-transparent admin-bg-green-600 admin-text-white',
      danger: 'admin-border-transparent admin-bg-red-600 admin-text-white',
      warning: 'admin-border-transparent admin-bg-yellow-600 admin-text-white',
      info: 'admin-border-transparent admin-text-white',
      outline: 'admin-border admin-bg-transparent',
      ghost: 'admin-border-transparent admin-bg-gray-100',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'admin-inline-flex admin-items-center admin-rounded-full admin-border admin-px-25 admin-py-05 admin-text-xs admin-font-semibold admin-transition-colors admin-focus-visible:outline-none',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

// ===== BUTTON =====
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'link' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'primary-outline' | 'secondary-outline' | 'danger-outline' | 'warning-outline' | 'info-outline' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', disabled, ...props }, ref) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger',
      success: 'btn-success',
      warning: 'btn-warning',
      info: 'btn-info',
      link: 'btn-link',
      ghost: 'btn-ghost',
      'primary-outline': 'admin-border admin-text-primary admin-hover:bg-gray-50',
      'secondary-outline': 'admin-border admin-hover:bg-gray-50',
      'danger-outline': 'admin-border admin-text-red-600 admin-hover:bg-red-50',
      'warning-outline': 'admin-border admin-text-yellow-600 admin-hover:bg-yellow-50',
      'info-outline': 'admin-border admin-hover:bg-gray-50',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'admin-btn',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ===== INPUT =====
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'admin-flex admin-h-10 admin-w-full admin-rounded-md admin-border admin-bg-background admin-px-3 admin-py-2 admin-text-sm admin-file:border-0 admin-file:bg-transparent admin-file:text-sm admin-file:font-medium admin-placeholder:text-muted-foreground admin-focus-visible:outline-none admin-disabled:cursor-not-allowed admin-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ===== SWITCH =====
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'admin-inline-flex admin-h-6 admin-w-11 admin-shrink-0 admin-cursor-pointer admin-items-center admin-rounded-full admin-border-2 admin-border-transparent admin-transition-colors admin-focus-visible:outline-none admin-disabled:cursor-not-allowed admin-disabled:opacity-50',
        checked ? 'admin-bg-primary' : 'admin-bg-input',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'admin-block admin-h-5 admin-w-5 admin-rounded-full admin-bg-background admin-shadow-lg admin-ring-0 admin-transition-transform',
          checked ? 'admin-translate-x-5' : 'admin-translate-x-0'
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

// ===== TEXTAREA =====
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'admin-flex admin-min-h-20 admin-w-full admin-rounded-md admin-border admin-bg-background admin-px-3 admin-py-2 admin-text-sm admin-placeholder:text-muted-foreground admin-focus-visible:outline-none admin-disabled:cursor-not-allowed admin-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// ===== CHECKBOX =====
interface CheckboxProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onCheckedChange, className, disabled, title, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      title={title}
      aria-checked={checked}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={cn(
        'admin-h-4 admin-w-4 admin-shrink-0 admin-rounded-sm admin-border admin-focus-visible:outline-none admin-disabled:cursor-not-allowed admin-disabled:opacity-50',
        checked ? 'admin-bg-primary admin-text-white' : 'admin-bg-background',
        disabled ? 'admin-opacity-50 admin-cursor-not-allowed' : 'admin-cursor-pointer',
        className
      )}
      {...props}
    >
      {checked && (
        <svg
          className="admin-h-4 admin-w-4"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
);
Checkbox.displayName = "Checkbox";

// ===== SHEET COMPONENTS =====
interface SheetContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType | null>(null);

interface SheetProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Sheet = ({ children, open: controlledOpen, onOpenChange }: SheetProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
};

export const SheetTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, onClick, ...props }, ref) => {
    const context = React.useContext(SheetContext);
    
    return (
      <button
        ref={ref}
        onClick={(e) => {
          context?.setOpen(true);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SheetTrigger.displayName = "SheetTrigger";

export const SheetContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SheetContext);
    
    if (!context?.open) return null;

    return (
      <div className="admin-fixed admin-inset-0 admin-z-50 admin-flex">
        {/* Backdrop */}
        <div 
          className="admin-fixed admin-inset-0 admin-bg-black-50"
          onClick={() => context.setOpen(false)}
        />
        
        {/* Sheet */}
        <div
          ref={ref}
          className={cn(
            "admin-fixed admin-right-0 admin-top-0 admin-h-full admin-w-full admin-max-w-sm admin-border-l admin-bg-background admin-shadow-lg",
            className
          )}
          {...props}
        >
          <button
            onClick={() => context.setOpen(false)}
            className="admin-absolute admin-right-4 admin-top-4 admin-rounded-sm admin-opacity-70 admin-transition-opacity admin-hover:opacity-100 admin-focus-visible:outline-none"
          >
            <svg className="admin-h-4 admin-w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {children}
        </div>
      </div>
    );
  }
);
SheetContent.displayName = "SheetContent";

export const SheetHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("admin-flex admin-flex-col admin-space-y-2 admin-text-center admin-p-6", className)}
      {...props}
    />
  )
);
SheetHeader.displayName = "SheetHeader";

export const SheetTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("admin-text-lg admin-font-semibold admin-text-foreground", className)}
      {...props}
    />
  )
);
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("admin-text-sm admin-text-muted-foreground", className)}
      {...props}
    />
  )
);
SheetDescription.displayName = "SheetDescription";

export const SheetFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("admin-flex admin-flex-col-reverse admin-justify-end admin-gap-2 admin-p-6", className)}
      {...props}
    />
  )
);
SheetFooter.displayName = "SheetFooter";

// ===== COLLAPSIBLE COMPONENTS =====
interface CollapsibleContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextType | null>(null);

interface CollapsibleProps extends HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ defaultOpen = false, onOpenChange, className, children, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    
    const handleOpenChange = (open: boolean) => {
      setInternalOpen(open);
      onOpenChange?.(open);
    };

    return (
      <CollapsibleContext.Provider value={{ open: internalOpen, setOpen: handleOpenChange }}>
        <div ref={ref} className={cn("admin-block", className)} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    );
  }
);
Collapsible.displayName = "Collapsible";

export const CollapsibleTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, onClick, ...props }, ref) => {
    const context = React.useContext(CollapsibleContext);
    
    return (
      <button
        ref={ref}
        onClick={(e) => {
          context?.setOpen(!context.open);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export const CollapsibleContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(CollapsibleContext);
    
    if (!context?.open) return null;

    return (
      <div
        ref={ref}
        className={cn("", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CollapsibleContent.displayName = "CollapsibleContent";

// ===== ALERT COMPONENTS =====
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'admin-bg-background admin-text-foreground admin-border',
      destructive: 'admin-text-red-600 admin-bg-red-50',
      warning: 'admin-text-yellow-600 admin-bg-yellow-50',
      success: 'admin-text-green-600 admin-bg-green-50',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'admin-relative admin-w-full admin-rounded-lg admin-border admin-p-4',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = "Alert";

export const AlertTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('admin-mb-1 admin-font-medium admin-leading-none admin-tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('admin-text-sm', className)}
      {...props}
    />
  )
);
AlertDescription.displayName = "AlertDescription";

// Alert Icons for different variants
export const AlertTriangleIcon = ({ className }: { className?: string }) => (
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

export const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn('admin-h-4 admin-w-4', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
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
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const InfoIcon = ({ className }: { className?: string }) => (
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

// ===== ALERT DIALOG COMPONENTS =====
interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType | null>(null);

interface AlertDialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AlertDialog = ({ children, open: controlledOpen, onOpenChange }: AlertDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

export const AlertDialogTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, onClick, ...props }, ref) => {
    const context = React.useContext(AlertDialogContext);
    
    return (
      <Button
        ref={ref}
        onClick={(e) => {
          context?.setOpen(true);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
AlertDialogTrigger.displayName = "AlertDialogTrigger";

export const AlertDialogContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AlertDialogContext);
    
    if (!context?.open) return null;

    return (
      <div className="admin-dialog admin-fixed admin-inset-0 admin-z-50 admin-flex admin-items-center admin-justify-center">
        {/* Backdrop */}
        <div 
          className="admin-fixed admin-inset-0 admin-bg-black-50"
          onClick={() => context.setOpen(false)}
        />
        
        {/* Dialog */}
        <div
          ref={ref}
          className={cn(
            "admin-dialog-content admin-relative admin-z-50 admin-grid admin-w-full admin-max-w-lg admin-gap-4 admin-border admin-bg-background admin-p-6 admin-shadow-lg admin-rounded-lg",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);
AlertDialogContent.displayName = "AlertDialogContent";

export const AlertDialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("admin-flex admin-flex-col admin-space-y-2 admin-text-center", className)}
      {...props}
    />
  )
);
AlertDialogHeader.displayName = "AlertDialogHeader";

export const AlertDialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("admin-text-lg admin-font-semibold", className)}
      {...props}
    />
  )
);
AlertDialogTitle.displayName = "AlertDialogTitle";

export const AlertDialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
AlertDialogDescription.displayName = "AlertDialogDescription";

export const AlertDialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("admin-flex admin-justify-end admin-gap-2", className)}
      {...props}
    />
  )
);
AlertDialogFooter.displayName = "AlertDialogFooter";

interface AlertDialogActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
}

export const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ className, onClick, disabled, children, ...props }, ref) => {
    const context = React.useContext(AlertDialogContext);
    
    return (
      <Button
        ref={ref}
        disabled={disabled}
        variant='primary'
        onClick={(e) => {
          if (!disabled) {
            onClick?.(e);
            context?.setOpen(false);
          }
        }}
        className={cn(
          'admin-btn admin-btn-primary',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
AlertDialogAction.displayName = "AlertDialogAction";

interface AlertDialogCancelProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const AlertDialogCancel = forwardRef<HTMLButtonElement, AlertDialogCancelProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const context = React.useContext(AlertDialogContext);
    
    return (
      <Button
        ref={ref}
        variant='secondary'
        onClick={(e) => {
          onClick?.(e);
          context?.setOpen(false);
        }}
        className={cn(
          'admin-btn admin-btn-secondary',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
AlertDialogCancel.displayName = "AlertDialogCancel";

