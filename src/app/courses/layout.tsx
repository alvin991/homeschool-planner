'use client';

import { CoursesUIProvider } from './CoursesUIContext';
import CoursesSidebar from './components/CoursesSidebar';

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CoursesUIProvider>
      <div className="flex min-h-0 flex-1">
        <aside className="w-100 shrink-0 border-r border-gray-200 bg-gray-50 p-4">
          <CoursesSidebar />
        </aside>
        <main className="flex-1 min-h-0 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </CoursesUIProvider>
  );
}
