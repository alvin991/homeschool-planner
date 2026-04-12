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

  const isLocked = formMode === 'lesson-new' || formMode === 'folder-new';

  // console.log(`selectedCourse ${JSON.stringify(selectedCourse, null, 2)}`)

  const handleNewLessonClick = () => {
    setFormMode('lesson-new');
    triggerLessonCreate(courseForSidebar._id);
  };

  const handleNewFolderClick = () => {
    setFormMode('folder-new');
    triggerFolderCreate(courseForSidebar._id);
  };

  return (
    <div className="relative">
      <SidebarHeader onClickAddLesson={handleNewLessonClick} onClickAddFolder={handleNewFolderClick}/>
      <LessonsList
        key={`${courseForSidebar._id}-${lessonsListKey}`}
        course={courseForSidebar}
      />

      {/* Overlay: blocks interactions and shows not-allowed cursor */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/20 cursor-not-allowed z-10" />
      )}
      {/* Footer message at the bottom, above overlay */}
      {isLocked && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-amber-50 border-t border-amber-200 px-3 py-2 text-xs text-amber-900">
          <span>
            🔒 Reordering is locked while creating a new lesson or folder.
          </span>
        </div>
      )}
    </div>
  );
}
