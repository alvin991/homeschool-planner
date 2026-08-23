import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { DateTime } from 'luxon';
import { canRescheduleRemaining, rescheduleTailFrom, previousOccurrenceFloor, pendingLessonsForDate } from './enrollmentUtils';

// Shared fixture calendar used across the rescheduleTailFrom tests below:
// weekdays = Mon/Wed/Fri, "today" (anchorDate) = Thu 2026-08-20, so
// generated dates always start the day after: Fri 2026-08-21.
//   Mon 08-17, Tue 08-18, Wed 08-19, Thu 08-20 (today),
//   Fri 08-21, Sat 08-22, Sun 08-23, Mon 08-24, Tue 08-25, Wed 08-26,
//   ... Fri 08-28, Sat 08-29, Sun 08-30, Mon 08-31
const d = (day: number) => new Date(2026, 7, day); // month is 0-indexed: 7 = August
const TODAY = DateTime.fromObject({ year: 2026, month: 8, day: 20 });

describe('canRescheduleRemaining', () => {
  it('is eligible when the occurrence is the first still-open one, with no pending siblings', () => {
    // Arrange: build a fake enrollment by hand, shaped exactly like the
    // real thing (lesson_occurrences), but with no database involved at
    // all - that's the whole point of testing a pure function.
    //
    // Two occurrences:
    //   - sequence 1: already completed (resolved, not "open")
    //   - sequence 2: one lesson, still pending - this is the one we're
    //     asking about. Since it's alone in its occurrence (lesson_rate: 1,
    //     no siblings), there's nothing else that could block it.
    const lessonIdInQuestion = new Types.ObjectId();

    const enrollment = {
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            {
              lesson_id: new Types.ObjectId(),
              lesson_title: 'Lesson A',
              status: 'completed' as const,
              completed_date: new Date('2026-08-10'),
            },
          ],
        },
        {
          sequence: 2,
          lessons: [
            {
              lesson_id: lessonIdInQuestion,
              lesson_title: 'Lesson B',
              status: 'pending' as const,
            },
          ],
        },
      ],
    };

    // Act: call the actual function we're testing, with the specific
    // occurrence sequence and lesson id we care about.
    const result = canRescheduleRemaining(
      enrollment,
      2,
      lessonIdInQuestion.toString()
    );

    // Assert: this should come back eligible.
    expect(result).toBe(true);
  });

  it('is not eligible when an earlier occurrence is still pending', () => {
    const targetLessonId = new Types.ObjectId();

    const enrollment = {
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            {
              lesson_id: new Types.ObjectId(),
              lesson_title: 'Lesson A',
              status: 'pending' as const,
            },
          ],
        },
        {
          sequence: 2,
          lessons: [
            {
              lesson_id: targetLessonId,
              lesson_title: 'Lesson B',
              status: 'pending' as const,
            },
          ],
        },
      ],
    };

    // Asking about sequence 2, but sequence 1 (earlier) is still open.
    const result = canRescheduleRemaining(enrollment, 2, targetLessonId.toString());

    expect(result).toBe(false);
  });

  it('is not eligible when a sibling lesson in the same occurrence is still pending', () => {
    const targetLessonId = new Types.ObjectId();
    const siblingLessonId = new Types.ObjectId();

    const enrollment = {
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            {
              lesson_id: targetLessonId,
              lesson_title: 'Chapter 1',
              status: 'pending' as const,
            },
            {
              lesson_id: siblingLessonId,
              lesson_title: 'Chapter 2',
              status: 'pending' as const, // sibling not done yet
            },
          ],
        },
      ],
    };

    const result = canRescheduleRemaining(enrollment, 1, targetLessonId.toString());

    expect(result).toBe(false);
  });

  it('is eligible when every sibling in the same occurrence is already resolved', () => {
    const targetLessonId = new Types.ObjectId();
    const siblingLessonId = new Types.ObjectId();

    const enrollment = {
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            {
              lesson_id: targetLessonId,
              lesson_title: 'Chapter 1',
              status: 'pending' as const, // the one being completed right now
            },
            {
              lesson_id: siblingLessonId,
              lesson_title: 'Chapter 2',
              status: 'completed' as const, // sibling already done
              completed_date: new Date('2026-08-15'),
            },
          ],
        },
      ],
    };

    const result = canRescheduleRemaining(enrollment, 1, targetLessonId.toString());

    expect(result).toBe(true);
  });

  it('is not eligible (and does not crash) when nothing is pending anywhere', () => {
    const enrollment = {
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            {
              lesson_id: new Types.ObjectId(),
              lesson_title: 'Lesson A',
              status: 'completed' as const,
              completed_date: new Date('2026-08-10'),
            },
          ],
        },
        {
          sequence: 2,
          lessons: [
            {
              lesson_id: new Types.ObjectId(),
              lesson_title: 'Lesson B',
              status: 'skipped' as const,
            },
          ],
        },
      ],
    };

    const result = canRescheduleRemaining(enrollment, 1, 'irrelevant-lesson-id');

    expect(result).toBe(false);
  });
});

describe('rescheduleTailFrom', () => {
  const baseEnrollment = {
    weekdays: [1, 3, 5], // Mon/Wed/Fri
    week_interval: 1 as const,
    suspension_periods: [],
    end_date: undefined,
  };

  it('returns the untouched head when fromIndex is past the end (empty tail)', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    const result = rescheduleTailFrom(enrollment, 2, TODAY);

    expect(result).toEqual([d(17), d(19)]);
  });

  it('is a no-op when every occurrence in the tail is already resolved', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19), d(21)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'completed' as const, completed_date: d(19) }] },
        { sequence: 3, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'C', status: 'skipped' as const }] },
      ],
    };

    // Tail starts at index 1 (sequence 2 onward) - both resolved, nothing to regenerate.
    const result = rescheduleTailFrom(enrollment, 1, TODAY);

    expect(result).toEqual([d(17), d(19), d(21)]);
  });

  it('gives every occurrence a fresh date when the whole tail is pending', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19), d(21)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
        { sequence: 3, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'C', status: 'pending' as const }] },
      ],
    };

    const result = rescheduleTailFrom(enrollment, 0, TODAY);

    // Fresh Mon/Wed/Fri dates starting the day after TODAY (Fri 08-21).
    expect(result).toEqual([d(21), d(24), d(26)]);
  });

  it('preserves an out-of-order completed occurrence untouched, in place, while its pending neighbors get fresh dates', () => {
    // This is the actual Gap B fix: the middle occurrence (sequence 2) was
    // completed early/out of order. Rescheduling the tail must never
    // rewrite its date, even though it sits between two pending ones.
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19), d(21)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'completed' as const, completed_date: d(15) }] },
        { sequence: 3, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'C', status: 'pending' as const }] },
      ],
    };

    const result = rescheduleTailFrom(enrollment, 0, TODAY);

    // Position 0 (pending) -> first fresh date. Position 1 (already
    // completed) -> untouched, still its original Aug 19. Position 2
    // (pending) -> next fresh date.
    expect(result).toEqual([d(21), d(19), d(24)]);
  });

  it('throws when lesson_occurrences and scheduled_dates have different lengths', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
      ],
    };

    expect(() => rescheduleTailFrom(enrollment, 0, TODAY)).toThrow(
      /Enrollment data inconsistent/
    );
  });

  it('throws when a tail position has no matching occurrence for its sequence', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        // sequence 2 is missing - sequence 3 exists instead, so the
        // lengths still match (2 === 2) but the lookup for sequence 2 fails.
        { sequence: 3, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'C', status: 'pending' as const }] },
      ],
    };

    expect(() => rescheduleTailFrom(enrollment, 0, TODAY)).toThrow(
      /No occurrence found for sequence 2/
    );
  });

  it('throws when there are not enough remaining valid days before end_date', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
      end_date: d(21), // only Fri 08-21 itself fits before the cutoff
    };

    // Needs 2 fresh dates, but only 1 (08-21) is available before end_date.
    expect(() => rescheduleTailFrom(enrollment, 0, TODAY)).toThrow(
      /Not enough scheduled days — 1 days available for 2 lessons/
    );
  });

  it('skips a suspended period when generating fresh dates', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
      ],
      suspension_periods: [{ start: d(21), end: d(21) }], // Fri 08-21 is suspended
    };

    const result = rescheduleTailFrom(enrollment, 0, TODAY);

    // Fri 08-21 is skipped; next valid Mon/Wed/Fri day is Mon 08-24.
    expect(result).toEqual([d(24)]);
  });

  it('honors a week_interval of 2, skipping the off week', () => {
    const enrollment = {
      ...baseEnrollment,
      scheduled_dates: [d(17), d(19)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
      week_interval: 2 as const,
    };

    const result = rescheduleTailFrom(enrollment, 0, TODAY);

    // Fri 08-21 falls in the active week; the whole next week (08-24 to
    // 08-28) is the "off" week under a 2-week interval, so the second
    // fresh date lands on Mon 08-31, not 08-24.
    expect(result).toEqual([d(21), d(31)]);
  });
});

describe('previousOccurrenceFloor', () => {
  it('uses the previous occurrence\'s scheduled slot when it is still pending', () => {
    const enrollment = {
      scheduled_dates: [d(17), d(28)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    expect(previousOccurrenceFloor(enrollment, 2)).toBe('2026-08-17');
  });

  it('uses the previous occurrence\'s actual completed_date once it is resolved, even if that predates its stale scheduled slot', () => {
    // This is the reported bug: occurrence 1 was completed early (Aug 21)
    // against an original slot of Aug 28. rescheduleTailFrom leaves
    // scheduled_dates[0] frozen at Aug 28 (Gap B fix), so the floor for
    // occurrence 2 must come from completed_date, not that stale slot -
    // otherwise occurrence 2 could never be completed before Aug 28, even
    // on a date after occurrence 1 actually finished.
    const enrollment = {
      scheduled_dates: [d(28), d(28)], // occurrence 1's slot never moved; occurrence 2 coincidentally rescheduled to the same day
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            { lesson_id: new Types.ObjectId(), lesson_title: 'A1', status: 'completed' as const, completed_date: d(11) },
            { lesson_id: new Types.ObjectId(), lesson_title: 'A2', status: 'completed' as const, completed_date: d(21) },
          ],
        },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    expect(previousOccurrenceFloor(enrollment, 2)).toBe('2026-08-21');
  });

  it('takes the latest completed_date when the previous occurrence has multiple resolved lessons', () => {
    const enrollment = {
      scheduled_dates: [d(28), d(28)],
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            { lesson_id: new Types.ObjectId(), lesson_title: 'A1', status: 'completed' as const, completed_date: d(21) },
            { lesson_id: new Types.ObjectId(), lesson_title: 'A2', status: 'completed' as const, completed_date: d(11) },
          ],
        },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    expect(previousOccurrenceFloor(enrollment, 2)).toBe('2026-08-21');
  });

  it('falls back to the scheduled slot when the previous occurrence is resolved but skipped (no completed_date)', () => {
    const enrollment = {
      scheduled_dates: [d(28), d(28)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'skipped' as const }] },
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    expect(previousOccurrenceFloor(enrollment, 2)).toBe('2026-08-28');
  });

  it('falls back to the scheduled slot when no occurrence matches the previous sequence', () => {
    const enrollment = {
      scheduled_dates: [d(17), d(28)],
      lesson_occurrences: [
        // sequence 1 missing
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    expect(previousOccurrenceFloor(enrollment, 2)).toBe('2026-08-17');
  });
});

describe('pendingLessonsForDate', () => {
  it('returns the pending lessons for the one occurrence scheduled on that date', () => {
    const lessonId = new Types.ObjectId();
    const enrollment = {
      scheduled_dates: [d(17), d(28)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'completed' as const, completed_date: d(17) }] },
        { sequence: 2, lessons: [{ lesson_id: lessonId, lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    const result = pendingLessonsForDate(enrollment, '2026-08-28');

    expect(result).toEqual([{ lesson: enrollment.lesson_occurrences[1].lessons[0], sequence: 2 }]);
  });

  it('returns an empty array when nothing is scheduled on that date', () => {
    const enrollment = {
      scheduled_dates: [d(17)],
      lesson_occurrences: [
        { sequence: 1, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'A', status: 'pending' as const }] },
      ],
    };

    expect(pendingLessonsForDate(enrollment, '2026-08-28')).toEqual([]);
  });

  it('collects pending lessons from every occurrence sharing the date, not just the first', () => {
    // The reported bug: occurrence 1 was completed early, so its slot sits
    // frozen at its original date (Aug 28). rescheduleTailFrom later
    // assigned occurrence 2 the same Aug 28 by coincidence. A day view for
    // Aug 28 must still surface occurrence 2's pending lessons even though
    // occurrence 1 (fully resolved, nothing pending) matches that date first.
    const pendingLessonId = new Types.ObjectId();
    const enrollment = {
      scheduled_dates: [d(28), d(28)],
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            { lesson_id: new Types.ObjectId(), lesson_title: 'A1', status: 'completed' as const, completed_date: d(11) },
            { lesson_id: new Types.ObjectId(), lesson_title: 'A2', status: 'completed' as const, completed_date: d(21) },
          ],
        },
        {
          sequence: 2,
          lessons: [
            { lesson_id: pendingLessonId, lesson_title: 'B1', status: 'pending' as const },
          ],
        },
      ],
    };

    const result = pendingLessonsForDate(enrollment, '2026-08-28');

    expect(result).toEqual([{ lesson: enrollment.lesson_occurrences[1].lessons[0], sequence: 2 }]);
  });

  it('skips a matching date when no occurrence exists for that sequence', () => {
    const enrollment = {
      scheduled_dates: [d(17), d(28)],
      lesson_occurrences: [
        // sequence 1 missing entirely
        { sequence: 2, lessons: [{ lesson_id: new Types.ObjectId(), lesson_title: 'B', status: 'pending' as const }] },
      ],
    };

    expect(pendingLessonsForDate(enrollment, '2026-08-17')).toEqual([]);
  });

  it('excludes completed and skipped lessons even on a matching date', () => {
    const enrollment = {
      scheduled_dates: [d(28)],
      lesson_occurrences: [
        {
          sequence: 1,
          lessons: [
            { lesson_id: new Types.ObjectId(), lesson_title: 'A1', status: 'completed' as const, completed_date: d(21) },
            { lesson_id: new Types.ObjectId(), lesson_title: 'A2', status: 'skipped' as const },
          ],
        },
      ],
    };

    expect(pendingLessonsForDate(enrollment, '2026-08-28')).toEqual([]);
  });
});
