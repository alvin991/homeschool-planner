# Outstanding Tasks / Wishlist

Living backlog for the homeschool-planner app. Written to be readable by any AI
assistant or human picking up the project cold — no prior conversation needed.

Last updated: 2026-08-20

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
- **Lesson-completion dates recorded in UTC instead of the family's local
  date.** `DayCell.tsx`'s "Complete" action used `new Date().toISOString()
  .slice(0,10)` — the UTC calendar date, not the family's — wrong most
  evenings, right when completions actually happen. Fixed by establishing
  `familyNow()`/`familyToday()`/`familyTodayAsDate()` (`utils/dateUtils.ts`)
  as the single source of truth for "what day is it," client and server,
  replacing every place that had been trusting the browser's or the
  server's own ambient clock/timezone instead. **Merged to `main`; deploy/
  tag pending.**
- **Fix schedule drift from missed/late lesson completions.** Backdating a
  completion now offers a choice — reschedule the remaining lessons (undo
  the drift) or just complete this one — and the underlying auto-reschedule
  sweep no longer silently overwrites already-completed occurrences out of
  sequence. Full design, decisions, and implementation detail:
  [`docs/reschedule-remaining-on-backdate.md`](reschedule-remaining-on-backdate.md).
  14 unit tests added for the two new pure helpers
  (`rescheduleTailFrom`/`canRescheduleRemaining`); manually verified in the
  app across all four core paths. **Merged to `main`; deploy/tag pending.**
  One known follow-up, not yet designed: reopening a lesson doesn't account
  for a prior reschedule (self-healing via the existing overdue sweep, not
  permanent corruption — see that file's own follow-up section).

## Backlog (rough priority order)

1. ~~Fix schedule drift from missed/late lesson completions.~~ ✅ **Done**
   — see "Recently shipped" above and
   [`docs/reschedule-remaining-on-backdate.md`](reschedule-remaining-on-backdate.md)
   for full detail. Kept at position #1 rather than renumbered, to avoid
   breaking the cross-references other items below make to specific
   numbers.

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

19. **Calendar-day fields rely on implicit, coincidental UTC round-tripping
    instead of an explicit convention — not currently broken, but fragile.**
    Found while implementing item #1 (the two share a root cause). Goal:
    datetime handling across the app should follow one explicit, consistent
    convention rather than "happens to work today." Positioned last in this
    list purely because it's new, not because it's low-priority — it's
    tightly coupled to item #1 (same fields, same reschedule logic) and
    worth resolving before that item's roadmap does much more with
    `scheduled_dates`.
    - **Finding A:** [`enrollmentResolvers.ts`](src/app/api/graphql/resolvers/enrollmentResolvers.ts)'s
      `new Date(completedDate)` parses a date-*only* ISO string
      (`"2026-08-09"`) as **UTC midnight** — a genuine JS spec quirk (date-
      only strings parse as UTC; date-*time* strings without a zone parse
      as local — inconsistent by design). This isn't wrong *today* only
      because every read site also uses `.toISOString().slice(0,10)`
      (also UTC) — write and read happen to cancel out. But it's a trap:
      any future code that reads `completed_date` via local getters
      (`.getDate()`, `.toLocaleDateString()`) instead of `.toISOString()`
      would silently get the wrong day, with nothing to warn that this
      field's correctness depends on every caller consistently choosing
      UTC.
    - **Finding B:** [`enrollmentUtils.ts`](src/app/api/graphql/lib/enrollmentUtils.ts)'s
      `generateScheduledDates()` zeroes time via `current.setHours(0, 0, 0,
      0)` — midnight in the **server's own local timezone**, not explicitly
      UTC and not explicitly `FAMILY_TIMEZONE`. This currently agrees with
      Finding A's UTC round-trip only because typical cloud hosts default
      to UTC. If the server's timezone were ever changed (e.g. someone sets
      `TZ=America/Edmonton` on the host, plausibly *thinking* that would
      help), every `scheduled_dates` entry would silently shift by a day
      when read back via `.toISOString().slice(0,10)` elsewhere. This is a
      different, more structural assumption than anything fixed in the
      urgent item above — it's baked into the core schedule-generation
      math, not just "what day is today."
    - **Not decided yet — needs its own design pass, not a quick patch.**
      Two directions worth weighing when this gets picked up: (a) keep
      `Date`/timestamp storage for these fields but make the UTC round-trip
      *explicit* (e.g. a helper that always anchors calendar-day fields to
      UTC midnight on write, matching the always-UTC reads, so it's a
      documented convention instead of an accident), or (b) store
      calendar-day fields (`start_date`, `end_date`, `scheduled_dates[]`,
      `completed_date`) as plain `"YYYY-MM-DD"` strings instead of `Date`
      — sidesteps the time-of-day ambiguity entirely for values that never
      had a meaningful time-of-day, and every GraphQL resolver already
      converts them to strings at the boundary anyway
      (`Enrollment.start_date`/`.end_date`/`.scheduled_dates` resolvers all
      format via `.toISOString().slice(0,10)`), so this might just remove a
      layer of conversion rather than add one. (b) is the more thorough
      fix but touches the schema and needs a migration; (a) is smaller but
      only codifies the current accident rather than simplifying it.
    - Not yet started.

20. **Consider branch protection on `main` requiring the Test check.**
    Prompted by realizing `deploy.yml` (manual `workflow_dispatch`, no
    `needs:`) has zero awareness of `test.yml`'s status — it'll happily
    build and deploy whatever commit is currently on `main`, test failures
    or not. Nothing currently prevents a red-checked commit from being
    deployed; a human just has to remember to look.
    - **The real tradeoff, not just upside:** GitHub's "require status
      checks before merging" effectively forces every change onto a PR —
      direct `git push` to `main` gets blocked outright, since there's no
      commit for a check to have run against yet at push time. That ends
      the quick local-merge-and-push pattern used all through this app's
      history so far (the timezone fix, doc-only `TASKS.md` updates, etc.)
      — fine for a genuine feature, real friction for a one-line docs fix.
    - **Setup detail that matters if this gets turned on:** GitHub's
      "Include administrators" checkbox — without it, protection doesn't
      apply to the repo owner by default, making the rule decorative
      rather than actually enforced.
    - Not yet decided whether the tradeoff is worth it for a 2-user app;
      revisit if a bad commit ever actually gets deployed for real.

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
