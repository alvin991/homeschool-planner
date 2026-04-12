'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CourseType, FormModeType } from './types';
import type { TreeData } from './components/lessons-tree/types';

type PendingTreeDraft = {
  seq: number;
  courseId: CourseType['_id'];
  kind: 'lesson' | 'folder';
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
  triggerFolderCreate: (courseId: CourseType['_id']) => void;
  pendingTreeDraft: PendingTreeDraft | null;
  /** Temp tree item id while creating a new lesson or folder (removed on cancel/save). */
  draftItemId: string | null;
  setDraftItemId: (id: string | null) => void;
  draftLessonCancelRequestId: number;
  draftLessonCancelId: string | null;
  cancelDraftItem: () => void;
  commitDraftItem: () => void;
  /** Latest outline from LessonsList (for LessonForm saves). */
  lessonTreeUi: TreeData | null;
  setLessonTreeUi: (tree: TreeData | null) => void;
  /** Clear the pending add-lesson/add-folder signal (after LessonsList applies it, or defensively). */
  clearPendingTreeDraft: () => void;
  /**
   * Returns true the first time this `seq` is seen (across remounts). Duplicate deliveries
   * (e.g. Strict Mode or LessonsList remount while stale pending state lingered) return false.
   */
  markTreeDraftSeqConsumed: (seq: number) => boolean;
  /** Clear course selection and return to the course list (e.g. breadcrumb "Courses"). */
  resetToCourseList: () => void;
};

const CoursesUIContext = createContext<CoursesUIContextValue | undefined>(
  undefined,
);

export function CoursesUIProvider({ children }: { children: ReactNode }) {
  const [selectedCourse, setSelectedCourse] = useState<CourseType | null>(null);
  const [selectedLessonTreeId, setSelectedLessonTreeId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormModeType>('course-list');
  const [pendingTreeDraft, setPendingTreeDraft] = useState<PendingTreeDraft | null>(null);
  const [draftItemId, setDraftItemId] = useState<string | null>(null);
  const [draftLessonCancelRequestId, setDraftLessonCancelRequestId] = useState(0);
  const [draftLessonCancelId, setDraftLessonCancelId] = useState<string | null>(null);
  const [lessonTreeUi, setLessonTreeUi] = useState<TreeData | null>(null);

  /** Monotonic counter so each trigger has a unique seq even after `pendingTreeDraft` is cleared. */
  const treeDraftSeqRef = useRef(0);
  /** Survives LessonsList remount (e.g. after save + refetch changes sidebar `key`). */
  const lastConsumedTreeDraftSeqRef = useRef(0);

  const clearPendingTreeDraft = useCallback(() => {
    setPendingTreeDraft(null);
  }, []);

  const markTreeDraftSeqConsumed = useCallback((seq: number) => {
    if (seq <= lastConsumedTreeDraftSeqRef.current) return false;
    lastConsumedTreeDraftSeqRef.current = seq;
    return true;
  }, []);

  const triggerLessonCreate = (courseId: CourseType['_id']) => {
    treeDraftSeqRef.current += 1;
    setPendingTreeDraft({
      seq: treeDraftSeqRef.current,
      courseId,
      kind: 'lesson',
    });
  };

  const triggerFolderCreate = (courseId: CourseType['_id']) => {
    treeDraftSeqRef.current += 1;
    setPendingTreeDraft({
      seq: treeDraftSeqRef.current,
      courseId,
      kind: 'folder',
    });
  };

  const cancelDraftItem = () => {
    if (draftItemId) {
      setDraftLessonCancelId(draftItemId);
      setDraftLessonCancelRequestId((n) => n + 1);
    }
    setDraftItemId(null);
    setSelectedLessonTreeId(null);
    setFormMode('course-edit');
    setPendingTreeDraft(null);
  };

  const commitDraftItem = () => {
    setDraftItemId(null);
    setDraftLessonCancelId(null);
    setSelectedLessonTreeId(null);
    setFormMode('course-edit');
    setPendingTreeDraft(null);
  };

  const resetToCourseList = useCallback(() => {
    setSelectedCourse(null);
    setSelectedLessonTreeId(null);
    setFormMode('course-list');
    setPendingTreeDraft(null);
    setDraftItemId(null);
    setDraftLessonCancelId(null);
    setLessonTreeUi(null);
  }, []);

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
        triggerFolderCreate,
        pendingTreeDraft,
        draftItemId,
        setDraftItemId,
        draftLessonCancelRequestId,
        draftLessonCancelId,
        cancelDraftItem,
        commitDraftItem,
        lessonTreeUi,
        setLessonTreeUi,
        clearPendingTreeDraft,
        markTreeDraftSeqConsumed,
        resetToCourseList,
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

