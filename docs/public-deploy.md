# Public Deploy — GCP Cloud Run + amaska.ca

Living design doc for taking the app from LAN/self-hosted-only to reachable
on the public internet. Written to be readable by any AI assistant or human
picking up the project cold — no prior conversation needed.

Last updated: 2026-09-17

## Context

Wife asked whether the app could go online so she (and eventually their
daughter) can reach it from outside the house. The app currently deploys via
a self-hosted GitHub Actions runner (Windows machine, Docker Desktop) running
`docker-compose.prod.yaml`, with MongoDB in a sibling container
(`homeschool-mongo`) on the `homeschool-net` Docker network — see
`.github/workflows/deploy.yml`. This story replaces that path for prod.

Data isn't sensitive (a family's course/lesson schedule), so this is
deliberately **not** a full auth system — see "Decisions locked" below.

## Decisions locked (2026-09-17)

- **Hosting: GCP Cloud Run**, not Render/Railway or staying self-hosted.
  Deliberate choice to get hands-on GCP practice, since the maintainer's day
  job (ATB) already uses GCP — a low-stakes personal project is a good place
  to learn it. Cost at 1-2 users' real-world traffic is effectively **$0**:
  Cloud Run's free tier is 2M requests/month, 360k GB-seconds, 180k
  vCPU-seconds, and `min-instances=0` means idle time costs nothing. Note
  GCP still requires a billing account (credit card on file) even to use
  only free-tier resources — set a **Budget Alert** (e.g. trigger at $1)
  when creating the project, as a safety net against a misconfiguration
  causing an unexpected charge, not because any is expected.
  `min-instances=0` also means occasional cold starts — a few extra seconds
  on the first request after idle time while the container spins up. Fine
  trade-off for $0 cost at 1-2 users; noted here so it doesn't get mistaken
  for a bug later.
- **Database: MongoDB Atlas free tier (M0, 512MB)** replaces the
  `homeschool-mongo` container. Only `MONGODB_URI` changes — no schema
  change.
- **No per-user login.** Data isn't sensitive enough to justify real auth.
  Instead, a single shared password gate (Phase 3) exists only to stop
  casual/accidental data-messing by a random visitor who finds the URL — not
  to identify who did what.
- **CORS: no change needed.** The app is same-origin (Next.js serves its own
  GraphQL API from the same domain as the frontend), so there's no
  cross-origin request to allow in the first place. Just confirm nothing in
  the codebase sets a wildcard `Access-Control-Allow-Origin`.
- **Rate limiting: skipped for v1 on the general API.** Cloud Run can run
  more than one instance, so an in-memory limiter wouldn't be reliable
  there, and real traffic from a 2-user app is ~0 — low payoff for the
  complexity. Only the new login endpoint gets throttled (Phase 3), since
  that endpoint is the actual new attack surface the password adds.
- **Domain: `amaska.ca`** (already owned) — subdomain `homeschool.amaska.ca`
  mapped to the Cloud Run service via Cloud Run domain mapping (free,
  automatic TLS cert).
- **Collaboration mode:** project owner is implementing this himself (wants
  the hands-on GCP learning); reviewed as he goes — same mode as other big
  features (see "Working agreements" in [TASKS.md](TASKS.md)).
- **CI/CD: keep GitHub Actions, retarget it at Cloud Run.** Considered
  Cloud Run's own "Continuous Deployment" console setup (auto-creates a
  Cloud Build trigger off the GitHub repo, least manual setup) but decided
  against it — it'd leave deploy config partly in the GCP console instead
  of fully versioned in the repo, unlike everything else here. `deploy.yml`
  gets rewritten now (not deferred) to `runs-on: ubuntu-latest` using the
  official `google-github-actions/deploy-cloudrun` action, authenticating
  via Workload Identity Federation (no long-lived service account key
  stored as a GitHub secret). The MacBook stays dev-only either way — it
  was never part of the deploy path.

## What this replaces

- `docker-compose.prod.yaml` and the self-hosted-runner path in
  `.github/workflows/deploy.yml` stop being used for prod once cutover
  (Phase 4) is done. `docker-compose.yaml` (local dev) is unaffected.
- The standalone `homeschool-mongo` container gets decommissioned only after
  Atlas has been confirmed working in prod — don't delete it as part of
  Phase 1 or 2.

## Roadmap

### Phase 1 — MongoDB Atlas migration
1. Create a free M0 cluster, a DB user scoped to just this database, and
   network access (Cloud Run has no fixed egress IP on the free tier, so
   this likely means `0.0.0.0/0` + a strong generated password, unless a
   Serverless VPC Connector + Cloud NAT is set up for a static IP later).
   Pick an Atlas region close to (ideally the same cloud provider as) the
   Cloud Run region chosen in Phase 2 — mainly for latency, not cost, since
   free-tier egress between them is still free at this scale.
2. Get the `mongodb+srv://...` connection string. Point a local dev run at
   it first to confirm connectivity, then migrate the real data over
   (`mongodump` from `homeschool-mongo` → `mongorestore` into Atlas),
   following the existing [migration safety checklist](TASKS.md#working-agreements)
   — out-of-band backup first, log the DB name/host before writing, test on
   one record, dry run, verify the backup actually restores.
3. Confirm the app runs end-to-end against Atlas locally before touching any
   deploy infra.
4. **Atlas M0 has no automated backups** — that's an M2+ paid feature. If
   ongoing backups matter (they have so far, per the safety checklist
   above), set up a periodic manual/cron `mongodump` against Atlas once
   it's live; don't assume Atlas is backing it up for you.

### Phase 2 — Cloud Run deploy (no login yet — keep the URL unguessable/unshared)
1. Enable the Artifact Registry and Cloud Run APIs on a GCP project.
2. Build the existing `Dockerfile`'s `runner` stage and push it to Artifact
   Registry (`gcloud builds submit`, or local `docker build` + `docker
   push`).
3. `gcloud run deploy` pointing at that image. Put `MONGODB_URI` in Secret
   Manager and mount it as an env var — Cloud Run supports this directly,
   no `env_file` juggling needed.
4. Set `min-instances=0`. Confirm the generated `*.run.app` URL works
   end-to-end.
5. Don't share this URL with anyone yet or map the custom domain — there's
   no login at this point.
6. **Do backlog [#19](TASKS.md) (proper env var management) here, not
   after.** The `NEXT_PUBLIC_*`-bakes-in-at-build-time problem it describes
   resurfaces in this new pipeline too: Cloud Build doesn't automatically
   forward env vars into the build the way `docker-compose.prod.yaml`'s
   `env_file:` did for the old path — it needs `--substitutions` or
   `--build-arg` explicitly. Since the build step is being redone anyway
   for Cloud Run, fix it properly now instead of carrying the old
   `NODE_ENV`-based `DEV_STUDENT_ID`/`PROD_STUDENT_ID` switch in
   [`calendar/page.tsx`](../src/app/calendar/page.tsx) into the new setup.

### Phase 3 — Login gate + login-attempt throttling
1. Add a Next.js `middleware.ts` at the project root: any unauthenticated
   request redirects to a simple one-field password page.
2. Compare the submitted value against a hash stored in Secret Manager
   (read as a runtime env var) — never commit the plaintext password.
3. On success, set a signed, httpOnly, long-lived cookie (e.g. 30 days) so
   the wife/daughter aren't re-entering it constantly.
4. Throttle the login route itself (e.g. 5 attempts / 15 min per IP) — an
   in-memory counter is fine while the service realistically stays at 0-1
   instances; move to Upstash Redis (free tier) if that stops being true.

### Phase 4 — Domain + cutover
1. Verify `amaska.ca` ownership in Google Search Console under the GCP
   project.
2. Add the Cloud Run domain mapping for `homeschool.amaska.ca`; add the
   CNAME record Cloud Run provides at the registrar.
3. Smoke-test end-to-end on the real domain with the login gate on.
4. Retire the old path: stop the Windows self-hosted deploy, decommission
   `homeschool-mongo` once Atlas has been the source of truth for a while,
   and remove `docker-compose.prod.yaml` (local `docker-compose.yaml` for
   dev is unaffected). `deploy.yml` itself is rewritten as part of Phase 2/4
   rather than kept around — see the CI/CD decision above.

## Open questions (not blocking — decide when you get there)

- Whether `homeschool-mongo` / the Windows self-hosted runner get
  decommissioned immediately after cutover or kept as a fallback.
- Exact login session mechanism (hand-rolled signed cookie vs. a small
  library) — deferred to Phase 3, decide then.
