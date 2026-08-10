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

1. **`enrollmentUtils.ts` — `rescheduleTailFrom(enrollment, fromIndex, anchorDate)`.** 🔧 *In progress — see below.*
2. **`enrollmentUtils.ts` — `canRescheduleRemaining(enrollment, occurrenceSequence, lessonId)`.** Not started.
3. **`calendarResolvers.ts`** — refactor `processOverdueLessons` to call `rescheduleTailFrom`; `calendarMonthView` computes `canRescheduleRemaining` per row. Not started.
4. **Schema** — `rescheduleRemaining: Boolean` on `UpdateOccurrenceStatusInput` (default `true`), `can_reschedule_remaining: Boolean!` on `MonthViewLesson`. Not started.
5. **`enrollmentResolvers.ts` (`updateOccurrenceStatus`)** — resolve occurrence, detect backdate, re-derive eligibility, call `rescheduleTailFrom` or just save. Not started.
6. **`DayCell.tsx`** — date input + checkbox in the popover. Not started.

## Step 1 deep-dive: `rescheduleTailFrom`

### Current WIP state (uncommitted, on `feat/reschedule-remaining-on-backdate`)

```ts
type RescheduleEnrollmentInput = Pick<
  IEnrollment,
  'scheduled_dates' | 'lesson_occurrences' | 'weekdays' | 'week_interval' | 'suspension_periods' | 'end_date'
>;

export function rescheduleTailFrom(enrollment: RescheduleEnrollmentInput, fromIndex: number, anchorDate: DateTime) {
  const { scheduled_dates, lesson_occurrences, weekdays, week_interval, suspension_periods, end_date } = enrollment;

  const tailDates = scheduled_dates.slice(fromIndex);

  const tailOccurrences = tailDates.map((_, idx) =>
    lesson_occurrences.find((occurrence) => occurrence.sequence === fromIndex + idx + 1)
  );

  // ⬅ stopped here — still need: isPending, pendingCount, generateScheduledDates
  // call, cursor-based reassembly, and the return statement.
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
   where `startDate` = the day after `anchorDate` (`anchorDate.plus({days:1}).toISODate()`).
   This function has zero awareness of the tail's old dates or which
   positions are resolved — it just returns `pendingCount` fresh dates
   following the pattern.
5. Reassemble: walk `tailDates` again position by position; pending →
   consume the next generated date (cursor-based); resolved → keep the old
   date untouched. Final result = unchanged head + reassembled tail.

Steps 4 and 5 aren't in the code yet (see WIP snippet above).

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

### Open question, not yet decided

`generateScheduledDates` can silently return *fewer* dates than requested if
it hits `end_date` or its `MAX_ITERATIONS` cap. `createEnrollment`/`updateEnrollment`
both guard against this (`if (scheduledDates.length < ...) throw`); the
current `processOverdueLessons` splice doesn't, and this function doesn't
yet either. Worth adding:

```ts
if (newDates.length < pendingCount) {
  throw new Error(
    `Not enough remaining days to reschedule ${pendingCount} lesson(s) before end_date`
  );
}
```

Undecided whether to add this now (this function is new code, so it's a
clean opportunity to close a pre-existing gap in the same class of logic) or
leave it matching the existing silent behavior for consistency with
`processOverdueLessons` until that call site is refactored in step 3 anyway.
