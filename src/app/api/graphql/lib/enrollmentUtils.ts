import { Types } from 'mongoose';
import { ICourse, ICourseLessonNode } from '@/models/Course';

interface ILessonSnapshot {
  _id: Types.ObjectId;
  title: string;
  content: string;
  note: string;
}

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

interface ILessonOccurrenceLesson {
  lesson_id: Types.ObjectId;
  lesson_title: string;
  day_number?: number;
  total_days?: number;
}

interface ILessonOccurrence {
  sequence: number;
  lessons: ILessonOccurrenceLesson[];
  status: 'pending' | 'completed' | 'skipped';
  completed_date?: Date;
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
        })),
        status: 'pending',
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
            },
          ],
          status: 'pending',
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

