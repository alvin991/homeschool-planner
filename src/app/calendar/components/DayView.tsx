import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_DAY_VIEW, UPDATE_OCCURRENCE_STATUS } from '../api';
import apolloClient from '@/utils/apolloClient';
import type { GetCalendarDayViewData, DayViewLesson } from '../types';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Nunito } from 'next/font/google';
import { localToday } from '@/utils/dateUtils';

const nunito = Nunito({
  subsets: ['latin'],
});

type DayViewProps = {
  studentId: string;
  date?: string;
};

export default function DayView({ studentId, date = localToday() }: DayViewProps) {
  const [now, setNow] = useState<Date | null>(null);
  // selectedLesson drives the detail popup — not yet implemented
  const [selectedLesson, setSelectedLesson] = useState<DayViewLesson | null>(
    null
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [updateOccurrenceStatus] = useMutation(UPDATE_OCCURRENCE_STATUS, {
    client: apolloClient,
    refetchQueries: [{ query: GET_DAY_VIEW, variables: { studentId, date } }],
  });
  const { data, loading, error } = useQuery<GetCalendarDayViewData>(
    GET_DAY_VIEW,
    {
      client: apolloClient,
      variables: { studentId, date },
      skip: !studentId || !date,
    }
  );
  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  if (error)
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );

  const studentName = data?.calendarDayView.studentName ?? '';
  const lessons = data?.calendarDayView.lessons ?? [];

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(
    (l) => l.status === 'completed'
  ).length;

  const handleToggleComplete = async (lesson: DayViewLesson) => {
    const newStatus = lesson.status === 'completed' ? 'pending' : 'completed';
    await updateOccurrenceStatus({
      variables: {
        input: {
          enrollmentId: lesson.enrollment_id,
          sequence: lesson.sequence,
          status: newStatus,
          completedDate: newStatus === 'completed' ? date : undefined,
        },
      },
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-center shrink-0 border-b border-gray-200">
        <div className="w-1/3 p-4">
          <p className={`text-3xl font-bold ${nunito.className}`}>
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            {' · '}
            {now?.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          <div className="flex items-center justify-between mt-1">
            <p className={`text-xl font-semibold ${nunito.className}`}>
              {studentName}
            </p>
            <p className={`text-xl text-gray-500 ${nunito.className}`}>
              ✓ {completedLessons} / {totalLessons}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-1/3 py-4">
          {lessons.map((lesson) => (
            <div
              key={`${lesson.enrollment_id}-${lesson.sequence}`}
              className="w-full mb-3"
            >
              <div className="rounded-xl overflow-hidden flex flex-col h-36 relative">
                {/* dark overlay when completed */}
                {lesson.status === 'completed' && (
                  <div className="absolute inset-0 bg-black/30 z-10 rounded-xl" />
                )}
                {/* upper 2/5 — pale */}
                <div
                  className="relative flex items-center px-4 gap-2"
                  style={{ flex: 2 }}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: lesson.subject_color }}
                  />
                  <p
                    className={`relative text-lg font-semibold ${nunito.className}`}
                    style={{ color: lesson.subject_color }}
                  >
                    {lesson.course_title}
                  </p>
                  {lesson.day_number && (
                    <p
                      className={`relative text-lg text-gray-400 ${nunito.className}`}
                    >
                      · Day {lesson.day_number} of {lesson.total_days}
                    </p>
                  )}
                </div>

                {/* lower 3/5 — solid */}
                <div
                  className="flex flex-col justify-between px-4 py-2"
                  style={{ flex: 3, backgroundColor: lesson.subject_color }}
                >
                  <p
                    className={`text-lg font-bold text-white ${nunito.className}`}
                  >
                    {lesson.lesson_title}
                  </p>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedLesson(lesson)}
                    >
                      <ChevronRightIcon className="w-6 h-6 text-white/70" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(lesson)}
                      className={`relative z-20 w-9 h-9 rounded-full border-2 flex items-center justify-center
                        ${
                          lesson.status === 'completed'
                            ? 'bg-white border-white'
                            : 'border-white/50 bg-transparent'
                        }`}
                    >
                      {lesson.status === 'completed' && (
                        <span
                          className="text-sm font-bold"
                          style={{ color: lesson.subject_color }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
