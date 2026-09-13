'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import ResourceTwoPanelLayout from '../components/ResourceTwoPanelLayout';
import ResourceEntityList from '../components/ResourceEntityList';
import {
  CREATE_CALENDAR_EVENT,
  DELETE_CALENDAR_EVENT,
  GET_ALL_CALENDAR_EVENTS,
  UPDATE_CALENDAR_EVENT,
  type GetAllCalendarEventsData,
  type CalendarEventRow,
} from '../api/calendarEvents.graphql';
import { GET_STUDENTS, type GetStudentsData } from '../api/students.graphql';
import apolloClient from '@/utils/apolloClient';

export default function CalendarEventsPage() {
  const { loading, error, data } = useQuery<GetAllCalendarEventsData>(GET_ALL_CALENDAR_EVENTS, {
    client: apolloClient,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  type CreateCalendarEventMut = { createCalendarEvent: CalendarEventRow };

  const { data: studentsData } = useQuery<GetStudentsData>(GET_STUDENTS, {
    client: apolloClient,
  });
  const students = useMemo(() => studentsData?.students ?? [], [studentsData?.students]);

  const [createCalendarEvent, { loading: creating }] = useMutation<CreateCalendarEventMut>(CREATE_CALENDAR_EVENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_ALL_CALENDAR_EVENTS }],
  });
  const [updateCalendarEvent, { loading: updating }] = useMutation(UPDATE_CALENDAR_EVENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_ALL_CALENDAR_EVENTS }],
  });
  const [deleteCalendarEvent, { loading: deleting }] = useMutation(DELETE_CALENDAR_EVENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_ALL_CALENDAR_EVENTS }],
  });

  const calendarEvents = useMemo(() => data?.calendarEvents ?? [], [data?.calendarEvents]);
  const selected = useMemo(
    () => calendarEvents.find((e) => e._id === selectedId) ?? null,
    [calendarEvents, selectedId],
  );

  const resetForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setStudentId(null);
    setFormError(null);
  };

  const handleAdd = () => {
    setSelectedId(null);
    setIsCreating(true);
    resetForm();
  };

  const handleSelect = (id: string) => {
    setIsCreating(false);
    setSelectedId(id);
    const row = calendarEvents.find((e) => e._id === id);
    setTitle(row?.title ?? '');
    setStartDate(row?.start_date ?? '');
    setEndDate(row?.end_date ?? '');
    setStudentId(row?.student ?? null);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setFormError('Name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Start date and end date are required.');
      return;
    }
    if (endDate < startDate) {
      setFormError('End date cannot be before start date.');
      return;
    }
    try {
      if (isCreating) {
        const res = await createCalendarEvent({ variables: { title: trimmed, start_date: startDate, end_date: endDate, studentId: studentId } });
        const created = res.data?.createCalendarEvent;
        if (created?._id) {
          setIsCreating(false);
          setSelectedId(created._id);
          setTitle(created.title);
          setStartDate(created.start_date);
          setEndDate(created.end_date);
        }
      } else if (selectedId) {
        await updateCalendarEvent({ variables: { id: selectedId, title: trimmed, start_date: startDate, end_date: endDate, studentId: studentId } });
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isCreating) return;
    if (!window.confirm('Delete this calendar event? This cannot be undone.')) return;
    setFormError(null);
    try {
      await deleteCalendarEvent({ variables: { id: selectedId } });
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

  const listItems = calendarEvents.map((e) => ({
    _id: e._id,
    primary: `${e.title} (${e.start_date === e.end_date ? e.start_date : `${e.start_date} – ${e.end_date}`})`,
  }));

  const detail = (() => {
    if (loading) {
      return <p className="text-sm text-gray-500">Loading calendar events…</p>;
    }
    if (error) {
      return <p className="text-sm text-red-600">Error: {error.message}</p>;
    }
    if (!isCreating && !selectedId) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-gray-500">
          <p>Select a calendar event from the list, or use &quot;Add Calendar Event&quot; on the left.</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-6 text-lg font-semibold text-gray-800">
          {isCreating ? 'New calendar event' : 'Edit calendar event'}
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="calendar-event-title" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="calendar-event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="start-date" className="mb-1 block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="student" className="mb-1 block text-sm font-medium text-gray-700">
              Student
            </label>
            <select
              id="student"
              value={studentId ?? ''}
              onChange={(e) => setStudentId(e.target.value || null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All students (global event)</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
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
          {!isCreating && selected ? (
            <p className="text-xs text-gray-400">ID: {selected._id}</p>
          ) : null}
        </div>
      </div>
    );
  })();

  return (
    <ResourceTwoPanelLayout
      list={
        <ResourceEntityList
          title="Calendar Events"
          addLabel="Add Calendar Event"
          items={listItems}
          selectedId={selectedId}
          isCreating={isCreating}
          onAdd={handleAdd}
          onSelect={handleSelect}
        />
      }
      detail={detail}
    />
  );
}
