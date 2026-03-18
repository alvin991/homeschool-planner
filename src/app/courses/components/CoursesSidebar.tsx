'use client';

import { useCoursesUI } from '../CoursesUIContext';
import LessonsList from './LessonsList';
import SidebarHeader from './SidebarHeader';

export default function CoursesSidebar() {
  const { selectedCourse, formMode, setFormMode, triggerLessonCreate } = useCoursesUI();

  if (!selectedCourse) {
    return <nav>Choose a course to see details</nav>;
  }

  const isLocked = formMode === 'lesson-new';

  // console.log(`selectedCourse ${JSON.stringify(selectedCourse, null, 2)}`)

  const handleNewLessonClick = () => {
    // Implement navigation to course details page
    setFormMode('lesson-new');
    triggerLessonCreate(selectedCourse._id);
    console.log(`lesson-new`);
  };

  return (
    <div>
      {/* <h3 className="text-sm font-semibold mb-2">
        {selectedCourse.title}
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        {selectedCourse.publisher.name} · Grade {selectedCourse.grade}
      </p>
      <h4 className="text-xs font-semibold text-gray-600 mb-1">
        Lessons
      </h4>
      <ul className="text-xs text-gray-700 space-y-1 max-h-64 overflow-auto pr-1">
        {selectedCourse.lessons.map((lesson) => (
          <li key={lesson._id} className="truncate">
            {lesson.order}. {lesson.title}
          </li>
        ))}
      </ul> */}
      <SidebarHeader onClick={handleNewLessonClick} />
      <LessonsList key={selectedCourse._id} course={selectedCourse} />

      {/* Overlay: blocks interactions and shows not-allowed cursor */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/20 cursor-not-allowed z-10" />
      )}
      {/* Footer message at the bottom, above overlay */}
      {isLocked && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-amber-50 border-t border-amber-200 px-3 py-2 text-xs text-amber-900">
          <span>🔒 Reordering is locked while creating a new lesson.</span>
        </div>
      )}
    </div>
  );
}
