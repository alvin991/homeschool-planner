'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import ResourceTwoPanelLayout from '../components/ResourceTwoPanelLayout';
import ResourceEntityList from '../components/ResourceEntityList';
import {
  CREATE_STUDENT,
  DELETE_STUDENT,
  GET_STUDENTS,
  UPDATE_STUDENT,
  type GetStudentsData,
  type StudentRow,
} from '../api/students.graphql';
import apolloClient from '@/utils/apolloClient';

export default function StudentsPage() {
  const { loading, error, data } = useQuery<GetStudentsData>(GET_STUDENTS, {
    client: apolloClient,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  type CreateStudentMut = { createStudent: StudentRow };

  const [createStudent, { loading: creating }] = useMutation<CreateStudentMut>(CREATE_STUDENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_STUDENTS }],
  });
  const [updateStudent, { loading: updating }] = useMutation(UPDATE_STUDENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_STUDENTS }],
  });
  const [deleteStudent, { loading: deleting }] = useMutation(DELETE_STUDENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_STUDENTS }],
  });

  const students = useMemo(() => data?.students ?? [], [data?.students]);
  const selected = useMemo(
    () => students.find((s) => s._id === selectedId) ?? null,
    [students, selectedId],
  );

  const resetForm = () => {
    setName('');
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
    const row = students.find((s) => s._id === id);
    setName(row?.name ?? '');
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Name is required.');
      return;
    }
    try {
      if (isCreating) {
        const res = await createStudent({ variables: { name: trimmed } });
        const created = res.data?.createStudent;
        if (created?._id) {
          setIsCreating(false);
          setSelectedId(created._id);
          setName(created.name);
        }
      } else if (selectedId) {
        await updateStudent({ variables: { id: selectedId, name: trimmed } });
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isCreating) return;
    if (!window.confirm('Delete this student? This cannot be undone.')) return;
    setFormError(null);
    try {
      await deleteStudent({ variables: { id: selectedId } });
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

  const listItems = students.map((s) => ({ _id: s._id, primary: s.name }));

  const detail = (() => {
    if (loading) {
      return <p className="text-sm text-gray-500">Loading students…</p>;
    }
    if (error) {
      return <p className="text-sm text-red-600">Error: {error.message}</p>;
    }
    if (!isCreating && !selectedId) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-gray-500">
          <p>Select a student from the list, or use &quot;Add Student&quot; on the left.</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-6 text-lg font-semibold text-gray-800">
          {isCreating ? 'New student' : 'Edit student'}
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="student-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="student-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="off"
            />
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
          title="Students"
          addLabel="Add Student"
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
