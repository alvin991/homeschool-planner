"use client"; // Next.js App Router

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import apolloClient from '@/utils/apolloClient';
import { TreeRenderer } from './lessons-tree/TreeRender';
import { TreeData, TreeItem } from './lessons-tree/types';
import { findItem } from './lessons-tree/treeUtils';
import useTreeDrag from './lessons-tree/useTreeDrag';
import type { CourseType } from '../types';
import { GET_COURSES, UPDATE_COURSE_LESSON_TREE } from '../api/course.graphql';
import { apiTreeToTreeData, treeDataToLessonTreeJson } from '../courseTree';
import { useCoursesUI } from '../CoursesUIContext';

type LessonsListProps = {
  course: CourseType;
  onNewLesson?: (lesson: TreeItem) => void;
};

export default function LessonsList({ course, onNewLesson }: LessonsListProps) {
  const {
    setDraftLessonId,
    draftLessonCancelRequestId,
    draftLessonCancelId,
    pendingLessonCreate,
    setFormMode,
    setSelectedLessonTreeId,
    setLessonTreeUi,
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

  useEffect(() => {
    setLessonTreeUi(lessons);
  }, [lessons, setLessonTreeUi]);

  const persistLessonsFromTree = useCallback(
    async (nextTree: TreeData) => {
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
    },
    [updateCourseLessonTree],
  );

  const lastHandledRequestIdRef = useRef<number | undefined>(undefined);
  const lastHandledCancelRequestIdRef = useRef<number | undefined>(undefined);

  const { activeId, insertBeforeId, handleDragStart, handleDragOver, handleDragEnd } =
    useTreeDrag(lessons, setLessons, persistLessonsFromTree);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  useEffect(() => {
    const seq = pendingLessonCreate?.seq;
    const requestCourseId = pendingLessonCreate?.courseId;
    if (!seq || !requestCourseId) return;
    if (requestCourseId !== course._id) return;
    if (lastHandledRequestIdRef.current === seq) return;
    if (seq <= 0) {
      lastHandledRequestIdRef.current = seq;
      return;
    }

    lastHandledRequestIdRef.current = seq;
    const newLesson: TreeItem = {
      id: `lesson-${Date.now()}`,
      type: 'lesson',
      title: 'Untitled',
    };
    queueMicrotask(() => {
      setLessons((prev) => [...prev, newLesson]);
      setSelectedId(newLesson.id);
      setPressedId(null);
      setDraftLessonId(newLesson.id);
      onNewLesson?.(newLesson);
    });
  }, [pendingLessonCreate?.seq, pendingLessonCreate?.courseId, course._id, onNewLesson, setDraftLessonId]);

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
    // Compute next selection first; never call context setters inside setSelectedId's updater —
    // that runs during React's state update and triggers "Cannot update Provider while rendering".
    const next = id === null ? null : selectedId === id ? null : id;
    setSelectedId(next);

    if (next === null) {
      setSelectedLessonTreeId(null);
      setFormMode('course-edit');
    } else {
      const item = findItem(lessons, next);
      if (item?.type === 'lesson') {
        setSelectedLessonTreeId(next);
        setFormMode('lesson-edit');
      } else if (item?.type === 'folder') {
        setSelectedLessonTreeId(next);
        setFormMode('folder-edit');
      } else {
        setSelectedLessonTreeId(null);
        setFormMode('course-edit');
      }
    }
  };

  return (
    // <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    <div className="p-7"> 
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
      <details style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9' }}>
        <summary>View Tree Structure (Debug)</summary>
        <pre>{JSON.stringify(lessons, null, 2)}</pre>
      </details>
    </div>
  );
}