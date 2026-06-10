'use client';

import { useRef, useEffect, useState } from 'react';

export default function DayCell({ dayNumber, isValid, sampleLessons }: { dayNumber: number; isValid: boolean; sampleLessons: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        const isOverflowing = scrollRef.current.scrollHeight > scrollRef.current.clientHeight;
        setHasOverflow(isOverflowing);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [sampleLessons]);

  return (
    <div className="relative p-2 bg-white min-h-0 border border-gray-200 overflow-hidden">
      {isValid && (
        <div className="absolute left-2 top-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {dayNumber}
        </div>
      )}
      {hasOverflow && (
        <div className="absolute right-2 top-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
          {sampleLessons.length} lessons
        </div>
      )}

      <div ref={scrollRef} className="mt-6 h-[calc(100%-1.5rem)] overflow-auto pr-1">
        <div className="space-y-2">
          {sampleLessons.map((lesson, idx) => (
            <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm">
              {lesson}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
