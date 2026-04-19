'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import ResourceTwoPanelLayout from '../components/ResourceTwoPanelLayout';
import ResourceEntityList from '../components/ResourceEntityList';
import {
  CREATE_SUBJECT,
  DELETE_SUBJECT,
  GET_SUBJECTS,
  UPDATE_SUBJECT,
  type GetSubjectsData,
  type SubjectRow,
} from '../api/resources.graphql';
import apolloClient from '@/utils/apolloClient';

const DEFAULT_SUBJECT_COLOR = '#6366f1';

export default function SubjectsPage() {
  const { loading, error, data } = useQuery<GetSubjectsData>(GET_SUBJECTS, {
    client: apolloClient,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_SUBJECT_COLOR);
  const [formError, setFormError] = useState<string | null>(null);

  type CreateSubjectMut = { createSubject: SubjectRow };

  const [createSubject, { loading: creating }] = useMutation<CreateSubjectMut>(CREATE_SUBJECT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_SUBJECTS }],
  });
  const [updateSubject, { loading: updating }] = useMutation(UPDATE_SUBJECT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_SUBJECTS }],
  });
  const [deleteSubject, { loading: deleting }] = useMutation(DELETE_SUBJECT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_SUBJECTS }],
  });

  const subjects = useMemo(() => data?.subjects ?? [], [data?.subjects]);
  const selected = useMemo(
    () => subjects.find((s) => s._id === selectedId) ?? null,
    [subjects, selectedId],
  );

  const resetForm = () => {
    setName('');
    setColor(DEFAULT_SUBJECT_COLOR);
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
    const row = subjects.find((s) => s._id === id);
    setName(row?.name ?? '');
    setColor(row?.color ?? DEFAULT_SUBJECT_COLOR);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedColor = color.trim();
    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }
    if (!trimmedColor) {
      setFormError('Color is required.');
      return;
    }
    try {
      if (isCreating) {
        const res = await createSubject({
          variables: { name: trimmedName, color: trimmedColor },
        });
        const created = res.data?.createSubject;
        if (created?._id) {
          setIsCreating(false);
          setSelectedId(created._id);
          setName(created.name);
          setColor(created.color);
        }
      } else if (selectedId) {
        await updateSubject({
          variables: {
            id: selectedId,
            input: { name: trimmedName, color: trimmedColor },
          },
        });
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isCreating) return;
    if (!window.confirm('Delete this subject? This cannot be undone.')) return;
    setFormError(null);
    try {
      await deleteSubject({ variables: { id: selectedId } });
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

  const listItems = subjects.map((s) => ({
    _id: s._id,
    primary: s.name,
    trailing: (
      <span
        className="h-4 w-4 shrink-0 rounded border border-gray-200 shadow-inner"
        style={{ backgroundColor: s.color }}
        title={s.color}
        aria-hidden
      />
    ),
  }));

  const detail = (() => {
    if (loading) {
      return <p className="text-sm text-gray-500">Loading subjects…</p>;
    }
    if (error) {
      return <p className="text-sm text-red-600">Error: {error.message}</p>;
    }
    if (!isCreating && !selectedId) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-gray-500">
          <p>Select a subject from the list, or use &quot;Add Subject&quot; on the left.</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-6 text-lg font-semibold text-gray-800">
          {isCreating ? 'New subject' : 'Edit subject'}
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="subject-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="subject-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoComplete="off"
            />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Color</span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/i.test(color) ? color : DEFAULT_SUBJECT_COLOR}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                aria-label="Pick subject color"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6366f1"
                className="min-w-[8rem] flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
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
          title="Subjects"
          addLabel="Add Subject"
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
