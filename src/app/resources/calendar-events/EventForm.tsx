import { useEventForm } from './useEventForm';
import { useCalendarEventsList } from './useCalendarEventsList';

type EventFormProps = ReturnType<typeof useEventForm> &
  ReturnType<typeof useCalendarEventsList> & {
    handleSave: () => void;
    creating: boolean;
    updating: boolean;
  };

export default function EventForm(props: EventFormProps) {
  const {
    loading,
    error,
    selectedId,
    isCreating,
    title,
    setTitle,
    setStartDate,
    setEndDate,
    setStudentId,
    startDate,
    endDate,
    studentId,
    formError,
    students,
    selected,
    creating,
    updating,
    deleting,
    handleSave,
    handleDelete,
    handleCancelCreate,
  } = props;

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
        <div className="space-y-4">
          <div>
            <label
              htmlFor="calendar-event-title"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
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
            <label
              htmlFor="start-date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
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
            <label
              htmlFor="end-date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
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
            <label
              htmlFor="student"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
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
          {!isCreating && selected ? (
            <p className="text-xs text-gray-400">ID: {selected._id}</p>
          ) : null}
        </div>
      </div>
    );
  })();

  return detail;
}
