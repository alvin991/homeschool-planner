'use client';

import { useMemo } from 'react';
import { useCoursesUI } from '../CoursesUIContext';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import LessonsList from './LessonsList';
import SidebarHeader from './SidebarHeader';

export default function CoursesSidebar() {
  const { data } = useCoursesQuery();
  const {
    selectedCourse,
    formMode,
    setFormMode,
    triggerLessonCreate,
    triggerFolderCreate,
    runCourseFlush,
  } = useCoursesUI();

  const courseForSidebar = useMemo(() => {
    if (!selectedCourse) return null;
    const courses = data?.courses ?? [];
    return courses.find((c) => c._id === selectedCourse._id) ?? selectedCourse;
  }, [data?.courses, selectedCourse]);

  const lessonsListKey = useMemo(() => {
    if (!courseForSidebar) return '';
    return JSON.stringify(courseForSidebar.lessonTree ?? []);
  }, [courseForSidebar]);

  if (!selectedCourse || !courseForSidebar) {
    return <nav>Choose a course to see details</nav>;
  }

  const isNewCourse = formMode === 'course-new' || !courseForSidebar._id;
  if (isNewCourse) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex justify-between items-center border-b border-gray-300 gap-2 pb-4">
          <h1 className="text-xl font-semibold text-gray-800">📚️ Lessons</h1>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <p className="text-sm text-gray-500">
            Save the new course first to enable lessons and folders.
          </p>
        </div>
      </div>
    );
  }

  const isLocked = formMode === 'lesson-new' || formMode === 'folder-new';

  // console.log(`selectedCourse ${JSON.stringify(selectedCourse, null, 2)}`)

  const handleNewLessonClick = () => {
    void (async () => {
      if (!(await runCourseFlush())) return;
      setFormMode('lesson-new');
      triggerLessonCreate(courseForSidebar._id);
    })();
  };

  const handleNewFolderClick = () => {
    void (async () => {
      if (!(await runCourseFlush())) return;
      setFormMode('folder-new');
      triggerFolderCreate(courseForSidebar._id);
    })();
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div className="shrink-0">
        <SidebarHeader
          onClickAddLesson={handleNewLessonClick}
          onClickAddFolder={handleNewFolderClick}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <LessonsList
          key={`${courseForSidebar._id}-${lessonsListKey}`}
          course={courseForSidebar}
        />
      </div>

      {/* Overlay: blocks interactions and shows not-allowed cursor */}
      {isLocked && (
        <div className="absolute inset-0 z-10 cursor-not-allowed bg-black/20" />
      )}
      {/* Footer message at the bottom, above overlay */}
      {isLocked && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span>
            🔒 Reordering is locked while creating a new lesson or folder.
          </span>
        </div>
      )}
    </div>
  );
}
