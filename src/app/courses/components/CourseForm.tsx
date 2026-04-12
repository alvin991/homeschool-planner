'use client';

import type { CourseType } from '../types';
import { useCourseForm } from '../hooks/useCourseForm';

type CourseFormNewProps = {
  course: CourseType;
};

export default function CourseForm({ course }: CourseFormNewProps) {
  const {
    title,
    setTitle,
    publisherName,
    setPublisherName,
    grade,
    setGrade,
    subjectName,
    editMode,
    setEditMode,
    handleSubjectSelect,
    handleSubmit,
    handleCancel,
  } = useCourseForm(course);

  const toggleEditModeOnDblClick = () => {
    console.log(`edit mode on dbl click`);
    if ( !editMode ) {
        // setEditMode((prev) => !prev);
        setEditMode(true);
        console.log(`set Edit Mode to true`);
    }
  };

  return (
    <div
      className={`w-full cursor-text p-4${editMode ? ' ring-2 ring-indigo-200 ring-inset' : ''}`}
      onDoubleClickCapture={toggleEditModeOnDblClick}
    >
      <form className="w-full bg-white rounded-lg p-6 space-y-4">
        {!editMode && (
          <>
            <p className="text-xs text-gray-500">
              Double-click anywhere in this bar to edit the course information.
            </p>
          </>
        )}
        <div className="flex w-full gap-2">
          {editMode ? (
            <div className="flex flex-col w-full gap-2">
              <div className="flex gap-2">
                <div className="flex flex-col gap-2 flex-[6]">
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="flex flex-col gap-2 flex-[6]">
                  <label className="block text-sm font-medium text-gray-700">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={publisherName}
                    onChange={(e) => setPublisherName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="flex flex-col gap-2 flex-[1]">
                  <label className="block text-sm font-medium text-gray-700">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="flex flex-col gap-2 flex-[1]">
                  <label className="block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => handleSubjectSelect(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
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
            </div>
          ) : (
            <>
              <div className="flex flex-col flex-[6]">
                <span className="block text-sm font-medium text-gray-700">
                  Title
                </span>
                <span className="mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-2xl font-bold text-gray-900">
                  {title}
                </span>
              </div>
              <div className="flex flex-col flex-[6]">
                <span className="block text-sm font-medium text-gray-700">
                  Publisher
                </span>
                <span className="mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-2xl font-bold text-gray-900">
                  {publisherName}
                </span>
              </div>
              <div className="flex flex-col flex-[1]">
                <span className="block text-sm font-medium text-gray-700">
                  Grade
                </span>
                <span className="mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-2xl font-bold text-gray-900">
                  {grade}
                </span>
              </div>
              <div className="flex flex-col flex-[1]">
                <span className="block text-sm font-medium text-gray-700">
                  Subject
                </span>
                <span className="mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-2xl font-bold text-gray-900">
                  {subjectName}
                </span>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}