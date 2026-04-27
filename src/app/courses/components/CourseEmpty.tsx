'use client';

import { useCallback } from 'react';
import { useCoursesUI } from '../CoursesUIContext';

export type CourseEmptyProps = {
  courseId: string;
};

export default function CourseEmpty({ courseId }: CourseEmptyProps) {
  const {
    setFormMode,
    triggerLessonCreate,
    runDetailFlush,
    runCourseFlush,
  } = useCoursesUI();

  const handleDoubleClick = useCallback(() => {
    void (async () => {
      if (!(await runDetailFlush())) return;
      if (!(await runCourseFlush())) return;
      setFormMode('lesson-new');
      triggerLessonCreate(courseId);
    })();
  }, [
    courseId,
    runDetailFlush,
    runCourseFlush,
    setFormMode,
    triggerLessonCreate,
  ]);

  return (
    <div
      className="flex min-h-0 w-full flex-1 cursor-default flex-col items-center justify-center px-4 text-center"
      onDoubleClick={handleDoubleClick}
      title="Outline: click to view, double-click to edit. Here: double-click to add a lesson."
      role="presentation"
    >
      {/* <h1 className="text-2xl font-bold text-gray-800">Nothing selected</h1> */}
      <p className="mt-3 max-w-md text-gray-600">
        Double-click this empty area to add a new lesson.
      </p>
      <p className="mt-3 max-w-md text-gray-600">
        In the outline on the left, click an item to view it, or double-click to
        edit.
      </p>
    </div>
  );
}
