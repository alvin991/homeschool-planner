'use client';

import {
  getDaysInCurrentMonth,
  getFirstWeekdayOfCurrentMonth,
} from '@/utils/dateUtils';
// import { useEffect, useState } from 'react';
import DayCell from './DayCell';
import { MonthViewDay } from '../types';

export default function CalendarGrid({ days }: { days: MonthViewDay[] }) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weekdaysHeader = daysOfWeek.map((day) => (
    <div
      key={day}
      className="flex items-center justify-center p-2 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-white"
    >
      {day}
    </div>
  ));

  const numOfDaysInMonth = getDaysInCurrentMonth();
  const firstDayOfMonth = getFirstWeekdayOfCurrentMonth();
  // TODO: midnight-rollover
  // If you want `today` to update automatically at midnight while the
  // page is open, add a timer that sets `today` to `new Date().getDate()`
  // at the next local midnight (or use an interval). Keep in mind timers
  // must run in the browser (useEffect) and this will re-render the
  // component when `today` changes.
  // const [mounted, setMounted] = useState(false);

  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // useEffect(() => {
  //   setMounted(true);
  // }, []);

  // const today = mounted ? new Date().getDate() : null;

  const lessonsByDay = new Map(
    days.map((d) => [parseInt(d.date.slice(8, 10), 10), d.lessons])
  );

  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDayOfMonth + 1;
    const isValid = dayNumber > 0 && dayNumber <= numOfDaysInMonth;
    const lessons = isValid ? (lessonsByDay.get(dayNumber) ?? []) : [];

    return (
      <DayCell
        key={i}
        dayNumber={dayNumber}
        isValid={isValid}
        lessons={lessons}
      />
    );
  });

  return (
    <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-0 bg-gray-300">
      {weekdaysHeader}
      {cells}
    </div>
  );
}
