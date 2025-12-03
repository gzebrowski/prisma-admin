import { useState, useEffect } from 'react';

import { Calendar } from './calendar';
import { Button } from './ui/simpleComponents';
import { DateTime } from 'luxon';

type DatetimePickerProps = {
  value?: Date | null;
  onChange: (date: Date | null) => void;
};

export function DatetimePicker({ value, onChange }: DatetimePickerProps) {
  const [date, setDate] = useState<Date | null>(value || null);
  const [hours, setHours] = useState<number>(value ? value.getHours() : 0);
  const [minutes, setMinutes] = useState<number>(value ? value.getMinutes() : 0);
  // useEffect(() => {
  //   if (date) {
  //     const newDate = new Date(date);
  //     newDate.setHours(hours || 0);
  //     newDate.setMinutes(minutes || 0);
  //     onChange(newDate);
  //   } else {
  //     onChange(null);
  //   }
  // }, [date, hours, minutes, onChange]);
  useEffect(() => {
    if (value) {
      setDate(value);
      setHours(value.getHours());
      setMinutes(value.getMinutes());
    } else {
      setDate(null);
      setHours(0);
      setMinutes(0);
    }
  }, [value]);

  const changeValue = (dt: Date | null, h: number | null, m: number | null) => {
    let somethingChanged = false;
    if (dt) {
      setDate(dt);
      somethingChanged = true;
    }
    if (h !== null) {
      setHours(h);
      somethingChanged = true;
    }
    if (m !== null) {
      setMinutes(m);
      somethingChanged = true;
    }
    const dt2 = dt || date;
    if (somethingChanged && dt2) {
      const newDate = DateTime.fromJSDate(dt2).set({ hour: h ?? dt2.getHours(), minute: m ?? dt2.getMinutes() }).toJSDate();
      onChange(newDate);
    }
  }
  return (
    <div className="space-y-4">
      <Calendar value={date} onChange={(v) => changeValue(v, null, null)}>
      <>
      {date && (
        <div className="admin-inline-flex admin-items-center admin-gap-4 admin-p-3 admin-light-background-color admin-rounded-lg">
          <div className="admin-flex admin-items-center admin-gap-2">
            <label className="admin-text-sm admin-font-medium">Time:</label>
            <select
              value={hours}
              onChange={(e) => changeValue(null, Number(e.target.value), null)}
              className="admin-px-2 admin-py-1 admin-border admin-border-gray-300 admin-rounded admin-focus-visible:outline-none focus:admin-ring-2 focus:admin-ring-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="admin-flex admin-items-center admin-gap-2">
            <label className="admin-text-sm admin-font-medium">:</label>
            <select
              value={minutes}
              onChange={(e) => changeValue(null, null, Number(e.target.value))}
              className="admin-px-2 admin-py-1 admin-border admin-rounded admin-focus-visible:outline-none"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="admin-flex admin-items-center admin-gap-2">
            <Button
              variant='link'
              onClick={() => {
                const now = new Date();
                setHours(now.getHours());
                setMinutes(now.getMinutes());
              }}
              className="admin-px-3 admin-py-1 admin-text-xs admin-bg-primary admin-text-white admin-rounded admin-transition-colors"
            >
              Now
            </Button>
          </div>
          
        </div>
      )}
      </>
      </Calendar>
    </div>
  );
}