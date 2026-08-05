# Outstanding Tasks / Wishlist

Living backlog for the homeschool-planner app. Written to be readable by any AI
assistant or human picking up the project cold — no prior conversation needed.

Last updated: 2026-08-04

## Context

This app was built for the maintainer's wife, to manage their daughter's
homeschool schedule (courses, enrollments, calendar). It's a small, 2-user
hobby project — favor simple, low-maintenance solutions over enterprise-y
ones.

## Needs finishing (in progress / done-but-not-shipped)

1. **Merge `feat/per-lesson-completion` branch to `main`.** Fixes a bug where
   marking one lesson complete on a day with `lesson_rate >= 1` (multiple
   lessons per day) silently completed its sibling lesson too — completion
   status now lives per-lesson instead of per-occurrence. Touches
   `models/Enrollment.ts`, `enrollmentUtils.ts`, GraphQL typedefs/resolvers,
   frontend (`DayView.tsx`, `DayCell.tsx`), and a data migration script
   (`scripts/migrate-lesson-status.ts`). Tested end-to-end locally.
   **After merging: re-run the migration script against production data**
   (see safety checklist below before doing so).

2. **`.env.example` is out of sync** — `NEXT_PUBLIC_DEFAULT_STUDENT_ID` was
   added to `.env` but never added to `.env.example`. Small standalone fix,
   can go directly on `main`.

## Backlog (rough priority order)

1. **Shared "selected student" context + nav redesign.** Enrollments has its
   own local student-selector state; Calendar has none (hardcoded fallback
   via `NODE_ENV` check). Plan: shared context (like `CoursesUIContext`)
   persisting across Enrollments/Calendar/Day View, plus a nav redesign with
   a visual separator between student-scoped items (Courses, Enrollments,
   Calendar, Today) and global/admin items (Resources), and a student picker
   (`👤 Mia ▼`) in the nav. This is one cohesive feature — do it in one
   session, not piecemeal.

2. **Surface Day View in the main nav** as "Today" — currently only reachable
   via `/calendar?view=day` or `/student-view`. Depends on #1 above.

3. **Reorder the system menu** to match actual dependency order: Resources →
   Courses → Enrollments → Calendar (Resources are prerequisites for
   everything else; currently ordered Courses → Enrollments → Calendar →
   Resources).

4. **Print original/initial schedule.** Print a hardcopy of an enrollment's
   schedule as first planned, before any skips/delays. Needs a new
   `original_scheduled_dates` field on the Enrollment model, set once at
   `createEnrollment`, never touched afterward.

5. **Enrollment progress comparison** — compare initial vs. current
   `scheduled_dates` to visualize postponed/delayed lessons. Bigger scope
   than #4, on hold, depends on it existing first.

6. **Unsaved changes detection.** No dirty-form warning anywhere — e.g.
   editing the enrollment form, clicking Preview then Cancel, then
   navigating away silently loses changes.

7. **System menu always navigates/reloads**, even if the clicked item is
   already the active page — can discard in-progress form state. Worth
   fixing alongside #6.

8. **Clean up console.logs and dead code** accumulated across
   `MonthView.tsx`, `DayCell.tsx`, `PreviewCalendar.tsx`, etc.

9. **Refactor `enrollments/page.tsx`.** Has grown long — form state,
   validation duplicated between `handlePreview`/`handleSave`, list
   rendering, all in one file. Plan: extract `EnrollmentForm`,
   `EnrollmentList` components, `useEnrollmentForm`/`useEnrollments` hooks,
   shared `validateForm`.

10. **Show real student name in `MonthTopBar`** — currently hardcoded
    "Student Name". Low urgency while only one student exists.

11. **npm vulnerability audit** — `npm audit` reported 11 vulnerabilities (1
    low, 7 moderate, 3 high) after installing Vitest, likely transitive
    deps. Check whether high-severity ones are in devDependencies (less
    urgent if so) before running `npm audit fix` / `--force`.

12. **Add test coverage.** Currently zero tests. Recommended: Vitest (not
    Jest — simpler config for Next.js + TS + ESM), React Testing Library
    only if component tests are needed. Highest-value target: the pure
    scheduling functions in `src/app/api/graphql/lib/enrollmentUtils.ts`
    (`generateScheduledDates`, `generateLessonOccurrences`,
    `computeSchedule`) — pure functions, no DB/React mocking needed, and two
    real bugs have already been found there. Skip resolver-level and
    component/E2E tests for now — low ROI for a 2-user app.

13. **Auto-reschedule uncompleted lessons — design locked, not started.** A
    lesson still `pending` after its `scheduled_date` has passed should
    auto-shift forward, rippling: the missed lesson takes the next date's
    slot, that occurrence's lesson takes the date after, etc.
    - Trigger: lazy check-on-load — when the calendar month/day resolver
      runs, scan for overdue pending lessons and reschedule before
      returning data. No cron needed.
    - Cutoff time is configurable **per student** (not global) — a field on
      the `Student` model, editable on the student edit form.
    - Cascade needs one additional date appended to `scheduled_dates` per
      shift (continuing the weekday/interval/suspension pattern) — you can't
      lose a slot.
    - Connects to #4 and #5 above.

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

17. **Proper env var management for dev/prod.** Env vars (e.g.
    `NEXT_PUBLIC_DEFAULT_STUDENT_ID`) are currently added manually to the
    production container. When building out the deploy pipeline further,
    consider GitHub Actions secrets injected at build time (required for
    `NEXT_PUBLIC_` vars) or a secrets manager for runtime vars.

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
