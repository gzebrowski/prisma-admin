import { Calendar } from './calendar';

// Export głównego komponentu
export { Calendar };

// Export typu dla łatwego użycia
export type { CalendarProps } from './calendar';

// Re-eksport z typami dla kompatybilności
export type DatePickerProps = {
  date?: Date;
  onDateChange: (date: Date) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

// Alias komponentu dla różnych nazw
export const DatePicker = Calendar;