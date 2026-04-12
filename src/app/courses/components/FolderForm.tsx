'use client';

import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import apolloClient from '@/utils/apolloClient';
import type { CourseType } from '../types';
import { GET_COURSES, UPDATE_COURSE_LESSON_TREE } from '../api/course.graphql';
import { apiTreeToTreeData, treeDataToLessonTreeJson } from '../courseTree';
import { useCoursesUI } from '../CoursesUIContext';
import {
  findItem,
  removeTreeItemHoistingFolderChildrenToRoot,
} from './lessons-tree/treeUtils';

export type FolderFormProps = {
  course: CourseType;
};

const titleErrClass = (invalid: boolean) =>
  invalid ? ' ring-2 ring-red-500 border-red-500' : '';

export default function FolderForm({ course }: FolderFormProps) {
  const {
    cancelDraftItem,
    commitDraftItem,
    formMode,
    setFormMode,
    selectedLessonTreeId,
    setSelectedLessonTreeId,
    lessonTreeUi,
    registerDetailFlush,
    runCourseFlush,
  } = useCoursesUI();

  const isViewMode = formMode === 'folder-view';

  const closeDetailPanel = () => {
    setSelectedLessonTreeId(null);
    setFormMode('course-edit');
  };

  const tree = lessonTreeUi ?? apiTreeToTreeData(course.lessonTree ?? []);
  const node = selectedLessonTreeId
    ? findItem(tree, selectedLessonTreeId)
    : null;

  /** Persisted outline (server snapshot) for reverting edits on Cancel. */
  const persistedFolderNode = useMemo(() => {
    if (!selectedLessonTreeId) return null;
    return findItem(apiTreeToTreeData(course.lessonTree ?? []), selectedLessonTreeId);
  }, [course.lessonTree, selectedLessonTreeId]);

  const [title, setTitle] = useState(() => node?.title ?? '');
  const [titleError, setTitleError] = useState(false);

  const [updateCourseLessonTree, { loading }] = useMutation(UPDATE_COURSE_LESSON_TREE, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
    awaitRefetchQueries: true,
  });

  const persistFolderToServer = useCallback(async (): Promise<boolean> => {
    if (!selectedLessonTreeId) return false;
    const treeNow = lessonTreeUi ?? apiTreeToTreeData(course.lessonTree ?? []);
    try {
      const overrides = {
        [selectedLessonTreeId]: { title: title.trim() },
      };
      await updateCourseLessonTree({
        variables: {
          id: course._id,
          lessonTree: treeDataToLessonTreeJson(treeNow, course, overrides),
        },
      });
      return true;
    } catch (err) {
      console.error('Failed to save folder', err);
      return false;
    }
  }, [selectedLessonTreeId, title, course, lessonTreeUi, updateCourseLessonTree]);

  const flushFolderChanges = useCallback(async (): Promise<boolean> => {
    if (isViewMode) return true;
    if (formMode !== 'folder-edit' && formMode !== 'folder-new') return true;
    if (!title.trim()) {
      setTitleError(true);
      return false;
    }
    setTitleError(false);
    return persistFolderToServer();
  }, [isViewMode, formMode, title, persistFolderToServer]);

  useLayoutEffect(() => {
    registerDetailFlush(flushFolderChanges);
    return () => registerDetailFlush(null);
  }, [registerDetailFlush, flushFolderChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    if (!selectedLessonTreeId) {
      console.warn('No folder selected');
      return;
    }

    const ok = await persistFolderToServer();
    if (ok) commitDraftItem();
  };

  const handleCancel = () => {
    setTitleError(false);
    if (formMode === 'folder-new') {
      cancelDraftItem();
      return;
    }
    if (formMode === 'folder-edit' && persistedFolderNode?.type === 'folder') {
      setTitle(persistedFolderNode.title);
      setFormMode('folder-view');
      return;
    }
    cancelDraftItem();
  };

  const handleDelete = async () => {
    if (isViewMode) return;
    if (formMode === 'folder-new') {
      if (
        !window.confirm(
          'Remove this new folder from the outline? Nothing will be saved to the server.',
        )
      ) {
        return;
      }
      cancelDraftItem();
      return;
    }

    if (formMode !== 'folder-edit' || !selectedLessonTreeId || !node) {
      return;
    }
    if (
      !window.confirm(
        'Delete this folder? Any lessons or subfolders inside it will be moved to the course root.',
      )
    ) {
      return;
    }

    const t = lessonTreeUi ?? apiTreeToTreeData(course.lessonTree ?? []);
    const nextTree = removeTreeItemHoistingFolderChildrenToRoot(
      t,
      selectedLessonTreeId,
    );
    if (!nextTree) {
      console.warn('Could not remove folder from tree');
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
      console.error('Failed to delete folder', err);
    }
  };

  const heading =
    formMode === 'folder-new'
      ? 'New Folder'
      : isViewMode
        ? 'Folder'
        : 'Edit Folder';

  const baseInput =
    'mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 ';

  return (
    <div className="flex h-full w-full justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl space-y-4 rounded-lg bg-white p-6"
      >
        <h1 className="mb-2 text-2xl font-semibold text-gray-800">{heading}</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Folder name
            {!isViewMode ? <span className="text-red-600"> *</span> : null}
          </label>
          <input
            value={title}
            readOnly={isViewMode}
            aria-invalid={!isViewMode && titleError}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(false);
            }}
            placeholder="e.g. Unit 1"
            className={
              baseInput +
              (isViewMode ? 'cursor-default bg-gray-100 text-gray-900' : 'bg-gray-50') +
              titleErrClass(!isViewMode && titleError)
            }
          />
          {!isViewMode && titleError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              Folder name is required.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
          {isViewMode ? (
            <div className="ml-auto flex flex-wrap gap-2">
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
                onClick={() => {
                  void (async () => {
                    if (!(await runCourseFlush())) return;
                    setFormMode('folder-edit');
                  })();
                }}
              >
                Edit
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                className="btn btn-ghost border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                onClick={handleDelete}
              >
                Delete
              </button>
              <div className="flex gap-2">
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
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
