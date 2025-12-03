import React, { useState, useRef, useEffect } from 'react';

import { dateToIsoString, getDate, getTodayDate } from '../utils/utils';
import { cn } from '../utils/utils';

export type CalendarProps = {
  value?: Date | string | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
};

export const Calendar: React.FC<CalendarProps> = (props: CalendarProps) => {
  const { value, onChange, disabled = false, placeholder = 'Select date...', className = '', children } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    const dt = value || getTodayDate();
    return getDate(dt);
  });
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Months names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Format date to ISO string (YYYY-MM-DD)
  const formatDateToISO = (date: Date | string): string => {
    return dateToIsoString(date) || '';
  };

  // Close calendar when clicking outside
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

  // Handle input click
  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      setViewMode('days');
    }
  };

  // Handle date selection
  const handleDateSelect = (selectedDate: Date) => {
    const dateIso = formatDateToISO(selectedDate);
    onChange(getDate(dateIso));
    setIsOpen(false);
  };

  // Handle month selection
  const handleMonthSelect = (month: number) => {
    const currDate = currentDate || getTodayDate();
    const newDate = new Date(currDate.getFullYear(), month, 1);
    setCurrentDate(newDate);
    setViewMode('days');
  };

  // Handle year selection
  const handleYearSelect = (year: number) => {
    const currDate = currentDate || getTodayDate();
    const newDate = new Date(year, currDate.getMonth(), 1);
    setCurrentDate(newDate);
    setViewMode('days');
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currDate = currentDate || getTodayDate();
    const newDate = new Date(currDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Navigate years
  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = currentDate || getTodayDate();
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  // Navigate decade
  const navigateDecade = (direction: 'prev' | 'next') => {
    const newDate = currentDate || getTodayDate();
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 10);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 10);
    }
    setCurrentDate(newDate);
  };
  const getCurrentDate = (): Date => {
    return currentDate || getTodayDate();
  };

  // Get days in month
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: (Date | null)[] = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  // Get years for year view
  const getYearsForDecade = (date: Date): number[] => {
    const year = date.getFullYear();
    const startYear = Math.floor(year / 10) * 10;
    const years: number[] = [];
    for (let i = startYear; i < startYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is selected
  const isSelected = (checkDate: Date): boolean => {
    return value ? dateToIsoString(checkDate) === dateToIsoString(value) : false;
  };

  // Check if date is in current month
  const isCurrentMonth = (checkDate: Date): boolean => {
    return checkDate.getMonth() === getCurrentDate().getMonth();
  };

  const inputValue = value ? formatDateToISO(value) : '';
  const baseInputClass = `
    admin-w-26 admin-px-3 admin-py-2 admin-border admin-border-gray-300 admin-rounded-md admin-shadow-sm 
    focus:admin-outline-none focus:admin-ring-2 focus:admin-ring-blue-500 focus:admin-border-blue-500
    admin-transition-colors admin-duration-200 admin-cursor-pointer
  `;
  
  const disabledInputClass = disabled ? 'admin-bg-gray-100 admin-cursor-not-allowed admin-text-gray-500' : 'admin-bg-background';
  const inputClass = `${baseInputClass} ${disabledInputClass} ${className}`;

  return (
    <div ref={containerRef} className="admin-relative admin-min-w-50 admin-inline-block">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        placeholder={placeholder}
        onClick={handleInputClick}
        readOnly
        disabled={disabled}
        className={inputClass}
      />
      {children}
      {isOpen && !disabled && (
        <div className="admin-absolute admin-z-50 admin-w-80 admin-mt-1 admin-light-background-color admin-border admin-rounded-md admin-shadow-lg admin-p-4">
          {/* Header */}
          <div className="admin-flex admin-items-center admin-justify-between admin-mb-4">
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'days') navigateMonth('prev');
                else if (viewMode === 'months') navigateYear('prev');
                else navigateDecade('prev');
              }}
              className="admin-p-1 hover:admin-light-background-color admin-rounded"
            >
              <svg className="admin-w-4 admin-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="admin-flex admin-items-center admin-space-x-2">
              {viewMode === 'days' && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('months')}
                    className="admin-px-2 admin-py-1 hover:admin-bg-gray-100 admin-rounded admin-text-sm admin-font-medium"
                  >
                    {monthNames[getCurrentDate().getMonth()]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('years')}
                    className="admin-px-2 admin-py-1 hover:admin-bg-gray-100 admin-rounded admin-text-sm admin-font-medium"
                  >
                    {getCurrentDate().getFullYear()}
                  </button>
                </>
              )}
              {viewMode === 'months' && (
                <button
                  type="button"
                  onClick={() => setViewMode('years')}
                  className="admin-px-2 admin-py-1 hover:admin-bg-gray-100 admin-rounded admin-text-sm admin-font-medium"
                >
                  {getCurrentDate().getFullYear()}
                </button>
              )}
              {viewMode === 'years' && (
                <span className="admin-px-2 admin-py-1 admin-text-sm admin-font-medium">
                  {Math.floor(getCurrentDate().getFullYear() / 10) * 10} - {Math.floor(getCurrentDate().getFullYear() / 10) * 10 + 9}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (viewMode === 'days') navigateMonth('next');
                else if (viewMode === 'months') navigateYear('next');
                else navigateDecade('next');
              }}
              className="admin-p-1 hover:admin-bg-gray-100 admin-rounded"
            >
              <svg className="admin-w-4 admin-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Days view */}
          {viewMode === 'days' && (
            <div>
              {/* Day headers */}
              <div className="admin-grid admin-grid-cols-7 admin-mb-2">
                {dayNames.map(day => (
                  <div key={day} className="admin-p-2 admin-text-center admin-text-xs admin-font-medium admin-text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="admin-grid admin-grid-cols-7 admin-gap-1">
                {getDaysInMonth(getCurrentDate()).map((day, index) => {
                  if (!day) return <div key={index} />;
                  
                  const isSelectedDay = isSelected(day);
                  const isTodayDay = isToday(day);
                  const isCurrentMonthDay = isCurrentMonth(day);
                  
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      className={`
                        admin-p-2 admin-text-sm admin-rounded hover:admin-bg-blue-500 transition-colors
                        ${isSelectedDay ? 'admin-bg-blue-500 admin-text-inverse hover:admin-bg-blue-600' : ''}
                        ${!isSelectedDay && isTodayDay ? 'admin-bg-blue-100 admin-foreground-color' : ''}
                        ${!isCurrentMonthDay ? 'admin-text-gray-400' : 'admin-text-gray-900'}
                      `}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Months view */}
          {viewMode === 'months' && (
            <div className="admin-grid admin-grid-cols-3 admin-gap-2">
              {monthNames.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthSelect(index)}
                  className={`
                    admin-p-3 admin-text-sm admin-rounded hover:admin-bg-blue-50 transition-colors
                    ${getCurrentDate().getMonth() === index ? 'admin-bg-blue-100 admin-foreground-color' : 'admin-text-gray-900'}
                  `}
                >
                  {month}
                </button>
              ))}
            </div>
          )}

          {/* Years view */}
          {viewMode === 'years' && (
            <div className="admin-grid admin-grid-cols-2 admin-gap-2">
              {getYearsForDecade(getCurrentDate()).map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearSelect(year)}
                  className={`
                    admin-p-3 admin-text-sm admin-rounded hover:admin-bg-blue-50 transition-colors
                    ${getCurrentDate().getFullYear() === year ? 'admin-bg-blue-100 admin-foreground-color' : 'admin-text-gray-900'}
                  `}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Today button */}
          <div className="admin-mt-4 admin-pt-3 admin-border-t admin-border-gray-200">
            <button
              type="button"
              onClick={() => handleDateSelect(new Date())}
              className="admin-w-full admin-px-3 admin-py-2 admin-text-sm admin-bg-gray-100 hover:admin-bg-gray-200 admin-admin-rounded admin-transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
