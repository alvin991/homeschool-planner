'use client';

import { useSearchParams } from 'next/navigation';
import DayView from '@/app/calendar/components/DayView';

export default function StudentPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') ?? '';
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  return <DayView studentId={studentId} date={date} />;
}
