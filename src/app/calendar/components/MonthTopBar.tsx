'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { shiftMonth } from '@/utils/dateUtils';

type MonthTopBarProps = {
  month: string;
  onMonthChange: (month: string) => void;
  today: Date;
};

export default function MonthTopBar({ month, onMonthChange, today }: MonthTopBarProps) {
  const [year, monthNum] = month.split('-').map(Number);
  const formattedSelectedMonth = new Date(year, monthNum - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const onPrev = () => {
    onMonthChange(shiftMonth(month, -1));
  };

  const onNext = () => {
    onMonthChange(shiftMonth(month, 1));
  };

  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="h-16 bg-white border-b flex items-center px-4">
      <div className="flex-1">Student Name</div>
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={onPrev}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:bg-slate-300"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="mx-2 text-lg font-semibold">{formattedSelectedMonth}</div>

        <button
          onClick={onNext}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:bg-slate-300"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-end">
        <button 
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:bg-slate-300"
          onClick={() => onMonthChange(todayMonth)}
        >
          Today
        </button>
      </div>
    </div>
  );
}
