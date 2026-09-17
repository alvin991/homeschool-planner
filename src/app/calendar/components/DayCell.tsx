'use client';

import { useRef, useEffect, useState } from 'react';
import { CalendarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { CalendarEvent, MonthViewLesson } from '../types';
import { useMutation } from '@apollo/client/react';
import { UPDATE_OCCURRENCE_STATUS, GET_CALENDAR_EVENTS } from '../api';
import apolloClient from '@/utils/apolloClient';
import { familyToday } from '@/utils/dateUtils';
import { useEventForm } from '@/app/resources/calendar-events/useEventForm';
import EventFormFields from '@/app/resources/calendar-events/EventFormFields';
import { CREATE_CALENDAR_EVENT } from '@/app/resources/api/calendarEvents.graphql';

export const statusActions: Record<string, { label: string; value: string }[]> = {
  pending: [
    { label: 'Complete', value: 'completed' },
    { label: 'Skip', value: 'skipped' },
  ],
  completed: [
    { label: 'Reopen', value: 'pending' },
  ],
  skipped: [
    { label: 'Reopen', value: 'pending' },
  ],
};

export default function DayCell({
  dayNumber,
  isValid,
  lessons,
  events,
  isToday,
  column,
  date,
  studentId,
}: {
  dayNumber: number;
  isValid: boolean;
  lessons: MonthViewLesson[];
  events: CalendarEvent[];
  isToday: boolean;
  column: number;
  date: string;
  studentId?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [popoverLesson, setPopoverLesson] = useState<MonthViewLesson | null>(
    null
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverPosition = column === 6 ? 'right-full' : 'left-full';
  // Wider than the lesson popover (w-80 vs w-64), so it needs to flip one column earlier.
  const addEventPopoverPosition = column >= 5 ? 'right-full' : 'left-full';
  const [popoverTop, setPopoverTop] = useState(0);
  const cellRef = useRef<HTMLDivElement>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [pickedDate, setPickedDate] = useState(familyToday());
  const [rescheduleChecked, setRescheduleChecked] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const addEventPopoverRef = useRef<HTMLDivElement>(null);
  const eventForm = useEventForm();
  const month = date.slice(0, 7);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        const isOverflowing =
          scrollRef.current.scrollHeight > scrollRef.current.clientHeight;
        setHasOverflow(isOverflowing);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [lessons, events]);

  useEffect(() => {
    if (!popoverLesson) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPopoverLesson(null);
        setIsCompleting(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverLesson]);

  useEffect(() => {
    if (!isAddingEvent) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!addEventPopoverRef.current?.contains(e.target as Node)) {
        setIsAddingEvent(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddingEvent]);

  const [updateStatus] = useMutation(UPDATE_OCCURRENCE_STATUS, {
    client: apolloClient,
    refetchQueries: ['GetMonthView'],
  });

  const [createCalendarEvent, { loading: creatingEvent }] = useMutation(CREATE_CALENDAR_EVENT, {
    client: apolloClient,
    refetchQueries: [{ query: GET_CALENDAR_EVENTS, variables: { studentId, month } }],
  });

  const handleAddEventSave = async () => {
    const err = eventForm.validate();
    if (err) {
      eventForm.setFormError(err);
      return;
    }
    eventForm.setFormError(null);
    try {
      await createCalendarEvent({
        variables: {
          title: eventForm.title.trim(),
          start_date: eventForm.startDate,
          end_date: eventForm.endDate,
          studentId: eventForm.studentId,
        },
      });
      setIsAddingEvent(false);
      eventForm.resetForm();
    } catch (e) {
      eventForm.setFormError(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  return (
    <div
      ref={cellRef}
      className={`group relative p-2 bg-white min-h-0 border border-gray-200
      ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}
    >
      {isValid && (
        <div className="absolute left-2 top-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {dayNumber}
        </div>
      )}
      {hasOverflow && (
        <div className="absolute right-2 top-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
          {lessons.length} lessons
        </div>
      )}
      {isValid && (
        <button
          type="button"
          onClick={() => {
            setPopoverLesson(null);
            eventForm.setTitle('');
            eventForm.setStartDate(date);
            eventForm.setEndDate(date);
            eventForm.setStudentId(studentId ?? null);
            eventForm.setFormError(null);
            setIsAddingEvent(true);
          }}
          aria-label="Add event"
          className="absolute right-2 bottom-2 w-[26px] h-[26px] rounded-full bg-slate-100 text-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      )}
      {isAddingEvent && (
        <div
          ref={addEventPopoverRef}
          className={`absolute ${addEventPopoverPosition} bottom-2 z-50 bg-white rounded-lg shadow-lg border p-4 w-80`}
        >
          {/* Outer triangle (border color) */}
          <div
            className={`absolute ${column >= 5 ? '-right-[10px]' : '-left-[10px]'} bottom-3 w-0 h-0
            border-t-[9px] border-t-transparent
            border-b-[9px] border-b-transparent
            ${column >= 5 ? 'border-l-[9px] border-l-black' : 'border-r-[9px] border-r-black'}`}
          />
          {/* Inner triangle (white fill) */}
          <div
            className={`absolute ${column >= 5 ? '-right-2' : '-left-2'} bottom-3 w-0 h-0
            border-t-8 border-t-transparent
            border-b-8 border-b-transparent
            ${column >= 5 ? 'border-l-8 border-l-white' : 'border-r-8 border-r-white'}`}
          />
          <h3 className="font-semibold mb-3">Add event</h3>
          <EventFormFields
            title={eventForm.title}
            setTitle={eventForm.setTitle}
            startDate={eventForm.startDate}
            setStartDate={eventForm.setStartDate}
            endDate={eventForm.endDate}
            setEndDate={eventForm.setEndDate}
            studentId={eventForm.studentId}
            setStudentId={eventForm.setStudentId}
            students={eventForm.students}
            formError={eventForm.formError}
            handleSave={handleAddEventSave}
            creating={creatingEvent}
            updating={false}
            isCreating={true}
            handleCancelCreate={() => {
              setIsAddingEvent(false);
              eventForm.resetForm();
            }}
            handleDelete={() => {}}
            deleting={false}
          />
        </div>
      )}
      {popoverLesson && (
        <div
          ref={popoverRef}
          className={`absolute ${popoverPosition} z-50 bg-white rounded-lg shadow-lg border p-4 w-64`}
          style={{ top: popoverTop }}
        >
          {/* Outer triangle (border color) */}
          <div
            className={`absolute ${column === 6 ? '-right-[10px]' : '-left-[10px]'} top-3 w-0 h-0 
            border-t-[9px] border-t-transparent 
            border-b-[9px] border-b-transparent
            ${column === 6 ? 'border-l-[9px] border-l-black' : 'border-r-[9px] border-r-black'}`}
          />
          {/* Inner triangle (white fill) */}
          <div
            className={`absolute ${column === 6 ? '-right-2' : '-left-2'} top-3 w-0 h-0 
            border-t-8 border-t-transparent 
            border-b-8 border-b-transparent
            ${column === 6 ? 'border-l-8 border-l-white' : 'border-r-8 border-r-white'}`}
          />
          <div className="flex items-center justify-between mb-2">
            {/* Status badge — solid color */}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold
              ${
                popoverLesson.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : popoverLesson.status === 'skipped'
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {popoverLesson.status}
            </span>
            {/* Action buttons — outlined */}
            {!isCompleting && (
              <div className="flex gap-1">
                {statusActions[popoverLesson.status].map((action) => (
                  <button
                    key={action.value}
                    className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      if (action.value === 'completed') {
                        setPickedDate(familyToday());
                        setRescheduleChecked(true);
                        setIsCompleting(true);
                        return;
                      }
                      updateStatus({
                        variables: {
                          input: {
                            enrollmentId: popoverLesson.enrollment_id,
                            lessonId: popoverLesson.lesson_id,
                            status: action.value,
                            completedDate: null,
                          },
                        },
                      });
                      setPopoverLesson(null);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isCompleting && (
            <div className="mb-3 space-y-2">
              <input
                type="date"
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                value={pickedDate}
                max={familyToday()}
                onChange={(e) => setPickedDate(e.target.value)}
              />
              {pickedDate < date && popoverLesson.can_reschedule_remaining && (
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={rescheduleChecked}
                    onChange={(e) => setRescheduleChecked(e.target.checked)}
                  />
                  Reschedule remaining lessons
                </label>
              )}
              <div className="flex justify-end gap-1">
                <button
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                  onClick={() => setIsCompleting(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded border border-slate-700 bg-slate-700 px-2 py-0.5 text-xs text-white hover:bg-slate-600"
                  onClick={() => {
                    updateStatus({
                      variables: {
                        input: {
                          enrollmentId: popoverLesson.enrollment_id,
                          lessonId: popoverLesson.lesson_id,
                          status: 'completed',
                          completedDate: pickedDate,
                          rescheduleRemaining: rescheduleChecked,
                        },
                      },
                    });
                    setPopoverLesson(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <h3 className="font-semibold">{popoverLesson.course_title}</h3>
          <p className="text-sm">{popoverLesson.lesson_title}</p>
        </div>
      )}

      <div
        ref={scrollRef}
        className="mt-6 h-[calc(100%-1.5rem)] overflow-auto pr-1"
        onScroll={() => setPopoverLesson(null)}
      >
        <div className="space-y-1 mb-1">
          {events.map((event) => (
            <div
              key={event._id}
              className="flex items-center gap-1 rounded-md overflow-hidden px-2 text-nowrap text-xs font-bold text-black"
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span>{event.title}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {lessons.map((lesson, idx) => (
            <div
              key={idx}
              className="flex rounded-md border overflow-hidden px-2 text-nowrap"
              style={{
                opacity: lesson.status === 'completed' ? 0.5 : 1,
                backgroundColor: lesson.subject_color,
                color: 'white',
              }}
              onDoubleClick={(e) => {
                const pillRect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                const cellRect = cellRef.current!.getBoundingClientRect();
                setPopoverTop(
                  pillRect.top - cellRect.top + pillRect.height / 2 - 9 - 12
                );
                setPopoverLesson(lesson);
                setIsCompleting(false);
                setIsAddingEvent(false);
              }}
            >
              <span
                className={lesson.status === 'skipped' ? 'line-through' : ''}
              >
                {lesson.course_abbr}: {lesson.lesson_title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
