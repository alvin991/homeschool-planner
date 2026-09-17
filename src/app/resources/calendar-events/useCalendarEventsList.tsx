import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  DELETE_CALENDAR_EVENT,
  GET_ALL_CALENDAR_EVENTS,
  type GetAllCalendarEventsData,
  type CalendarEventRow,
} from '../api/calendarEvents.graphql';
import apolloClient from '@/utils/apolloClient';

export function useCalendarEventsList({
  onReset,
  onLoadRow,
  onError,
}: {
  onReset: () => void;
  onLoadRow: (row: CalendarEventRow) => void;
  onError: (message: string | null) => void;
}) {
  const { loading, error, data } = useQuery<GetAllCalendarEventsData>(GET_ALL_CALENDAR_EVENTS, {
    client: apolloClient,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [deleteCalendarEvent, { loading: deleting }] = useMutation(DELETE_CALENDAR_EVENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_ALL_CALENDAR_EVENTS }],
  });

  const calendarEvents = useMemo(() => data?.calendarEvents ?? [], [data?.calendarEvents]);
  const selected = useMemo(
    () => calendarEvents.find((e) => e._id === selectedId) ?? null,
    [calendarEvents, selectedId],
  );

  const handleAdd = () => {
    setSelectedId(null);
    setIsCreating(true);
    onReset();
  };

  const handleSelect = (id: string) => {
    setIsCreating(false);
    setSelectedId(id);
    const row = calendarEvents.find((e) => e._id === id);
    if (row) {
      onLoadRow(row);
    } else {
      onReset();
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isCreating) return;
    if (!window.confirm('Delete this calendar event? This cannot be undone.')) return;
    onError(null);
    try {
      await deleteCalendarEvent({ variables: { id: selectedId } });
      setSelectedId(null);
      onReset();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    onReset();
  };

  const listItems = calendarEvents.map((e) => ({
    _id: e._id,
    primary: `${e.title} (${e.start_date === e.end_date ? e.start_date : `${e.start_date} – ${e.end_date}`})`,
  }));

  return {
    loading,
    error,
    calendarEvents,
    selectedId,
    setSelectedId,
    isCreating,
    setIsCreating,
    selected,
    deleting,
    handleAdd,
    handleSelect,
    handleDelete,
    handleCancelCreate,
    listItems,
  };
}
