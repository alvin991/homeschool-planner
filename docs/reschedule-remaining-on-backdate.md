# Reschedule Remaining on Backdate

Branch: `feat/reschedule-remaining-on-backdate`. Full design + implementation
notes for backlog #1 in `TASKS.md` ("Fix schedule drift from missed/late
lesson completions") — kept in its own file since the detail here goes well
past what belongs in the living backlog. `TASKS.md` links here; this file is
the source of truth for anything below "why this feature exists."

## The problem, in plain English

Say a Math enrollment runs Mon/Wed/Fri, lessons 1–5 currently scheduled:

| Lesson | Scheduled for |
|---|---|
| 1 | Mon Aug 3 |
| 2 | Wed Aug 5 |
| 3 | Fri Aug 7 |
| 4 | Mon Aug 10 |
| 5 | Wed Aug 12 |

Nobody marks Lesson 2 complete before the 8pm cutoff on Wednesday. The
overdue-check bumps it forward — but it doesn't just move Lesson 2, it shifts
*everything after it* forward by one slot too (Lesson 3 → Aug 10, Lesson 4 →
Aug 12, Lesson 5 → Aug 14). The whole rest of the course permanently drifted
two days later because of one missed checkbox click.

But Lesson 2 actually *did* happen on Wednesday, Aug 5, exactly as planned —
someone just forgot to tap "complete" in time. The fix: let them tell the app
"this was actually done on Aug 5" (a date earlier than where the app
currently has it — a **backdate**), and offer a choice: **reschedule the
remaining lessons** (undo the drift, pull 3/4/5 back to where they'd have
been) or **just complete this lesson** (record Aug 5, leave 3/4/5 where they
are).

**The twist that drives half the design below:** if Lesson 4 had *already*
been completed early (kid got ahead, did it out of order), correcting
Lesson 2 must never silently rewrite Lesson 4's real completion date. Before
this feature, the auto-reschedule mechanism did exactly that — blindly
overwriting the whole tail regardless of status. That's Gap B below.

## The two gaps (from TASKS.md, unabridged here since everything below refers back to them)

- **Gap A:** marking a lesson complete used whatever date the currently-
  viewed calendar page happened to show, not necessarily the day it was
  actually done. **Fixed already** — was part of the `fix/completion-date-timezone`
  branch (merged to `main`): `DayView.tsx`/`DayCell.tsx` now always use
  `familyToday()`, not a page-viewed date.
- **Gap B:** `processOverdueLessons`'s tail-splice-and-regenerate logic
  doesn't distinguish already-completed occurrences from pending ones in the
  tail it overwrites — completing lessons out of sequence risks a later
  completed lesson's real date being silently rewritten. **This feature's
  main job is closing this gap**, via `rescheduleTailFrom` (step 1).

## Design decisions locked

- **Backdate = correction.** When `completedDate` is earlier than an
  occurrence's currently-assigned scheduled slot, treat it as a correction:
  regenerate `scheduled_dates` for the remaining *still-pending* occurrences
  after it, skipping over already-completed ones instead of overwriting the
  whole tail.
- **Trigger: date picker in `DayCell.tsx`'s popover, not drag-and-drop.**
  Drag-and-drop was seriously considered and dropped — a pending lesson only
  ever renders in the one cell matching its current slot, so a correction
  target in a different month has no cell to drop on, and auto-paging the
  month mid-drag is a lot of fiddly state for a 2-user app. A plain
  `<input type="date">` has no such visibility constraint. `@dnd-kit` stays
  scoped to the course lesson-tree UI.
- **Backdate-choice checkbox.** Defaults to checked ("reschedule remaining"),
  can be unchecked for "only complete this lesson" (leave every other
  occurrence's `scheduled_dates` entry untouched — display is already
  correct either way, since completed lessons place by `completed_date`, not
  by slot).
- **Checkbox eligibility — the one condition, covering two cases:**
  completing *this* lesson must resolve the **first still-open occurrence**
  in the enrollment's sequence (lowest `sequence` with any pending lesson).
  This single check covers both "an earlier occurrence is still pending"
  (out-of-order completion) and "a sibling lesson in this same occurrence is
  still pending" (the `lesson_rate >= 1` chunking case — the day isn't done
  yet). The frontend can't determine this alone (no visibility into other
  occurrences' status), so the server computes and exposes it, and **must
  re-check it itself inside the mutation** rather than trusting the client
  — client state can be stale (another tab, a race).
- **Timezone dependency — satisfied.** This feature's date comparisons and
  anchors depend on `familyNow()`/`familyToday()` from `fix/completion-date-timezone`,
  merged to `main` 2026-08-09.

## Implementation roadmap

1. **`enrollmentUtils.ts` — `rescheduleTailFrom(enrollment, fromIndex, anchorDate)`.** ✅ *Done — see below.*
2. **`enrollmentUtils.ts` — `canRescheduleRemaining(enrollment, occurrenceSequence, lessonId)`.** ✅ *Done.*
3. **`calendarResolvers.ts`** — refactor `processOverdueLessons` to call `rescheduleTailFrom`; `calendarMonthView` computes `canRescheduleRemaining` per row. Not started.
4. **Schema** — `rescheduleRemaining: Boolean` on `UpdateOccurrenceStatusInput` (default `true`), `can_reschedule_remaining: Boolean!` on `MonthViewLesson`. Not started.
5. **`enrollmentResolvers.ts` (`updateOccurrenceStatus`)** — resolve occurrence, detect backdate, re-derive eligibility, call `rescheduleTailFrom` or just save. Not started.
6. **`DayCell.tsx`** — date input + checkbox in the popover. Not started.

## Step 1 deep-dive: `rescheduleTailFrom`

### Final state (committed)

```ts
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

  const tailDates = scheduled_dates.slice(fromIndex);

  const tailOccurrences = tailDates.map((_, idx) => {
    const sequence = fromIndex + idx + 1;
    const occurrence = lesson_occurrences.find((occ) => occ.sequence === sequence);
    if (!occurrence) {
      throw new Error(`No occurrence found for sequence ${sequence}`);
    }
    return occurrence;
  });

  const isPending = (occurrence: ILessonOccurrence) =>
    occurrence.lessons.some((lesson) => lesson.status === 'pending');

  const pendingCount = tailOccurrences.filter(isPending).length;

  const { year, month, day } = anchorDate.plus({ days: 1 });
  const startDate = new Date(year, month - 1, day);
  const newTailDates = generateScheduledDates(
    startDate,
    weekdays,
    week_interval,
    (suspension_periods ?? []).map((p) => ({ start: p.start, end: p.end })),
    pendingCount,
    end_date
  );

  if (newTailDates.length < pendingCount) {
    throw new Error(
      `Not enough scheduled days — ${newTailDates.length} days available for ${pendingCount} lessons`
    );
  }

  let cursor = 0;
  const newTail = tailDates.map((oldDate, i) =>
    isPending(tailOccurrences[i]) ? newTailDates[cursor++] : oldDate
  );

  return [...scheduled_dates.slice(0, fromIndex), ...newTail];
}
```

### Why the input type is `Pick<IEnrollment, ...>`, not hand-written

Every field (`scheduled_dates`, `lesson_occurrences`, `weekdays`, `week_interval`,
`suspension_periods`, `end_date`) has the *exact same type* on `IEnrollment` —
no string/Date conversion needed, unlike `computeSchedule`'s hand-written
`ComputeScheduleInput` (which takes raw GraphQL input strings before they're
parsed into `Date`s). Since it's a pure subset with zero transformation,
deriving via `Pick` is strictly better than duplicating the field list by
hand — it can't silently drift out of sync if the model changes; it breaks
loudly at the `Pick` line instead.

This also structurally satisfies both real callers without either needing to
cast anything: `processOverdueLessons` hands it a `.lean()` plain object,
`updateOccurrenceStatus` (once wired in, step 5) hands it a real Mongoose
document. Neither is `IEnrollment` itself (which `extends Document` and
requires every field) — that's exactly why the narrow type exists.

### The five-step algorithm

1. Slice `scheduled_dates` from `fromIndex` → `tailDates`.
2. Look up each tail position's occurrence by `sequence === fromIndex + idx + 1`
   (**not just `idx + 1`** — easy off-by-`fromIndex` bug, since `idx` is
   local to the tail slice, not the full array) → `tailOccurrences`, aligned
   1:1 with `tailDates`.
3. Check each occurrence for any lesson with `status === 'pending'` — status
   lives on `lesson_occurrences[].lessons[].status`, **not** on the
   occurrence itself (an occurrence is just `{ sequence, lessons[] }`; the
   `lesson_rate >= 1` chunking case is exactly why lessons are a nested
   array). Count how many tail occurrences are still pending → `pendingCount`.
4. Call `generateScheduledDates(startDate, weekdays, week_interval, suspensions, pendingCount, end_date)`,
   where `startDate` = the day after `anchorDate`, built via
   `new Date(year, month - 1, day)` from `anchorDate.plus({days:1})`'s
   destructured components — **not** `.toJSDate()` (preserves the current
   time-of-day, which can roll into the wrong day once
   `generateScheduledDates`'s internal `setHours(0,0,0,0)` zeroes it in the
   *server's* local timezone — a real bug caught during implementation, same
   class as the `DayCell.tsx` UTC bug) and **not** a `.toISODate()` string
   round-trip either (works, but only because the server happens to run in
   UTC — the component-based version is correct regardless of the server's
   timezone, since `generateScheduledDates` only ever uses local-zone
   `Date` methods internally, never `.toISOString()`/UTC ones). This
   function has zero awareness of the tail's old dates or which positions
   are resolved — it just returns up to `pendingCount` fresh dates
   following the pattern (see the shortfall guard below for "up to").
5. Reassemble: walk `tailDates` again position by position; pending →
   consume the next generated date (cursor-based); resolved → keep the old
   date untouched. Final result = unchanged head + reassembled tail.

### Accepted limitation: no chronological reconciliation

`generateScheduledDates` (step 4) has no knowledge of any already-resolved
occurrence's date, and the reassembly (step 5) never compares date *values*
across positions — only *counts* have to line up, and they always do by
construction. So a resolved occurrence's preserved date has **no guaranteed
chronological relationship** to its freshly-regenerated neighbors — it could
be earlier or later than them, in either direction, with no correction.

Concrete example: enrollment on Mon/Wed/Fri, today Aug 10. Lesson 9 (near
the end of a 10-lesson tail) was originally slotted for Sept 4, but the kid
did it early as bonus work — `completed_date` = Aug 10 (correctly ≤ today),
but its `scheduled_dates` slot is untouched, still Sept 4. Later, Lesson 1
gets backdate-corrected, triggering `rescheduleTailFrom` on lessons 2–10.
The 9 freshly generated dates for the pending ones run roughly Aug 12–31.
Lesson 10 (sequence-wise *after* Lesson 9) ends up around Aug 31 — *before*
Lesson 9's preserved Sept 4 date, despite coming later in sequence.

This is accepted, not a bug to fix in this pass. The function's actual job
is narrower than "produce a perfectly chronologically-sorted schedule around
arbitrary out-of-order completions" — it's "never silently overwrite an
already-resolved occurrence's date" (Gap B) plus "give pending ones fresh
dates." Fully solving the chronological-reconciliation problem would be a
much bigger feature than warranted for a rare situation in a 2-person
household's use of this app.

### Two open questions — both resolved

**Shortfall guard: added.** `generateScheduledDates` can silently return
*fewer* dates than requested if it hits `end_date` or its `MAX_ITERATIONS`
cap. Traced through what the *unguarded* code would have done: `isPending`
positions pull from `newTailDates[cursor++]`, which returns `undefined` on
an out-of-bounds read rather than throwing — so a shortfall would have
silently leaked `undefined` into the final `scheduled_dates` array for
however many pending positions ran out of generated dates. Considered (and
rejected) generating "as many as fit" instead of throwing — walked through
concretely why that doesn't actually help: whatever's left over from the
shortfall still has nowhere valid to go (`undefined`, a stale/misleading
date, or pushing past `end_date`, which defeats the point of `end_date`
existing at all). It's a genuine, irreconcilable scheduling conflict — more
lessons than remaining valid days — that only a person can actually resolve
(extend `end_date`, drop lessons, accept the course runs long), so failing
loudly is correct, not just "the easy option." Matches the exact message
convention `createEnrollment`/`updateEnrollment`/`previewEnrollmentSchedule`
already use for this same class of error (confirmed via `grep`, all three
say `` `Not enough scheduled days — ${X} days available for ${Y} lessons}` ``
verbatim) — this app has already independently converged on "throw" for
this problem three times before; `rescheduleTailFrom` is a fourth. The
check belongs in `rescheduleTailFrom` itself, not inside
`generateScheduledDates` — matches how the three existing callers already
do it (check-after-call, not baked into the shared generator), and doesn't
risk changing behavior for other existing callers of `generateScheduledDates`.
Bonus: once step 3 refactors `processOverdueLessons` to call
`rescheduleTailFrom` instead of its own inline splice, it inherits this
guard for free — closing a pre-existing gap in that function without
needing to touch it directly for this reason.

**Missing-occurrence lookup: throws.** A `.find()` miss for an expected
`sequence` (different from the length-mismatch case above — this is a gap
or duplicate in sequence numbers that could exist even when the overall
counts happen to match) now throws immediately inside the `tailOccurrences`
lookup, rather than silently falling through as "not pending." Chosen for
consistency with the length-mismatch guard — same category of "the data
isn't in the shape this function assumes." Side benefit: once
`tailOccurrences` can never contain `undefined`, `isPending` no longer needs
an optional parameter or the `!!occurrence &&` guard — failing fast at the
boundary simplified everything downstream.
