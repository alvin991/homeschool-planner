'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CourseType, FormModeType } from './types';

type CoursesUIContextValue = {
  selectedCourse: CourseType | null;
  setSelectedCourse: (course: CourseType | null) => void;
  formMode: FormModeType;
  setFormMode: (formMode: FormModeType) => void;
};

const CoursesUIContext = createContext<CoursesUIContextValue | undefined>(
  undefined,
);

export function CoursesUIProvider({ children }: { children: ReactNode }) {
  const [selectedCourse, setSelectedCourse] = useState<CourseType | null>(null);
  const [formMode, setFormMode] = useState<FormModeType>('course-list');

  return (
    <CoursesUIContext.Provider value={{ selectedCourse, setSelectedCourse, formMode, setFormMode }}>
      {children}
    </CoursesUIContext.Provider>
  );
}

export function useCoursesUI() {
  const ctx = useContext(CoursesUIContext);
  if (!ctx) {
    throw new Error('useCoursesUI must be used within a CoursesUIProvider');
  }
  return ctx;
}

