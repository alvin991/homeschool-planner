'use client';

import DayCell from './DayCell';
import { MonthViewDay } from '../types';

type CalendarGridProps = {
  days: MonthViewDay[];
  today: Date;
  month: string;
};

export default function CalendarGrid({ days, today, month }: CalendarGridProps) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weekdaysHeader = daysOfWeek.map((day) => (
    <div
      key={day}
      className="flex items-center justify-center p-2 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-white"
    >
      {day}
    </div>
  ));
 
  const [year, monthNum] = month.split('-').map(Number);
  const numOfDaysInMonth = new Date(year, monthNum, 0).getDate();
  const firstDayOfMonth = new Date(year, monthNum - 1, 1).getDay();

  const todayDay = today.getDate();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = currentMonth === days[0]?.date.slice(0, 7);

  const lessonsByDay = new Map(
    days.map((d) => [parseInt(d.date.slice(8, 10), 10), d.lessons])
  );

  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDayOfMonth + 1;
    const isValid = dayNumber > 0 && dayNumber <= numOfDaysInMonth;
    const lessons = isValid ? (lessonsByDay.get(dayNumber) ?? []) : [];

    const isToday = isValid && isCurrentMonth && dayNumber === todayDay;

    return (
      <DayCell
        key={i}
        dayNumber={dayNumber}
        isValid={isValid}
        lessons={lessons}
        isToday={isToday}
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
