'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function MonthTopBar() {
  const onPrev = () => {
    console.log('Previous month');
  };

  const onNext = () => {
    console.log('Next month');
  };

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
        <div className="text-lg font-semibold">June 2026</div>

        <button
          onClick={onNext}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:bg-slate-300"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-end">
        <button>Today: June 8, 2026</button>
      </div>
    </div>
  );
}
