'use client';
import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import apolloClient from '@/utils/apolloClient';
import type { CourseType, LessonType } from '../types';
import { GET_COURSES, UPDATE_COURSE_LESSON_TREE } from '../api/course.graphql';
import { apiTreeToTreeData, treeDataToLessonTreeJson } from '../courseTree';
import { useCoursesUI } from '../CoursesUIContext';

export type LessonFormProps = {
  course: CourseType;
  lesson: LessonType | null;
};

export default function LessonForm({ course, lesson }: LessonFormProps) {
  const [title, setTitle] = useState(() => lesson?.title ?? '');
  const [description, setDescription] = useState(() => lesson?.note ?? '');
  const [content, setContent] = useState(() => lesson?.content ?? '');
  const {
    cancelDraftLesson,
    commitDraftLesson,
    formMode,
    selectedLessonTreeId,
    lessonTreeUi,
  } = useCoursesUI();

  const [updateCourseLessonTree, { loading }] = useMutation(UPDATE_COURSE_LESSON_TREE, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
    awaitRefetchQueries: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      console.warn('Title is required');
      return;
    }

    const tree = lessonTreeUi ?? apiTreeToTreeData(course.lessonTree ?? []);

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
      } else if (formMode === 'lesson-new' && selectedLessonTreeId) {
        const overrides = {
          [selectedLessonTreeId]: {
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
      } else {
        console.warn('Cannot save lesson: missing selection');
        return;
      }
      commitDraftLesson();
    } catch (err) {
      console.error('Failed to save lesson', err);
    }
  };

  const handleCancel = () => {
    cancelDraftLesson();
  };

  return (
    <div className="flex justify-center h-full p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white rounded-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          {lesson ? 'Edit Lesson' : 'New Lesson'}
        </h1>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The name of this scheduled item"
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
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
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what students will learn or do..."
            rows={3}
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add content, instructions, or notes..."
            rows={8}
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <p className="mt-1 text-xs text-gray-400">
            Main content and activities for the student
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
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
      </form>
    </div>
  );
}
