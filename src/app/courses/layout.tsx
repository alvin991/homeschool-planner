'use client';

import { useCoursesUI } from './CoursesUIContext';
import CoursesSidebar from './components/CoursesSidebar';
import CourseForm from './components/CourseForm';

function CourseFormNewBar() {
  const { selectedCourse } = useCoursesUI();
  if (!selectedCourse) return null;
  return (
    <div className="w-full shrink-0 border-b border-gray-200 bg-gray-50">
      <CourseForm course={selectedCourse} />
    </div>
  );
}

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <CourseFormNewBar />
      <div className="flex min-h-0 flex-1">
        <aside className="w-[26rem] shrink-0 border-r border-gray-200 bg-gray-50 p-4 relative">
          <CoursesSidebar />
        </aside>
        <main className="flex-1 min-h-0 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
