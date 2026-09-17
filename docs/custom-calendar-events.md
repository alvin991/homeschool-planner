# Custom Calendar Events

Full design + implementation roadmap for backlog #1 in `TASKS.md` ("Custom
calendar events") — wife's request, relayed 2026-09-06. Kept in its own file
per the established convention (see `docs/reschedule-remaining-on-backdate.md`)
since the detail here goes past what belongs in the living backlog.

## The ask, in plain English

Wife wants to add something to the calendar that isn't a lesson: pick a
single date or a range of dates, give it a name, and see it show up. Named
examples: a stat holiday (affects everyone), "Annabelle ballet class"
(affects one kid). Design partner mode — this doc is the locked spec; the
project owner implements it himself, reviewed as he goes.

## Design decisions locked (confirmed 2026-09-06)

- **Purely visual — no interaction with lesson scheduling.** An event never
  suppresses, pauses, or reschedules a lesson. This is deliberately
  orthogonal to `Enrollment.suspension_periods`, which already exists for
  "pause this enrollment's lesson generation during a date range" and is set
  per-enrollment when creating/editing it. If a stat holiday should also
  pause a specific course, that's still a manual, separate step on that
  enrollment — not something this feature auto-derives. Keeping these two
  mechanisms unlinked avoids exactly the kind of implicit coupling
  `TASKS.md` #14 (UTC round-tripping) warns about elsewhere in this app.
- **Scope: both global and per-student**, via a nullable `student` reference
  on the event — `null` means "shows on every student's calendar" (stat
  holidays), a set value means "shows only for that student" (ballet class).
  Chosen over two separate collections or a scope enum because it's the
  smallest model that satisfies both named examples, and mirrors how the
  app already separates student-scoped concepts from global ones (see the
  nav-redesign discussion in `TASKS.md` #6).
- **Dates stored as plain `"YYYY-MM-DD"` strings, not `Date`.** This is a
  brand-new model with no legacy data, so there's zero cost to sidestepping
  the UTC-round-trip trap documented in `TASKS.md` #14 — every existing
  calendar-day field (`Enrollment.start_date`/`end_date`/`scheduled_dates`)
  uses `Date` and depends on every reader consistently choosing UTC; this
  model just never has that problem in the first place.
- **Single day is `start_date === end_date`, not a nullable `end_date`.**
  Avoids branching on "is this a range or a single day" anywhere in the
  resolver, rendering, or overlap-query logic — a single-day event is just
  the range's degenerate case.
- **A day can have multiple events; they stack in the banner area above
  lessons.** No uniqueness constraint — `calendarEvents` returns every event
  overlapping the date, and all of them render as pills in the banner group.
  **Overflow: reuse the existing scroll behavior, unchanged.** The "N
  lessons" badge keeps counting lessons only, not events — confirmed
  2026-09-06 rather than adding separate event-overflow handling. If a cell
  gets crowded (events + lessons together taller than the cell), the
  existing `scrollRef` scrollable area in `DayCell.tsx` already handles it
  with zero new logic.
- **Fetched via its own `calendarEvents(studentId, month)` query**, not
  folded into `calendarMonthView`/`calendarDayView`. Those two resolvers
  already run `processOverdueLessons` as a side effect on every call
  (see `calendarResolvers.ts`); keeping events on an independent query means
  fetching/creating/editing an event never touches that reschedule sweep,
  and the frontend already fetches per-view data in parallel queries today.
- **v1 rendering: repeat the same pill on every day in the range.** No
  spanning-bar layout across grid cells. `CalendarGrid.tsx` renders each
  `DayCell` independently with no shared row layout today — building a
  true spanning bar is a real layout project on its own. Repeating the pill
  ships correctly with zero grid changes; a spanning bar is a pure visual
  upgrade that can be layered on later without touching the data model or
  API at all.
- **Create/edit entry point: a new Resources-style page (`/resources/events`),
  not click-to-add on the calendar.** Supersedes the earlier click-to-add
  decision (updated 2026-09-06) — the live calendar (`DayCell`/`CalendarGrid`)
  now only ever *displays* events; no click handlers, no inline popover form
  there. `/resources/events` reuses the exact two-panel CRUD pattern already
  built for `/resources/students` (`ResourceTwoPanelLayout` +
  `ResourceEntityList` for the list, a form in the detail pane) — same
  component reuse, same add/select/save/delete flow, same styling. Chosen
  over calendar-inline entry because it's a separated UI consistent with how
  every other admin/global concept in this app (students, subjects,
  publishers) is managed, and it makes bulk entry (e.g. typing in a whole
  school year's worth of stat holidays in one sitting) far less painful than
  clicking through individual day cells across multiple months.
- **Before saving, a Preview step reuses the calendar itself — same pattern
  as the enrollment flow's `PreviewCalendar.tsx`.** A modal with
  `MonthTopBar` + `CalendarGrid` (Cancel/Save footer), just like previewing
  an enrollment's generated schedule before committing. Genuinely simpler
  than the enrollment case, though: enrollments need a dedicated
  `previewEnrollmentSchedule` query because their schedule is *generated*
  server-side from weekday/interval rules; an event's dates are exactly what
  was typed into the form, nothing to compute. So the preview modal just
  fetches the real `calendarMonthView` + `calendarEvents` for the form's
  selected student and month (the same data the live calendar would show)
  and merges the in-progress draft event into the `events` array
  client-side before handing both to the existing `CalendarGrid` — no new
  query, only a small new component.

## Data model

New file `src/models/CalendarEvent.ts`, following the exact pattern of
`src/models/Student.ts`:

```ts
import { Schema, model, Document, Types, type Model } from 'mongoose';
import mongoose from 'mongoose';

export interface ICalendarEvent extends Document {
  title: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD", === start_date for a single day
  student?: Types.ObjectId | null; // null = global/family-wide
}

const CalendarEventSchema = new Schema<ICalendarEvent>({
  title: { type: String, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  student: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
});

const CalendarEventModel =
  (mongoose.models.CalendarEvent as Model<ICalendarEvent> | undefined) ??
  model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);

export default CalendarEventModel;
```

## GraphQL schema

Three new typedef files, matching the existing per-domain split in
`src/app/api/graphql/schema/typedefs/`:

**`calendarEvent.typedefs.ts`** (base type + inputs, alongside `calendarTypeDefs`):
```graphql
type CalendarEvent {
  _id: ID!
  title: String!
  start_date: String!
  end_date: String!
  student: ID
}

input CalendarEventCreateInput {
  title: String!
  start_date: String!
  end_date: String!
  studentId: ID
}

input CalendarEventUpdateInput {
  title: String
  start_date: String
  end_date: String
  studentId: ID
}
```

**`query.calendarEvent.typedefs.ts`**:
```graphql
extend type Query {
  calendarEvents(studentId: ID, month: String): [CalendarEvent!]!
}
```
Both args optional — updated 2026-09-06. The live calendar (`MonthView`/
`DayView`) always passes both, same as before. But the new
`/resources/events` management page (below) needs a different query shape:
"list every event, regardless of student or month" — there's no "current
month in view" on a list/form page. Rather than add a second query field,
one flexible field serves both callers: omit an arg to drop that filter.

**`mutation.calendarEvent.typedefs.ts`**:
```graphql
extend type Mutation {
  createCalendarEvent(input: CalendarEventCreateInput!): CalendarEvent!
  updateCalendarEvent(id: ID!, input: CalendarEventUpdateInput!): CalendarEvent!
  deleteCalendarEvent(id: ID!): Boolean!
}
```

Register all three in `src/app/api/graphql/schema/typedefs/index.ts`: add the
three imports, then splice `calendarEventTypeDefs` into the "types" group
(after `calendarTypeDefs`), `queryCalendarEventTypeDefs` into the "extend
Query" group (after `queryCalendarTypeDefs`), and
`mutationCalendarEventTypeDefs` into the "extend Mutation" group (after
`mutationEnrollmentTypeDefs`) — the file's own comment ("types before roots;
extend after base type Query/Mutation") tells you exactly where each goes.

## Shared helper: `monthToDateRange` (do this before the resolver)

The `"2026-09"` → `{ startDate: "2026-09-01", endDate: "2026-09-30" }`
conversion is about to exist a **third time** — it's already inline in
`calendarMonthView` (`calendarResolvers.ts`), and the new `calendarEvents`
resolver needs the exact same logic. Extract it once, to
`src/utils/dateUtils.ts` (already home to the similar `shiftMonth` month-
string helper — same file, same "month string utilities" grouping):

```ts
export function monthToDateRange(month: string): { startDate: string; endDate: string } {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}
```

Two follow-on changes, both small:
- **Refactor `calendarMonthView`** (`calendarResolvers.ts`) to call this
  instead of its own inline copy — pure duplication removal, no behavior
  change. Touches existing code, but safely: same output, same call site.
- **Add unit tests** — `src/utils/dateUtils.ts` has no test file yet (this
  is its first pure, easily-testable function); add
  `src/utils/dateUtils.test.ts` with a handful of cases: a normal month, a
  31-day month, February (28 vs. 29 in a leap year), and December→next-year
  rollover doesn't apply here since it only touches one month, so just
  confirm `lastDay` computation across month lengths. Matches the project's
  existing testing convention (pure functions only, e.g.
  `enrollmentUtils.test.ts`) — no DB/React mocking needed.

## Resolver

New file `src/app/api/graphql/resolvers/calendarEventResolvers.ts`, CRUD
pattern copied from `studentResolvers.ts`, plus the flexible list query:

```ts
import CalendarEventModel from '@/models/CalendarEvent';
import { monthToDateRange } from '@/utils/dateUtils';

export const calendarEventResolvers = {
  Query: {
    calendarEvents: async (
      _: unknown,
      { studentId, month }: { studentId?: string; month?: string }
    ) => {
      const filter: Record<string, unknown> = {};

      if (month) {
        const { startDate, endDate } = monthToDateRange(month);
        filter.start_date = { $lte: endDate };
        filter.end_date = { $gte: startDate };
      }

      if (studentId) {
        filter.$or = [{ student: null }, { student: studentId }];
      }

      return await CalendarEventModel.find(filter).lean();
    },
  },
  Mutation: {
    createCalendarEvent: async (
      _: unknown,
      { input }: { input: { title: string; start_date: string; end_date: string; studentId?: string } }
    ) => {
      const { studentId, ...rest } = input;
      const created = await CalendarEventModel.create({ ...rest, student: studentId ?? null });
      return created.toObject();
    },
    updateCalendarEvent: async (
      _: unknown,
      { id, input }: { id: string; input: { title?: string; start_date?: string; end_date?: string; studentId?: string | null } }
    ) => {
      const { studentId, ...rest } = input;
      const update = studentId !== undefined ? { ...rest, student: studentId } : rest;
      const updated = await CalendarEventModel.findByIdAndUpdate(id, { $set: update }, {
        returnDocument: 'after',
        runValidators: true,
      });
      if (!updated) throw new Error('CalendarEvent not found');
      return updated.toObject();
    },
    deleteCalendarEvent: async (_: unknown, { id }: { id: string }) => {
      const deleted = await CalendarEventModel.findByIdAndDelete(id);
      if (!deleted) throw new Error('CalendarEvent not found');
      return true;
    },
  },
};
```

Note the overlap query for `calendarEvents`: `start_date <= endDate AND
end_date >= startDate` is the standard range-overlap test, same shape as the
existing enrollment-overlap filter in `calendarResolvers.ts`'s
`calendarMonthView` (`start_date: { $lte: endDate }` /
`end_date: { $gte: startDate }`) — reuse that exact pattern rather than
reinventing it.

Three call shapes, one field: `calendarEvents(studentId, month)` (live
calendar — both filters apply), `calendarEvents(studentId)` (unused for now,
but harmless — every event visible to that student, any date), and
`calendarEvents()` (the `/resources/events` list — everything, no filter).

Register in `src/app/api/graphql/schema/index.ts`: import
`calendarEventResolvers` and add it to the `mergeGraphQLResolvers(...)` call
alongside `calendarResolvers`.

## Frontend

**Live-calendar query** — add to `src/app/calendar/api.ts` (already holds
the other calendar queries), always called with both args:
```ts
export const GET_CALENDAR_EVENTS = gql`
  query GetCalendarEvents($studentId: ID!, $month: String!) {
    calendarEvents(studentId: $studentId, month: $month) {
      _id
      title
      start_date
      end_date
      student
    }
  }
`;
```
Add a matching `CalendarEvent` type to `src/app/calendar/types.ts`, same
shape as the existing `MonthViewLesson`/`GetCalendarMonthViewData` pair.

**Resources-page queries/mutations** — new file
`src/app/resources/api/calendarEvents.graphql.ts`, matching the grouping
convention of `students.graphql.ts` (one file per resource, list + all
CRUD mutations together):
```ts
export const GET_ALL_CALENDAR_EVENTS = gql`
  query GetAllCalendarEvents {
    calendarEvents {
      _id
      title
      start_date
      end_date
      student
    }
  }
`;

export const CREATE_CALENDAR_EVENT = gql`
  mutation CreateCalendarEvent($input: CalendarEventCreateInput!) {
    createCalendarEvent(input: $input) { _id }
  }
`;

export const UPDATE_CALENDAR_EVENT = gql`
  mutation UpdateCalendarEvent($id: ID!, $input: CalendarEventUpdateInput!) {
    updateCalendarEvent(id: $id, input: $input) { _id }
  }
`;

export const DELETE_CALENDAR_EVENT = gql`
  mutation DeleteCalendarEvent($id: ID!) {
    deleteCalendarEvent(id: $id)
  }
`;
```
`GET_ALL_CALENDAR_EVENTS` calls `calendarEvents` with no arguments — this is
what the loosened resolver signature above exists for: the management list
has no "current month/student in view" to scope by, it needs everything.

For the scope picker in the create/edit form, reuse the existing
`GET_STUDENTS` query from `src/app/resources/api/students.graphql.ts` rather
than adding a new one — it already returns `{ _id, name }` for every
student, which is exactly the dropdown data needed (plus an "Everyone"
option mapping to `null`).

**`MonthView.tsx`** — add a second `useQuery(GET_CALENDAR_EVENTS, { variables: { studentId, month } })`
parallel to the existing month-view query, and pass the result down to
`CalendarGrid`.

**`CalendarGrid.tsx`** — accept an `events: CalendarEvent[]` prop. For each
grid cell's `date`, filter events where `date >= start_date && date <= end_date`
(this is what "repeat the pill on every day in the range" means concretely)
and pass the matches to `DayCell` as a new `events` prop, alongside the
existing `lessons` prop.

**`DayCell.tsx`** — one addition, purely display, no interaction: render each
matched event as its own pill, visually distinct from lesson pills (a
full-width banner above the lesson list, not mixed into `lessons.map(...)`)
so it doesn't pick up the lesson popover's Complete/Skip/Reopen actions — an
event has no status and isn't clickable here. All create/edit/delete
happens on `/resources/events` instead (see below).

**`DayView.tsx`** — same `GET_CALENDAR_EVENTS` query (variables adjusted to
a single date instead of a month, or reuse the month query and filter
client-side to the one date — either works since the data volume is tiny).
Render matched events as a small banner section above the lesson list,
reusing the existing card styling conventions in this file rather than
introducing a new visual language. Also display-only.

## Create/edit UI — `/resources/events`

New page, modeled directly on `src/app/resources/students/page.tsx` (read
that file first — this is a close copy, not a from-scratch design):

- **List (left panel):** `ResourceEntityList` with `title="Events"`,
  `addLabel="Add Event"`, fed by `GET_ALL_CALENDAR_EVENTS` (no
  student/month scoping — the whole list). Each row's `primary` text is the
  event title; use the optional `trailing` slot to show the scope — the
  student's name (looked up from `GET_STUDENTS`) or "Everyone" for
  `student: null`.
- **Form (right panel, detail pane):** title text input, start date input,
  end date input (both always visible — a date **range** is the common
  case, confirmed 2026-09-06, not single-day — so no toggle/expand step,
  just two plain `<input type="date">` fields matching the rest of the
  app's date-input convention), and a student `<select>` populated from the
  existing `GET_STUDENTS` query (`src/app/resources/api/students.graphql.ts`)
  with an extra leading "Everyone" option whose value maps to
  `null`/empty-string. Save/Delete/Cancel buttons and
  `isCreating`/`selectedId` state management copy `students/page.tsx`'s
  pattern exactly (`handleAdd`, `handleSelect`, `handleSave`,
  `handleDelete`, `resetForm`).
  - **Small UX nicety:** when the start-date input changes, auto-fill the
    end-date field to match it *only if the end date hasn't been manually
    edited yet* (track with one boolean, e.g. `endDateTouched`, set `true`
    the first time the end-date input's `onChange` fires). A true
    single-day event then still only takes one click/type — she just never
    touches End — while the common range case has both fields immediately
    ready to widen. Cheaper than a toggle: no conditional rendering, one
    extra boolean of state.
- **Preview button**, next to Save: opens `EventPreviewCalendar.tsx` (new,
  sibling to `enrollments/components/PreviewCalendar.tsx`), reusing the same
  modal shell (header with title + ✕, `MonthTopBar` + `CalendarGrid` body,
  Cancel/Save footer). Internally it:
  1. Runs `GET_MONTH_VIEW` and `GET_CALENDAR_EVENTS` for the form's chosen
     student and the start date's month (`useQuery`, both `client:
     apolloClient`) — the exact same queries `MonthView.tsx` already uses.
  2. Merges the in-progress form values (title/start_date/end_date/student)
     into the fetched `calendarEvents` array as one extra client-side-only
     entry (no `_id` needed, just enough shape to satisfy `CalendarEvent`)
     before computing per-cell matches the same way `CalendarGrid.tsx` does
     for the real page.
  3. Renders `MonthTopBar` + `CalendarGrid` with the merged `lessons` +
     `events`, so the parent sees the draft event exactly where it will
     land alongside her real, already-scheduled lessons — not an isolated
     preview like the enrollment case's computed-schedule-only view.
  Cancel closes without saving (same as `PreviewCalendar.tsx`); Save calls
  through to the page's real `handleSave` (`createCalendarEvent` /
  `updateCalendarEvent`) and closes the modal.
- **Nav:** add an "Events" `<Link>` to the Resources dropdown in
  `src/app/top-menu/components/NavigationMenu.tsx`, alongside the existing
  Publishers/Subjects/Students links.

## Implementation roadmap

Ordered as a **build sequence** (schema → api → page → calendar display →
preview), not just a file list — each phase is independently testable
before starting the next:

**Phase 1 — schema** (testable directly via GraphQL, no UI needed yet):
1. `src/utils/dateUtils.ts` — add `monthToDateRange` + new
   `src/utils/dateUtils.test.ts` unit tests; refactor `calendarMonthView`
   (`calendarResolvers.ts`) to call it instead of its own inline copy.
2. `src/models/CalendarEvent.ts` — new model.
3. `calendarEvent.typedefs.ts` / `query.calendarEvent.typedefs.ts` /
   `mutation.calendarEvent.typedefs.ts` — new typedefs, registered in
   `schema/typedefs/index.ts`.
4. `src/app/api/graphql/resolvers/calendarEventResolvers.ts` — new resolver
   (using `monthToDateRange`), registered in `schema/index.ts`. Confirm
   create/list/update/delete work before moving on (e.g. via the GraphQL
   endpoint directly).

**Phase 2 — api layer:**
5. `src/app/resources/api/calendarEvents.graphql.ts` — new file:
   `GET_ALL_CALENDAR_EVENTS` (no args) + `CREATE_CALENDAR_EVENT` /
   `UPDATE_CALENDAR_EVENT` / `DELETE_CALENDAR_EVENT`, matching
   `students.graphql.ts`'s grouping.

**Phase 3 — page** (no Preview button yet — that needs Phase 4 first):
6. `src/app/resources/events/page.tsx` — new Resources page, copied from
   `students/page.tsx`'s structure (`ResourceTwoPanelLayout` +
   `ResourceEntityList` + detail form), with the student-scope dropdown.
7. `src/app/top-menu/components/NavigationMenu.tsx` — add the "Events" link
   to the Resources dropdown, so the page is reachable.
   → End-to-end testable here: create/edit/delete events and see them in
   the list, even though nothing shows on the live calendar yet.

**Phase 4 — calendar display** (closes the loop on the actual ask — "see it
on the calendar"):
8. `src/app/calendar/api.ts` — `GET_CALENDAR_EVENTS` (studentId+month) +
   a `CalendarEvent` type in `src/app/calendar/types.ts`.
9. `MonthView.tsx` → `CalendarGrid.tsx` → `DayCell.tsx` — thread `events`
   down, render as a display-only banner pill above lessons. No interaction
   added to the live calendar.
10. `DayView.tsx` — fetch + render the day's events banner, also display-only.

**Phase 5 — preview — on hold, decided 2026-09-16.** Deferred rather than
shipped in v1: the events form (Phase 3) ships without a Preview button.
Reasoning: unlike the enrollment case, an event's dates are exactly what's
typed into the form — there's no generated schedule that could surprise
you, so the value Preview adds here (catching a mistake before saving) is
smaller than it was for enrollments. Can still be picked up later without
any rework — nothing in Phases 1-4 depends on it existing.
11. `src/app/enrollments/components/PreviewCalendar.tsx` →
    `src/app/resources/events/components/EventPreviewCalendar.tsx` — new
    component, same modal shell, merges the draft event into live
    `calendarMonthView`/`calendarEvents` data client-side (no new query).
    Wire the Preview button into the Phase 3 page's form.

Phases 1-4: done. Phase 5: on hold (see above).

## Addendum: quick-add button on the calendar (added 2026-09-17)

Real usage feedback from the wife, after trying the shipped v1: adding an
event only via `/resources/calendar-events` is one extra hop away from
where she's actually looking (the calendar itself) — she wants a button/
icon directly on the day cell that opens a small popup form.

**Decisions locked (confirmed 2026-09-17):**
- **Alongside the Resources page, not replacing it.** The calendar gets a
  quick "add event" shortcut for convenience; `/resources/calendar-events`
  stays as the full management page (bulk view, edit, delete, scope
  dropdown) — same reasoning as the original v1 decision to build that page
  at all: bulk entry (a whole school year of stat holidays) is still
  painful from individual day cells.
- **Add only — no edit/delete from the calendar.** Clicking an existing
  event pill does nothing new; editing/deleting an event still only
  happens on the Resources page. Keeps this addition small: a dedicated
  button only ever needs a "create" flow, never has to disambiguate "is
  this click on empty space, a lesson pill, or an event pill" the way the
  original (rejected) click-anywhere-to-add design would have.
- **Simplified popup, not the full form:** title input, start date, end
  date (both default to the clicked cell's `date`), and a student-scope
  `<select>` — kept, since it's small, but defaulting to the calendar's
  currently-viewed student rather than "Everyone." **Correction
  (2026-09):** an earlier version of this doc claimed the popup reuses an
  "auto-fill-End-until-touched" nicety from the Resources form — that
  never actually got built on either form; both start/end dates are
  plain, independent fields today. If it's still wanted, it'd need
  implementing in `useEventForm`/`EventFormFields` (shared by both), not
  assumed as already-existing behavior.
- **UI: bottom-right corner, hover-only — confirmed 2026-09-17** (mockup
  reviewed and picked over pairing it next to the day-number badge).
  `absolute right-2 bottom-2`, ~26px circular button matching the
  day-number badge's style (`bg-slate-100`/`text-slate-700`, no border),
  centered "+" icon, `opacity-0` → `opacity-100` on cell hover (needs
  `group`/`group-hover` on the cell's root div). Chosen because it claims
  genuinely unused space rather than competing with either existing corner
  badge — it'll occasionally sit over the last visible pill on a packed
  day, which is an accepted, deliberate trade-off (same pattern most
  calendar apps use), not an oversight.
- **No calendar-based Preview in this popup — decided 2026-09-17, not just
  deferred.** Unlike the Resources-page form (where Preview's whole point
  is "you can't see the calendar from here, so we show you a temporary
  one"), this popup is triggered *from* the live calendar — the real thing
  is already visible right behind it. A second, separate preview calendar
  showing the same event would be redundant, not just extra work to skip.
  If a mistake is made (wrong date, typo'd title), the fix is a quick trip
  to `/resources/calendar-events` — acceptable friction since it's a rare
  correction, not a routine step, and that page's own Preview stays on
  hold too (Phase 5, unchanged). After Save, the real calendar behind the
  popup already refreshes immediately via the mutation's `refetchQueries`
  (see roadmap step 3 below), so the "did it land where I meant" question
  is answered a second later anyway, just without a modal for it.

**Implementation roadmap (sequenced — later steps depend on earlier ones):**

1. **Extract the form into its own component.** New file, e.g.
   `src/app/resources/calendar-events/components/EventForm.tsx`. Pull
   everything currently inline in `calendar-events/page.tsx`'s `detail`
   (lines ~153-250: title/start/end/student inputs, Save/Cancel/Delete
   buttons, `formError` display) into a component taking props like
   `{ title, startDate, endDate, studentId, onTitleChange, onStartDateChange,
   onEndDateChange, onStudentIdChange, onSave, onCancel, isSaving,
   showDelete, onDelete, isDeleting, formError }`. `page.tsx` keeps all its
   existing state/handlers untouched — it just renders `<EventForm ... />`
   instead of the inline JSX. This is the foundational step: nothing else
   below can start until the form exists as something the popup can also
   render. `showDelete={false}` is what makes the popup's add-only
   constraint (locked above) simple — the popup just never passes a
   Delete handler, `EventForm` only renders that button when `showDelete`
   is true.
2. **Icon + hover effect on `DayCell.tsx`.** Independent of step 1, can be
   done in parallel: the bottom-right circular button (placement locked
   above) plus a local `isAddingEvent` boolean toggled on click. No real
   save logic wired yet at this point.
3. **Popup component rendering the extracted form.** New file (or inline
   in `DayCell.tsx`, matching how the lesson popover is already inline
   there — a judgment call while building). Renders `<EventForm />` from
   step 1 inside a popover reusing the file's existing triangle-pointer +
   `popoverTop` positioning technique (not new positioning). Pre-fills
   start/end to this cell's `date`. Needs the plumbing noted below
   (`studentId`, the mutation, refetch) wired into its `onSave`.
4. **Cancel/close wiring** — falls out of step 1 rather than being
   separate: `EventForm`'s `onCancel` prop already exists (it's what the
   Resources page's Cancel button already calls). The popup just passes
   its own `onCancel = () => setIsAddingEvent(false)` (plus resetting the
   local form state) — no second button needed, same prop, different
   callback per caller.

**Plumbing needed for step 3:**
- `DayCell.tsx` doesn't currently receive `studentId` — only `dayNumber`,
  `lessons`, `events`, `isToday`, `column`, `date`. Needs `studentId`
  threaded down from `MonthView.tsx` → `CalendarGrid.tsx` → `DayCell.tsx`
  (`month` can be derived from the cell's own `date` via
  `date.slice(0, 7)`), both to default the scope dropdown and to build the
  mutation's `refetchQueries` correctly.
- `CREATE_CALENDAR_EVENT` already exists in
  `src/app/resources/api/calendarEvents.graphql.ts` — the popup imports it
  directly from there rather than duplicating it into `calendar/api.ts`.
  **Correction (2026-09):** an earlier version of this doc said to
  duplicate it, reasoning that `calendar/` and `resources/` should stay
  decoupled the same way `GET_CALENDAR_EVENTS`/`GET_ALL_CALENDAR_EVENTS`
  are. That reasoning doesn't actually hold here — unlike those two
  queries (genuinely different argument shapes), the two
  `CREATE_CALENDAR_EVENT` copies were byte-for-byte identical, so
  duplicating it bought no real decoupling, just two places to update in
  lockstep. It's also inconsistent with `EventFormFields`/`useEventForm`
  already being imported directly from `resources/calendar-events/` into
  `DayCell.tsx` — that cross-folder boundary was already crossed, so
  keeping just this one mutation duplicated was the odd one out.
- On save, refetch `GET_CALENDAR_EVENTS` with this cell's `studentId`/
  `month` variables (not just the bare string form, since the variables
  need to match exactly) so the new event appears immediately without a
  full reload — mirrors how `updateStatus` in this same file already does
  `refetchQueries: ['GetMonthView']` for lessons.
- One new boolean (`isAddingEvent`) plus form-field state, mutually
  exclusive with the existing `popoverLesson` state — opening one should
  close the other.

**All 4 tasks done.** One implementation detail worth recording since it
diverged slightly from this doc: the popup's positioning technique is
reused, but not with the exact same threshold as the lesson popover — at
`w-80` it's wider than the lesson popover's `w-64`, so it needed its own
flip variable (`column >= 5 ? 'right-full' : 'left-full'`, vs. the lesson
popover's `column === 6`) to avoid overflowing the viewport from the
second-to-last column, not just the last one. Also, `CREATE_CALENDAR_EVENT`
is imported directly from `resources/api/calendarEvents.graphql.ts` rather
than duplicated into `calendar/api.ts` — see the correction note above.
