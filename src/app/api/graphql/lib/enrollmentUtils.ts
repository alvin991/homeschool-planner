import { ICourse, ICourseLessonNode } from '@/models/Course';
import { ILessonSnapshot, ILessonOccurrence, ILessonOccurrenceLesson, IEnrollment } from '@/models/Enrollment';
import { DateTime } from 'luxon';

export function flattenLessonTree(
  nodes: ICourseLessonNode[]
): ILessonSnapshot[] {
  const result: ILessonSnapshot[] = [];
  for (const node of nodes) {
    if (node.kind === 'lesson') {
      result.push({
        _id: node._id,
        title: node.title,
        content: node.content ?? '',
        note: node.note ?? '',
      });
    } else if (node.kind === 'folder' && node.children) {
      result.push(...flattenLessonTree(node.children));
    }
  }
  return result;
}

export function generateLessonOccurrences(
  lessonSnapshot: ILessonSnapshot[],
  lessonRate: 0.25 | 0.5 | 1 | 2
): ILessonOccurrence[] {
  const result: ILessonOccurrence[] = [];
  let sequence = 1;

  if (lessonRate >= 1) {
    // chunk lessons into groups of lessonRate
    const chunkSize = lessonRate;
    for (let i = 0; i < lessonSnapshot.length; i += chunkSize) {
      const chunk = lessonSnapshot.slice(i, i + chunkSize);
      result.push({
        sequence: sequence++,
        lessons: chunk.map((l) => ({
          lesson_id: l._id,
          lesson_title: l.title,
          status: 'pending',
          completed_date: undefined,
        })),
      });
    }
  } else {
    // each lesson spans totalDays occurrences
    const totalDays = 1 / lessonRate;
    for (const lesson of lessonSnapshot) {
      for (let day = 1; day <= totalDays; day++) {
        result.push({
          sequence: sequence++,
          lessons: [
            {
              lesson_id: lesson._id,
              lesson_title: lesson.title,
              day_number: day,
              total_days: totalDays,
              status: 'pending',
              completed_date: undefined,
            },
          ]
        });
      }
    }
  }

  return result;
}

export function generateScheduledDates(
  startDate: Date,
  weekdays: number[],
  weekInterval: 1 | 2,
  suspensionPeriods: Array<{ start: Date; end: Date }>,
  totalOccurrences: number,
  endDate?: Date
): Date[] {
  const MAX_ITERATIONS = 365 * 2;
  let iterations = 0;
  const result: Date[] = [];

  // get the Sunday of the week containing startDate
  const startOfWeek = new Date(startDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

  while (result.length < totalOccurrences && iterations < MAX_ITERATIONS) {
    if (endDate && current > endDate) break;

    const weekNumber = Math.floor(
      (current.getTime() - startOfWeek.getTime()) / MS_PER_WEEK
    );
    const isActiveWeek = weekNumber % weekInterval === 0;
    const isWeekday = weekdays.includes(current.getDay());
    const isSuspended = suspensionPeriods.some(
      (p) => current >= p.start && current <= p.end
    );

    if (isActiveWeek && isWeekday && !isSuspended) {
      result.push(new Date(current));
    }

    current.setDate(current.getDate() + 1);
    iterations++;
  }

  return result;
}

type ComputeScheduleInput = {
  course: ICourse;
  weekdays: number[];
  week_interval: 1 | 2;
  lesson_rate: 0.25 | 0.5 | 1 | 2;
  start_date: string;
  end_date?: string;
  suspension_periods?: Array<{ start: string; end: string }>;
};

export function computeSchedule(
  {
    course,
    weekdays,
    week_interval,
    lesson_rate,
    start_date,
    end_date,
    suspension_periods,
  }: ComputeScheduleInput
) {
  const lessonSnapshots = flattenLessonTree(course.lessonTree);
  const lessonOccurrences = generateLessonOccurrences(lessonSnapshots, lesson_rate);
  const scheduledDates = generateScheduledDates(
    new Date(start_date),
    weekdays,
    week_interval,
    (suspension_periods ?? []).map((p) => ({
      start: new Date(p.start),
      end: new Date(p.end),
    })),
    lessonOccurrences.length,
    end_date ? new Date(end_date) : undefined
  );

  return { lessonSnapshots, lessonOccurrences, scheduledDates };
}

type RescheduleEnrollmentInput = Pick<
  IEnrollment,
  'scheduled_dates' | 'lesson_occurrences' | 'weekdays' | 'week_interval' | 'suspension_periods' | 'end_date'
>;

export function rescheduleTailFrom(enrollment: RescheduleEnrollmentInput, fromIndex: number, anchorDate: DateTime): Date[] {
  const { scheduled_dates, lesson_occurrences, weekdays, week_interval, suspension_periods, end_date } = enrollment;

  if (lesson_occurrences.length !== scheduled_dates.length) {
    throw new Error(
      `Enrollment data inconsistent: ${lesson_occurrences.length} lesson_occurrences vs ${scheduled_dates.length} scheduled_dates`
    );
  }

  //Slice scheduled_dates from fromIndex → tailDates.
  const tailDates = scheduled_dates.slice(fromIndex);

  //Look up each tail position's occurrence by sequence → tailOccurrences, aligned 1:1 with tailDates.
  const tailOccurrences = tailDates.map((_, idx) => {
    const sequence = fromIndex + idx + 1;
    const occurrence = lesson_occurrences.find((occ) => occ.sequence === sequence);
    if (!occurrence) {
      throw new Error(`No occurrence found for sequence ${sequence}`);
    }
    return occurrence;
  });

  //Check each occurrence in tailOccurrences for status === 'pending', and count how many are — call it pendingCount. (This is the split you were describing in step 1 — it just operates on the paired list, and produces a count, not a filtered array.)
  const isPending = (occurrence: ILessonOccurrence) =>
    occurrence.lessons.some((lesson) => lesson.status === 'pending');

  const pendingCount = tailOccurrences.filter(isPending).length;

  //Call generateScheduledDates(startDate, ..., pendingCount, ...) where startDate is the day after anchorDate — asking for exactly pendingCount fresh dates, nothing about the old tail involved.
  const { year, month, day } = anchorDate.plus({ days: 1 });
  const startDate = new Date(year, month - 1, day);
  const newTailDates = generateScheduledDates(
    startDate,
    weekdays,
    week_interval,
    (suspension_periods ?? []).map((p) => ({
      start: p.start,
      end: p.end,
    })),
    pendingCount,
    end_date
  );

  if (newTailDates.length < pendingCount) {
    throw new Error(
      `Not enough scheduled days — ${newTailDates.length} days available for ${pendingCount} lessons`
    );
  }

  //Walk tailDates one more time, position by position: if that position's occurrence was pending, take the next date off the freshly generated list; if it was already resolved, keep the original old date untouched. This reassembly step is what actually produces the output — it's missing from your list, and it's the one that makes resolved occurrences immune to being overwritten (the Gap B fix).
  let cursor = 0;
  const newTail = tailDates.map((oldDate, i) =>
    isPending(tailOccurrences[i]) ? newTailDates[cursor++] : oldDate
  );

  //Final result = the untouched head (scheduled_dates.slice(0, fromIndex)) + that reassembled tail from step 5.
  return [...scheduled_dates.slice(0, fromIndex), ...newTail];
}

type PreviousOccurrenceFloorInput = Pick<IEnrollment, 'lesson_occurrences' | 'scheduled_dates'>;

// The floor a completedDate must not fall before, derived from the
// immediately preceding occurrence (occurrenceSequence - 1). If that
// occurrence is still open (has a pending lesson), its scheduled slot is
// the floor - same as before. But once it's resolved, its scheduled_dates
// entry is frozen at whatever it was pre-resolution (rescheduleTailFrom
// deliberately never rewrites a resolved occurrence's slot), so using it
// as the floor blocks legitimate early completions of the next occurrence.
// Once resolved, the floor should be the date it actually resolved on -
// the latest completed_date among its lessons - falling back to the
// scheduled slot only if none of them carry one (e.g. all skipped).
export function previousOccurrenceFloor(
  enrollment: PreviousOccurrenceFloorInput,
  occurrenceSequence: number
): string {
  const prevSequence = occurrenceSequence - 1;
  const scheduledSlotStr = new Date(enrollment.scheduled_dates[prevSequence - 1])
    .toISOString()
    .slice(0, 10);

  const prevOccurrence = enrollment.lesson_occurrences.find((o) => o.sequence === prevSequence);
  if (!prevOccurrence) return scheduledSlotStr;

  const isResolved = prevOccurrence.lessons.every((l) => l.status !== 'pending');
  if (!isResolved) return scheduledSlotStr;

  const completedDates = prevOccurrence.lessons
    .map((l) => l.completed_date)
    .filter((d): d is Date => d != null);
  if (completedDates.length === 0) return scheduledSlotStr;

  const latest = completedDates.reduce((max, d) => (d > max ? d : max));
  return latest.toISOString().slice(0, 10);
}

type PendingLessonsForDateInput = Pick<IEnrollment, 'lesson_occurrences' | 'scheduled_dates'>;

// All pending lessons whose occurrence is scheduled on `date`. Iterates
// every position rather than stopping at the first match, because more
// than one occurrence can land on the same scheduled_dates entry - e.g. a
// resolved occurrence's frozen (pre-backdate) slot coinciding with a later
// occurrence freshly assigned by rescheduleTailFrom. A `.find()` that stops
// at the first match would silently drop the later occurrence's lessons
// whenever that collision happens to put the resolved occurrence first.
export function pendingLessonsForDate(
  enrollment: PendingLessonsForDateInput,
  date: string
): Array<{ lesson: ILessonOccurrenceLesson; sequence: number }> {
  const result: Array<{ lesson: ILessonOccurrenceLesson; sequence: number }> = [];

  for (let i = 0; i < enrollment.scheduled_dates.length; i++) {
    const schedDateStr = new Date(enrollment.scheduled_dates[i]).toISOString().slice(0, 10);
    if (schedDateStr !== date) continue;

    const occurrence = enrollment.lesson_occurrences.find((o) => o.sequence === i + 1);
    if (!occurrence) continue;

    for (const lesson of occurrence.lessons) {
      if (lesson.status === 'pending') {
        result.push({ lesson, sequence: occurrence.sequence });
      }
    }
  }

  return result;
}

type CanRescheduleRemainingInput = Pick<IEnrollment, 'lesson_occurrences'>;

export function canRescheduleRemaining(enrollment: CanRescheduleRemainingInput, occurrenceSequence: number, lessonId: string): boolean {
  const sorted = [...enrollment.lesson_occurrences].sort((a, b) => a.sequence - b.sequence);
  const firstOpen = sorted.find((o) => o.lessons.some((l) => l.status === 'pending'));

  if (!firstOpen || firstOpen.sequence !== occurrenceSequence) {
    return false;
  }

  return firstOpen.lessons.every(
    (l) => l.lesson_id.toString() === lessonId || l.status !== 'pending'
  );
}
