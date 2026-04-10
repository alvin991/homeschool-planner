'use client';

import type { ReactNode } from 'react';
import { CoursesUIProvider } from '@/app/courses/CoursesUIContext';
import { CoursesBreadcrumbProvider } from './top-menu/CoursesBreadcrumbContext';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CoursesUIProvider>
      <CoursesBreadcrumbProvider>{children}</CoursesBreadcrumbProvider>
    </CoursesUIProvider>
  );
}
