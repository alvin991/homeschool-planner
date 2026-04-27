"use client"; // Next.js App Router

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import apolloClient from '@/utils/apolloClient';
import { TreeRenderer } from './lessons-tree/TreeRender';
import { TreeData, TreeItem } from './lessons-tree/types';
import { findItem, maxOutlinePosition } from './lessons-tree/treeUtils';
import useTreeDrag from './lessons-tree/useTreeDrag';
import type { CourseType } from '../types';
import { GET_COURSES, UPDATE_COURSE_LESSON_TREE } from '../api/course.graphql';
import { apiTreeToTreeData, treeDataToLessonTreeJson } from '../courseTree';
import { useCoursesUI } from '../CoursesUIContext';

type LessonsListProps = {
  course: CourseType;
};

export default function LessonsList({ course }: LessonsListProps) {
  const {
    setDraftItemId,
    draftLessonCancelRequestId,
    draftLessonCancelId,
    pendingTreeDraft,
    clearPendingTreeDraft,
    markTreeDraftSeqConsumed,
    formMode,
    setFormMode,
    selectedLessonTreeId,
    setSelectedLessonTreeId,
    setLessonTreeUi,
    lessonTreeSourceRef,
    runCourseFlush,
    runDetailFlush,
  } = useCoursesUI();
  const [lessons, setLessons] = useState<TreeData>(() =>
    apiTreeToTreeData(course.lessonTree ?? []),
  );
  const courseRef = useRef(course);
  useEffect(() => {
    courseRef.current = course;
  }, [course]);

  const [updateCourseLessonTree] = useMutation(UPDATE_COURSE_LESSON_TREE, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
    awaitRefetchQueries: true,
  });

  /** Serialize outline saves so overlapping drags / refetches cannot hit stale Mongoose versions. */
  const persistOutlineChainRef = useRef<Promise<void>>(Promise.resolve());

  /** Layout sync: ref + context match `lessons` before sibling forms run layout effects. */
  useLayoutEffect(() => {
    lessonTreeSourceRef.current = lessons;
    setLessonTreeUi(lessons);
  }, [lessons, lessonTreeSourceRef, setLessonTreeUi]);

  const persistLessonsFromTree = useCallback(
    async (nextTree: TreeData) => {
      const run = async () => {
        try {
          await updateCourseLessonTree({
            variables: {
              id: courseRef.current._id,
              lessonTree: treeDataToLessonTreeJson(nextTree, courseRef.current),
            },
          });
        } catch (err) {
          console.error('Failed to save lesson outline', err);
        }
      };
      persistOutlineChainRef.current =
        persistOutlineChainRef.current.then(run);
      await persistOutlineChainRef.current;
    },
    [updateCourseLessonTree],
  );

  const lastHandledCancelRequestIdRef = useRef<number | undefined>(undefined);

  const { activeId, insertBeforeId, handleDragStart, handleDragOver, handleDragEnd } =
    useTreeDrag(lessons, setLessons, persistLessonsFromTree);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const doubleClickArmRef = useRef<{
    id: string;
    t: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  /** Clear tree highlight when the detail panel closes (Close / save / cancel from forms). */
  useEffect(() => {
    if (formMode === 'course-edit' && selectedLessonTreeId === null) {
      queueMicrotask(() => setSelectedId(null));
    }
  }, [formMode, selectedLessonTreeId]);

  useEffect(() => {
    const seq = pendingTreeDraft?.seq;
    const requestCourseId = pendingTreeDraft?.courseId;
    const kind = pendingTreeDraft?.kind;
    if (!seq || !requestCourseId || !kind) return;
    if (requestCourseId !== course._id) return;
    if (seq <= 0) {
      clearPendingTreeDraft();
      return;
    }

    if (!markTreeDraftSeqConsumed(seq)) {
      clearPendingTreeDraft();
      return;
    }

    clearPendingTreeDraft();

    queueMicrotask(() => {
      if (kind === 'lesson') {
        const id = `lesson-${Date.now()}`;
        setLessons((prev) => {
          if (prev.some((n) => n.id === id)) return prev;
          const next: TreeData = [
            ...prev,
            {
              id,
              type: 'lesson',
              title: 'Untitled',
              outlinePosition: maxOutlinePosition(prev) + 1,
            },
          ];
          lessonTreeSourceRef.current = next;
          return next;
        });
        setSelectedId(id);
        setPressedId(null);
        setSelectedLessonTreeId(id);
        setDraftItemId(id);
        return;
      }
      const folderId = `folder-${Date.now()}`;
      setLessons((prev) => {
        if (prev.some((n) => n.id === folderId)) return prev;
        const next: TreeData = [
          ...prev,
          {
            id: folderId,
            type: 'folder',
            title: 'Untitled folder',
            outlinePosition: maxOutlinePosition(prev) + 1,
            children: [],
          },
        ];
        lessonTreeSourceRef.current = next;
        return next;
      });
      setSelectedId(folderId);
      setPressedId(null);
      setSelectedLessonTreeId(folderId);
      setDraftItemId(folderId);
    });
  }, [
    pendingTreeDraft?.seq,
    pendingTreeDraft?.courseId,
    pendingTreeDraft?.kind,
    course._id,
    clearPendingTreeDraft,
    markTreeDraftSeqConsumed,
    lessonTreeSourceRef,
    setDraftItemId,
    setSelectedLessonTreeId,
  ]);

  useEffect(() => {
    if (draftLessonCancelRequestId <= 0) return;
    if (lastHandledCancelRequestIdRef.current === draftLessonCancelRequestId) return;
    lastHandledCancelRequestIdRef.current = draftLessonCancelRequestId;
    if (!draftLessonCancelId) return;

    queueMicrotask(() => {
      setLessons((prev) => prev.filter((item) => item.id !== draftLessonCancelId));
      setSelectedId((prev) => (prev === draftLessonCancelId ? null : prev));
      setPressedId((prev) => (prev === draftLessonCancelId ? null : prev));
    });
  }, [draftLessonCancelRequestId, draftLessonCancelId]);

  // const addLessonToRoot = (title: string) => {
  //   const newLesson: TreeItem = {
  //     id: `lesson-${Date.now()}`, // Simple unique ID
  //     type: 'lesson',
  //     title,
  //   };
  //   setLessons([...lessons, newLesson]);
  // };

  const handleOnSelect = (id: string | null) => {
    void (async () => {
      if (id !== null) {
        if (!(await runDetailFlush())) return;
        if (!(await runCourseFlush())) return;
      }
      setSelectedId(id);
      if (id === null) {
        setSelectedLessonTreeId(null);
        setFormMode('course-edit');
        return;
      }
      const item = findItem(lessons, id);
      if (item?.type === 'lesson') {
        setSelectedLessonTreeId(id);
        setFormMode('lesson-view');
      } else if (item?.type === 'folder') {
        setSelectedLessonTreeId(id);
        setFormMode('folder-view');
      } else {
        setSelectedLessonTreeId(null);
        setFormMode('course-edit');
      }
    })();
  };

  const handleRequestEdit = useCallback(
    async (id: string) => {
      if (!(await runDetailFlush())) return;
      if (!(await runCourseFlush())) return;
      setSelectedId(id);
      const item = findItem(lessons, id);
      if (item?.type === 'lesson') {
        setSelectedLessonTreeId(id);
        setFormMode('lesson-edit');
      } else if (item?.type === 'folder') {
        setSelectedLessonTreeId(id);
        setFormMode('folder-edit');
      }
    },
    [lessons, runCourseFlush, runDetailFlush, setFormMode, setSelectedLessonTreeId],
  );

  return (
    // <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    <div className="min-h-0 p-7">
      {/* <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Enter lesson or folder name"
          onKeyPress={(e) => e.key === 'Enter' && handleAddLesson()}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleAddLesson} style={{ marginRight: '10px', padding: '8px 16px' }}>
          ➕ Add Lesson
        </button>
        <button onClick={handleAddFolder} style={{ padding: '8px 16px' }}>
          📁 Add Folder
        </button>
      </div> */}
      
      {/* Tree */}
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <TreeRenderer
          items={lessons}
          insertBeforeId={insertBeforeId}
          selectedId={selectedId}
          onSelect={handleOnSelect}
          onRequestEdit={handleRequestEdit}
          doubleClickArmRef={doubleClickArmRef}
          pressedId={pressedId}
          onPressChange={setPressedId}
        />

        {/* Drag overlay to show dragged item (including children) */}
        <DragOverlay>
          {activeId ? (
            (() => {
              const activeItem = findItem(lessons, activeId);
              if (!activeItem) return null;
              const overlayClass =
                'p-2.5 bg-white border-2 border-blue-500 shadow-lg rounded-md min-w-[14rem] max-w-[22.5rem] z-50';

              const renderChildren = (item: TreeItem, depth = 0) => {
                const rowStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 0',
                  marginLeft: depth * 16,
                  fontSize: 13,
                  color: '#111827',
                };
                const icon = item.type === 'folder' ? '📁' : '📄';

                return (
                  <div key={item.id}>
                    <div style={rowStyle}>
                      <span style={{ width: 18, textAlign: 'center', marginRight: 8 }}>{icon}</span>
                      <span>{item.title}</span>
                    </div>
                    {item.children && item.children.map(child => renderChildren(child, depth + 1))}
                  </div>
                );
              };

              const titleIcon = activeItem.type === 'folder' ? '📁' : '📄';

              return (
                <div className={overlayClass}>
                  <div className="flex items-center font-semibold mb-1">
                    <span className="mr-2">{titleIcon}</span>
                    <span>{activeItem.title}</span>
                  </div>
                  {activeItem.children && activeItem.children.length > 0 && (
                    <div className="max-h-60 overflow-auto">
                      {activeItem.children.map(child => renderChildren(child, 1))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Debug: Show current tree structure */}
      {/* <details style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9' }}>
        <summary>View Tree Structure (Debug)</summary>
        <pre>{JSON.stringify(lessons, null, 2)}</pre>
      </details> */}
    </div>
  );
}