'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type MutableRefObject,
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
  /** Tree item id for the right panel: lesson id (or temp `lesson-…`) in lesson modes, folder id in folder-view/edit, else null. */
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
  /**
   * Same tree as LessonsList `lessons` (layout sync + ref updated when inserting a draft row).
   * Forms in `main` read this so saves never see a stale outline vs the sidebar.
   */
  lessonTreeSourceRef: MutableRefObject<TreeData | null>;
  /** Clear the pending add-lesson/add-folder signal (after LessonsList applies it, or defensively). */
  clearPendingTreeDraft: () => void;
  /**
   * Returns true the first time this `seq` is seen (across remounts). Duplicate deliveries
   * (e.g. Strict Mode or LessonsList remount while stale pending state lingered) return false.
   */
  markTreeDraftSeqConsumed: (seq: number) => boolean;
  /** Clear course selection and return to the course list (e.g. breadcrumb "Courses"). */
  resetToCourseList: () => void;
  /**
   * CourseForm registers a flush (validate + save) while its fields are in local edit mode.
   * Returns false if validation or save failed (caller must abort navigation).
   */
  registerCourseFlush: (fn: (() => Promise<boolean>) | null) => void;
  /** LessonForm / FolderForm register flush for lesson-edit/new or folder-edit/new. */
  registerDetailFlush: (fn: (() => Promise<boolean>) | null) => void;
  runCourseFlush: () => Promise<boolean>;
  runDetailFlush: () => Promise<boolean>;
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

  const courseFlushRef = useRef<(() => Promise<boolean>) | null>(null);
  const detailFlushRef = useRef<(() => Promise<boolean>) | null>(null);
  const lessonTreeSourceRef = useRef<TreeData | null>(null);

  const registerCourseFlush = useCallback((fn: (() => Promise<boolean>) | null) => {
    courseFlushRef.current = fn;
  }, []);

  const registerDetailFlush = useCallback((fn: (() => Promise<boolean>) | null) => {
    detailFlushRef.current = fn;
  }, []);

  const runCourseFlush = useCallback(async () => {
    const fn = courseFlushRef.current;
    if (!fn) return true;
    return fn();
  }, []);

  const runDetailFlush = useCallback(async () => {
    const fn = detailFlushRef.current;
    if (!fn) return true;
    return fn();
  }, []);

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
    lessonTreeSourceRef.current = null;
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
        lessonTreeSourceRef,
        clearPendingTreeDraft,
        markTreeDraftSeqConsumed,
        resetToCourseList,
        registerCourseFlush,
        registerDetailFlush,
        runCourseFlush,
        runDetailFlush,
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

