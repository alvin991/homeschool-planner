# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Homeschool Planner — a Next.js (App Router) app for managing a homeschool curriculum: draggable lesson/folder outlines, enrollment scheduling with a live calendar preview, a month/day-view calendar with per-student auto-rescheduling, and shared resources (subjects, publishers, students). Single GraphQL endpoint over MongoDB/Mongoose. It's a small, 2-user hobby project (built for the maintainer's family) — favor simple, low-maintenance solutions over enterprise-y ones, and note in `docs/TASKS.md` if a change affects the backlog there.

Auth/multi-tenancy is deliberately out of scope; the GraphQL route is trusted-single-user.

## Commands

```bash
npm run dev      # dev server (webpack)
npm run build    # production build (NODE_ENV=production, webpack)
npm start        # serve production build
npm run lint     # ESLint
npm run format   # Prettier --write .
npm test         # vitest (watch mode)
npx vitest run   # vitest, single run (what CI uses)
npx vitest run path/to/file.test.ts        # run one test file
npx vitest run -t "test name substring"    # run tests matching a name
npx tsc --noEmit                            # type-check only (also run in CI)
```

CI (`.github/workflows/test.yml`) runs `npx vitest run` then `npx tsc --noEmit` on every push/PR — run both before considering a change done. There is no `vitest.config.*` or `playwright.config.*`; tests are plain `*.test.ts` files colocated with the code they test (e.g. `src/utils/dateUtils.test.ts`, `src/app/api/graphql/lib/enrollmentUtils.test.ts`). Playwright is a devDependency but not currently wired into any script.

Deploys are manual-only (`workflow_dispatch`) and there are two independent paths until Phase 4 cutover: `deploy.yml` (self-hosted Windows runner via `docker-compose.prod.yaml`, serves the family today, local `homeschool-mongo`) and `deploy-cloudrun.yml` (GitHub-hosted → Cloud Build via `cloudbuild.yaml` → Cloud Run, Atlas, auth via Workload Identity Federation, no login gate yet). See `docs/public-deploy.md` and `docs/RUNNING_MIGRATIONS.md` for the deploy/migration runbooks — don't assume push-to-main deploys.

## Architecture

Three-tier: React client components → one GraphQL HTTP endpoint (`POST /api/graphql`) → Mongoose models → MongoDB. Full diagrammed writeup is in `README.md`; the essentials:

- **GraphQL route** (`src/app/api/graphql/route.ts`): one `ApolloServer`, lazily connects Mongoose in the request context (`mongoose.connect` when `readyState === 0`). Two other REST routes (`src/app/api/course/route.ts`, `src/app/api/migrate-enrollments/route.ts`) instead use the cached-connection helper `src/utils/dbConnect.ts` — these are two independent connection paths, not a shared one; don't assume changing one affects the other.
- **Schema/resolvers**: SDL typeDefs under `src/app/api/graphql/schema/typedefs/`, split by domain. Resolvers are split by domain too (`courseResolvers`, `resourceResolvers`, `enrollmentResolvers`, `studentResolvers`, `calendarResolvers`, `calendarEventResolvers`) and merged via `mergeGraphQLResolvers` (`src/app/api/graphql/schema/mergeResolvers.ts`), which merges *inside* each type name (`Query`, `Mutation`, …) so a plain spread doesn't drop earlier modules' fields. Add new fields by adding a resolver module and including it in `src/app/api/graphql/schema/index.ts`, not by editing a monolithic resolver map.
- **Models** (`src/models/`): Mongoose schemas. `Course.lessonTree` is an **embedded recursive tree** (lesson/folder subdocuments with nested `children`), not a normalized Lesson collection — GraphQL maps between Mongo shape and API shape via `src/app/api/graphql/lib/lessonTreeDto.ts`.
- **Client data layer**: Apollo Client (`src/utils/apolloClient.ts`) → `/api/graphql`. Feature areas keep their GraphQL documents under `src/app/<feature>/api/*.graphql.ts`.
- **Cross-cutting UI state**: `src/app/courses/CoursesUIContext.tsx` holds selected course, outline selection, and form mode (course/lesson/folder × view/edit/new), plus `lessonTreeSourceRef` and flush hooks (`runCourseFlush`/`runDetailFlush`) so switching context can safely persist/validate the active form instead of racing stale tree state.

### Scheduling (enrollments → calendar)

- `computeSchedule` (`src/app/api/graphql/lib/enrollmentUtils.ts`, wrapping `flattenLessonTree` / `generateLessonOccurrences` / `generateScheduledDates`) is the single source of truth for turning an enrollment's recurrence rule into `scheduled_dates` + `lesson_occurrences`. It's called from both `createEnrollment` and `previewEnrollmentSchedule` in `enrollmentResolvers.ts` — the preview path runs the same computation and simply never writes to the DB, so preview and save can't drift apart. Don't reimplement schedule generation elsewhere; extend `computeSchedule`'s helpers instead.
- `scheduled_dates[i]` and `lesson_occurrences[i]` on `Enrollment` are paired **by index** (`lesson_occurrences[i].sequence` = 1-based position of `scheduled_dates[i]`) for O(1) lookup — keep them in lockstep in any code that mutates one.
- `calendarMonthView` (`src/app/api/graphql/resolvers/calendarResolvers.ts`) deliberately does **not** reuse the preview's pairing logic — it has different concerns (multiple enrollments, month filtering, reconciling live completed/skipped status). This divergence from `computeSchedule` is intentional, not drift to "fix."
- **Auto-rescheduling**: `processOverdueLessons` runs at the top of `calendarMonthView`/`calendarDayView`, before data is fetched. It finds the first pending occurrence whose date has passed (today only counts as overdue after a per-student `lesson_cutoff_time` cutoff, default `20:00`, from `src/models/Student.ts`), splices overdue dates out of `scheduled_dates`, and regenerates that many dates forward from today using the enrollment's existing pattern. No cron job — it's a lazy check-on-load, intentionally.
- Lesson completion status (`pending | completed | skipped`) is tracked **per lesson**, not per occurrence (a `lesson_rate` ≥ 1 can bundle multiple lessons per occurrence). Valid transitions live in a `statusActions` lookup rather than being hardcoded per button.
- **Known invariant gap** (see `docs/reschedule-remaining-on-backdate.md` and `docs/TASKS.md` for full detail): a completed lesson's scheduled date is *supposed* to be immutable, but `processOverdueLessons`/`updateEnrollment`'s schedule-changed branch can still silently reassign a `scheduled_dates` slot behind an already-completed lesson. Month View works around this by placing completed lessons via their own `completed_date` rather than the occurrence's date slot, but the underlying data-layer invariant isn't enforced yet — be careful with any change that touches `scheduled_dates` splicing.
- All "what day/time is it" logic must go through `src/utils/dateUtils.ts` (`familyNow()` / `familyToday()` / `familyTodayAsDate()`) and the `FAMILY_TIMEZONE` constant (`src/utils/constants.ts`, `'America/Edmonton'`) — never the browser's or server's ambient clock/timezone directly. This was a real bug class (UTC-vs-family-timezone mismatches in cutoff checks and completion dates); see `docs/TASKS.md` history.

### Frontend structure

- Feature areas live under `src/app/<feature>/` with their own `components/`, `api.ts` or `api/*.graphql.ts`, and sometimes `hooks/`. `layout.tsx` per feature area wires up any feature-scoped providers.
- `src/app/calendar/components/` (`CalendarGrid`, `DayCell`, `MonthTopBar`) is shared as-is between the live `/calendar` page and the enrollment preview modal (`src/app/enrollments/components/PreviewCalendar.tsx`) — same rendering, different fetch strategy (live calendar refetches per month since data can change server-side; preview fetches the whole projected schedule once since a not-yet-saved schedule can't change under the user).
- `src/app/testing/` is a standalone dnd-kit drag-and-drop prototype/sandbox, unrelated to the production courses tree in `src/app/courses/components/lessons-tree/` — don't confuse the two when searching for tree/drag-drop logic.
- Migration scripts (`scripts/*.ts`, run via `npx tsx`) are deliberately excluded from the production Docker image (`Dockerfile`'s `runner` stage only copies `public`, `.next`, `node_modules`, `package.json`) — see `docs/RUNNING_MIGRATIONS.md` for how they're actually run against prod (throwaway container on the `homeschool-net` Docker network, `--env-file` pointed at the prod env, `npm ci --include=dev` to avoid `NODE_ENV=production` silently skipping `dotenv`).

## Docs worth reading before larger changes

- `README.md` — architecture diagrams and full narrative (source for most of the above).
- `docs/TASKS.md` — living backlog and change history, written to be read cold; check it for context on why something is shaped the way it is, and update it when shipping backlog items.
- `docs/ENROLLMENT_SYSTEM_DESIGN.md`, `docs/calendar-design.md`, `docs/custom-calendar-events.md`, `docs/reschedule-remaining-on-backdate.md` — design docs for those subsystems.
- `docs/RUNNING_MIGRATIONS.md` — runbook for one-off scripts against production.
- `docs/docker-tutorial.md`, `docs/github-actions-tutorial.md` — learning-oriented walkthroughs of this repo's Docker and GitHub Actions setup (the maintainer is using this project to learn CI/CD and GCP; keep them accurate when changing workflows).
- `docs/public-deploy.md` — deployment plan/notes (currently being edited on this branch).
