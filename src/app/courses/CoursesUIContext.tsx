'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CourseType, FormModeType } from './types';

type PendingLessonCreate = {
  seq: number;
  courseId: CourseType['_id'];
};

type CoursesUIContextValue = {
  selectedCourse: CourseType | null;
  setSelectedCourse: (course: CourseType | null) => void;
  /** Tree item id (`String(lesson._id)` or temp `lesson-…`) when a lesson row is selected; drives right-panel LessonForm. */
  selectedLessonTreeId: string | null;
  setSelectedLessonTreeId: (id: string | null) => void;
  formMode: FormModeType;
  setFormMode: (formMode: FormModeType) => void;
  triggerLessonCreate: (courseId: CourseType['_id']) => void;
  pendingLessonCreate: PendingLessonCreate | null;
  draftLessonId: string | null;
  setDraftLessonId: (lessonId: string | null) => void;
  draftLessonCancelRequestId: number;
  draftLessonCancelId: string | null;
  cancelDraftLesson: () => void;
  commitDraftLesson: () => void;
};

const CoursesUIContext = createContext<CoursesUIContextValue | undefined>(
  undefined,
);

export function CoursesUIProvider({ children }: { children: ReactNode }) {
  const [selectedCourse, setSelectedCourse] = useState<CourseType | null>(null);
  const [selectedLessonTreeId, setSelectedLessonTreeId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormModeType>('course-list');
  const [pendingLessonCreate, setPendingLessonCreate] = useState<PendingLessonCreate | null>(null);
  const [draftLessonId, setDraftLessonId] = useState<string | null>(null);
  const [draftLessonCancelRequestId, setDraftLessonCancelRequestId] = useState(0);
  const [draftLessonCancelId, setDraftLessonCancelId] = useState<string | null>(null);

  const triggerLessonCreate = (courseId: CourseType['_id']) => {
    setPendingLessonCreate((prev) => ({ seq: (prev?.seq ?? 0) + 1, courseId }));
  };

  const cancelDraftLesson = () => {
    if (draftLessonId) {
      setDraftLessonCancelId(draftLessonId);
      setDraftLessonCancelRequestId((n) => n + 1);
    }
    setDraftLessonId(null);
    setSelectedLessonTreeId(null);
    setFormMode('course-edit');
  };

  const commitDraftLesson = () => {
    setDraftLessonId(null);
    setDraftLessonCancelId(null);
    setSelectedLessonTreeId(null);
    setFormMode('course-edit');
  };

  return (
    <CoursesUIContext.Provider
      value={{
        selectedCourse,
        setSelectedCourse,
        selectedLessonTreeId,
        setSelectedLessonTreeId,
        formMode,
        setFormMode,
        triggerLessonCreate,
        pendingLessonCreate,
        draftLessonId,
        setDraftLessonId,
        draftLessonCancelRequestId,
        draftLessonCancelId,
        cancelDraftLesson,
        commitDraftLesson,
      }}
    >
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

