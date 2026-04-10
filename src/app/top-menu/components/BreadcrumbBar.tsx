'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCoursesUI } from '@/app/courses/CoursesUIContext';
import { useCoursesBreadcrumb } from '../CoursesBreadcrumbContext';

const SEGMENT_LABELS: Record<string, string> = {
  courses: 'Courses',
  checklists: 'Checklists',
  sumsum: 'Sumsum',
  kaka: 'Kaka',
  testing: 'Testing',
};

function labelForSegment(segment: string): string {
  const mapped = SEGMENT_LABELS[segment];
  if (mapped) return mapped;
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type Crumb = {
  key: string;
  label: string;
  href: string;
  /** "Courses" on /courses: back to list when not the last crumb */
  coursesSegment?: boolean;
};

export default function BreadcrumbBar() {
  const pathname = usePathname();
  const { resetToCourseList } = useCoursesUI();
  const { selectedCourseId, selectedCourseTitle } = useCoursesBreadcrumb();
  const segments = pathname.split('/').filter(Boolean);

  let crumbs: Crumb[];

  if (pathname === '/courses' || pathname.startsWith('/courses/')) {
    crumbs = [
      { key: 'home', label: 'Home', href: '/' },
      {
        key: 'courses',
        label: 'Courses',
        href: '/courses',
        coursesSegment: true,
      },
    ];
    if (selectedCourseTitle) {
      crumbs.push({
        key: selectedCourseId ? `course-${selectedCourseId}` : `course-${selectedCourseTitle}`,
        label: selectedCourseTitle,
        href: '/courses',
      });
    }
  } else {
    crumbs = [{ key: 'home', label: 'Home', href: '/' }];
    let acc = '';
    for (const seg of segments) {
      acc += `/${seg}`;
      crumbs.push({
        key: acc,
        label: labelForSegment(seg),
        href: acc,
      });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="border-b border-gray-100 bg-gray-50 px-6 py-2">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-gray-600">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const coursesReset =
            crumb.coursesSegment &&
            pathname === '/courses' &&
            !isLast;

          return (
            <li key={crumb.key} className="flex items-center gap-1">
              {i > 0 && (
                <span className="select-none text-gray-400" aria-hidden>
                  /
                </span>
              )}
              {coursesReset ? (
                <button
                  type="button"
                  className="hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-sm"
                  onClick={() => resetToCourseList()}
                >
                  {crumb.label}
                </button>
              ) : isLast ? (
                <span className="font-medium text-gray-900">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-sm"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
