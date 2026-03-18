'use client';
import React, { useState } from 'react';
import type { LessonType } from '../types';
import { useCoursesUI } from '../CoursesUIContext';

export type LessonFormProps = {
  lesson: LessonType | null;
};

export default function LessonForm({ lesson }: LessonFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const { cancelDraftLesson, commitDraftLesson } = useCoursesUI();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Replace with real submit logic
    // console.log({ lesson.lesson.title, lesson:content });
    commitDraftLesson();
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
            type="button"
            className="btn btn-ghost border border-gray-300"
            onClick={handleSubmit}
          >
            Save
          </button>
          {/* <button
          type="submit"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
        >
          Save
        </button> */}
        </div>
      </form>
    </div>
  );
}
