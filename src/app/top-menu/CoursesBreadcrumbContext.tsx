'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type CoursesBreadcrumbContextValue = {
  selectedCourseId: string | null;
  selectedCourseTitle: string | null;
  setSelectedCourseBreadcrumb: (id: string | null, title: string | null) => void;
};

const CoursesBreadcrumbContext = createContext<
  CoursesBreadcrumbContextValue | undefined
>(undefined);

export function CoursesBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [rawCourseId, setRawCourseId] = useState<string | null>(null);
  const [rawCourseTitle, setRawCourseTitle] = useState<string | null>(null);
  const pathname = usePathname();

  const onCoursesRoute = pathname.startsWith('/courses');
  const selectedCourseId = onCoursesRoute ? rawCourseId : null;
  const selectedCourseTitle = onCoursesRoute ? rawCourseTitle : null;

  const setSelectedCourseBreadcrumb = useCallback(
    (id: string | null, title: string | null) => {
      setRawCourseId(id);
      setRawCourseTitle(title);
    },
    [],
  );

  const value = useMemo(
    () => ({
      selectedCourseId,
      selectedCourseTitle,
      setSelectedCourseBreadcrumb,
    }),
    [selectedCourseId, selectedCourseTitle, setSelectedCourseBreadcrumb],
  );

  return (
    <CoursesBreadcrumbContext.Provider value={value}>
      {children}
    </CoursesBreadcrumbContext.Provider>
  );
}

export function useCoursesBreadcrumb() {
  const ctx = useContext(CoursesBreadcrumbContext);
  if (!ctx) {
    throw new Error(
      'useCoursesBreadcrumb must be used within CoursesBreadcrumbProvider',
    );
  }
  return ctx;
}
