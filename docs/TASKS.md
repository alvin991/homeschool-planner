# Outstanding Tasks / Wishlist

Living backlog for the homeschool-planner app. Written to be readable by any AI
assistant or human picking up the project cold — no prior conversation needed.

Last updated: 2026-10-06

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

## Backlog (reordered 2026-09-06 — prioritized by end-user impact: the wife's
explicit requests and daily-use pain points first, dev-only/infra items last)

1. **Custom calendar events (e.g. stat holidays, "Annabelle ballet class") —
   in progress, schema/api/page/calendar-display done, Preview on hold.**
   Wife's request — current top priority. Pick a single date or date range,
   give it a name, see it show up on the calendar alongside lesson
   occurrences, purely as a visual annotation (no interaction with lesson
   scheduling/auto-reschedule). **Preview step deferred** (decided
   2026-09-16) — the events form ships without it for now; an event's dates
   are exactly what's typed in (no generated schedule to double-check
   against, unlike enrollments), so the payoff is smaller and it can be
   added later with zero rework. See "Phase 5" in the design doc.
   Full design, decisions, and a file-and-line-level implementation roadmap:
   [`docs/custom-calendar-events.md`](custom-calendar-events.md). Locked:
   new standalone `CalendarEvent` model (dates as plain `"YYYY-MM-DD"`
   strings, not `Date`); nullable `student` field (`null` = global,
   set = per-student — covers both named examples); own `calendarEvents`
   query, not folded into `calendarMonthView`/`calendarDayView`; v1 renders
   a multi-day event by repeating the same pill on every day in its range
   (no spanning bar); a day can show multiple events, stacked above lessons,
   reusing the existing scroll behavior for overflow (the "N lessons" badge
   still counts lessons only). Create/edit/delete lives on a new
   `/resources/events` page (two-panel CRUD, same pattern as
   `/resources/students`) rather than inline on the calendar — the live
   calendar only ever displays events. A Preview step before saving reuses
   `CalendarGrid`/`MonthTopBar` the same way the enrollment flow's
   `PreviewCalendar.tsx` does, merging the draft event into live calendar
   data client-side (no new query needed, since event dates are typed
   directly rather than generated). Design-partner mode: project owner
   implements, reviewed as he goes.

2. **Suspension periods: move out of `Enrollment`, into their own shared
   entity — design locked 2026-09-19, not started.** Wife's request. Today,
   a suspension period (pause lesson generation over a date range) is set
   per-enrollment — with multiple enrollments active for a student at once,
   pausing all of them for the same break means re-entering the same dates
   on every single one. Locked: becomes its own `SuspensionPeriod` entity,
   scoped by an optional student list (empty = all students) and an
   optional enrollment list (empty = all enrollments within the student
   scope) — covers global, per-student, and per-enrollment cases with one
   shape. **Form UX locked 2026-09-19** (iterated twice — first a
   two-multi-select, then a progressive-disclosure student-first version,
   both dropped as more than a 2-user app needs): enter start/end date
   first, the form auto-lists every active enrollment with a lesson date in
   that range, **pre-checked** — uncheck to exclude. Nothing unchecked
   saves as `enrollments: []` ("all," and stays correct for enrollments
   added later); unchecking some saves that explicit narrower list. No
   student picker anywhere — each row already shows the student's name, so
   one list does both jobs; the `students` field stays in the data model
   unused rather than getting UI, since one student exists today. Also
   deliberately decoupled from the separate, much bigger "always select a
   student first, everywhere in the app" idea (project owner's own idea,
   floated alongside this) (folded into #7's nav redesign below, not a
   prerequisite here). Full
   design, decisions, data model, schema, resolver wiring, migration plan,
   and phased roadmap:
   [`docs/suspension-periods-redesign.md`](suspension-periods-redesign.md).
   No code written yet.

3. **Print original/initial schedule.** Wife's original ask (clarified after
   initial miscommunication): print a hardcopy of an enrollment's schedule
   as first planned, before any skips/delays. Needs a new
   `original_scheduled_dates` field on the Enrollment model, set once at
   `createEnrollment`, never touched afterward.

4. **Remove or disable the student "delete" button.** Wife's request.
   Undecided between removing it entirely vs. disabling/gating it behind
   extra confirmation. Reason not yet specified — ask the stakeholder (wife)
   when picked up. Likely lives in the students management page under
   `/resources`.

5. **Unsaved changes detection.** No dirty-form warning anywhere — e.g.
   editing the enrollment form, clicking Preview then Cancel, then
   navigating away silently loses changes.

6. **System menu always navigates/reloads**, even if the clicked item is
   already the active page — can discard in-progress form state. Worth
   fixing alongside #5.

7. **Shared "selected student" context + nav redesign.** Enrollments has its
   own local student-selector state; Calendar has none (hardcoded fallback
   via `NODE_ENV` check). Plan: shared context (like `CoursesUIContext`)
   persisting across Enrollments/Calendar/Day View, plus a nav redesign with
   a visual separator between student-scoped items (Courses, Enrollments,
   Calendar, Today) and global/admin items (Resources), and a student picker
   (`👤 Mia ▼`) in the nav. This is one cohesive feature — do it in one
   session, not piecemeal.

8. **Surface Day View in the main nav** as "Today" — currently only reachable
   via `/calendar?view=day` or `/student-view`. Depends on #7 above.

9. **Folders-as-sub-courses — design locked 2026-07-10, not started.**
   Wife's original ask (enrollment A finishes → enrollment B auto-starts).
   Replaces an earlier "chained enrollments" idea, abandoned because
   cascading recomputation across chained enrollments was unbounded in cost.
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

10. **Preview-mode UI cleanup.** `PreviewCalendar.tsx` reuses
   `CalendarGrid`/`DayCell` as-is, so an unsaved schedule preview shows the
   same Complete/Skip/Reopen buttons and "pending" status wording as the
   real calendar, which doesn't make sense before anything has happened.
   Open question: give `DayCell` a `readOnly`/`isPreview` prop, or have
   `PreviewCalendar` render its own simpler cell component?

11. **Show real student name in `MonthTopBar`** — currently hardcoded
    "Student Name", visible to the user today. Low urgency while only one
    student exists.

12. **Reorder the system menu** to match actual dependency order: Resources →
    Courses → Enrollments → Calendar (Resources are prerequisites for
    everything else; currently ordered Courses → Enrollments → Calendar →
    Resources).

13. **Enrollment progress comparison** — compare initial vs. current
    `scheduled_dates` to visualize postponed/delayed lessons. Bigger scope
    than #3, on hold, depends on it existing first.

14. **Show the app version (git tag) in the UI.** Not yet designed — genuinely
    coupled to #21 (automate semver tagging), not independent:
    - Git tags don't exist inside the running container at runtime — there's
      no way to `git describe` your way to it after the fact. The version
      has to be baked in at **build time**, e.g. as `NEXT_PUBLIC_APP_VERSION`
      (Next.js inlines `NEXT_PUBLIC_` vars into the JS bundle at build time),
      rendered somewhere like the nav footer.
    - **Ordering problem:** `deploy.yml` builds and deploys whatever's on
      `main` *before* a tag is created — tagging currently happens manually
      *after* deploy (see #21). So at the moment of `docker compose --build`,
      the tag this deploy will eventually get doesn't exist yet.
    - `package.json`'s `"version"` field is also stale (`0.1.0`, never
      bumped) and not currently the source of truth for the `vX.Y.Z` git
      tags (currently at `v1.7.2`).
    - Two directions once #21 is designed: (a) if semver bumping becomes
      commit-driven (e.g. `semantic-release`), compute the next version
      *before* the build step and pass it in as a build arg, tagging only
      after a successful deploy; or (b) keep manual tagging but move it
      *before* the deploy trigger (tag first, then `deploy.yml` triggers off
      `push: tags: ['v*']` and reads the tag via `${{ github.ref_name }}`
      as the build arg — simpler, no semantic-release dependency, but keeps
      tagging manual).
    - Not started — resolve #21's approach first, since it decides which
      direction this takes.

15. **Calendar-day fields rely on implicit, coincidental UTC round-tripping
    instead of an explicit convention — not currently broken, but fragile.**
    Found while implementing the schedule-drift fix (see "Recently shipped"
    above — the two share a root cause). Goal: datetime handling across the
    app should follow one explicit, consistent convention rather than
    "happens to work today." It's tightly coupled to that fix (same fields,
    same reschedule logic) and worth resolving before more work builds on
    `scheduled_dates`. Preventive/latent-bug item — no user-visible symptom
    today, but real risk if left alone.
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
      different, more structural assumption than the schedule-drift fix
      addressed — it's baked into the core schedule-generation math, not
      just "what day is today."
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

16. **Add test coverage.** Currently zero tests. Recommended: Vitest (not
    Jest — simpler config for Next.js + TS + ESM), React Testing Library
    only if component tests are needed. Highest-value target: the pure
    scheduling functions in `src/app/api/graphql/lib/enrollmentUtils.ts`
    (`generateScheduledDates`, `generateLessonOccurrences`,
    `computeSchedule`) — pure functions, no DB/React mocking needed, and two
    real bugs have already been found there. Skip resolver-level and
    component/E2E tests for now — low ROI for a 2-user app.

17. **npm vulnerability audit** — `npm audit` reported 11 vulnerabilities (1
    low, 7 moderate, 3 high) after installing Vitest, likely transitive
    deps. Check whether high-severity ones are in devDependencies (less
    urgent if so) before running `npm audit fix` / `--force`.

18. **Clean up console.logs and dead code** accumulated across
    `MonthView.tsx`, `DayCell.tsx`, `PreviewCalendar.tsx`, etc. Pure
    code-quality item — no user-visible effect.

19. **Refactor `enrollments/page.tsx`.** Has grown long — form state,
    validation duplicated between `handlePreview`/`handleSave`, list
    rendering, all in one file. Plan: extract `EnrollmentForm`,
    `EnrollmentList` components, `useEnrollmentForm`/`useEnrollments` hooks,
    shared `validateForm`. Pure code-quality item — no user-visible effect.

20. **Proper env var management for dev/prod — done 2026-10-04 for the Cloud
    Run path, self-hosted path intentionally left as-is.** `calendar/page.tsx`
    no longer hardcodes `DEV_STUDENT_ID`/`PROD_STUDENT_ID` switched via
    `NODE_ENV` — now a single `process.env.NEXT_PUBLIC_DEFAULT_STUDENT_ID`
    read. `NEXT_PUBLIC_` vars bake into the JS bundle at **build time**, so
    this is wired through `Dockerfile`'s `builder` stage (`ARG`/`ENV`,
    defaulted to the real student ID) and `cloudbuild.yaml` (passes it as an
    explicit `--build-arg`, overridable via `--substitutions`) — see
    `docs/public-deploy.md` Phase 2 step 6 for the full writeup.
    `docker-compose.prod.yaml`'s self-hosted build still has no build-arg
    plumbing of its own (would need its own `build: args:` block plus
    `.github/workflows/deploy.yml` loading the value into the runner's shell
    env before `--build` runs — compose's `${VAR}` substitution reads the
    invoking shell, not `env_file:`). Left alone deliberately: self-hosted is
    being retired per Phase 4, works today only because the Dockerfile's
    `ARG` default happens to match the real ID, and fixing it properly would
    be throwaway work on a path that's going away. Revisit only if cutover
    stalls and the student ID needs to change before then.

21. **Automate semver tagging in CI/CD.** Currently tagged manually after
    deploy, which is easy to forget. Commit messages already follow
    `feat(...)`/`fix(...)` convention, so options: `semantic-release` for
    fully automated bumps, a `workflow_dispatch` input for manual trigger, or
    PR-label-based bumping. Pure infra item — no user-visible effect, but
    #14 (show app version) depends on the direction chosen here.

22. **Consider branch protection on `main` requiring the Test check.**
    Prompted by realizing `deploy.yml` (manual `workflow_dispatch`, no
    `needs:`) has zero awareness of `test.yml`'s status — it'll happily
    build and deploy whatever commit is currently on `main`, test failures
    or not. Nothing currently prevents a red-checked commit from being
    deployed; a human just has to remember to look. Pure process item — no
    direct user-visible effect, though it protects against a bad deploy.
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

23. **Require PRs to merge into `main` (no direct push).** Decided
    2026-09-06 — want merging into `main` locked down via GitHub branch
    protection requiring a pull request, rather than the current practice of
    sometimes merging via PR and sometimes pushing directly. Related to #22
    (requiring the Test check to pass before merge) — the two are usually
    turned on via the same branch protection rule, but this item is about
    requiring a PR to exist at all, independent of whether a status check is
    also required. Same setup caveat as #22 applies: GitHub's "Include
    administrators" checkbox must be checked, or the repo owner can still
    push directly to `main` despite the rule being on. Pure process item —
    no direct user-visible effect.

24. **Take the app public — GCP Cloud Run + `homeschool.amaska.ca`.** Wife's
    request, so she (and eventually their daughter) can reach it outside the
    house. Decided 2026-09-17: Cloud Run (deliberate GCP-practice choice,
    ties to the maintainer's day job) + MongoDB Atlas free tier, replacing
    the current self-hosted-runner deploy path. No per-user login — data
    isn't sensitive — just a single shared password gate to stop accidental
    data-messing, plus login-attempt throttling (no general API rate
    limiting for v1; app is same-origin so CORS needs no change). Domain
    `amaska.ca` already owned; custom domain mapping to Cloud Run is free.
    Full design, decisions, and phased roadmap:
    [`docs/public-deploy.md`](public-deploy.md). Design-partner mode:
    project owner implements (wants the hands-on GCP learning), reviewed as
    he goes.
    - **Phase 2 done 2026-10-06** — Cloud Run deploys are now one click
      (Actions → Deploy (Cloud Run)), first CI deploy live as revision
      `homeschool-planner-00003-qq2`. Next up: Phase 3 (login gate +
      throttling) — URL stays unshared until then.
    - **Redis/Upstash evaluated 2026-10-04 — not worth it for calendar
      caching, but confirmed as the right fit if Phase 3's login throttle
      ever needs to move off its in-memory counter.** Looked into caching
      `calendarMonthView`/`calendarDayView` in Redis to avoid
      recomputation; verdict was negative — the query isn't pure
      (`processOverdueLessons` mutates `scheduled_dates` as a time-based
      side effect inside the read path, independent of any explicit edit),
      invalidation would need hooks across 7 mutation call sites across
      `enrollmentResolvers.ts`/`calendarEventResolvers.ts`, and a
      self-hosted Redis container wouldn't even be reachable from Cloud Run
      (no fixed network, scales to zero) while `docker-compose.prod.yaml`
      — where it'd naturally live — is itself being retired per Phase 4.
      Upstash (serverless, HTTP-based, no persistent connection needed)
      remains the right tool *if* Phase 3's login-attempt throttle
      (`docs/public-deploy.md` Phase 3 step 4) ever actually outgrows its
      planned in-memory counter. No action taken now — revisit only if
      that happens.

25. **Bump npm.** Noticed 2026-09-22 during the Cloud Run build (`gcloud
    builds submit`, item #24): `npm notice` flagged a new major version
    available (10.8.2 → 12.0.2), currently whatever ships with the
    `node:20` base image in `Dockerfile`. Pure infra item — no user-visible
    effect; check for breaking changes in the npm 11/12 changelogs before
    bumping, since a major version jump could change lockfile format or CLI
    behavior.

26. **Today Dashboard.** Idea surfaced via a ChatGPT brainstorm, discussed
    with wife 2026-10-04. A single landing page combining: a greeting +
    today's date, today's lesson list with pending/completed checkmarks,
    today's events (from `calendarEvents`), a per-course progress bar (see
    #27), and a short "upcoming" preview (tomorrow's lesson count, next
    week's events). Rough mockup from the brainstorm:
    ```
    Good morning! — October 4

    Today's Lessons
    ✓ Math Lesson 42
    ✓ Reading Chapter 8
    □ Science Lesson 5

    Today's Events
    🩰 Dance — 5:30 PM

    Course Progress
    Math Grade 4       ███████░░░ 78%
    Science Grade 4    █████░░░░░ 52%

    Upcoming
    Tomorrow: 3 lessons
    Next week: Dance x2
    ```
    Overlaps with #8 ("Surface Day View in the main nav as 'Today'") — this
    would likely *become* that "Today" page rather than sit alongside the
    existing Day View, since it's a superset (lessons + events + progress +
    upcoming, vs. Day View's lessons-only). Depends on #7 (shared student
    context) same as #8 does, since it needs a student selected before it
    can render anything. Data sources mostly exist already
    (`calendarDayView`, `calendarEvents`, course progress — see #27), but
    "upcoming" (tomorrow + next week preview) isn't served by any current
    query and would need new resolver work. Not yet designed.

27. **Course progress (bars, % complete per course).** Same source as #26;
    also usable standalone outside the dashboard (e.g. a column on a course
    list, or its own small card), not just embedded in it. Needs "progress"
    defined before implementing — candidates: lessons completed / total
    lessons in the course's *current* enrollment, vs. completed / total
    across *all* enrollments ever run for that course (covers re-enrollment/
    repeats). Also needs a decision on how `lesson_rate` bundling (multiple
    lessons completed per occurrence) factors into the percentage. Related
    to but distinct from #13 (enrollment progress comparison) — #13 is about
    *schedule drift* (planned vs. actual dates), this is about raw
    *completion percentage*; keep them separate rather than conflating. Not
    yet designed.

28. **Notes — scope undecided (daily / weekly / monthly?).** Same source as
    #26. Not yet designed: granularity (one note per day? per week? per
    month?), scope (per student, or shared across the family), and whether
    a note attaches to a specific date/lesson or stands alone. Flagged here
    so the idea isn't lost, not ready to implement — needs its own design
    pass, likely its own doc once scoped (same convention as
    `custom-calendar-events.md`/`suspension-periods-redesign.md`).

29. **Archive an enrollment once all its lessons are completed.** Not yet
    designed. Idea: once every lesson in an enrollment's `lesson_occurrences`
    is `completed` (or `skipped`?), let it be archived — hidden from the
    active enrollments list/calendar generation without deleting its data
    (history needed for #13/#27 progress features). Open questions: manual
    archive action vs. automatic once the last lesson completes; whether an
    archived enrollment still shows on the calendar for its already-passed
    dates or disappears entirely; whether it can be unarchived (e.g. if a
    lesson gets reopened via #16's existing reopen flow after archiving).

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
