# Outstanding Tasks / Wishlist

Living backlog for the homeschool-planner app. Written to be readable by any AI
assistant or human picking up the project cold — no prior conversation needed.

Last updated: 2026-08-07

## Context

This app was built for the maintainer's wife, to manage their daughter's
homeschool schedule (courses, enrollments, calendar). It's a small, 2-user
hobby project — favor simple, low-maintenance solutions over enterprise-y
ones.

## Recently shipped

- **Per-lesson completion status** (v1.6.0) — merged, production migration
  run, deployed.
- **Overdue-reschedule cutoff timezone bug** (v1.6.1) — `processOverdueLessons`
  was reading a student's `lesson_cutoff_time` in the server's timezone
  (UTC) instead of the family's (`America/Edmonton`), causing lessons to get
  auto-rescheduled hours before the real cutoff. Fixed via Luxon +
  `FAMILY_TIMEZONE` constant.
- **Student cutoff-time not displaying** (v1.6.1) — edit form always showed
  the default (20:00) instead of the saved value; `GET_STUDENTS` query never
  requested the field.

## Urgent — production bug, fix independently of the backlog below

**Lesson-completion dates are recorded in UTC instead of the family's local
date.** `DayCell.tsx:142`'s "Complete" action uses `new Date().toISOString()
.slice(0,10)`, which reads the **UTC** calendar date, not the family's
(`America/Edmonton`, UTC-6/-7). Any completion marked after ~5–6pm local is
already "tomorrow" in UTC — squarely inside the default 20:00 cutoff window,
so this is likely wrong most evenings, right when the family actually does
its "did we finish today" check. (Found while designing the fix for backlog
#1 below — went to fix `DayView.tsx`'s equivalent bug and initially assumed,
incorrectly, that `DayCell.tsx` "already did this right.")

- Root cause: trusting the browser's own clock/timezone at all, rather than
  the app's single explicit `FAMILY_TIMEZONE` constant — the same shaky
  assumption behind two earlier timezone bugs in this app
  (`processOverdueLessons`'s cutoff check; the cutoff-time display bug).
  `MonthView.tsx:40` (`const today = new Date()`) and `calendar/page.tsx:18`
  (month default) have the identical class of issue and are cheap to fix in
  the same pass.
- **Fix locked (2026-08-07): align the whole app on one setting** rather
  than patch `DayCell.tsx:142` with browser-local `localToday()` and call it
  done — read "today" from `FAMILY_TIMEZONE` explicitly, client and server:
  1. `utils/dateUtils.ts` — add `familyNow(): DateTime` (`DateTime.now()
     .setZone(FAMILY_TIMEZONE)`) and `familyToday(): string`
     (`familyNow().toISODate()`), replacing `localToday()` — rename it
     rather than just patching its internals, so nothing reading the name
     "local" is tempted to mean "the browser's own clock" again. Also add
     `familyTodayAsDate(): Date` — a native `Date` built from `familyNow()`'s
     year/month/day via the local constructor (`new Date(y, m-1, d)`) — for
     `MonthView.tsx`, the one spot needing a `Date`-typed value;
     `CalendarGrid`/`MonthTopBar` only ever read `Date` via local getters
     (`getDate()`/`getMonth()`/`getFullYear()`, never `toISOString()`), so
     they stay correct fed a `Date` built this way — no downstream prop-type
     changes needed. This module has no server-only imports today, so it's
     safe to import from both client components and resolvers — one shared
     implementation instead of two that happen to agree.
  2. `calendarResolvers.ts` — swap `processOverdueLessons`'s inline
     `DateTime.now().setZone(FAMILY_TIMEZONE)` for `familyNow()`.
  3. `DayView.tsx:75` — change `completedDate: date` to
     `completedDate: familyToday()`.
  4. `DayCell.tsx:142` — change `new Date().toISOString().slice(0,10)` to
     `familyToday()`. This line is the actual production bug.
  5. `MonthView.tsx:40` / `calendar/page.tsx:18` — swap their browser-local
     `new Date()` today/month defaults for `familyTodayAsDate()` /
     `familyToday().slice(0,7)` respectively.
- Not yet started. Small, contained, no schema/data changes — safe to ship
  on its own ahead of backlog #1.

## Backlog (rough priority order)

1. **Fix schedule drift from missed/late lesson completions — current
   priority.** Two related gaps combine into one recurring real-world pain
   point (wife/kids forget to mark a lesson complete before the cutoff, it
   auto-reschedules to tomorrow, and by the time it's marked complete the
   rest of the enrollment has permanently drifted forward):
   - **Gap A:** marking a lesson complete uses whatever date the currently-
     viewed calendar page happens to show ([`DayView.tsx:75`](src/app/calendar/components/DayView.tsx#L75) →
     [`enrollmentResolvers.ts:117-123`](src/app/api/graphql/resolvers/enrollmentResolvers.ts#L117-L123)),
     not necessarily the day it was actually done — so a lesson already
     bumped to tomorrow by `processOverdueLessons` stays mis-dated even
     after being marked complete.
   - **Gap B:** `processOverdueLessons`'s tail-splice-and-regenerate logic
     doesn't distinguish already-completed occurrences from pending ones in
     the tail it overwrites (documented in the `INVARIANT` comment directly
     above the function in `calendarResolvers.ts`) — completing lessons out
     of sequence risks a later completed lesson's real date being silently
     rewritten.
   - **Design direction locked (2026-08-06):** when a lesson is marked
     complete with a backdated completion date (earlier than its currently-
     assigned scheduled slot), treat it as a correction — regenerate
     `scheduled_dates` for the remaining *still-pending* occurrences after
     it, reusing the same splice-and-regenerate mechanism
     `processOverdueLessons` already has, but skipping over already-
     completed occurrences instead of blindly overwriting the whole tail.
     Fixes both the display glitch and the permanent schedule drift from one
     mechanism, without needing to persist separate reschedule history.
   - **Trigger mechanism locked (2026-08-06): date picker in `DayCell.tsx`'s
     popover**, not drag-and-drop. Drag-and-drop was considered and dropped
     — it runs into a real problem with no simple fix: a pending lesson
     only ever renders in the one `DayCell` matching its current slot, so
     if the correction target is in a different month there's no cell to
     drop on, and auto-paging the month mid-drag (hover the nav arrow →
     switch months → keep the drag session alive through a GraphQL
     refetch) is a lot of fiddly state for a 2-user app. A plain
     `<input type="date">` has no such visibility constraint, so it
     handles month-boundary corrections for free. (`@dnd-kit` stays
     scoped to the course lesson-tree UI — not needed for this fix.)
     Extend the existing "Complete" action in `DayCell.tsx`'s popover:
     instead of firing `updateOccurrenceStatus` immediately with today's
     date, reveal an inline date input — **default = today, `max` = today,
     no future dates selectable** — plus a "Reschedule remaining lessons"
     checkbox.
   - **Backdate-choice refinement (2026-08-07):** a backdated completion
     shouldn't *always* silently pull the rest of the schedule back —
     sometimes a lesson is legitimately done early/out of order (extra
     effort that day) and the remaining pacing should be left alone. So
     the checkbox above, when available, defaults to **checked**
     (reschedule remaining — matches the original locked drift-correction
     design) but can be unchecked for **"only complete this lesson"** (set
     just this occurrence's status/`completed_date`; leave every other
     occurrence's `scheduled_dates` entry untouched — display is already
     correct either way since completed lessons place by `completed_date`,
     not by slot).
   - **Checkbox eligibility (2026-08-07):** the checkbox is only shown/
     enabled when *both* hold:
     1. The picked date is earlier than the popover's own day-cell date
        (otherwise this isn't a backdate at all — the component already
        knows this for free, since that's literally the cell it's
        rendered in, no extra data needed).
     2. Completing **this** lesson resolves the **first still-open
        occurrence** in the enrollment's sequence — i.e. the lowest-
        `sequence` occurrence that currently has any pending lesson. This
        single condition covers two cases the client can't determine on
        its own without help: an *earlier* occurrence (by sequence) is
        still pending (out-of-order completion — exactly the INVARIANT
        gap from Gap B, now guarded proactively instead of just
        defensively), or a *sibling* lesson within this same occurrence is
        still pending (the `lesson_rate >= 1` case, where an occurrence's
        `lessons` array holds more than one lesson for that day — the day
        isn't actually "done" yet, so the remaining schedule shouldn't
        compress). Either way, rescheduling the tail wouldn't be safe, so
        only "complete this lesson only" is available.
     Since #2 needs visibility into *other* occurrences' status that the
     frontend doesn't have, the server must compute and expose it (see
     roadmap below) — and must **re-check it itself** inside the mutation
     rather than trusting whatever the client sends, since client state
     can be stale (another tab, a race).
   - **Depends on the urgent timezone-alignment fix above shipping first**
     — this feature's date comparisons/anchors and the "Urgent" section's
     `familyNow()`/`familyToday()` helpers are the same code; no point
     building this on top of the bug that fix replaces.
   - **Implementation roadmap:**
     1. `enrollmentUtils.ts` — add a pure `rescheduleTailFrom(enrollment,
        fromIndex, anchorDate)` helper: takes the tail of `scheduled_dates`
        from `fromIndex` on, splits it into still-pending occurrences (get
        freshly generated dates via the existing `generateScheduledDates`,
        starting the day after `anchorDate`) vs. already-completed ones
        (date left untouched, positions preserved) — this is the INVARIANT
        fix (Gap B) as a reusable, unit-testable function. Good first target
        for backlog #13 (test coverage) since it's pure and isolated.
        **`anchorDate` is always "today"** (family tz) for both call sites
        below — never the backdated `completedDate` — so a deep backdate
        can never generate a remaining-tail date that's already in the
        past.
     2. `enrollmentUtils.ts` — add a second pure helper,
        `canRescheduleRemaining(enrollment, occurrenceSequence, lessonId)`:
        sorts `lesson_occurrences` by `sequence`, finds the first one with
        any `pending` lesson (`firstOpen`), and returns
        `firstOpen?.sequence === occurrenceSequence && occurrence.lessons
        .every(l => l.lesson_id === lessonId || l.status !== 'pending')` —
        i.e. this occurrence is the first open one *and* every other
        lesson in it (siblings) is already resolved. One shared
        implementation used by both the query-side hint and the mutation-
        side enforcement below keeps the two from drifting apart.
     3. `calendarResolvers.ts` — refactor `processOverdueLessons`'s manual
        splice block to call `rescheduleTailFrom` (anchor = today in
        `FAMILY_TIMEZONE`) instead of duplicating the logic. Also, in
        `calendarMonthView`, compute `canRescheduleRemaining(...)` per
        pending lesson and include it on the row (see schema change next).
     4. `inputs.typedefs.ts` / `MonthViewLesson` type — add
        `rescheduleRemaining: Boolean` to `UpdateOccurrenceStatusInput`
        (meaningful only when the completion is a genuine backdate;
        ignored otherwise; **default when omitted: `true`**, preserving
        today's behavior for `DayView.tsx`'s quick-toggle so it never has
        to think about this), and add `can_reschedule_remaining: Boolean!`
        to the `MonthViewLesson` GraphQL type + `calendar/types.ts`, fed
        by step 2's helper.
     5. `enrollmentResolvers.ts` (`updateOccurrenceStatus`) — change the
        lesson lookup to resolve the *occurrence* first (need its
        `sequence` to index into `scheduled_dates`, not just the flattened
        lesson). When `status === 'completed'`, compare `completedDate`'s
        calendar day to `scheduled_dates[occurrence.sequence - 1]`'s day
        (string comparison, not raw `Date`, to avoid a repeat of the
        earlier timezone bug class). If `completedDate` is earlier →
        backdate: re-derive eligibility via
        `canRescheduleRemaining(enrollment, occurrence.sequence, lessonId)`
        — **don't trust `input.rescheduleRemaining` on its own**; only
        actually reschedule when *both* the helper says it's eligible
        *and* the client requested it. If eligible and requested, call
        `rescheduleTailFrom(enrollment,
        occurrence.sequence, todayFamilyTz)` (anchor = today, not
        `completedDate` — see step 1) and save the result; otherwise save
        only this occurrence's status/`completed_date` and leave
        `scheduled_dates` alone. If not a backdate, behave exactly as
        today (flag irrelevant). Worth a light guard too: reject/no-op if
        `completedDate` is before the *previous* occurrence's scheduled
        date or before `enrollment.start_date` — nonsensical regardless of
        mode.
     6. `DayCell.tsx` — extend the popover's "Complete" action (its UTC
        date bug is already fixed by the urgent item above by this point):
        reveal an inline `<input type="date">` — `defaultValue` and `max`
        both = `familyToday()`, so no future date is selectable — plus a
        "Reschedule remaining lessons" checkbox that only renders/enables
        when the picked date is earlier than the popover's own cell date
        *and* `lesson.can_reschedule_remaining` is true (default checked
        when shown). On confirm, fire `updateOccurrenceStatus` with the
        chosen `completedDate` and `rescheduleRemaining`.
   - Not yet started.

2. **Shared "selected student" context + nav redesign.** Enrollments has its
   own local student-selector state; Calendar has none (hardcoded fallback
   via `NODE_ENV` check). Plan: shared context (like `CoursesUIContext`)
   persisting across Enrollments/Calendar/Day View, plus a nav redesign with
   a visual separator between student-scoped items (Courses, Enrollments,
   Calendar, Today) and global/admin items (Resources), and a student picker
   (`👤 Mia ▼`) in the nav. This is one cohesive feature — do it in one
   session, not piecemeal.

3. **Surface Day View in the main nav** as "Today" — currently only reachable
   via `/calendar?view=day` or `/student-view`. Depends on #2 above.

4. **Reorder the system menu** to match actual dependency order: Resources →
   Courses → Enrollments → Calendar (Resources are prerequisites for
   everything else; currently ordered Courses → Enrollments → Calendar →
   Resources).

5. **Print original/initial schedule.** Print a hardcopy of an enrollment's
   schedule as first planned, before any skips/delays. Needs a new
   `original_scheduled_dates` field on the Enrollment model, set once at
   `createEnrollment`, never touched afterward.

6. **Enrollment progress comparison** — compare initial vs. current
   `scheduled_dates` to visualize postponed/delayed lessons. Bigger scope
   than #5, on hold, depends on it existing first.

7. **Unsaved changes detection.** No dirty-form warning anywhere — e.g.
   editing the enrollment form, clicking Preview then Cancel, then
   navigating away silently loses changes.

8. **System menu always navigates/reloads**, even if the clicked item is
   already the active page — can discard in-progress form state. Worth
   fixing alongside #7.

9. **Clean up console.logs and dead code** accumulated across
   `MonthView.tsx`, `DayCell.tsx`, `PreviewCalendar.tsx`, etc.

10. **Refactor `enrollments/page.tsx`.** Has grown long — form state,
    validation duplicated between `handlePreview`/`handleSave`, list
    rendering, all in one file. Plan: extract `EnrollmentForm`,
    `EnrollmentList` components, `useEnrollmentForm`/`useEnrollments` hooks,
    shared `validateForm`.

11. **Show real student name in `MonthTopBar`** — currently hardcoded
    "Student Name". Low urgency while only one student exists.

12. **npm vulnerability audit** — `npm audit` reported 11 vulnerabilities (1
    low, 7 moderate, 3 high) after installing Vitest, likely transitive
    deps. Check whether high-severity ones are in devDependencies (less
    urgent if so) before running `npm audit fix` / `--force`.

13. **Add test coverage.** Currently zero tests. Recommended: Vitest (not
    Jest — simpler config for Next.js + TS + ESM), React Testing Library
    only if component tests are needed. Highest-value target: the pure
    scheduling functions in `src/app/api/graphql/lib/enrollmentUtils.ts`
    (`generateScheduledDates`, `generateLessonOccurrences`,
    `computeSchedule`) — pure functions, no DB/React mocking needed, and two
    real bugs have already been found there. Skip resolver-level and
    component/E2E tests for now — low ROI for a 2-user app.

14. **Folders-as-sub-courses — design locked 2026-07-10, not started.**
    Replaces an earlier "chained enrollments" idea (enrollment A finishes →
    enrollment B auto-starts) that was abandoned because cascading
    recomputation across chained enrollments was unbounded in cost.
    - **Locked design:** don't chain enrollments. Instead, folders A/B/C/D
      live inside one course; each folder's lessons are a "sub-course." The
      existing sequential scheduling (`flattenLessonTree` →
      `generateLessonOccurrences` → `generateScheduledDates`) already gives
      "folder B starts right after folder A" for free.
    - Folder depth capped at 1 level (a folder can't contain another
      folder) — needs enforcement both in the Course schema (currently only
      checks non-empty `title`) and in the UI (disable "+ Folder" inside a
      folder, block drag-into-folder).
    - Persistence: add `folder_id?: ObjectId` to the lesson snapshot
      (interface + schema + the local duplicate interface in
      `enrollmentUtils.ts`). Store an id reference, not a denormalized
      folder title, since the course tree is already populated per
      enrollment and folder titles can resolve live at render time.
    - Display: month view cell becomes
      `{course_abbr} - {folder_title} - {lesson_title}`; day view adds a
      `folder_title` line near `lesson_title`.
    - Day view (`calendarDayView` resolver) is behind month view here — it
      doesn't select `course_abbr` yet and needs folder-resolution logic
      added from scratch.
    - Caveat: only new/resaved enrollments get `folder_id` populated — no
      backfill mechanism exists yet.

15. **Preview-mode UI cleanup.** `PreviewCalendar.tsx` reuses
    `CalendarGrid`/`DayCell` as-is, so an unsaved schedule preview shows the
    same Complete/Skip/Reopen buttons and "pending" status wording as the
    real calendar, which doesn't make sense before anything has happened.
    Open question: give `DayCell` a `readOnly`/`isPreview` prop, or have
    `PreviewCalendar` render its own simpler cell component?

16. **Remove or disable the student "delete" button.** Undecided between
    removing it entirely vs. disabling/gating it behind extra confirmation.
    Reason not yet specified — ask the stakeholder (wife) when picked up.
    Likely lives in the students management page under `/resources`.

17. **Proper env var management for dev/prod.** `calendar/page.tsx` currently
    hardcodes two student IDs (`DEV_STUDENT_ID`, `PROD_STUDENT_ID`) and
    switches between them via `NODE_ENV`. Converting this to a real env var
    (e.g. `NEXT_PUBLIC_DEFAULT_STUDENT_ID`) is more involved than it looks:
    `NEXT_PUBLIC_` vars get baked into the JS bundle at **build time**, but
    `docker-compose.prod.yaml`'s `env_file:` only reaches the *running
    container*, not the Docker build step. Doing it properly needs: `ARG`/
    `ENV` in the `Dockerfile`'s builder stage, a `build: args:` block in
    `docker-compose.prod.yaml`, and `.github/workflows/deploy.yml` loading
    `production.env` into the runner's shell environment before
    `docker compose ... --build` runs (compose's `${VAR}` substitution reads
    the invoking shell env, not `env_file:`) — plus the code change itself.
    Four files, not one; budget a focused session rather than folding it into
    an unrelated fix.

18. **Automate semver tagging in CI/CD.** Currently tagged manually after
    deploy, which is easy to forget. Commit messages already follow
    `feat(...)`/`fix(...)` convention, so options: `semantic-release` for
    fully automated bumps, a `workflow_dispatch` input for manual trigger, or
    PR-label-based bumping.

## Working agreements

**Data migration safety checklist** — apply to any migration script, dev or
prod database:
1. Take an out-of-band backup independent of any in-app backup mechanism
   (e.g. `mongodump --uri="$MONGODB_URI" --collection=<name> --out=./backups/pre-migration-$(date +%Y%m%d-%H%M%S)`).
2. Log the DB name/host immediately after connecting, before any writes, so
   a wrong connection string is caught early.
3. Test on a single record first (`.limit(1)` or a specific `_id`) before
   running the full batch.
4. Add a dry-run mode that logs intended changes without writing.
5. Verify the backup is actually restorable (do a throwaway restore test)
   before you need it for real.

**Collaboration style for larger features:** for bigger/more involved
features, the project owner sometimes wants to write the implementation
himself, using the AI as a design partner/reviewer rather than an
implementer — producing a locked design and an ordered, file-and-line-level
roadmap, then reviewing diffs as he goes, rather than writing the feature
code directly. Ask if this is the desired mode before starting to write code
on a large feature.
