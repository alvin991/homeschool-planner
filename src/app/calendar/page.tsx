'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DayView from './components/DayView';
import MonthView from './components/MonthView';
import { familyToday } from '@/utils/dateUtils';

function CalendarContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') ?? 'month';
  const date = searchParams.get('date') ?? undefined;
  
  const DEV_STUDENT_ID = '6a221c10e8f7d2867590f1a5';
  const PROD_STUDENT_ID = '6a09362f9289b2cc08b29c47';
  const studentId = searchParams.get('studentId') 
    ?? (process.env.NODE_ENV === 'production' ? PROD_STUDENT_ID : DEV_STUDENT_ID);

  const month = searchParams.get('month') ?? familyToday().slice(0, 7); // "YYYY-MM" format

  if (view === 'month') return <MonthView studentId={studentId} month={month} />;

  return <DayView studentId={studentId} date={date} />;
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<p className="p-4 text-gray-500">Loading...</p>}>
      <CalendarContent />
    </Suspense>
  );
}
