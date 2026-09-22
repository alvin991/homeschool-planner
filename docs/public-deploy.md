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
  change. Considered GCP-native **Firestore** instead (would keep
  everything inside one GCP project/billing, no public IP allowlisting) but
  decided against it: Firestore isn't MongoDB-wire-protocol compatible, so
  it'd mean rewriting every Mongoose schema/resolver and redesigning the
  scheduling engine's queries around Firestore's more limited query model —
  a multi-day rewrite with real regression risk on an app the family uses
  daily, for a skill that (per job-hunting experience) shows up far less in
  postings than Cloud Run/IAM/GKE/BigQuery — where Phases 2 and 4 already
  spend the GCP-learning time. Revisit only as a throwaway side project, not
  by migrating production data through it.
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

## Local gcloud CLI setup (devcontainer)

The devcontainer (`docker-compose.yaml`'s `dev` service, Debian-based
`node:20` image) doesn't ship with the `gcloud` CLI by default — it has to be
installed manually per container instance. As of 2026-09-20 it's installed
and authenticated as `alvin991@gmail.com`, targeting the
`homeschool-planner-509220` GCP project (created, but no relevant APIs
enabled yet — Phase 2 below hasn't started).

**This setup lives in the container's writable layer, not a mounted volume**
(only `.:/workspace` and the Mongo `db_data` volume are declared in
`docker-compose.yaml`). It survives a plain `docker stop`/`start` of the same
container, but a devcontainer **rebuild** (recreating the container from the
image) wipes it — `gcloud` and the login both disappear and need redoing. If
that happens, run:

```bash
# Install (already root in this container — no sudo)
apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list
apt-get update && apt-get install -y google-cloud-cli

# Log in (device-code flow — no browser available in this container)
gcloud auth login --no-launch-browser
# Prints a URL: open it on your phone/laptop, sign in, paste the resulting code back here.

# Point at this project
gcloud config set project homeschool-planner-509220
```

Deliberately not baked into the `Dockerfile`'s `deps` stage (which would
survive rebuilds) — decided to keep the dev image lean, since `gcloud` is
only needed for the initial manual Phase 2 deploy below and occasional
ad-hoc admin (checking logs, rotating secrets) afterward, not routine
day-to-day dev work. Revisit if re-running this setup after every rebuild
becomes annoying enough to be worth the tradeoff.

## Roadmap

### Phase 1 — MongoDB Atlas migration
1. Create a free M0 cluster, a DB user scoped to just this database, and
   network access (Cloud Run has no fixed egress IP on the free tier, so
   this likely means `0.0.0.0/0` + a strong generated password, unless a
   Serverless VPC Connector + Cloud NAT is set up for a static IP later).
   Pick an Atlas region close to (ideally the same cloud provider as) the
   Cloud Run region chosen in Phase 2 — mainly for latency, not cost, since
   free-tier egress between them is still free at this scale.

   **Confirmed 2026-09-22, hit exactly as predicted above**: first Cloud Run
   deploy failed at runtime with `Could not connect to any servers in your
   MongoDB Atlas cluster` — Cloud Run's shared, non-fixed egress IP pool
   means there's no single IP worth allowlisting. Fix, in the **Atlas web
   console** (no `gcloud`/CLI equivalent — this is MongoDB's own UI):
   Atlas project → left sidebar **Network Access** → **Add IP Address** →
   **Allow Access from Anywhere** (fills in `0.0.0.0/0`) → add a comment
   noting why (e.g. "Cloud Run — no fixed egress IP") → confirm, wait
   ~1 minute for the rule to go active. No redeploy needed — Cloud Run just
   succeeds on its next connection attempt once the rule is live. Security
   here rests entirely on the DB user's generated password, not IP
   restriction — consistent with the decision already made above.
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
1. **Done 2026-09-22.** Enable the Artifact Registry, Cloud Run, Secret
   Manager, and Cloud Build APIs on the `homeschool-planner-509220` GCP
   project (Secret Manager needed by step 3 below and Cloud Build by step 2
   below — enabled together here to avoid a second round trip):
   ```bash
   gcloud services enable \
     run.googleapis.com \
     artifactregistry.googleapis.com \
     secretmanager.googleapis.com \
     cloudbuild.googleapis.com \
     --project=homeschool-planner-509220
   ```
   Verify:
   ```bash
   gcloud services list --enabled --project=homeschool-planner-509220
   ```
   Enabling these also auto-enabled 4 dependency APIs GCP pulls in
   automatically (`iam.googleapis.com`, `iamcredentials.googleapis.com`,
   `pubsub.googleapis.com`, `containerregistry.googleapis.com`) — expected,
   no action needed.
2. Build the existing `Dockerfile`'s `runner` stage and push it to Artifact
   Registry. This container has no local Docker daemon, so use the
   Cloud-Build-based route (`gcloud builds submit`) rather than local
   `docker build` + `docker push` — see [Local gcloud CLI
   setup](#local-gcloud-cli-setup-devcontainer) above for why.
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

## First deploy: what actually happened (2026-09-22, narrated walkthrough)

Phase 1 and Phase 2 above are written as a terse roadmap; this section is the
same ground covered again as a narrated walkthrough, for re-reading later
while still learning GCP. The first real deploy went source code → live
`*.run.app` URL in 9 steps:

1. **Confirmed the tools were ready.** `gcloud` (Google's CLI for
   controlling a GCP account from the terminal) was already installed and
   logged in inside the devcontainer — see [Local gcloud CLI
   setup](#local-gcloud-cli-setup-devcontainer) above. Project
   `homeschool-planner-509220` already existed — a GCP **project** is the
   top-level container for billing, permissions, and every resource created
   below.

2. **Enabled the GCP services needed** (`gcloud services enable ...`). GCP
   projects don't have access to every product by default — each one is a
   separate on/off switch. Turned on **Cloud Run** (runs the app),
   **Artifact Registry** (stores the built container image), **Secret
   Manager** (stores the DB password), **Cloud Build** (builds the image on
   Google's servers, since this devcontainer has no Docker daemon). This
   auto-enabled 4 more dependency APIs (IAM, Pub/Sub, etc.) — expected, not
   something explicitly requested.

3. **Created an empty repository to hold the image**
   (`gcloud artifacts repositories create`). The app needs to be packaged
   as a **container image** — code + Node.js + every dependency, bundled so
   it runs identically anywhere — before it can be stored, it needs
   somewhere to live. This created that storage location (repository
   `homeschool-planner`, region `us-west1` — the GCP region geographically
   closest to Edmonton; there's no Western-Canada region).

4. **Built the image and pushed it there** (`gcloud builds submit
   --tag=...`). Read `Dockerfile`, ran the full multi-stage build (install
   deps → build Next.js → assemble the lean `runner` image) on Google's
   infrastructure rather than locally, pushed the result into the
   repository from step 3. ~5 minutes, ended `STATUS: SUCCESS`.

5. **Stored the database password safely** (`gcloud secrets create
   mongodb-uri`). The real Atlas connection string (from `.env`) needed to
   reach the running app without being baked into the image itself — Secret
   Manager is GCP's vault for this. Piped straight from `.env` into the
   secret via stdin, never printed to a terminal or written to a second
   file.

6. **Told Cloud Run to actually run the image** (`gcloud run deploy`). This
   creates the actual **Cloud Run service** — the named, running resource
   with a public URL. Flags used: `--allow-unauthenticated` (no Google
   login required to reach it — fine since there's no per-user auth system,
   just a future password gate in Phase 3), `--min-instances=0` (scale to
   zero cost when idle), `--set-secrets` (inject the Step 5 secret as the
   `MONGODB_URI` env var at runtime).

7. **Hit and fixed a permissions error.** First deploy attempt failed:
   Cloud Run runs the container under an automatic robot identity (a
   **service account**), which didn't yet have permission to read the
   Step 5 secret. Fixed with `gcloud secrets add-iam-policy-binding`,
   granting that service account the narrow "Secret Manager Secret
   Accessor" role — read access to that one secret, nothing else.

8. **Redeployed — service started, but couldn't reach the database.**
   MongoDB Atlas only accepts connections from allowlisted IPs, and Cloud
   Run has no single fixed IP to allowlist (shared, rotating
   infrastructure). Fixed on Atlas's own website (a separate product from
   GCP entirely, no `gcloud` equivalent) — see the Phase 1 note above for
   the exact console steps (Network Access → Allow Access from Anywhere).

9. **It worked** — confirmed live and reachable end-to-end against Atlas.

**Where this leaves things**, relative to the phases above: the *manual,
one-off* version of Phase 1 and Phase 2 is done — the app is live at its
`*.run.app` URL, unguessable/unshared for now. Still open: Phase 2's env-var
cleanup item (step 6 above), Phase 3 (password gate — right now this URL has
zero access control beyond obscurity), Phase 4 (domain mapping + retiring
the old self-hosted path), and separately, rewriting `deploy.yml` so this
becomes a one-click GitHub Actions deploy instead of manual `gcloud`
commands run by hand.

## Open questions (not blocking — decide when you get there)

- Whether `homeschool-mongo` / the Windows self-hosted runner get
  decommissioned immediately after cutover or kept as a fallback.
- Exact login session mechanism (hand-rolled signed cookie vs. a small
  library) — deferred to Phase 3, decide then.
