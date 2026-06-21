'use client';

import { useRef, useEffect, useState } from 'react';
import { MonthViewLesson } from '../types';

export default function DayCell({
  dayNumber,
  isValid,
  lessons,
}: {
  dayNumber: number;
  isValid: boolean;
  lessons: MonthViewLesson[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        const isOverflowing =
          scrollRef.current.scrollHeight > scrollRef.current.clientHeight;
        setHasOverflow(isOverflowing);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [lessons]);

  return (
    <div className="relative p-2 bg-white min-h-0 border border-gray-200 overflow-hidden">
      {isValid && (
        <div className="absolute left-2 top-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {dayNumber}
        </div>
      )}
      {hasOverflow && (
        <div className="absolute right-2 top-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
          {lessons.length} lessons
        </div>
      )}

      <div
        ref={scrollRef}
        className="mt-6 h-[calc(100%-1.5rem)] overflow-auto pr-1"
      >
        <div className="space-y-2">
          {lessons.map((lesson, idx) => (
            <div
              key={idx}
              className="flex rounded-md border overflow-hidden px-2"
              style={{ opacity: lesson.status === 'completed' ? 0.5 : 1, backgroundColor: lesson.subject_color, color: 'white'}}
            >
                {lesson.course_abbr}: {lesson.lesson_title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
