import React, { useState, useRef, useEffect } from 'react';

export type AutoCompleteOption = {
  label: string;
  value: string;
};

type ValueType = {
  label?: string | null;
  value?: string | null;
} | null;
    
type AutoCompleteProps = {
  disabled?: boolean;
  emptyMessage?: string;
  placeholder?: string;
  onInputChange?: (value: string) => void;
  onValueChange?: (value: string, label?: string | null) => void;
  value?: ValueType;
  options?: AutoCompleteOption[];
  className?: string;
  loading?: boolean;
  maxHeight?: number;
  emitOnSetValue?: boolean;
  showAllOptions?: boolean;
};

export function AutoComplete(props: AutoCompleteProps) {
  const {
    disabled = false,
    emptyMessage = 'No options found',
    placeholder = 'Type to search...',
    onInputChange,
    onValueChange,
    value,
    options = [],
    className = '',
    loading = false,
    maxHeight = 200,
    emitOnSetValue = false,
  } = props;

  const [inputValue, setInputValue] = useState(value?.label || '');
  const [prevValue, setPrevValue] = useState<ValueType | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<AutoCompleteOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on input value
  useEffect(() => {
    if (!inputValue.trim() || props.showAllOptions) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, options]);

  // Update input value when external value changes
  useEffect(() => {
    if (prevValue === null && value) {
      setPrevValue(value);
    }
    if (prevValue?.value && (!value || value.value === undefined || value.value === null)) {
      setPrevValue(null);
      setInputValue('');
      return;
    }
    if (value && prevValue && value.value !== prevValue.value) {
      setInputValue(value?.label || '');
      setPrevValue(value);
      if (emitOnSetValue && value?.value !== undefined && value?.value !== null) {
        onValueChange?.(value.value, value.label);
      }
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    onInputChange?.(newValue);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleOptionSelect = (option: AutoCompleteOption) => {
    setInputValue(option.label);
    setIsOpen(false);
    onValueChange?.(option.value, option.label);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const baseInputClass = `
    admin-w-full admin-px-3 admin-py-2 admin-border admin-border-gray-300 admin-rounded-md admin-shadow-sm 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    transition-colors duration-200
  `;

  const disabledInputClass = disabled ? 'admin-bg-gray-100 admin-cursor-not-allowed admin-text-gray-500' : 'admin-light-background-color';
  const inputClass = `${baseInputClass} ${disabledInputClass} ${className}`;

  return (
    <div ref={containerRef} className="admin-relative admin-w-full">
      <div className="admin-relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        
        {/* Loading indicator */}
        {loading && (
          <div className="admin-absolute admin-right-3 admin-top-1/2 admin-transform admin--translate-y-50">
            <div className="animate-spin admin-h-4 admin-w-4 admin-border-2 admin-border-gray-300 admin-border-t-blue-500 admin-rounded-full"></div>
          </div>
        )}
        
        {/* Dropdown arrow */}
        {!loading && (
          <div className="admin-absolute admin-right-3 admin-top-1/2 admin-transform admin--translate-y-50 admin-pointer-events-none">
            <svg 
              className={`admin-h-4 admin-w-4 admin-text-gray-400 admin-transition-transform admin-duration-200 ${isOpen ? 'admin-rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div 
          ref={dropdownRef}
          className="admin-absolute admin-z-50 admin-w-full admin-mt-1 admin-light-background-color admin-border admin-border-gray-300 admin-rounded-md admin-shadow-lg"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          <div className="admin-overflow-y-auto admin-max-h-full">
            {loading ? (
              <div className="admin-px-3 admin-py-2 admin-text-sm admin-text-gray-500 admin-text-center">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="admin-px-3 admin-py-2 admin-text-sm admin-text-gray-500 admin-text-center">
                {emptyMessage}
              </div>
            ) : (
              <ul role="listbox" className="admin-py-1">
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={highlightedIndex === index}
                    className={`
                      admin-px-3 admin-py-2 admin-cursor-pointer admin-text-sm admin-transition-colors admin-duration-150
                      ${highlightedIndex === index 
                        ? 'admin-bg-blue-50 admin-text-blue-900' 
                        : 'admin-text-gray-900 admin-hover-bg-gray-50'
                      }
                    `}
                    onClick={() => handleOptionSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
