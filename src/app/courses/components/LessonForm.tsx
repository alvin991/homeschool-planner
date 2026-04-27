'use client';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import apolloClient from '@/utils/apolloClient';
import type { CourseType, LessonType } from '../types';
import { GET_COURSES, UPDATE_COURSE_LESSON_TREE } from '../api/course.graphql';
import { apiTreeToTreeData, treeDataToLessonTreeJson } from '../courseTree';
import { useCoursesUI } from '../CoursesUIContext';
import { removeTreeItemHoistingFolderChildrenToRoot } from './lessons-tree/treeUtils';

export type LessonFormProps = {
  course: CourseType;
  lesson: LessonType | null;
};

const titleErrClass = (invalid: boolean) =>
  invalid
    ? ' ring-2 ring-red-500 border-red-500'
    : '';

export default function LessonForm({ course, lesson }: LessonFormProps) {
  const [title, setTitle] = useState(() => lesson?.title ?? '');
  const [description, setDescription] = useState(() => lesson?.note ?? '');
  const [content, setContent] = useState(() => lesson?.content ?? '');
  const [titleError, setTitleError] = useState(false);
  const {
    cancelDraftItem,
    commitDraftItem,
    formMode,
    setFormMode,
    selectedLessonTreeId,
    setSelectedLessonTreeId,
    draftItemId,
    lessonTreeUi,
    lessonTreeSourceRef,
    registerDetailFlush,
    runCourseFlush,
  } = useCoursesUI();

  const isViewMode = formMode === 'lesson-view';

  const closeDetailPanel = () => {
    setSelectedLessonTreeId(null);
    setFormMode('course-edit');
  };

  const [updateCourseLessonTree, { loading }] = useMutation(UPDATE_COURSE_LESSON_TREE, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
    awaitRefetchQueries: true,
  });

  const persistLessonToServer = useCallback(async (): Promise<boolean> => {
    const tree =
      lessonTreeSourceRef.current ??
      lessonTreeUi ??
      apiTreeToTreeData(course.lessonTree ?? []);
    try {
      if (formMode === 'lesson-edit' && lesson) {
        const overrides = {
          [String(lesson._id)]: {
            title: title.trim(),
            content,
            note: description,
          },
        };
        await updateCourseLessonTree({
          variables: {
            id: course._id,
            lessonTree: treeDataToLessonTreeJson(tree, course, overrides),
          },
        });
        return true;
      }
      const newLessonKey = selectedLessonTreeId ?? draftItemId;
      if (formMode === 'lesson-new' && newLessonKey) {
        const overrides = {
          [newLessonKey]: {
            title: title.trim(),
            content,
            note: description,
          },
        };
        await updateCourseLessonTree({
          variables: {
            id: course._id,
            lessonTree: treeDataToLessonTreeJson(tree, course, overrides),
          },
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save lesson', err);
      return false;
    }
  }, [
    formMode,
    lesson,
    selectedLessonTreeId,
    draftItemId,
    title,
    content,
    description,
    course,
    lessonTreeUi,
    lessonTreeSourceRef,
    updateCourseLessonTree,
  ]);

  const flushLessonChanges = useCallback(async (): Promise<boolean> => {
    if (isViewMode) return true;
    if (formMode !== 'lesson-edit' && formMode !== 'lesson-new') return true;
    if (!title.trim()) {
      setTitleError(true);
      return false;
    }
    setTitleError(false);
    return persistLessonToServer();
  }, [isViewMode, formMode, title, persistLessonToServer]);

  useLayoutEffect(() => {
    registerDetailFlush(flushLessonChanges);
    return () => registerDetailFlush(null);
  }, [registerDetailFlush, flushLessonChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    if (!(await persistLessonToServer())) {
      console.warn('Cannot save lesson: missing selection or save failed');
      return;
    }
    commitDraftItem();
  };

  const handleCancel = () => {
    setTitleError(false);
    if (formMode === 'lesson-new') {
      cancelDraftItem();
      return;
    }
    if (formMode === 'lesson-edit' && lesson) {
      setTitle(lesson.title);
      setDescription(lesson.note ?? '');
      setContent(lesson.content ?? '');
      setFormMode('lesson-view');
      return;
    }
    cancelDraftItem();
  };

  const showLessonDelete = formMode === 'lesson-view' || formMode === 'lesson-edit';

  const enterLessonEditMode = useCallback(async () => {
    if (!(await runCourseFlush())) return;
    setFormMode('lesson-edit');
  }, [runCourseFlush, setFormMode]);

  const handleDelete = async () => {
    if (formMode === 'lesson-new') {
      if (
        !window.confirm(
          'Remove this new lesson from the outline? Nothing will be saved to the server.',
        )
      ) {
        return;
      }
      cancelDraftItem();
      return;
    }

    if (
      (formMode !== 'lesson-edit' && formMode !== 'lesson-view') ||
      !lesson ||
      !selectedLessonTreeId
    ) {
      return;
    }
    if (
      !window.confirm(
        'Delete this lesson from the course? This cannot be undone.',
      )
    ) {
      return;
    }

    const tree =
      lessonTreeSourceRef.current ??
      lessonTreeUi ??
      apiTreeToTreeData(course.lessonTree ?? []);
    const nextTree = removeTreeItemHoistingFolderChildrenToRoot(
      tree,
      selectedLessonTreeId,
    );
    if (!nextTree) {
      console.warn('Could not remove lesson from tree');
      return;
    }

    try {
      await updateCourseLessonTree({
        variables: {
          id: course._id,
          lessonTree: treeDataToLessonTreeJson(nextTree, course),
        },
      });
      commitDraftItem();
    } catch (err) {
      console.error('Failed to delete lesson', err);
    }
  };

  const baseField =
    'mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 ';

  return (
    <div className="flex justify-center h-full p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white rounded-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          {isViewMode ? 'Lesson' : lesson ? 'Edit Lesson' : 'New Lesson'}
        </h1>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title
            {!isViewMode ? <span className="text-red-600"> *</span> : null}
          </label>
          <input
            value={title}
            readOnly={isViewMode}
            aria-invalid={!isViewMode && titleError}
            title={isViewMode ? 'Double-click to edit' : undefined}
            onDoubleClick={
              isViewMode ? () => void enterLessonEditMode() : undefined
            }
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(false);
            }}
            placeholder="The name of this scheduled item"
            className={
              baseField +
              (isViewMode ? 'cursor-default bg-gray-100 text-gray-900' : 'bg-gray-50') +
              titleErrClass(!isViewMode && titleError)
            }
          />
          {!isViewMode && titleError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              Title is required.
            </p>
          ) : null}
          <p className="mt-1 text-xs text-gray-400">
            The name of this scheduled item
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={description}
            readOnly={isViewMode}
            title={isViewMode ? 'Double-click to edit' : undefined}
            onDoubleClick={
              isViewMode ? () => void enterLessonEditMode() : undefined
            }
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what students will learn or do..."
            rows={3}
            className={
              baseField +
              (isViewMode ? 'cursor-default bg-gray-100 text-gray-900' : 'bg-gray-50')
            }
          />
          <p className="mt-1 text-xs text-gray-400">
            Brief description of what this item covers
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Content
          </label>
          <textarea
            value={content}
            readOnly={isViewMode}
            title={isViewMode ? 'Double-click to edit' : undefined}
            onDoubleClick={
              isViewMode ? () => void enterLessonEditMode() : undefined
            }
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add content, instructions, or notes..."
            rows={8}
            className={
              baseField +
              ' py-3 ' +
              (isViewMode ? 'cursor-default bg-gray-100 text-gray-900' : 'bg-gray-50')
            }
          />
          <p className="mt-1 text-xs text-gray-400">
            Main content and activities for the student
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
          {showLessonDelete ? (
            <button
              type="button"
              disabled={loading}
              className="btn btn-ghost border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
              onClick={handleDelete}
            >
              Delete
            </button>
          ) : null}
          <div
            className={`flex flex-wrap gap-2 ${showLessonDelete ? '' : 'ml-auto'}`}
          >
            {isViewMode ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost border border-gray-300"
                  onClick={closeDetailPanel}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => void enterLessonEditMode()}
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost border border-gray-300"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-ghost border border-gray-300 disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
