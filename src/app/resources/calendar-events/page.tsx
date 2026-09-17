'use client';

import { useMutation } from '@apollo/client/react';
import ResourceTwoPanelLayout from '../components/ResourceTwoPanelLayout';
import ResourceEntityList from '../components/ResourceEntityList';
import EventForm from './EventForm';
import { useEventForm } from './useEventForm';
import { useCalendarEventsList } from './useCalendarEventsList';
import {
  CREATE_CALENDAR_EVENT,
  UPDATE_CALENDAR_EVENT,
  GET_ALL_CALENDAR_EVENTS,
  type CalendarEventRow,
} from '../api/calendarEvents.graphql';
import apolloClient from '@/utils/apolloClient';

export default function CalendarEventsPage() {
  const form = useEventForm();
  const list = useCalendarEventsList({
    onReset: form.resetForm,
    onLoadRow: form.loadRow,
    onError: form.setFormError,
  });

  type CreateCalendarEventMut = { createCalendarEvent: CalendarEventRow };

  const [createCalendarEvent, { loading: creating }] = useMutation<CreateCalendarEventMut>(CREATE_CALENDAR_EVENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_ALL_CALENDAR_EVENTS }],
  });
  const [updateCalendarEvent, { loading: updating }] = useMutation(UPDATE_CALENDAR_EVENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_ALL_CALENDAR_EVENTS }],
  });

  const handleSave = async () => {
    const err = form.validate();
    if (err) {
      form.setFormError(err);
      return;
    }
    form.setFormError(null);
    const trimmed = form.title.trim();
    try {
      if (list.isCreating) {
        const res = await createCalendarEvent({
          variables: {
            title: trimmed,
            start_date: form.startDate,
            end_date: form.endDate,
            studentId: form.studentId,
          },
        });
        const created = res.data?.createCalendarEvent;
        if (created?._id) {
          list.setIsCreating(false);
          list.setSelectedId(created._id);
          form.setTitle(created.title);
          form.setStartDate(created.start_date);
          form.setEndDate(created.end_date);
        }
      } else if (list.selectedId) {
        await updateCalendarEvent({
          variables: {
            id: list.selectedId,
            title: trimmed,
            start_date: form.startDate,
            end_date: form.endDate,
            studentId: form.studentId,
          },
        });
      }
    } catch (e) {
      form.setFormError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  return (
    <ResourceTwoPanelLayout
      list={
        <ResourceEntityList
          title="Calendar Events"
          addLabel="Add Calendar Event"
          items={list.listItems}
          selectedId={list.selectedId}
          isCreating={list.isCreating}
          onAdd={list.handleAdd}
          onSelect={list.handleSelect}
        />
      }
      detail={<EventForm {...form} {...list} handleSave={handleSave} creating={creating} updating={updating} />}
    />
  );
}
