'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CourseType, FormModeType } from './types';
import type { TreeData } from './components/lessons-tree/types';

type PendingLessonCreate = {
  seq: number;
  courseId: CourseType['_id'];
};

type CoursesUIContextValue = {
  selectedCourse: CourseType | null;
  setSelectedCourse: (course: CourseType | null) => void;
  /** Tree item id for the right panel: lesson id (or temp `lesson-…`) in lesson modes, folder id in folder-edit, else null. */
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
  /** Latest outline from LessonsList (for LessonForm saves). */
  lessonTreeUi: TreeData | null;
  setLessonTreeUi: (tree: TreeData | null) => void;
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
  const [lessonTreeUi, setLessonTreeUi] = useState<TreeData | null>(null);

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
        lessonTreeUi,
        setLessonTreeUi,
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

