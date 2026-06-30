'use client';

import { useState } from 'react';
import { CourseType } from '../types';
import { useMutation } from '@apollo/client/react';
import apolloClient from '@/utils/apolloClient';
import { BULK_CREATE_LESSONS, GET_COURSES } from '../api/course.graphql';
import { useCoursesUI } from '../CoursesUIContext';

export type BulkLessonsFormProps = {
  course: CourseType;
};

const prefixErrClass = (invalid: boolean) =>
  invalid ? ' ring-2 ring-red-500 border-red-500' : '';

const baseInput =
  'mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50';

export default function BulkLessonsForm({ course }: BulkLessonsFormProps) {
  const [prefix, setPrefix] = useState('');
  const [range, setRange] = useState(1);
  const [startFrom, setStartFrom] = useState<number | ''>('');
  const [prefixError, setPrefixError] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { setFormMode } = useCoursesUI();

  const [bulkCreateLessons, { loading }] = useMutation(BULK_CREATE_LESSONS, {
    client: apolloClient,
    refetchQueries: [{ query: GET_COURSES }],
    awaitRefetchQueries: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefix.trim()) {
      setPrefixError(true);
      return;
    }
    setPrefixError(false);
    setSubmitError('');
    try {
      await bulkCreateLessons({
        variables: {
          courseId: course._id,
          prefix: prefix.trim(),
          range,
          startFrom: startFrom === '' ? undefined : startFrom,
        },
      });
      setFormMode('course-edit');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to generate lessons.');
    }
  };

  return (
    <div className="flex h-full w-full justify-center p-6">
      <form className="w-full max-w-md space-y-6" onSubmit={(e) => void handleSubmit(e)}>
        <h1 className="text-2xl font-semibold text-gray-800">Bulk Create Lessons</h1>
        <div>
          <label htmlFor="prefix" className="block text-sm font-medium text-gray-700">
            Lesson Title Prefix <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="prefix"
            aria-invalid={prefixError}
            className={baseInput + prefixErrClass(prefixError)}
            placeholder="e.g. Chapter 1 -"
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value);
              setPrefixError(false);
            }}
          />
          {prefixError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              Prefix is required.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="range" className="block text-sm font-medium text-gray-700">
            Number of Lessons to Create
          </label>
          <input
            type="number"
            id="range"
            min={1}
            className={baseInput}
            placeholder="e.g. 10"
            value={range}
            onChange={(e) => setRange(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label htmlFor="startFrom" className="block text-sm font-medium text-gray-700">
            Start From <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <input
            type="number"
            id="startFrom"
            min={1}
            className={baseInput}
            placeholder=""
            value={startFrom}
            onChange={(e) => setStartFrom(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
          />
        </div>
        {submitError ? (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormMode('course-edit')}
            className="btn btn-ghost w-full border border-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn w-full border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate Lessons'}
          </button>
        </div>
      </form>
    </div>
  );
}
