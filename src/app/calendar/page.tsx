'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DayView from './components/DayView';
import MonthView from './components/MonthView';

function CalendarContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') ?? 'month';
  const date = searchParams.get('date') ?? undefined;
  const studentId = searchParams.get('studentId') ?? '';

  if (view === 'month') return <MonthView />;

  return <DayView studentId={studentId} date={date} />;
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<p className="p-4 text-gray-500">Loading...</p>}>
      <CalendarContent />
    </Suspense>
  );
}
