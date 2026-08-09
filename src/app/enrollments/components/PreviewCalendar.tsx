'use client';
import apolloClient from '@/utils/apolloClient';
import { useQuery } from '@apollo/client/react';
import {
  PREVIEW_ENROLLMENT_SCHEDULE,
  type PreviewEnrollmentScheduleData,
} from '../api';
import CalendarGrid from '../../calendar/components/CalendarGrid';
import MonthTopBar from '../../calendar/components/MonthTopBar';
import { useState } from 'react';
import { familyTodayAsDate } from '@/utils/dateUtils';

type PreviewCalendarProps = {
  studentId: string;
  courseId: string;
  startDate: string;
  endDate?: string;
  weekdays: number[];
  lessonRate: number;
  status: string;
  suspensionPeriods: { start: string; end: string }[];
  onSave: () => void;
  onClose: () => void;
};

export default function PreviewCalendar({
  studentId,
  courseId,
  startDate,
  endDate,
  weekdays,
  lessonRate,
  status,
  suspensionPeriods,
  onSave,
  onClose,
}: PreviewCalendarProps) {
  const { data, loading, error } = useQuery<PreviewEnrollmentScheduleData>(
    PREVIEW_ENROLLMENT_SCHEDULE,
    {
      client: apolloClient,
      variables: {
        input: {
          studentId: studentId,
          courseId: courseId,
          start_date: startDate,
          end_date: endDate,
          weekdays: weekdays,
          lesson_rate: lessonRate,
          status: status,
          suspension_periods: suspensionPeriods,
        },
      },
    }
  );
  const allDays = data?.previewEnrollmentSchedule.days ?? [];
  const [month, setMonth] = useState(startDate.slice(0, 7));
  const today = familyTodayAsDate();
  const days = allDays.filter((d) => d.date.startsWith(month));

  if (loading) return <div className="fixed inset-0 z-50 ...">Loading...</div>;
  if (error)
    return <div className="fixed inset-0 z-50 ...">Error: {error.message}</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Preview Schedule</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Calendar content — fills remaining space */}
        <div className="flex-1 min-h-0 flex flex-col">
          <MonthTopBar month={month} onMonthChange={setMonth} today={today} />
          <CalendarGrid days={days} today={today} month={month} />
       </div>

        {/* Footer — Cancel / Save */}
        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
