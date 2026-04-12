'use client';

import { useState } from 'react';
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

export default function FolderForm({ course }: FolderFormProps) {
  const {
    cancelDraftItem,
    commitDraftItem,
    formMode,
    selectedLessonTreeId,
    lessonTreeUi,
  } = useCoursesUI();

  const tree = lessonTreeUi ?? apiTreeToTreeData(course.lessonTree ?? []);
  const node = selectedLessonTreeId
    ? findItem(tree, selectedLessonTreeId)
    : null;

  const [title, setTitle] = useState(() => node?.title ?? '');

  const [updateCourseLessonTree, { loading }] = useMutation(UPDATE_COURSE_LESSON_TREE, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
    awaitRefetchQueries: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      console.warn('Folder name is required');
      return;
    }
    if (!selectedLessonTreeId) {
      console.warn('No folder selected');
      return;
    }

    try {
      const overrides = {
        [selectedLessonTreeId]: { title: title.trim() },
      };
      await updateCourseLessonTree({
        variables: {
          id: course._id,
          lessonTree: treeDataToLessonTreeJson(tree, course, overrides),
        },
      });
      commitDraftItem();
    } catch (err) {
      console.error('Failed to save folder', err);
    }
  };

  const handleCancel = () => {
    cancelDraftItem();
  };

  const handleDelete = async () => {
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

    const tree = lessonTreeUi ?? apiTreeToTreeData(course.lessonTree ?? []);
    const nextTree = removeTreeItemHoistingFolderChildrenToRoot(
      tree,
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
    formMode === 'folder-new' ? 'New Folder' : 'Edit Folder';

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
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Unit 1"
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
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
        </div>
      </form>
    </div>
  );
}
