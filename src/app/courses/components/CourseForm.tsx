'use client';

import { useMemo } from 'react';
import type { CourseType } from '../types';
import { useCourseForm } from '../hooks/useCourseForm';
import { useCoursesUI } from '../CoursesUIContext';

type CourseFormNewProps = {
  course: CourseType;
};

const errRing = (invalid: boolean | undefined) =>
  invalid ? ' ring-2 ring-red-500 border-red-500' : '';

function Req() {
  return <span className="text-red-600"> *</span>;
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

/** Preview chip for subject calendar color (hex from API). */
function SubjectColorSwatch({ color }: { color: string | null | undefined }) {
  const hex = color?.trim();
  if (!hex) {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-full border-2 border-dashed border-gray-300 bg-gray-50"
        title="No color set"
        aria-label="No subject color"
      />
    );
  }
  return (
    <div
      className="h-9 w-9 shrink-0 rounded-full border border-gray-300 shadow-sm ring-1 ring-black/5"
      style={{ backgroundColor: hex }}
      title={hex}
      aria-label={`Subject color ${hex}`}
    />
  );
}

export default function CourseForm({ course }: CourseFormNewProps) {
  const { runDetailFlush } = useCoursesUI();
  const {
    title,
    setTitle,
    publisherName,
    setPublisherName,
    grade,
    setGrade,
    subjectName,
    subjectColor,
    editMode,
    setEditMode,
    courseFieldErrors,
    clearFieldError,
    metaData,
    metaLoading,
    handleSubjectSelect,
    handleSubmit,
    handleCancel,
  } = useCourseForm(course);

  const publisherOptions = useMemo(() => {
    const list = [...(metaData?.publishers ?? [])];
    if (publisherName && !list.some((p) => p.name === publisherName)) {
      list.unshift({ _id: `orphan-pub-${publisherName}`, name: publisherName });
    }
    return list;
  }, [metaData?.publishers, publisherName]);

  const subjectOptions = useMemo(() => {
    const list = [...(metaData?.subjects ?? [])];
    if (subjectName && !list.some((s) => s.name === subjectName)) {
      list.unshift({
        _id: `orphan-sub-${subjectName}`,
        name: subjectName,
        color: course.subject?.color ?? '',
      });
    }
    return list;
  }, [metaData?.subjects, subjectName, course.subject?.color]);

  /** Color to show in the swatch while editing (state wins, then option from meta). */
  const displaySubjectColor = useMemo(() => {
    if (subjectColor?.trim()) return subjectColor.trim();
    const match = subjectOptions.find((s) => s.name === subjectName);
    return match?.color?.trim() ?? '';
  }, [subjectColor, subjectOptions, subjectName]);

  const toggleEditModeOnDblClick = async () => {
    if (!editMode) {
      const ok = await runDetailFlush();
      if (!ok) return;
      setEditMode(true);
    }
  };

  const baseInput =
    'mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300';

  const baseSelect = `${baseInput} cursor-pointer`;

  const onSubject = (name: string) => {
    handleSubjectSelect(name);
    clearFieldError('subjectName');
    clearFieldError('subjectColor');
  };

  return (
    <div
      className={`w-full cursor-text p-4${editMode ? ' ring-2 ring-indigo-200 ring-inset' : ''}`}
      onDoubleClickCapture={() => {
        void toggleEditModeOnDblClick();
      }}
    >
      <form className="w-full bg-white rounded-lg p-6 space-y-4" onSubmit={handleSubmit}>
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
                    <Req />
                  </label>
                  <input
                    type="text"
                    value={title}
                    aria-invalid={Boolean(courseFieldErrors.title)}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      clearFieldError('title');
                    }}
                    className={baseInput + errRing(courseFieldErrors.title)}
                  />
                  {courseFieldErrors.title ? (
                    <FieldError message="Title is required." />
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 flex-[5]">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="course-publisher">
                    Publisher
                    <Req />
                  </label>
                  <select
                    id="course-publisher"
                    value={publisherName}
                    disabled={metaLoading}
                    aria-invalid={Boolean(courseFieldErrors.publisherName)}
                    onChange={(e) => {
                      setPublisherName(e.target.value);
                      clearFieldError('publisherName');
                    }}
                    className={baseSelect + errRing(courseFieldErrors.publisherName)}
                  >
                    <option value="">Select publisher…</option>
                    {publisherOptions.map((p) => (
                      <option key={p._id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {courseFieldErrors.publisherName ? (
                    <FieldError message="Publisher is required." />
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 flex-[1]">
                  <label className="block text-sm font-medium text-gray-700">
                    Grade
                    <Req />
                  </label>
                  <input
                    type="text"
                    value={grade}
                    aria-invalid={Boolean(courseFieldErrors.grade)}
                    onChange={(e) => {
                      setGrade(e.target.value);
                      clearFieldError('grade');
                    }}
                    className={baseInput + errRing(courseFieldErrors.grade)}
                  />
                  {courseFieldErrors.grade ? <FieldError message="Grade is required." /> : null}
                </div>
                <div className="flex flex-col gap-2 flex-[3]">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="course-subject">
                    Subject
                    <Req />
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="course-subject"
                      value={subjectName}
                      disabled={metaLoading}
                      aria-invalid={Boolean(
                        courseFieldErrors.subjectName || courseFieldErrors.subjectColor,
                      )}
                      onChange={(e) => onSubject(e.target.value)}
                      className={
                        'min-w-0 flex-1 ' +
                        baseSelect +
                        errRing(courseFieldErrors.subjectName || courseFieldErrors.subjectColor)
                      }
                    >
                      <option value="">Select subject…</option>
                      {subjectOptions.map((s) => (
                        <option key={s._id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <SubjectColorSwatch color={displaySubjectColor} />
                  </div>
                  {displaySubjectColor ? (
                    <p className="text-xs text-gray-500">{displaySubjectColor}</p>
                  ) : null}
                  {courseFieldErrors.subjectName || courseFieldErrors.subjectColor ? (
                    <FieldError message="Subject is required." />
                  ) : null}
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
                <button type="submit" className="btn btn-ghost border border-gray-300">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col flex-[6]">
                <span className="block text-sm font-medium text-gray-700">Title</span>
                <span className="mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-2xl font-bold text-gray-900">
                  {title}
                </span>
              </div>
              <div className="flex flex-col flex-[5]">
                <span className="block text-sm font-medium text-gray-700">Publisher</span>
                <span className="mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-2xl font-bold text-gray-900">
                  {publisherName}
                </span>
              </div>
              <div className="flex flex-col flex-[1]">
                <span className="block text-sm font-medium text-gray-700">Grade</span>
                <span className="mt-1 block w-full rounded-lg border-gray-200 px-4 py-2 text-2xl font-bold text-gray-900">
                  {grade}
                </span>
              </div>
              <div className="flex flex-col flex-[3]">
                <span className="block text-sm font-medium text-gray-700">Subject</span>
                <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2">
                  <span className="min-w-0 flex-1 text-2xl font-bold text-gray-900">
                    {subjectName}
                  </span>
                  <SubjectColorSwatch color={displaySubjectColor} />
                </div>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
