import React from 'react';

// Pagination components (simple versions)
export const Pagination: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={`pagination ${className || ''}`}>{children}</div>
);

export const PaginationContent: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="pagination-content">{children}</div>
);

export const PaginationItem: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="pagination-item">{children}</div>
);

export const PaginationLink: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}> = ({ children, onClick, isActive }) => (
  <span 
    className={`pagination-link ${isActive ? 'active' : ''}`} 
    onClick={onClick}
  >
    {children}
  </span>
);

export const PaginationPrevious: React.FC<{
  onClick: () => void;
  isActive?: boolean;
}> = ({ onClick, isActive }) => (
  <button 
    className={`pagination-previous ${isActive ? 'active' : ''}`} 
    onClick={onClick}
    disabled={!isActive}
  >
    Previous
  </button>
);

export const PaginationNext: React.FC<{
  onClick: () => void;
  isActive?: boolean;
}> = ({ onClick, isActive }) => (
  <button 
    className={`pagination-next ${isActive ? 'active' : ''}`} 
    onClick={onClick}
    disabled={!isActive}
  >
    Next
  </button>
);

export const PaginationEllipsis: React.FC = () => (
  <span className="pagination-ellipsis">...</span>
);