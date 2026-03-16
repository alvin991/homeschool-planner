"use client";
import { useState } from "react";
import type { CourseType } from "../types";

export type CourseFormProps = {
  course?: CourseType | null;
};

export default function CourseForm({ course }: CourseFormProps) {
  const [title, setTitle] = useState(course?.title ?? "");
  const [publisherName, setPublisherName] = useState(course?.publisher?.name ?? "");
  const [grade, setGrade] = useState(course?.grade ?? "");
  const [subjectName, setSubjectName] = useState(course?.subject?.name ?? "");
  const [subjectColor, setSubjectColor] = useState(course?.subject?.color ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Replace with real submit logic
    console.log({
      title,
      publisher: { name: publisherName },
      grade,
      subject: { name: subjectName, color: subjectColor },
    });
  };

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
          <input
            value={publisherName}
            onChange={(e) => setPublisherName(e.target.value)}
            placeholder="Publisher name"
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
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
          <input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Math, Science"
            className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
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

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
