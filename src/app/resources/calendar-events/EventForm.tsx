import { useEventForm } from './useEventForm';
import { useCalendarEventsList } from './useCalendarEventsList';
import EventFormFields from './EventFormFields';

type EventFormProps = ReturnType<typeof useEventForm> &
  ReturnType<typeof useCalendarEventsList> & {
    handleSave: () => void;
    creating: boolean;
    updating: boolean;
  };

export default function EventForm(props: EventFormProps) {
  const { loading, error, selectedId, isCreating, selected, ...fieldProps } = props;

  if (loading) {
    return <p className="text-sm text-gray-500">Loading calendar events…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">Error: {error.message}</p>;
  }
  if (!isCreating && !selectedId) {
    return (
      <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-gray-500">
        <p>
          Select a calendar event from the list, or use &quot;Add Calendar
          Event&quot; on the left.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-lg font-semibold text-gray-800">
        {isCreating ? 'New calendar event' : 'Edit calendar event'}
      </h2>
      <EventFormFields isCreating={isCreating} {...fieldProps} />
      {!isCreating && selected ? (
        <p className="text-xs text-gray-400">ID: {selected._id}</p>
      ) : null}
    </div>
  );
}
