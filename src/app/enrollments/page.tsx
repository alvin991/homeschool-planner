'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import apolloClient from '@/utils/apolloClient';
import ResourceTwoPanelLayout from '@/app/resources/components/ResourceTwoPanelLayout';
import ResourceEntityList from '@/app/resources/components/ResourceEntityList';
import {
  CREATE_ENROLLMENT,
  DELETE_ENROLLMENT,
  GET_COURSES_SLIM,
  GET_ENROLLMENTS,
  GET_STUDENTS,
  UPDATE_ENROLLMENT,
  type CourseSlim,
  type EnrollmentRow,
  type EnrollmentStatus,
  type GetCoursesSlimData,
  type GetEnrollmentsData,
  type GetStudentsData,
  type SuspensionPeriod,
} from './api';

const WEEKDAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const STATUS_OPTIONS: { label: string; value: EnrollmentStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Dropped', value: 'dropped' },
];

function emptyForm() {
  return {
    courseId: '',
    start_date: '',
    end_date: '',
    weekdays: [] as number[],
    lesson_rate: 1,
    status: 'active' as EnrollmentStatus,
    suspension_periods: [] as SuspensionPeriod[],
  };
}

export default function EnrollmentsPage() {
  const { data: studentsData } = useQuery<GetStudentsData>(GET_STUDENTS, {
    client: apolloClient,
  });
  const { data: coursesData } = useQuery<GetCoursesSlimData>(GET_COURSES_SLIM, {
    client: apolloClient,
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const { loading, error, data } = useQuery<GetEnrollmentsData>(
    GET_ENROLLMENTS,
    {
      client: apolloClient,
      variables: { studentId: selectedStudentId },
      skip: !selectedStudentId,
    }
  );

  type CreateEnrollmentMut = { createEnrollment: EnrollmentRow };
  const [createEnrollment, { loading: creating }] =
    useMutation<CreateEnrollmentMut>(CREATE_ENROLLMENT, {
      client: apolloClient,
      refetchQueries: selectedStudentId
        ? [
            {
              query: GET_ENROLLMENTS,
              variables: { studentId: selectedStudentId },
            },
          ]
        : [],
    });
  const [updateEnrollment, { loading: updating }] = useMutation(
    UPDATE_ENROLLMENT,
    {
      client: apolloClient,
      refetchQueries: selectedStudentId
        ? [
            {
              query: GET_ENROLLMENTS,
              variables: { studentId: selectedStudentId },
            },
          ]
        : [],
    }
  );
  const [deleteEnrollment, { loading: deleting }] = useMutation(
    DELETE_ENROLLMENT,
    {
      client: apolloClient,
      refetchQueries: selectedStudentId
        ? [
            {
              query: GET_ENROLLMENTS,
              variables: { studentId: selectedStudentId },
            },
          ]
        : [],
    }
  );

  const students = useMemo(
    () => studentsData?.students ?? [],
    [studentsData?.students]
  );
  const courses = useMemo(
    () => coursesData?.courses ?? [],
    [coursesData?.courses]
  );
  const enrollments = useMemo(
    () => data?.enrollments ?? [],
    [data?.enrollments]
  );

  const courseMap = useMemo(
    () => new Map<string, CourseSlim>(courses.map((c) => [c._id, c])),
    [courses]
  );

  const resetForm = () => {
    setForm(emptyForm());
    setFormError(null);
  };

  const loadEnrollmentIntoForm = (e: EnrollmentRow) => {
    setForm({
      courseId: e.course,
      start_date: e.start_date ?? '',
      end_date: e.end_date ?? '',
      weekdays: [...e.weekdays],
      lesson_rate: e.lesson_rate,
      status: e.status,
      suspension_periods: e.suspension_periods.map((p) => ({
        start: p.start,
        end: p.end,
      })),
    });
    setFormError(null);
  };

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setSelectedId(null);
    setIsCreating(false);
    resetForm();
  };

  const handleAdd = () => {
    setSelectedId(null);
    setIsCreating(true);
    resetForm();
  };

  const handleSelect = (id: string) => {
    setIsCreating(false);
    setSelectedId(id);
    const row = enrollments.find((e) => e._id === id);
    if (row) loadEnrollmentIntoForm(row);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.courseId) {
      setFormError('Course is required.');
      return;
    }
    if (!form.start_date) {
      setFormError('Start date is required.');
      return;
    }
    if (form.end_date && form.end_date < form.start_date) {
      setFormError('End date must be on or after start date.');
      return;
    }
    if (form.lesson_rate <= 0) {
      setFormError('Lesson rate must be greater than 0.');
      return;
    }
    for (const p of form.suspension_periods) {
      if (!p.start || !p.end) {
        setFormError(
          'All suspension periods must have both a start and end date.'
        );
        return;
      }
      if (p.start > p.end) {
        setFormError('Suspension period start must be before end.');
        return;
      }
    }
    try {
      const input = {
        studentId: selectedStudentId,
        courseId: form.courseId,
        start_date: form.start_date,
        end_date: form.end_date || null,
        weekdays: form.weekdays,
        lesson_rate: form.lesson_rate,
        status: form.status,
        suspension_periods: form.suspension_periods,
      };
      if (isCreating) {
        const res = await createEnrollment({ variables: { input } });
        const created = res.data?.createEnrollment;
        if (created?._id) {
          setIsCreating(false);
          setSelectedId(created._id);
          loadEnrollmentIntoForm(created);
        }
      } else if (selectedId) {
        await updateEnrollment({ variables: { id: selectedId, input: input } });
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isCreating) return;
    if (!window.confirm('Delete this enrollment? This cannot be undone.'))
      return;
    setFormError(null);
    try {
      await deleteEnrollment({ variables: { id: selectedId } });
      setSelectedId(null);
      resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    resetForm();
  };

  const toggleDay = (value: number) => {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(value)
        ? f.weekdays.filter((d) => d !== value)
        : [...f.weekdays, value].sort((a, b) => a - b),
    }));
  };

  const updateSuspension = (
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setForm((f) => {
      const periods = [...f.suspension_periods];
      periods[index] = { ...periods[index], [field]: value };
      return { ...f, suspension_periods: periods };
    });
  };

  const addSuspension = () => {
    setForm((f) => ({
      ...f,
      suspension_periods: [...f.suspension_periods, { start: '', end: '' }],
    }));
  };

  const removeSuspension = (index: number) => {
    setForm((f) => ({
      ...f,
      suspension_periods: f.suspension_periods.filter((_, i) => i !== index),
    }));
  };

  const listItems = enrollments.map((e) => ({
    _id: e._id,
    primary: courseMap.get(e.course)?.title ?? e.course,
    trailing: (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          e.status === 'active'
            ? 'bg-green-100 text-green-700'
            : e.status === 'completed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
        }`}
      >
        {e.status}
      </span>
    ),
  }));

  const list = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <label
          htmlFor="student-filter"
          className="mb-1 block text-xs font-medium text-gray-500"
        >
          Student
        </label>
        <select
          id="student-filter"
          value={selectedStudentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select a student…</option>
          {students.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {selectedStudentId ? (
        <ResourceEntityList
          title="Enrollments"
          addLabel="Add Enrollment"
          items={listItems}
          selectedId={selectedId}
          isCreating={isCreating}
          onAdd={handleAdd}
          onSelect={handleSelect}
        />
      ) : (
        <p className="text-sm text-gray-400">
          Select a student to see their enrollments.
        </p>
      )}
    </div>
  );

  const detail = (() => {
    if (!selectedStudentId) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-gray-500">
          <p>Select a student on the left to manage their enrollments.</p>
        </div>
      );
    }
    if (loading) {
      return <p className="text-sm text-gray-500">Loading enrollments…</p>;
    }
    if (error) {
      return <p className="text-sm text-red-600">Error: {error.message}</p>;
    }
    if (!isCreating && !selectedId) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-gray-500">
          <p>
            Select an enrollment from the list, or use &quot;Add
            Enrollment&quot; on the left.
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-6 text-lg font-semibold text-gray-800">
          {isCreating ? 'New enrollment' : 'Edit enrollment'}
        </h2>
        <div className="space-y-5">
          <div>
            <label
              htmlFor="enroll-course"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Course
            </label>
            <select
              id="enroll-course"
              value={form.courseId}
              onChange={(e) =>
                setForm((f) => ({ ...f, courseId: e.target.value }))
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="enroll-start-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Start date <span className="text-red-500">*</span>
              </label>
              <input
                id="enroll-start-date"
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <label
                  htmlFor="enroll-end-date"
                  className="block text-sm font-medium text-gray-700"
                >
                  End date{' '}
                  <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  type="checkbox"
                  checked={form.end_date !== ''}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setForm((f) => ({ ...f, end_date: '' }));
                    } else {
                      setForm((f) => ({ ...f, end_date: f.start_date }));
                    }
                  }}
                />
              </div>
              {form.end_date !== '' && (
                <input
                  id="enroll-end-date"
                  type="date"
                  value={form.end_date}
                  min={form.start_date || undefined}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, end_date: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Lesson days
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const active = form.weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="enroll-rate"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Lesson rate{' '}
              <span className="font-normal text-gray-500">
                (lessons per day)
              </span>
            </label>
            <select
              id="enroll-rate"
              value={form.lesson_rate}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  lesson_rate: parseFloat(e.target.value),
                }))
              }
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={0.25}>0.25</option>
              <option value={0.5}>0.5</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="enroll-status"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="enroll-status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as EnrollmentStatus,
                }))
              }
              className="w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Suspension periods
              </p>
              <button
                type="button"
                onClick={addSuspension}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                + Add period
              </button>
            </div>
            {form.suspension_periods.length === 0 ? (
              <p className="text-xs text-gray-400">No suspension periods.</p>
            ) : (
              <div className="space-y-2">
                {form.suspension_periods.map((period, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={period.start}
                      onChange={(e) =>
                        updateSuspension(i, 'start', e.target.value)
                      }
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-400">—</span>
                    <input
                      type="date"
                      value={period.end}
                      onChange={(e) =>
                        updateSuspension(i, 'end', e.target.value)
                      }
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeSuspension(i)}
                      className="text-sm text-red-400 hover:text-red-600"
                      aria-label="Remove period"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError ? (
            <p className="text-sm text-red-600">{formError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={creating || updating}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating || updating ? 'Saving…' : 'Save'}
            </button>
            {isCreating ? (
              <button
                type="button"
                onClick={handleCancelCreate}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
          {!isCreating && selectedId ? (
            <p className="text-xs text-gray-400">ID: {selectedId}</p>
          ) : null}
        </div>
      </div>
    );
  })();

  return <ResourceTwoPanelLayout list={list} detail={detail} />;
}
