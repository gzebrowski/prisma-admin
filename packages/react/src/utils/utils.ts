/**
 * Type definition for class value inputs
 */

import { DateTime } from 'luxon';

type ClassValue = 
  | string 
  | number 
  | boolean 
  | undefined 
  | null 
  | { [key: string]: boolean | undefined | null }
  | ClassValue[];

/**
 * Combines class names with conditional support
 * @param inputs - Class values to combine (strings, objects, arrays)
 * @returns Combined and deduplicated class string
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  
  // Process all inputs
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string') {
      classes.push(...input.split(/\s+/).filter(Boolean));
    } else if (typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(...nested.split(/\s+/));
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(...key.split(/\s+/).filter(Boolean));
        }
      }
    }
  }
  
  // Remove duplicates while preserving order
  const uniqueClasses = Array.from(new Set(classes));
  return uniqueClasses.join(' ');
}

export function dateToIsoString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') {
    return DateTime.fromISO(date).toISODate();
  }
  return DateTime.fromJSDate(date).toISODate();
}

export function getDate(theDate: string | Date | null | undefined): Date | null {
  if (!theDate) return null;
  if (theDate instanceof Date) return theDate;
  const dt = DateTime.fromISO(theDate);
  return dt.isValid ? dt.toJSDate() : null;
}

export function getTodayDate(): Date {
  return DateTime.now().startOf('day').toJSDate();
}
