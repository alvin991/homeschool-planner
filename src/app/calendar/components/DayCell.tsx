'use client';

import { useRef, useEffect, useState } from 'react';
import { MonthViewLesson } from '../types';

export default function DayCell({
  dayNumber,
  isValid,
  lessons,
  isToday,
  column,
}: {
  dayNumber: number;
  isValid: boolean;
  lessons: MonthViewLesson[];
  isToday: boolean;
  column: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [popoverLesson, setPopoverLesson] = useState<MonthViewLesson | null>(
    null
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverPosition = column === 6 ? 'right-full' : 'left-full';
  const [popoverTop, setPopoverTop] = useState(0);
  const cellRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!popoverLesson) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPopoverLesson(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverLesson]);

  return (
    <div
      ref={cellRef}
      className={`relative p-2 bg-white min-h-0 border border-gray-200 
      ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}
    >
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
      {popoverLesson && (
        <div
          ref={popoverRef}
          className={`absolute ${popoverPosition} z-50 bg-white rounded-lg shadow-lg border p-4 w-64`}
          style={{ top: popoverTop }}
        >
          {/* Outer triangle (border color) */}
          <div
            className={`absolute ${column === 6 ? '-right-[10px]' : '-left-[10px]'} top-3 w-0 h-0 
            border-t-[9px] border-t-transparent 
            border-b-[9px] border-b-transparent
            ${column === 6 ? 'border-l-[9px] border-l-black' : 'border-r-[9px] border-r-black'}`}
          />
          {/* Inner triangle (white fill) */}
          <div
            className={`absolute ${column === 6 ? '-right-2' : '-left-2'} top-3 w-0 h-0 
            border-t-8 border-t-transparent 
            border-b-8 border-b-transparent
            ${column === 6 ? 'border-l-8 border-l-white' : 'border-r-8 border-r-white'}`}
          />
          <h3>{popoverLesson.course_title}</h3>
          <p>{popoverLesson.lesson_title}</p>
        </div>
      )}

      <div
        ref={scrollRef}
        className="mt-6 h-[calc(100%-1.5rem)] overflow-auto pr-1"
        onScroll={() => setPopoverLesson(null)}
      >
        <div className="space-y-2">
          {lessons.map((lesson, idx) => (
            <div
              key={idx}
              className="flex rounded-md border overflow-hidden px-2 text-nowrap"
              style={{
                opacity: lesson.status === 'completed' ? 0.5 : 1,
                backgroundColor: lesson.subject_color,
                color: 'white',
              }}
              onDoubleClick={(e) => {
                const pillRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const cellRect = cellRef.current!.getBoundingClientRect();
                setPopoverTop(pillRect.top - cellRect.top + pillRect.height / 2 - 9 - 12);
                setPopoverLesson(lesson);
              }}
            >
              {lesson.course_abbr}: {lesson.lesson_title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
