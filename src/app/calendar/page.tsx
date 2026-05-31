'use client';

import { useSearchParams } from 'next/navigation';

import DayView from "./components/DayView";

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') ?? 'day';
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const studentId = searchParams.get('studentId') ?? '';

  if (view === 'month') return <p className="p-4 text-gray-500">Month view coming soon.</p>;
    
  return (
    <DayView studentId={studentId} date={date} />
  );
}
