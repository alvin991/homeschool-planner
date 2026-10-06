# Public Deploy — GCP Cloud Run + amaska.ca

Living design doc for taking the app from LAN/self-hosted-only to reachable
on the public internet. Written to be readable by any AI assistant or human
picking up the project cold — no prior conversation needed.

Last updated: 2026-10-06

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
  was never part of the deploy path. **What actually happened
  (2026-10-04):** instead of rewriting `deploy.yml` in place, the Cloud Run
  workflow was added as a *separate* file, `deploy-cloudrun.yml`, so the
  self-hosted deploy keeps working until cutover. `deploy.yml` gets deleted
  in Phase 4 rather than rewritten.

## What this replaces

- `docker-compose.prod.yaml` and the self-hosted-runner path in
  `.github/workflows/deploy.yml` stop being used for prod once cutover
  (Phase 4) is done. `docker-compose.yaml` (local dev) is unaffected.
- **Added 2026-10-04:** `.github/workflows/deploy-cloudrun.yml` is a new,
  separate manual-trigger workflow for deploying to Cloud Run — deliberately
  *not* a replacement of `deploy.yml` yet. Both exist side by side until
  Phase 4 cutover is a deliberate decision, not an accidental side effect of
  this file existing; `deploy.yml` still deploys the self-hosted app your
  family actually uses day to day in the meantime.
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

## GitHub Actions Workload Identity Federation setup (done 2026-10-04)

One-time GCP-side setup so `.github/workflows/deploy-cloudrun.yml` can
authenticate to GCP without a long-lived service account key stored as a
GitHub secret (the "Decisions locked" CI/CD choice above). **Workload
Identity Federation (WIF)**, in plain terms: GitHub's own OIDC token (which
every Actions run gets for free, scoped to that specific repo/workflow) is
exchanged for short-lived GCP credentials, *if and only if* GCP has been
told in advance to trust tokens from this exact repo. No secret ever has to
be generated, copied, or rotated — there's nothing to leak.

Created, in order:

```bash
PROJECT=homeschool-planner-509220
PROJECT_NUMBER=616908089248

# 1. A dedicated identity for GitHub Actions to act as (not the default
#    compute service account — narrower, single-purpose, easy to audit).
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer (WIF)" \
  --project=$PROJECT

# 2. A pool — a container for external (non-Google) identity providers.
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions pool" \
  --project=$PROJECT

# 3. A provider inside that pool — trusts GitHub's OIDC issuer specifically,
#    and --attribute-condition restricts it to tokens asserting THIS repo
#    (without it, any GitHub repo anywhere could claim this identity).
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='alvin991/homeschool-planner'" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --project=$PROJECT

# 4. Let that specific repo's tokens impersonate the service account from
#    step 1 (the actual "trust" link between GitHub and this identity).
gcloud iam service-accounts add-iam-policy-binding \
  "github-deployer@${PROJECT}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/alvin991/homeschool-planner" \
  --project=$PROJECT

# 5. Grant that service account only what it needs to build + deploy —
#    not roles/editor or similar broad grants.
for ROLE in roles/run.admin roles/artifactregistry.writer roles/cloudbuild.builds.editor roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:github-deployer@${PROJECT}.iam.gserviceaccount.com" \
    --role="$ROLE"
done

# 6. Added 2026-10-06 after the first CI runs of deploy-cloudrun.yml failed
#    without them — see "Extra deployer grants" below for which error each
#    one fixed.
for ROLE in roles/serviceusage.serviceUsageConsumer roles/storage.bucketViewer roles/logging.viewer; do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:github-deployer@${PROJECT}.iam.gserviceaccount.com" \
    --role="$ROLE"
done
# Scoped to Cloud Build's source-staging bucket only, not project-wide storage.
gcloud storage buckets add-iam-policy-binding gs://${PROJECT}_cloudbuild \
  --member="serviceAccount:github-deployer@${PROJECT}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

`roles/iam.serviceAccountUser` (step 5) deserves a note: this lets
`github-deployer` *act as* the Cloud Run runtime service account
(`${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`) when deploying —
without it, `gcloud run deploy` fails the same way step 7 of the manual
deploy walkthrough did, just one layer up (the deployer, not the running
container, needs the grant this time).

**Extra deployer grants (step 6), added 2026-10-06.** The original four
roles were enough to start a build but not to finish one — the first CI
runs of `deploy-cloudrun.yml` failed in `gcloud builds submit` three times
before succeeding:

| Error | Fix |
|---|---|
| `The user is forbidden from accessing the bucket [homeschool-planner-509220_cloudbuild]` (message suggests `serviceusage.services.use`) | `roles/serviceusage.serviceUsageConsumer` (project) + `roles/storage.admin` on the `_cloudbuild` bucket only, so it can upload the source tarball |
| Same bucket error again | `roles/storage.bucketViewer` (project) — `gcloud builds submit` lists the project's buckets to confirm the default `<project>_cloudbuild` bucket really belongs to this project (anti-squatting check), and `storage.buckets.list` is project-level, so the bucket-scoped grant above doesn't cover it. This was the real fix for the bucket error. |
| `This tool can only stream logs if you are Viewer/Owner of the project` — build actually **succeeded** (check `gcloud builds describe <id>`), but `gcloud` exited non-zero so the deploy step was skipped | `options: logging: CLOUD_LOGGING_ONLY` in `cloudbuild.yaml` + `roles/logging.viewer` (project), instead of granting the broad project `roles/viewer` |

`serviceUsageConsumer` may turn out to be unnecessary — the error message
pointed at it, but `bucketViewer` is what actually unblocked the upload, and
the two were never tested separately. Harmless to keep (it only allows
*using* already-enabled APIs, not enabling/disabling them); remove it and
re-run a deploy if you ever want the absolute minimum set.

The provider's full resource name (needed by `google-github-actions/auth` in
the workflow) is retrieved via:
```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" --workload-identity-pool="github-pool" --project=$PROJECT \
  --format="value(name)"
# -> projects/616908089248/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```
Both this and the service account email are hardcoded directly in
`deploy-cloudrun.yml` rather than kept as GitHub repo variables — neither is
a secret (the attribute condition in step 3 is what actually enforces trust,
not secrecy of the name), so a repo variable would add setup steps without
adding security.

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

### Phase 2 — Cloud Run deploy (no login yet — keep the URL unguessable/unshared) — DONE 2026-10-06
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
   setup](#local-gcloud-cli-setup-devcontainer) above for why. **Done
   2026-10-04:** use the versioned `cloudbuild.yaml` at the repo root
   (`gcloud builds submit --config=cloudbuild.yaml --substitutions=...`)
   instead of the ad-hoc `--tag=` shorthand used for the very first manual
   build — the shorthand has no way to pass `--build-arg`, which step 6
   below now needs.
3. **Done 2026-09-22** (manually — see "First deploy" below; automated
   2026-10-06 via `deploy-cloudrun.yml`). `gcloud run deploy` pointing at
   that image. Put `MONGODB_URI` in Secret Manager and mount it as an env
   var — Cloud Run supports this directly, no `env_file` juggling needed.
4. **Done 2026-09-22.** Set `min-instances=0`. Confirm the generated
   `*.run.app` URL works end-to-end.
5. Don't share this URL with anyone yet or map the custom domain — there's
   no login at this point.
6. **Done 2026-10-04 for the Cloud Run path** (backlog
   [#20](TASKS.md) — was numbered #19 when this line was first written,
   renumbered since). `calendar/page.tsx`'s old `NODE_ENV`-based
   `DEV_STUDENT_ID`/`PROD_STUDENT_ID` switch is replaced with a single
   `process.env.NEXT_PUBLIC_DEFAULT_STUDENT_ID` read. Wired through as a
   proper build arg: `Dockerfile`'s `builder` stage takes `ARG
   NEXT_PUBLIC_DEFAULT_STUDENT_ID` (defaulted to the current real student
   ID, `6a09362f9289b2cc08b29c47` — all three environments, local/
   self-hosted/Atlas, share this same ID as of 2026-10-04), and
   `cloudbuild.yaml` passes it explicitly via `--build-arg` so it can be
   overridden per-build without editing the Dockerfile.

   **Scope note:** this fixes the *Cloud Run* build path generically (the
   value now flows through `cloudbuild.yaml`'s substitutions, not a
   hardcoded literal). `docker-compose.prod.yaml`'s self-hosted build still
   has no build-arg plumbing of its own — it only works today because the
   Dockerfile's `ARG` default happens to match the real ID. That's
   intentional for now (self-hosted is mid-retirement per Phase 4, not
   worth the full 4-file fix TASKS.md #20 originally scoped), but means the
   self-hosted path would silently go stale if the student ID ever changes
   before full cutover — update the Dockerfile default too if that
   happens.

**Phase 2 closed 2026-10-06.** First successful CI deploy: Actions →
**Deploy (Cloud Run)** → Run workflow on `main` at `3c57edf`, producing
Cloud Run revision `homeschool-planner-00003-qq2` serving image tag
`3c57edf…` (every image is tagged with the commit SHA it was built from, so
`gcloud run services describe homeschool-planner --region=us-west1
--format="value(spec.template.spec.containers[0].image)"` tells you exactly
which commit is live). Verified `/calendar` returns 200 and the student ID
build arg is baked into the calendar page's client JS chunk. Getting there
took three extra IAM grants and a `cloudbuild.yaml` logging change — see
"Extra deployer grants" in the WIF setup section above. Next: Phase 3.

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
3. Smoke-test end-to-end on the real domain with the login gate on. Steps
   1-3 can happen any time; they don't touch the family's live data.
4. **Final data copy — the actual cutover moment** (added 2026-10-06). Atlas
   only holds the one-off copy from Phase 1 (2026-09-22); the family has
   kept writing to `homeschool-mongo` via the self-hosted app since. Steps
   4 and 5 must happen back to back so nobody writes to the old DB after
   the copy:
   - pick a quiet time and ask the family not to use the home app for a bit
   - `mongodump` `homeschool-mongo` to an out-of-band backup and keep it
   - `mongodump` → `mongorestore --drop` into Atlas (`--drop` replaces the
     stale Phase 1 copy and any test clicks made on the `*.run.app` URL),
     following the [migration safety checklist](TASKS.md#working-agreements)
     — log the target host/DB name before writing
   - open the domain and confirm recently completed lessons show up
5. Switch over: tell the family to use `homeschool.amaska.ca` from now on,
   and stop running **Deploy (self-hosted)**.
6. Retire the old path once Atlas has been the source of truth for a while:
   delete `deploy.yml` and `docker-compose.prod.yaml` (local
   `docker-compose.yaml` for dev is unaffected), unregister the Windows
   self-hosted runner, and decommission `homeschool-mongo`. Set up the
   periodic Atlas `mongodump` from Phase 1 step 4 before decommissioning —
   Atlas M0 has no backups of its own, so until then the old container is
   effectively the only fallback copy of the data.

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

**Update 2026-10-06:** the env-var cleanup and the one-click deploy are both
done — see Phase 2 above. The one-click deploy ended up as a separate
`deploy-cloudrun.yml` rather than a rewrite of `deploy.yml`.

## How a one-click CI deploy works (2026-10-06, narrated walkthrough)

The "First deploy" section above is the *manual* path: `gcloud` commands run
by hand from the devcontainer, as `alvin991@gmail.com`. This section is the
same journey done by `.github/workflows/deploy-cloudrun.yml`, step by step,
with the file and line that does each step. Read it alongside the workflow
file. (For GitHub Actions basics — what a workflow, job, step and runner
are — see [github-actions-tutorial.md](github-actions-tutorial.md) first.)

```
 You click "Run workflow" (Actions → Deploy (Cloud Run), branch: main)
   │
   ▼
 GitHub-hosted Ubuntu VM ─ 1. checkout code at the chosen commit
   │                       2. ask GitHub for an OIDC token ("I am a run of alvin991/homeschool-planner")
   │                       3. trade it with GCP for short-lived github-deployer credentials (WIF)
   │                       4. gcloud builds submit ──────────┐
   │                                                         ▼
   │                                   Cloud Storage: <project>_cloudbuild bucket (source .tgz)
   │                                                         ▼
   │                                   Cloud Build: runs cloudbuild.yaml → docker build
   │                                                         ▼
   │                                   Artifact Registry: image tagged :<commit sha>
   │                       5. deploy-cloudrun action ────────┐
   │                                                         ▼
   │                                   Cloud Run: new revision from that image,
   │                                   MONGODB_URI mounted from Secret Manager,
   │                                   100% of traffic moved to it
   ▼
 6. "Show deployed URL" prints the *.run.app URL
```

1. **A fresh VM starts and checks out the code.** `runs-on: ubuntu-latest`
   means GitHub lends a brand-new Linux VM for this one job and deletes it
   afterward — unlike `deploy.yml`, which runs on your own Windows machine.
   `actions/checkout@v4` downloads the repo at the commit the run was
   started from (`github.sha`). Nothing from previous runs survives on
   this VM, which is why every run rebuilds from scratch.

2. **GitHub hands the job an identity token.** `permissions: id-token: write`
   in the workflow lets the job request an **OIDC token** from GitHub — a
   short-lived, GitHub-signed statement like *"this is a workflow run of
   repo `alvin991/homeschool-planner`, ref `refs/heads/main`"*. It's not a
   GCP credential yet; it's proof of *who is asking*.

3. **GCP trades that token for real, temporary credentials.**
   `google-github-actions/auth@v2` sends the OIDC token to GCP. GCP checks
   it against the WIF setup above: is it signed by GitHub
   (`--issuer-uri`)? Is it from *this* repo (`--attribute-condition`)? Is
   this repo allowed to act as `github-deployer` (the
   `workloadIdentityUser` binding)? If all yes, GCP issues an access token
   for `github-deployer`, valid for about an hour. The action writes it to a
   `gha-creds-*.json` file — you can see that path in the run log as
   `GOOGLE_APPLICATION_CREDENTIALS` — and every later `gcloud` command in
   the job uses it. **No password or key is stored anywhere**: that's the
   whole point of WIF. The file is deleted by the "Post Run
   google-github-actions/auth" cleanup step.

4. **The image is built by Cloud Build, not on the VM.**
   `gcloud builds submit --config=cloudbuild.yaml` does three things:
   - **Packs and uploads the source.** It tars the checked-out repo
     (honoring `.gitignore`, since there's no `.gcloudignore` — that's the
     log line "Some files were not included in the source upload") and
     uploads it to the `homeschool-planner-509220_cloudbuild` storage
     bucket. This is the step that needed the extra storage grants.
   - **Starts a build** on Google's machines, which follows
     `cloudbuild.yaml`: one `docker build` of the `Dockerfile`'s `runner`
     stage, passing `NEXT_PUBLIC_DEFAULT_STUDENT_ID` as a `--build-arg`.
     The build itself runs as the **compute** service account (see "Who's
     who" below), not as `github-deployer`.
   - **Pushes the image** to Artifact Registry, tagged with the commit SHA
     (`_IMAGE_TAG=${{ github.sha }}`), and waits, streaming the build's
     logs into the GitHub run (that's what `logging: CLOUD_LOGGING_ONLY` +
     `roles/logging.viewer` made possible). About 5 minutes, mostly
     `npm ci` and `next build`.

5. **Cloud Run gets a new revision.**
   `google-github-actions/deploy-cloudrun@v2` tells Cloud Run: run *this*
   image for service `homeschool-planner`. Cloud Run creates a new
   **revision** — an immutable snapshot of "this image + these settings"
   (named like `homeschool-planner-00003-qq2`) — mounts the `mongodb-uri`
   secret as the `MONGODB_URI` env var, starts it, and once it's healthy
   moves 100% of traffic to it. Old revisions are kept (not running, just
   remembered), which is what makes rollback a one-liner — see "Operating
   it" below.

6. **The run prints the URL** and the cleanup ("Post Run") steps delete the
   credentials file. The VM is then thrown away.

### Who's who: the four identities involved

Most permission errors in this project have come from the *wrong identity*
lacking a grant, so it's worth knowing which one is acting at each moment:

| Identity | What it is | Acts when… | Key permissions |
|---|---|---|---|
| `alvin991@gmail.com` | You, a human | You run `gcloud` in the devcontainer | `roles/owner` — can do anything, which is why manual commands "just work" and hide missing grants |
| `github-deployer@…iam.gserviceaccount.com` | Robot account for CI, created for WIF | Steps 3–5 above, inside the GitHub run | Only the 8 grants listed in the WIF setup section |
| `616908089248-compute@developer.gserviceaccount.com` | GCP's default compute robot account | **Building** the image in Cloud Build *and* **running** the app in Cloud Run | `roles/editor` (project-wide default) + `secretAccessor` on `mongodb-uri` |
| `616908089248@cloudbuild.gserviceaccount.com` | Cloud Build's *legacy* robot account | Not used by our builds — newer projects default to the compute account above | (shown in the IAM policy; ignore) |

`roles/iam.serviceAccountUser` on `github-deployer` is the bridge between
rows 2 and 3: it lets the deployer tell Cloud Run *"run this revision as the
compute account"*. Check which account a build used with
`gcloud builds list --limit=1 --format="value(serviceAccount)"`.

### Operating it: what's live, logs, rollback

**Which commit is live?** Every image is tagged with its commit SHA, so:
```bash
gcloud run services describe homeschool-planner --region=us-west1 \
  --format="value(spec.template.spec.containers[0].image)"
# → …/homeschool-planner:3c57edf56d8579a5f9cea7124858cb32ae381fe9

git show --stat 3c57edf           # what that commit is
git log --oneline 3c57edf..main   # what's merged but NOT deployed yet
```
Or in the console: **Cloud Run → homeschool-planner → Revisions** (top row
is serving). Or in GitHub: the newest green run of **Deploy (Cloud Run)**.

**Reading the app's logs** (errors, `console.log` output from resolvers):
```bash
gcloud run services logs read homeschool-planner --region=us-west1 --limit=50
```
Console equivalent: **Cloud Run → homeschool-planner → Logs**.

**Rolling back a bad deploy.** You don't need to rebuild anything — old
revisions still exist, so just move traffic back:
```bash
gcloud run revisions list --service=homeschool-planner --region=us-west1   # find the previous good one
gcloud run services update-traffic homeschool-planner --region=us-west1 \
  --to-revisions=homeschool-planner-00002-vld=100
```
This takes seconds. Traffic now stays **pinned** to that revision. Once a
fix is merged and deployed, unpin it so the newest revision serves again,
then confirm with `describe` that traffic shows `latestRevision: true`:
```bash
gcloud run services update-traffic homeschool-planner --region=us-west1 --to-latest
```
Rollback only changes **code**. It doesn't undo **data** changes the bad
revision made in Atlas — for that you need a `mongodump` backup.

**GitHub says the build step failed — did it really?** `gcloud builds submit`
can fail *after* the build finished (that's exactly what the
log-streaming error did on 2026-10-06). Check Cloud Build's own verdict:
```bash
gcloud builds list --limit=3     # STATUS column: SUCCESS / FAILURE / WORKING
gcloud builds describe <BUILD_ID> --format="value(status)"
```
If the image built but the job failed, the deploy step was **skipped**, so
nothing changed on Cloud Run. Fix the cause and run the workflow again.

**Re-run vs. a new run.** GitHub's **Re-run jobs** repeats the *same
commit*, including the old copies of `deploy-cloudrun.yml` and
`cloudbuild.yaml`. Re-run is right when only something *outside* the repo
changed (e.g. you just added an IAM grant). If you changed a file in the
repo, merge it and start a **new** run with **Run workflow** instead.

**Cost check.** Console → **Billing → Reports**, filtered to this project.
Expected: $0. The Budget Alert recommended in "Decisions locked" emails you
if not — check **Billing → Budgets & alerts** that it actually exists.

## Reference: GCP IAM, and how to add/rotate a Secret Manager secret

Written after digging into why step 7 above happened, for re-reading whenever
a new secret needs adding later.

**What IAM is.** Every GCP resource — a secret, a Cloud Run service, a
storage bucket, the project itself — has an attached policy that answers one
question: *which identities can do which actions on this specific thing?* A
policy is a list of **bindings**, each one an (identity, role, resource)
triple:

- **Identity** — a human Google account, a **service account** (a robot
  identity a *service* like Cloud Run uses instead of a human logging in), a
  Google Group, or `allUsers` (the public internet).
- **Role** — a named bundle of permissions. `roles/secretmanager.secretAccessor`
  bundles exactly one (read a secret's value); broad legacy roles like
  `roles/editor` bundle hundreds across every service. Prefer the narrowest
  predefined role, scoped to the single resource that needs it — not a
  project-wide grant.
- **Resource** — what the policy attaches to. Policies exist at every level
  of GCP's hierarchy (**Organization → Folder → Project → individual
  resource**) and are inherited downward. Granting a role directly on one
  secret (as done below) is the narrowest possible scope.

**GCP defaults to deny.** No identity can touch a resource unless some
binding, somewhere in that hierarchy, explicitly grants it. That's why step 7
above failed instead of silently working: Cloud Run's auto-created service
account (`616908089248-compute@developer.gserviceaccount.com`, GCP's default
per-project "Compute Engine default service account") started with zero
bindings on the new secret. Creating the secret (step 5) only made the
*resource* exist — it granted access to no one. The account used to run
`gcloud secrets create` had broad project-level rights already (the project
was created under it), which is why creating/reading it from the CLI "just
worked" and made the missing grant easy to miss — the *running app* is a
completely separate identity that needed its own explicit binding.

**How to add a new secret** (e.g. a new value landing in `.env` that Cloud
Run needs to read):

```bash
# 1. Create it — pipe the value in, never pass it as a CLI arg (shell history):
grep '^NEW_VAR_NAME=' .env | cut -d '=' -f2- | \
  gcloud secrets create new-secret-name \
    --data-file=- \
    --replication-policy=automatic \
    --project=homeschool-planner-509220

# 2. Grant the Cloud Run service account read access — every new secret
#    needs this once, it's the step that bit step 7 above:
gcloud secrets add-iam-policy-binding new-secret-name \
  --member="serviceAccount:616908089248-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=homeschool-planner-509220

# 3. Wire it into the running service. Use --update-secrets (merges) not
#    --set-secrets (replaces the whole mapping and would silently drop
#    MONGODB_URI):
gcloud run services update homeschool-planner \
  --region=us-west1 \
  --update-secrets=NEW_VAR_NAME=new-secret-name:latest
```

Secret names are lowercase-with-hyphens (`new-secret-name`), separate from
the env var name it's injected as (`NEW_VAR_NAME`) — that mapping happens in
step 3.

**How to rotate an existing secret's value** (e.g. changing the Atlas
password later):

```bash
printf '%s' 'new-value' | gcloud secrets versions add mongodb-uri --data-file=-
```

Gotcha: a running Cloud Run **revision** reads the secret once at container
startup and doesn't re-check `:latest` while it keeps running. A new secret
version has no effect until a new revision is deployed — trigger one with a
no-op `gcloud run services update` (or a real redeploy) right after rotating.

## Open questions (not blocking — decide when you get there)

- Whether `homeschool-mongo` / the Windows self-hosted runner get
  decommissioned immediately after cutover or kept as a fallback.
- Exact login session mechanism (hand-rolled signed cookie vs. a small
  library) — deferred to Phase 3, decide then.
