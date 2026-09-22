# Suspension Periods Redesign

Design doc for moving suspension periods off `Enrollment` into their own
shared entity — wife's request, relayed 2026-09-19. Kept in its own file per
the established convention (see `docs/reschedule-remaining-on-backdate.md`,
`docs/custom-calendar-events.md`) since the detail here goes past what
belongs in the living backlog. This is a design doc only — no code has been
written yet; see `docs/TASKS.md` for current status.

## The ask, in plain English

Suspension periods ("pause lesson generation during a date range") currently
live only as `Enrollment.suspension_periods`, an array embedded on each
individual enrollment. The pain point: when a student has several
enrollments active at once, pausing all of them for the same break (e.g.
Christmas) means opening every single enrollment and re-entering the same
date range each time. She wants to set a suspension period once and have it
apply broadly — across multiple students, or a single student's multiple
courses — not be forced to repeat herself per enrollment.

## Design decisions locked (confirmed 2026-09-19)

- **Becomes its own top-level entity, not an `Enrollment` field.** New
  model/collection `SuspensionPeriod`, following the exact precedent already
  set for `CalendarEvent` (`docs/custom-calendar-events.md`) — a new
  Resources-style management page, its own model/typedefs/resolver, rather
  than a field on an existing type.
- **Scope: any combination of students, and optionally specific
  enrollments.** A period carries two independent filters:
  - `students: [Student]` — which students it applies to. **Empty = all
    students.**
  - `enrollments: [Enrollment]` — optionally narrows further to specific
    enrollments. **Empty = all enrollments** (within whatever the student
    filter allows).

  A period applies to a given enrollment (belonging to student `S`) when:
  ```
  (period.students is empty OR S in period.students)
  AND
  (period.enrollments is empty OR that enrollment in period.enrollments)
  ```
  One shape covers every case asked for: a global school-wide break (both
  empty), a break for one or several students across all their courses
  (`students` set, `enrollments` empty), a break for one specific course
  regardless of scoping by student (`enrollments` set), or an arbitrary set
  of enrollments spanning multiple students. Chosen over separate
  "global"/"per-student"/"per-enrollment" types because it's the smallest
  model that satisfies all of them at once, and mirrors how `CalendarEvent`
  already uses a nullable/empty scope field for the same global-vs-scoped
  distinction.
- **Per-enrollment scoping stays available, just optional.** Confirmed
  2026-09-19 — the old per-enrollment-only behavior remains expressible
  (pick one student, one enrollment), it's just no longer the *only* option.
- **Existing per-enrollment periods migrate 1:1, not auto-consolidated.**
  Each enrollment's existing `suspension_periods` entries become their own
  `SuspensionPeriod` docs scoped to just that one enrollment
  (`students: []`, `enrollments: [thatEnrollmentId]`). No attempt to detect
  "these three enrollments all got the same date range, merge them" — safest
  default, preserves exact current behavior; she can consolidate manually
  afterward through the new page if she wants to.
- **Editing/creating/deleting a suspension period regenerates every
  enrollment it (now or previously) matches.** Unlike `CalendarEvent`
  (purely visual, never touches scheduling), a `SuspensionPeriod` change has
  to propagate to `Enrollment.scheduled_dates` for every affected
  enrollment — potentially several at once, which is the entire point of
  this redesign.
- **Regeneration strategy: full regenerate from `start_date`, same as
  `updateEnrollment`'s existing schedule-changed branch — not
  `rescheduleTailFrom`'s completion-protecting tail-splice.** Deliberately
  reuses the existing (already-imperfect) approach rather than introducing a
  second, differently-behaved regeneration path. This means the
  already-documented gap in `CLAUDE.md`/`docs/reschedule-remaining-on-backdate.md`
  — a completed lesson's scheduled slot isn't fully protected from being
  reassigned — is inherited here too, not fixed and not worsened. Out of
  scope for this change.
- **No Preview step.** Same reasoning as `custom-calendar-events.md`'s v1
  decision: the dates saved are exactly what's typed into the form, nothing
  generated to double-check. The effect (schedules shifting) is visible
  immediately after saving, on the Calendar/Enrollments pages.
- **Create/edit entry point: a new Resources-style page
  (`/resources/suspension-periods`).** Reuses the same two-panel CRUD
  pattern (`ResourceTwoPanelLayout` + `ResourceEntityList`) already built for
  `/resources/students` and `/resources/calendar-events` — same
  add/select/save/delete flow, same styling.
- **Form UX: one date-driven enrollment picker, no student picker at all
  (locked 2026-09-19, superseding an earlier progressive-disclosure
  design).** Enter start date + end date first. The form then queries every
  *active* enrollment that actually has a scheduled lesson date landing
  inside that range, and lists them **pre-checked** — each row labelled
  `"{studentName} — {courseTitle}"`. Uncheck a row to exclude that
  enrollment from the suspension.
  - **Save mapping, chosen to match the existing empty-means-all model
    exactly:** if nothing was unchecked, save `enrollments: []` (the "all"
    case) rather than the literal list of IDs shown. If one or more rows
    were unchecked, save the remaining checked IDs as an explicit list.
    This isn't just cosmetic — leaving `enrollments: []` means the period
    stays correct if a *new* enrollment is added later that also happens to
    fall in that window (e.g. a course added in November still gets paused
    by a suspension already entered for December break), matching the
    intuitive "this is winter break" meaning. An explicit narrowed list is
    only stored when the user deliberately excluded something.
  - **No separate student picker, now or later.** Each row already shows
    the student's name, so checking/unchecking individual rows covers
    "pause one student's stuff" and "pause everyone's stuff" the same way a
    dedicated student step would have, without a second control. The
    `students` field stays in the data model unused (zero cost, see Data
    model above) rather than getting its own UI — reconsider only if a
    concrete need shows up that this can't express (e.g. "auto-include any
    future enrollment for student X during this window, but not other
    students' future enrollments" — a narrow case, not needed today with
    one student).
  - **"Affected" = has an actual lesson date in range, not just
    active-and-overlapping.** Chosen over the broader "enrollment's own
    start/end_date overlaps the suspension window" check because it only
    ever pre-checks enrollments that would genuinely lose a lesson — a
    course whose weekdays don't happen to land a lesson in that window
    simply doesn't show up, rather than showing up pre-checked with nothing
    for the suspension to actually do.

  This is a form-level UX choice only — it does not change the data model
  or scoping semantics above (still two independent empty-means-all filters
  underneath; this form just never exposes the `students` one).
- **Explicitly decoupled from the bigger "student-first everywhere" nav
  idea (backlog #7, `docs/TASKS.md`).** There's a separate, much larger
  appetite to restructure the whole app so a student is always selected
  before Calendar/Enrollments/etc. are usable at all. That's a real
  direction worth pursuing on its own, but this feature doesn't need to
  wait for it — the progressive-disclosure picker above is scoped
  entirely to this one form, not a prerequisite for or blocker on that
  larger refactor.

## Data model

New file `src/models/SuspensionPeriod.ts`, following the pattern of
`src/models/CalendarEvent.ts`:

```ts
import { Schema, model, Document, Types, type Model } from 'mongoose';
import mongoose from 'mongoose';

export interface ISuspensionPeriod extends Document {
  label?: string;
  start: Date;
  end: Date;
  students: Types.ObjectId[];    // ref Student; [] = all students
  enrollments: Types.ObjectId[]; // ref Enrollment; [] = all enrollments (within student scope)
}

const SuspensionPeriodSchema = new Schema<ISuspensionPeriod>({
  label: { type: String },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  students: { type: [{ type: Schema.Types.ObjectId, ref: 'Student' }], default: [] },
  enrollments: { type: [{ type: Schema.Types.ObjectId, ref: 'Enrollment' }], default: [] },
});

const SuspensionPeriodModel =
  (mongoose.models.SuspensionPeriod as Model<ISuspensionPeriod> | undefined) ??
  model<ISuspensionPeriod>('SuspensionPeriod', SuspensionPeriodSchema);

export default SuspensionPeriodModel;
```

`start`/`end` stay `Date` (not the `"YYYY-MM-DD"` string convention
`CalendarEvent` uses) — they feed straight into the existing
`generateScheduledDates`, which already works in `Date`, matching the
field's old type on `Enrollment`.

**Remove `suspension_periods` from `src/models/Enrollment.ts`** (interface
`IEnrollment` + schema) — fully replaced by the new collection.

## GraphQL schema

New files, mirroring `calendarEvent.typedefs.ts` /
`query.calendarEvent.typedefs.ts` / `mutation.calendarEvent.typedefs.ts`:

**`suspensionPeriod.typedefs.ts`**:
```graphql
type SuspensionPeriod {
  _id: ID!
  label: String
  start: String!
  end: String!
  students: [ID!]!
  enrollments: [ID!]!
}

input SuspensionPeriodCreateInput {
  label: String
  start: String!
  end: String!
  studentIds: [ID!]
  enrollmentIds: [ID!]
}

input SuspensionPeriodUpdateInput {
  label: String
  start: String
  end: String
  studentIds: [ID!]
  enrollmentIds: [ID!]
}
```

**`query.suspensionPeriod.typedefs.ts`**:
```graphql
extend type Query {
  suspensionPeriods: [SuspensionPeriod!]!
}
```

**`mutation.suspensionPeriod.typedefs.ts`**:
```graphql
extend type Mutation {
  createSuspensionPeriod(input: SuspensionPeriodCreateInput!): SuspensionPeriod!
  updateSuspensionPeriod(id: ID!, input: SuspensionPeriodUpdateInput!): SuspensionPeriod!
  deleteSuspensionPeriod(id: ID!): Boolean!
}
```

Register all three in `src/app/api/graphql/schema/typedefs/index.ts`, next
to the calendarEvent ones.

**Remove** the old `SuspensionPeriod` type + `suspension_periods` field from
`enrollment.typedefs.ts`, and `SuspensionPeriodInput` +
`suspension_periods` from `EnrollmentCreateInput`/`EnrollmentUpdateInput` in
`inputs.typedefs.ts`.

**Extend `enrollments(studentId: ID!)` → `enrollments(studentId: ID, start: String, end: String)`**
in `query.enrollment.typedefs.ts` — same "loosen + add optional filters"
move already made for `calendarEvents(studentId, month)`. `studentId`
omitted → no student filter (unchanged behavior otherwise). `start`/`end`
given → adds `status: 'active'` and `scheduled_dates: { $elemMatch: { $gte:
start, $lte: end } }`, i.e. only active enrollments with a lesson date
landing in that range — this is exactly the query the new suspension-period
form's enrollment picker needs, so no separate query/typedef is required
for it.

**Add optional `enrollmentId: ID` to `previewEnrollmentSchedule`** so
previewing an *existing* enrollment's schedule can pick up
enrollment-scoped suspensions too. A brand-new enrollment still can't (no id
yet) — same chicken/egg as today's creation-time behavior.

## Shared lookup helper

New file `src/app/api/graphql/lib/suspensionPeriodUtils.ts` — DB-touching,
so kept separate from the pure `src/app/api/graphql/lib/enrollmentUtils.ts`
(preserves that file's "pure functions only" testability and its ~15
existing unit tests untouched, no signature changes needed there):

```ts
export async function getApplicableSuspensionPeriods(
  studentId: string,
  enrollmentId?: string
): Promise<Array<{ start: Date; end: Date }>>
```
Query: `students` empty-or-contains `studentId` AND (`enrollmentId` given ?
`enrollments` empty-or-contains it : `enrollments` empty). The
no-`enrollmentId` branch is what `createEnrollment`/`previewEnrollmentSchedule`
(new enrollment, no id yet) use — only global/student-scoped periods can
apply pre-creation.

Also add `regenerateEnrollmentSchedule(enrollment)` in the same file:
fetches applicable periods for that enrollment, calls the existing
`generateScheduledDates` (unchanged signature) from its `start_date` over
its full `lesson_occurrences.length`, and returns the new dates (throws the
same "not enough scheduled days" error `updateEnrollment` already throws
today).

## Resolver wiring — every call site that used to read `enrollment.suspension_periods`

1. **`previewEnrollmentSchedule`** (`enrollmentResolvers.ts`) — replace
   `input.suspension_periods` with
   `getApplicableSuspensionPeriods(input.studentId, enrollmentId)`.
2. **`createEnrollment`** — replace the `input.suspension_periods` mapping
   with `getApplicableSuspensionPeriods(input.studentId)` (no enrollment id
   yet); drop `suspension_periods` from the `Enrollment.create({...})` call.
3. **`updateEnrollment`**'s `scheduleChanged` branch — drop
   `input.suspension_periods !== undefined` from the `scheduleChanged`
   condition (field no longer exists on the input); replace the
   `effectiveSuspensions` fallback (`existing.suspension_periods`) with
   `getApplicableSuspensionPeriods(existing.student.toString(), existing._id.toString())`.
4. **`processOverdueLessons`** (`calendarResolvers.ts`) — before calling
   `rescheduleTailFrom`, fetch
   `getApplicableSuspensionPeriods(studentId, String(enrollment._id))` and
   pass it in as `suspension_periods` on an explicit object literal (below)
   instead of relying on the enrollment doc's own field.
5. **`updateOccurrenceStatus`**'s backdate-reschedule branch
   (`enrollmentResolvers.ts`) — same fetch-then-pass pattern.
6. **New `suspensionPeriodResolvers.ts` mutations** — on
   create/update/delete, find every enrollment whose scope now (and, for
   update/delete, previously) matches, and call
   `regenerateEnrollmentSchedule` + `Enrollment.findByIdAndUpdate` for each.
   Small N in practice (a 2-user hobby app), so a plain loop is fine — no
   batching/queueing needed.

Important: **`rescheduleTailFrom`'s signature is not changing** — still
`Pick<IEnrollment, 'scheduled_dates' | 'lesson_occurrences' | 'weekdays' |
'week_interval' | 'suspension_periods' | 'end_date'>` — specifically to
avoid touching its existing unit tests in `enrollmentUtils.test.ts`. Callers
now build that Pick shape as an explicit object literal with a
freshly-fetched `suspension_periods` value, e.g.:
```ts
const suspensionPeriods = await getApplicableSuspensionPeriods(studentId, String(enrollment._id));
const updatedDates = rescheduleTailFrom(
  {
    scheduled_dates: enrollment.scheduled_dates,
    lesson_occurrences: enrollment.lesson_occurrences,
    weekdays: enrollment.weekdays,
    week_interval: enrollment.week_interval,
    suspension_periods: suspensionPeriods,
    end_date: enrollment.end_date,
  },
  firstOverdueIndex, nowFamilyTz, !pastCutoff
);
```

## Migration

New `scripts/migrate-suspension-periods-to-own-collection.ts`, same shape as
`scripts/migrate-flat-lessons-to-lessonTree.ts` (dotenv + raw
`db.collection('enrollments')` access, so it works regardless of whether the
Mongoose model has already dropped the field):

1. Find every enrollment doc with a non-empty `suspension_periods` array.
2. For each period in each such doc, insert one `SuspensionPeriod` doc
   scoped *only* to that one enrollment (`students: []`,
   `enrollments: [enrollmentId]`) — preserves today's exact
   per-enrollment-only behavior.
3. `$unset: { suspension_periods: '' }` on every enrollment doc.
4. Log a summary count.

Run against prod **before** deploying the code that removes the field, per
`docs/RUNNING_MIGRATIONS.md`'s existing throwaway-container runbook — though
order is low-risk either direction (old code ignores the new collection;
new code no longer reads the old field), migrate-first keeps it tidy.

## Frontend

- **`src/app/enrollments/page.tsx`** — remove all suspension-period UI: the
  "Suspension periods" section (JSX + `updateSuspension`/`addSuspension`/
  `removeSuspension` handlers), `suspension_periods` from `emptyForm()`,
  `loadEnrollmentIntoForm`, the two validation blocks, and the `input`
  object in `handleSave`. Stop passing `suspensionPeriods` to
  `PreviewCalendar`; pass `enrollmentId={isCreating ? undefined : selectedId}`
  instead.
- **`src/app/enrollments/components/PreviewCalendar.tsx`** — drop the
  `suspensionPeriods` prop, add optional `enrollmentId?: string`, forward it
  as a query variable.
- **`src/app/enrollments/api.ts`** — drop `suspension_periods {...}` from
  `GET_ENROLLMENTS`/`CREATE_ENROLLMENT`/`UPDATE_ENROLLMENT` selections and
  the `SuspensionPeriod`/`EnrollmentRow` types; add `$enrollmentId: ID` to
  `PREVIEW_ENROLLMENT_SCHEDULE`.
- **New `src/app/resources/api/suspensionPeriods.graphql.ts`** —
  `GET_ALL_SUSPENSION_PERIODS`, `CREATE_/UPDATE_/DELETE_SUSPENSION_PERIOD`,
  plus `GET_ENROLLMENTS_IN_RANGE` (`enrollments(start, end)`, returning
  `_id, student, course`) for the enrollment picker — matching
  `calendarEvents.graphql.ts`'s grouping of everything one page needs in
  one file. No separate "all enrollments" query/file needed (see GraphQL
  schema section above).
- **New `src/app/resources/suspension-periods/page.tsx`**, modeled directly
  on `src/app/resources/calendar-events/page.tsx`: same
  `ResourceTwoPanelLayout` + `ResourceEntityList` shell,
  `handleAdd`/`handleSelect`/`handleSave`/`handleDelete` pattern. Form
  fields: label (optional text), start date, end date, then the enrollment
  picker (see "Form UX" decision above):
  - Once both dates are filled and valid (`end >= start`), fire
    `GET_ENROLLMENTS_IN_RANGE`. Render each result as a **pre-checked**
    checkbox row, labelled `"{studentName} — {courseTitle}"` resolved
    client-side from `GET_STUDENTS` + `GET_COURSES_SLIM`. Track exclusions
    as a `Set` of unchecked ids, not a set of checked ones — so a newly
    fetched (e.g. dates edited) list defaults every row back to checked
    unless the user re-excludes it.
  - On save: `enrollmentIds: excluded.size === 0 ? [] : results.filter(r => !excluded.has(r._id)).map(r => r._id)`.
  - Editing an existing period: run the same query for its saved
    `start`/`end`, then pre-check everything *except* rows whose id isn't
    in the saved `enrollments` list (only meaningful when that list is
    non-empty — an empty saved list means everything stays checked, same as
    creating new).
  - List view's `trailing` text (left panel): `enrollments.length === 0 ?
    'All enrollments' : `${enrollments.length} enrollment(s)``.

  No Preview button (see decision above). No student picker anywhere on
  this page (see "Form UX" decision above).
- **`src/app/top-menu/components/NavigationMenu.tsx`** — add a "Suspension
  Periods" link to the Resources dropdown, alongside Publishers/Subjects/
  Students/Calendar Events.

## Implementation roadmap

Phased the same way `custom-calendar-events.md` was, so each phase is
independently testable:

**Phase 1 — schema:**
1. `src/models/SuspensionPeriod.ts` — new model.
2. `suspensionPeriod.typedefs.ts` / `query.suspensionPeriod.typedefs.ts` /
   `mutation.suspensionPeriod.typedefs.ts` — registered in
   `schema/typedefs/index.ts`.
3. `src/app/api/graphql/lib/suspensionPeriodUtils.ts` —
   `getApplicableSuspensionPeriods` + `regenerateEnrollmentSchedule`.
4. `src/app/api/graphql/resolvers/suspensionPeriodResolvers.ts` — CRUD +
   affected-enrollment regeneration, registered in `schema/index.ts`.
   Confirm create/list/update/delete work directly via the GraphQL endpoint
   before moving on.

**Phase 2 — cut `Enrollment` over:**
5. Remove `suspension_periods` from `Enrollment.ts` model + typedefs +
   create/update inputs.
6. Wire the 5 call sites in "Resolver wiring" above to
   `getApplicableSuspensionPeriods`/`regenerateEnrollmentSchedule`.
7. Extend `enrollments` with optional `start`/`end` args (and loosen
   `studentId` to optional); add `enrollmentId` to
   `previewEnrollmentSchedule`.

**Phase 3 — migration:**
8. `scripts/migrate-suspension-periods-to-own-collection.ts`. Dry-run
   against a dev DB copy, confirm output, then run against prod per
   `docs/RUNNING_MIGRATIONS.md` before/alongside deploying Phase 2's code.

**Phase 4 — frontend:**
9. `src/app/resources/api/suspensionPeriods.graphql.ts` (including
   `GET_ENROLLMENTS_IN_RANGE`).
10. `src/app/resources/suspension-periods/page.tsx` + nav link. → End-to-end
    testable here: create/edit/delete periods, confirm the enrollment
    picker pre-checks the right rows for a given date range and that
    unchecking/re-checking narrows correctly, and see affected enrollments'
    schedules update.
11. Clean up `src/app/enrollments/page.tsx` /
    `PreviewCalendar.tsx` / `enrollments/api.ts` (remove old per-enrollment
    UI, wire `enrollmentId` through to preview).

## Verification

- `npx vitest run` — existing `enrollmentUtils.test.ts` / `dateUtils.test.ts`
  should be untouched and still pass (no signature changes to any pure
  function they cover).
- `npx tsc --noEmit`.
- Manual, via the app: enter a date range with 2+ active enrollments having
  lessons in it, confirm the picker pre-checks exactly those (and nothing
  with no lesson in range); leave everything checked and save, confirm
  every one of those enrollments' calendars skips the range, *and* that
  adding a brand-new overlapping enrollment afterward also gets paused
  (confirms the `enrollments: []` "all" mapping); uncheck one row before
  saving and confirm that enrollment is unaffected while the rest are;
  delete a period and confirm affected schedules revert; run the migration
  script against a dev DB copy first and confirm existing per-enrollment
  suspensions survive unchanged as new single-enrollment-scoped periods.

## Open follow-ups, not designed yet

- Whether `/resources/calendar-events`' documented "orthogonal to
  `Enrollment.suspension_periods`" note (in `docs/custom-calendar-events.md`)
  needs a pointer-update once this ships, since the field it references will
  no longer exist on `Enrollment`.
- No attempt made here to fix the completed-lesson scheduled-slot invariant
  gap (`docs/reschedule-remaining-on-backdate.md`) — this redesign inherits
  it unchanged via `regenerateEnrollmentSchedule`.
