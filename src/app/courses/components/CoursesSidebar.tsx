'use client';

import { useCoursesUI } from '../CoursesUIContext';
import LessonsList from './LessonsList';

export default function CoursesSidebar() {
  const { selectedCourse } = useCoursesUI();

  if (!selectedCourse) {
    return <nav>Choose a course to see details</nav>;
  }

  console.log(`selectedCourse ${JSON.stringify(selectedCourse, null, 2)}`)

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
      <LessonsList key={selectedCourse._id} course={selectedCourse} />
    </div>
  );
}