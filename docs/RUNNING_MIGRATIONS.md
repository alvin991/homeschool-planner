# Running a One-Off Migration Script Against Production

Runbook for running a CLI migration script (e.g. `scripts/migrate-lesson-status.ts`)
against the production database on the mini server. Written up after doing this
for the per-lesson-completion migration (v1.6.0 release, 2026-08-05).

## Why this is needed

Migration scripts live in `scripts/` and are deliberately **not** part of the
production Docker image — the `runner` stage in `Dockerfile` only copies
`public`, `.next`, `node_modules`, and `package.json`, not `scripts/` or `src/`.
So you can't `docker exec` into the running app container to run one.

The production Mongo container (`homeschool-mongo`) also isn't port-published
to the host — it's only reachable from inside the `homeschool-net` Docker
network, by containers attached to it.

The approach: spin up a **throwaway container** (deleted automatically on
exit) attached to `homeschool-net`, with the repo mounted into it, and run
the script from there. No need to install Node.js permanently on the mini
server just for occasional migrations.

## 0. Prerequisites

- Docker Desktop running on the mini server (it already is — it's what runs
  the app)
- A checkout of the repo on the mini server, at the commit you want to
  migrate against. Two options:
  - If the GitHub Actions self-hosted runner has deployed before, it likely
    already has a full checkout somewhere under its working directory. Find
    it by searching for a known file, e.g. in PowerShell:
    ```powershell
    Get-ChildItem -Path C:\ -Recurse -Filter "migrate-lesson-status.ts" -ErrorAction SilentlyContinue | Select-Object FullName
    ```
    (adjust the filename for whichever script you're running)
  - Otherwise, `git clone` the repo onto the mini server manually.
- **`cd` into the repo root — not the `scripts` subfolder.** The search
  above returns a path like
  `C:\actions-runner\_work\homeschool-planner\homeschool-planner\scripts\migrate-lesson-status.ts`.
  Strip off the trailing `\scripts\<filename>.ts` and `cd` into what's left —
  that's the folder containing `package.json`/`package-lock.json`, which
  `npm ci` needs. Double check with `Get-Location` before continuing; it
  should end in `...\homeschool-planner\homeschool-planner`, not
  `...\homeschool-planner\homeschool-planner\scripts`.
- This matters because of the next point: `${PWD}` in all the `docker run`
  commands below means "whatever folder you're currently in" — it's what
  gets mounted into the container. `cd` into the wrong folder and the
  container mounts the wrong thing (or an empty one), and `npm ci` has
  nothing to work from.

## 1. Find the production connection string

The script needs `MONGODB_URI`, which lives in the production env file used
by the deploy workflow (`docker-compose.prod.yaml`'s `env_file`).

Find its path via the GitHub repo variable that points to it:
**GitHub → your repo → Settings → Secrets and variables → Actions → Variables
tab → `DEPLOY_ENV_FILE`**. Its value is the absolute path on the mini server
(e.g. `C:\Users\you\homeschool.env`).

If you don't have access to check that, or forgot to set it as a variable,
search the mini server directly:
```powershell
Get-ChildItem -Path C:\ -Recurse -Filter "*.env" -ErrorAction SilentlyContinue | Select-Object FullName
```
Then open candidates and look for a `MONGODB_URI=` line.

## 2. Take an out-of-band backup first

Before running anything that writes, back up the relevant collection —
independent of any in-script/in-DB backup mechanism (e.g. an in-app
`EnrollmentBackup` collection isn't enough on its own; it lives in the same
DB it's supposed to protect).

Either:
- **MongoDB Compass** (if already connected to the mini server's DB): select
  the collection → Export Collection → full collection → **JSON** (not
  CSV — CSV flattens nested arrays/subdocuments and loses structure)
- **Or `mongodump` via a throwaway container** on the same network:
  ```powershell
  docker run --rm --network homeschool-net -v ${PWD}:/backup mongo:7 `
    mongodump --uri="<MONGODB_URI>" --collection=<collection-name> --out=/backup/pre-migration-<date>
  ```
  - `--rm` — delete the container once it exits
  - `--network homeschool-net` — attach to the same Docker network as the
    app/Mongo containers, so the hostname in `MONGODB_URI` (e.g.
    `homeschool-mongo`) resolves
  - `-v ${PWD}:/backup` — mount your current host folder into the
    container at `/backup`, so the dump ends up somewhere you can see it
    after the container is deleted (otherwise it'd vanish with the
    container)
  - `mongo:7` — official MongoDB image bundling the `mongodump` CLI (match
    the major version to your actual Mongo server version if it differs
    notably)

Doing both (Compass export + mongodump) is fine and gives redundant coverage.

## 3. Start the throwaway container for running the script

```powershell
docker run --rm -it --network homeschool-net --env-file "<path-to-production.env>" -v ${PWD}:/app -w /app node:20 bash
```

- `-it` — interactive shell, so you can run commands one at a time and see
  what happens (more reliable over remote desktop than chaining commands
  with `&&` in one line — multi-line PowerShell commands using backtick
  continuation are easy to mangle when pasted)
- `--env-file "<path>"` — injects the production env vars (including
  `MONGODB_URI`) into the container
- `-v ${PWD}:/app -w /app` — mounts your repo checkout into the container at
  `/app` and sets it as the working directory
- `node:20` — matches the Node version used elsewhere in this project
  (`Dockerfile`)
- `bash` — drop into an interactive shell instead of running a command
  directly

This container will show up in Docker Desktop with an auto-generated random
name (e.g. `nervous_keller`) since `--name` wasn't specified — that's
expected, purely cosmetic.

## 4. Install dependencies — watch for the `NODE_ENV=production` gotcha

Inside the container shell:
```bash
npm ci --include=dev
```

**Don't just run `npm ci`.** The production env file sets `NODE_ENV=production`
(needed for the app itself), and that same env var leaks into this install
step since we loaded it via `--env-file`. npm silently skips all
`devDependencies` — including `dotenv`, which migration scripts typically
need — whenever `NODE_ENV=production` is set, with **no error message**, just
a smaller install. This surfaces later as a confusing
`Cannot find module 'dotenv/config'` error when you try to run the script,
even though `npm ci` itself reported success. `--include=dev` forces dev
dependencies to install regardless of `NODE_ENV`.

`tsx` itself is not a declared dependency in `package.json` — it's invoked
via `npx tsx`, which will prompt to install it fresh the first time
(`Need to install the following packages: tsx@x.x.x. Ok to proceed? (y)`) —
that prompt is expected and unrelated to the `NODE_ENV` issue above.

## 5. Dry run

```bash
npx tsx scripts/migrate-lesson-status.ts --dry-run
```

Check the very first line of output: `Connected to: <db-name> (<host>)` —
confirm it's actually the production database/host before trusting anything
else the script prints. Then sanity-check the count/list of records it says
it would touch.

## 6. Single-record test

Pick one record (ideally a small/simple one) and actually write, without
`--dry-run`:
```bash
npx tsx scripts/migrate-lesson-status.ts --id=<one-record-id>
```
Then verify:
- In Compass: re-run/refresh the query (Compass can show a stale cached
  view) and confirm the document now has the new shape.
- In the app itself: load the relevant page for that record and confirm it
  renders correctly with no errors.

## 7. Full run

Once the single-record test checks out:
```bash
npx tsx scripts/migrate-lesson-status.ts
```

## 8. Clean up

Type `exit` in the container's shell (or close the window). Because it was
started with `--rm`, Docker deletes the container automatically the moment
it stops — no manual `docker rm` needed. The only thing left behind on the
mini server is `node_modules` inside your mounted repo checkout folder,
which is harmless to leave or delete.

## Deploy-vs-migrate ordering (script-specific, but a useful pattern)

For the per-lesson-completion migration specifically, the app code had to be
**deployed before** running the migration, not after — the old (previously
deployed) resolvers read fields directly at the shape the migration removes,
so migrating first would have broken things for whatever window the old code
was still serving. Check this kind of ordering dependency for any future
migration before assuming "migrate first" or "deploy first" is safe by
default — it depends on whether the old code can tolerate the new data shape,
and whether the new code can tolerate the old data shape, during the gap
between the two steps.
