"use client";

import type { CourseType } from '../types';
import { useCourseForm } from '../hooks/useCourseForm';

export type CourseFormProps = {
  course?: CourseType | null;
};

export default function CourseForm({ course }: CourseFormProps) {
  const {
    title,
    setTitle,
    publisherName,
    setPublisherName,
    grade,
    setGrade,
    subjectName,
    subjectColor,
    setSubjectColor,
    metaData,
    handleSubjectSelect,
    handleSubmit,
    handleCancel,
  } = useCourseForm(course);

  return (
    <div className="flex justify-center h-full p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white rounded-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Course Info</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <p className="mt-1 text-xs text-gray-400">The name of this course</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Publisher</label>
          <select
            value={publisherName}
            onChange={(e) => setPublisherName(e.target.value)}
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Select publisher</option>
            {metaData?.publishers.map((p) => (
              <option key={p._id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">Publisher or provider of the course</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Grade</label>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g. 5, 6-8, K-12"
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <p className="mt-1 text-xs text-gray-400">Grade level or range</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subject</label>
          <select
            value={subjectName}
            onChange={(e) => handleSubjectSelect(e.target.value)}
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Select subject</option>
            {metaData?.subjects.map((s) => (
              <option key={s._id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">Subject or discipline</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subject color</label>
          <input
            type="text"
            value={subjectColor}
            onChange={(e) => setSubjectColor(e.target.value)}
            placeholder="e.g. #3B82F6 or blue"
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <p className="mt-1 text-xs text-gray-400">Color for the subject (hex or name)</p>
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
        </div>
      </form>
    </div>
  );
}
