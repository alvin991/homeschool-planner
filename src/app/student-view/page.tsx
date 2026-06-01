'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DayView from '@/app/calendar/components/DayView';

function StudentContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') ?? '';
  const date = searchParams.get('date') ?? undefined;

  return <DayView studentId={studentId} date={date} />;
}

export default function StudentPage() {
  return (
    <Suspense fallback={<p className="p-4 text-gray-500">Loading...</p>}>
      <StudentContent />
    </Suspense>
  );
}
