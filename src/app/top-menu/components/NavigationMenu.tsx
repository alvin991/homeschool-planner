'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavigationMenu() {
  const pathname = usePathname();
  const resourcesOpen =
    pathname === '/resources' || pathname.startsWith('/resources/');

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-600">
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-800"
      >
        🏠 Home
      </Link>
      <Link
        href="/courses"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-gray-100"
      >
        📋 Courses
      </Link>
      <Link
        href="/enrollments"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-gray-100"
      >
        ✅ Enrollments
      </Link>
      <details className="relative">
        <summary
          className={`flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 py-1.5 marker:hidden hover:bg-gray-100 [&::-webkit-details-marker]:hidden ${
            resourcesOpen ? 'bg-gray-100 font-medium text-gray-800' : ''
          }`}
        >
          📚 Resources
        </summary>
        <div className="absolute left-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-gray-200 bg-white py-1 shadow-md">
          <Link
            href="/resources/publishers"
            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Publishers
          </Link>
          <Link
            href="/resources/subjects"
            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Subjects
          </Link>
        </div>
      </details>
      <Link
        href="/students"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-gray-100"
      >
        👤 Students
      </Link>
      <button
        type="button"
        className="ml-2 h-8 w-8 rounded-full bg-gray-300 transition-colors hover:bg-gray-400"
        aria-label="Account"
      />
    </nav>
  );
}
