# Docker, Compose & Devcontainer — a walkthrough of this repo

A from-scratch tutorial on `.env`, `Dockerfile`, `docker-compose`, containers,
volumes, networks, and the VS Code Dev Containers extension — using this
repo's actual files as the examples throughout, not generic samples.

## The mental model first

Four Docker concepts, and how they relate:

| Concept | What it is | This repo's example |
|---|---|---|
| **Image** | A read-only template: filesystem + metadata (built once, reused many times) | Built from [Dockerfile](../Dockerfile) |
| **Container** | A running (or stopped) instance of an image, with its own writable layer | `homeschool-app`, `homeschool-planner-mongo` |
| **Volume** | Persistent storage that survives a container being deleted, mounted into a container | `db_data` (Mongo's data) |
| **Network** | Lets containers reach each other by container name instead of IP | `homeschool-net` (prod) |

A **Dockerfile** describes how to *build an image*. A **docker-compose.yaml**
describes how to *run one or more containers* from images (building them if
needed) plus their volumes/networks/env. A **devcontainer.json** tells the
VS Code Dev Containers extension to use a specific compose file/service as
your actual coding environment instead of your host machine.

## 1. The Dockerfile — building an image

[Dockerfile](../Dockerfile) uses a **multi-stage build** — three `FROM`
stages that each build on the last, but only the final stage ships:

```dockerfile
FROM node:20 AS deps       # stage 1: install dependencies only
FROM node:20 AS builder    # stage 2: copy deps in, build the Next.js app
FROM node:20 AS runner     # stage 3: copy only build output + deps, this is what ships
```

Why split it up (line by line):

- **`deps` stage** (lines 2-9): copies only `package.json`/lockfiles first,
  then `npm ci`. Docker caches each instruction as a layer keyed on its
  inputs — as long as the lockfile doesn't change, this entire stage is
  skipped on rebuild, which is the single biggest speedup for iterative
  builds.
- **`builder` stage** (lines 12-17): copies the full source, pulls in
  `node_modules` from `deps`, runs `npm run build`. This stage produces
  `.next` (compiled Next.js output) but the stage itself is *thrown away* —
  none of its intermediate layers ship.
- **`runner` stage** (lines 20-35): starts fresh from `node:20` again and
  cherry-picks only `public`, `.next`, `node_modules`, `package.json` from
  `builder`. This is why the final image doesn't contain raw TypeScript
  source, dev dependencies, or build caches — smaller and slightly more
  secure.

Two different `docker build --target` values are used elsewhere in this repo
for two different purposes:

- [docker-compose.yaml](../docker-compose.yaml) (line 19) builds
  `target: deps` — dev doesn't want the built/runner stage at all, it just
  wants `node_modules` installed, then mounts live source over it (§3).
- [docker-compose.prod.yaml](../docker-compose.prod.yaml) (line 23) builds
  `target: runner` — the real, deployable production image.

A [.dockerignore](../.dockerignore) at the repo root keeps `COPY . .` (line
14) from sending the entire working directory into the build context on
every build — without it, that instruction would drag in `node_modules`
(737M), `.next` (191M), `.git`, and — worst case — `.env` or `data_backup/`
(real exported family data), any of which could slow builds or end up
baked into an image layer. The file's own comments explain why each entry
is there.

**Commands you'd run by hand** (Compose normally does this for you):

```bash
docker build -t homeschool-planner:local --target runner .
docker images                 # list built images
docker image prune            # delete dangling/unused images
```

## 2. `.env` — two completely different consumers

This is the part people usually get tangled on, and
[.env.example](../.env.example) actually documents it inline. There are
**two independent readers** of env files here, and they don't talk to each
other:

1. **Next.js itself** reads `.env` directly (not `.env.example`) for
   `npm run dev`/`npm run build` — this is Next's own built-in dotenv
   loading, nothing Docker-specific.
2. **Docker Compose's `env_file:` key** reads a file *on the host* and
   injects its `KEY=value` pairs as environment variables *inside the
   container* at container-start time. It has nothing to do with Next's own
   dotenv loading — Compose just sets OS-level env vars in the container,
   and if Next.js happens to also read `.env` inside that container, that's
   a second, separate mechanism doing something similar, not the same
   mechanism.

Where `env_file:` is used:

- `docker-compose.yaml` — both `db` (lines 6-7) and `dev` (lines 14-15) load
  `.env` from the repo root.
- `docker-compose.prod.yaml` — the `app` service (lines 31-32) loads
  `${DEPLOY_ENV_FILE:-.env}`. That `${...}` syntax is **Compose variable
  substitution**, resolved from the *host shell's* environment when you run
  `docker compose`, not from inside any container — so on the deploy runner,
  `DEPLOY_ENV_FILE=C:/path/to/production.env` (set in the host shell) tells
  Compose which file to read; locally it falls back to plain `.env`.

Critical distinction called out at the top of `docker-compose.prod.yaml`:
`env_file` injects vars into the **running container**, it does **not** bake
them into the image at build time. This matters a lot for Next.js
specifically, because `NEXT_PUBLIC_*` variables get compiled into the
client-side JS bundle *during `npm run build`* — so if a `NEXT_PUBLIC_*` var
is only set via `env_file` at container-*run* time, it won't exist yet when
the build happened, and the client bundle will be missing it. (This exact
gap is flagged as backlog item [#19](TASKS.md) and mentioned in
[public-deploy.md](public-deploy.md).)

The `MONGO_INITDB_*` vars (lines 13-15 of `.env.example`) are a third,
narrower case: they're only read by the official `mongo` image's own
entrypoint script, only on that container's *first-ever* startup (when its
data directory is empty), to create the initial root user/database. Setting
them after the volume already has data does nothing.

### Environment variables vs `.env` files — how they relate

A running container has a plain OS-level list of environment variables,
same as any process on Linux — `.env` is just *one possible source* that
populates that list, not a different concept. In this repo, a container's
final environment variables can come from any of these, layered:

- `ENV` instructions baked into the image at *build* time
  ([Dockerfile](../Dockerfile) lines 16 and 33 both set `NODE_ENV=production`
  this way — permanent, part of the image itself).
- `environment:` keys in a compose file, set directly, no file involved
  (e.g. `CHOKIDAR_USEPOLLING=true` in `docker-compose.yaml` lines 26-27).
- `env_file:` — reads a file *on the host* and injects its contents as env
  vars at container *start* time (`docker-compose.yaml` lines 6-7, 14-15;
  `docker-compose.prod.yaml` lines 31-32). This is the mechanism that makes
  a `.env` file relevant to a container at all.
- Secrets injected at deploy time by a platform, bypassing files entirely —
  e.g. Cloud Run's `--set-secrets`/`--update-secrets`, described in
  [public-deploy.md](public-deploy.md), reads from Secret Manager straight
  into the container's env, no `.env` file exists anywhere in that path.

So: "container env vars" is the general runtime concept; "`.env` file" is
one specific, file-based way (via Compose's `env_file:`) of populating that
list on container start — and a *separate* mechanism by which Next.js
itself also reads `.env` directly, independent of Docker. The two happen to
share the filename and the `KEY=value` format, which is why they feel like
the same thing, but they're two different readers of a similarly-shaped
file.

## 3. `docker-compose.yaml` — local dev

Two services in [docker-compose.yaml](../docker-compose.yaml):

**`db`** (lines 2-11) — plain MongoDB, official `mongo:7` image, nothing
custom-built. `volumes: - db_data:/data/db` is a **named volume**: Docker
manages its storage location on the host, and it persists independently of
the container's lifecycle. Delete and recreate the `db` container as many
times as you want — `db_data` (and the Mongo data in it) survives. It only
disappears if you explicitly run `docker compose down -v` or
`docker volume rm db_data`.

**`dev`** (lines 13-31) — this is the interesting one, and it's *not* meant
to serve the app directly:

- `build: target: deps` — only installs `node_modules`, doesn't build or run
  anything.
- `volumes: - .:/workspace:cached` — a **bind mount**, not a named volume.
  This maps the actual repo folder on the host straight into the container
  at `/workspace`, live, in both directions. Edit a file in VS Code on the
  host → it's instantly visible inside the container, and vice versa. This
  is what makes "run the dev server inside the container but edit with your
  normal host tools" work.
- `command: sleep infinity` — the container's main process does nothing but
  idle forever. It's designed to be `docker exec`'d into (or attached to via
  VS Code, see §4) to manually run `npm run dev`, not to auto-start the app.
  That's why there's no `CMD` doing `npm run dev` here.
- `CHOKIDAR_USEPOLLING=true` / `CHOKIDAR_INTERVAL=1000` (lines 26-27) —
  file-watching (hot reload) often can't rely on native filesystem change
  events across a bind mount, especially on Mac/Windows hosts where the
  mount is proxied — so this forces Next's watcher to poll every second
  instead.
- `depends_on: - db` — starts `db` before `dev`, but only waits for the
  container to *start*, not for Mongo to actually be ready to accept
  connections. Fine here since nothing in `dev`'s own startup needs Mongo
  immediately.

**Commands**:

```bash
docker compose up -d              # build (if needed) + start both services, detached
docker compose ps                 # list running containers for this project
docker compose exec dev bash      # shell into the running dev container
docker compose exec dev npm run dev   # actually start the Next.js dev server, once inside
docker compose logs -f db         # tail logs
docker compose down               # stop + remove containers (volumes survive)
docker compose down -v            # also delete volumes — this wipes local Mongo data
```

## 4. Devcontainer + the VS Code extension

[.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) is
read by the **Dev Containers** VS Code extension
(`ms-vscode-remote.remote-containers`), not by Docker itself — Docker has no
idea this file exists. When you run "Reopen in Container":

1. The extension reads `dockerComposeFile: ["../docker-compose.yaml"]` +
   `service: "dev"` (lines 3-6) — it reuses the existing compose file rather
   than needing a separate one, and targets the `dev` service specifically
   (ignoring `db` for the purpose of "which container is my editor attached
   to" — though `db` still gets started via `depends_on`).
2. It runs `docker compose up` under the hood, then attaches a full VS Code
   server *inside* the `dev` container.
3. `workspaceFolder: "/workspace"` (line 7) tells it where the repo lives
   inside the container — matches the bind-mount target from
   `docker-compose.yaml` line 22.
4. `customizations.vscode.extensions` (lines 15-18) — VS Code extensions to
   auto-install *inside* the container's VS Code server (ESLint, Prettier
   here). These are separate from the host's extensions; the container
   starts with none of the host extensions except what's listed here.
5. `postCreateCommand: "npm install && apk add --no-cache git"` (line 21) —
   runs once, right after the container is *created* (not every start).
   `apk` implies an Alpine-derived base somewhere in this chain — worth
   double-checking against `node:20` (Debian-based) if that line ever
   errors; it may be stale.

**Key gotcha, with a live example in this repo**: anything not covered by
the bind mount (`.:/workspace`) or a named volume lives in the container's
writable layer and is **wiped on rebuild** ("Rebuild Container" — recreates
the container from the image), though it survives a plain stop/start of the
*same* container. [public-deploy.md](public-deploy.md) documents hitting
exactly this with the `gcloud` CLI — installed manually inside the
container, gone after every rebuild, because it was deliberately *not*
added to the Dockerfile (kept the dev image lean) and there's no volume for
it.

There's an unmerged branch, `chore/devcontainer-claude-persistence`, that
fixes this same class of problem for Claude Code's own config:

```diff
   "postCreateCommand": "npm install && npm install -g @anthropic-ai/claude-code"
```

```diff
     volumes:
       - .:/workspace:cached
+      - claude_home:/root/.claude
```

```diff
 volumes:
   db_data:
+  claude_home:
```

This is a clean, minimal illustration of the named-volume pattern: instead
of a whole-repo bind mount, `claude_home` is a Docker-managed volume mounted
at just `/root/.claude`. It survives rebuilds (unlike the writable layer)
*and* is scoped to only that one directory (unlike a bind mount, which
would tie it to a host path). The same trick would fix the `gcloud` CLI
problem above, just not applied there (yet) since that install is treated
as intentionally ephemeral.

The same branch also adds Dev Container **Features**:

```json
"features": {
  "ghcr.io/devcontainers/features/git:1": {},
  "ghcr.io/devcontainers/features/gcloud-cli:1": {}
}
```

Features are a standardized way to layer extra tooling onto a devcontainer
*without* editing the Dockerfile — the extension installs them into the
built image at container-creation time, before `postCreateCommand` runs.
This is the "proper" fix for the `gcloud`-disappears-on-rebuild problem:
baking it in as a Feature means it survives rebuilds, unlike a manual
`apt-get install` run by hand inside a live container.

## 5. `docker-compose.prod.yaml` — production

Deliberately a different shape from dev —
[docker-compose.prod.yaml](../docker-compose.prod.yaml) runs one service, no
bind mount, no `sleep infinity`:

- `build: target: runner` (lines 20-23) — builds the real, minimal image
  (§1), then `image: homeschool-planner:local` tags it.
- `networks: - homeschool-net` with `external: true` (lines 27-28, 34-36) —
  this is an **external network**, meaning Compose doesn't create or own
  it; it must already exist on the host (`docker network create
  homeschool-net`), and the separately-run MongoDB container
  (`homeschool-mongo`) is attached to that same network by hand, outside
  this compose file entirely. Two containers on the same Docker network can
  resolve each other **by container name** — that's why `MONGODB_URI` uses
  hostname `homeschool-mongo` instead of an IP, per the comment at the top
  of the file and confirmed in `.env.example` line 6.
- `ports: "3002:3000"` (lines 29-30) — host port 3002 maps to container port
  3000, distinct from dev's `3000:3000` so both could theoretically run on
  the same host at once without colliding.
- `restart: unless-stopped` — auto-restarts the container after a crash or
  host reboot, but not if deliberately stopped.

Per [CLAUDE.md](../CLAUDE.md) and [public-deploy.md](public-deploy.md), this
whole file is mid-migration to Cloud Run and will eventually be retired
(Phase 4) — the compose-based self-hosted deploy path is being replaced by
`gcloud builds submit` + `gcloud run deploy`, which don't use
`docker-compose.prod.yaml` at all (Cloud Build reads the `Dockerfile`
directly). Worth knowing if learning this file cold: it's already scoped as
legacy in this repo's own roadmap, not the long-term deploy path.

## 6. Command cheat-sheet, tied to this repo

```bash
# Images
docker build -t homeschool-planner:local --target runner .
docker images
docker image prune

# Compose (dev)
docker compose up -d
docker compose exec dev npm run dev
docker compose logs -f dev
docker compose down          # keeps volumes
docker compose down -v       # also deletes db_data — wipes local Mongo data

# Compose (prod, on the deploy host)
DEPLOY_ENV_FILE=/path/to/production.env docker compose -f docker-compose.prod.yaml up -d --build

# Volumes
docker volume ls
docker volume inspect homeschool-planner_db_data
docker volume rm homeschool-planner_db_data   # careful — irreversible data loss

# Networks
docker network ls
docker network create homeschool-net          # one-time, prod host only
docker network inspect homeschool-net
```

## Where to go from here

- [github-actions-tutorial.md](github-actions-tutorial.md) — the companion
  tutorial: how `deploy.yml` gets from a button click in GitHub to running
  `docker compose -f docker-compose.prod.yaml up -d --build` on the Windows
  machine (runners, triggers, variables vs. secrets).

- [RUNNING_MIGRATIONS.md](RUNNING_MIGRATIONS.md) — a good next read: shows a
  *third* pattern, a throwaway container attached to `homeschool-net` at
  migration-run time only, using `npm ci --include=dev` because
  `NODE_ENV=production` (baked into the runner image, `Dockerfile` line 33)
  silently skips devDependencies otherwise.
- For hands-on practice rather than more reading: try applying the
  `claude_home` volume pattern from the unmerged branch to fix the
  `gcloud`-disappears-on-rebuild problem documented in `public-deploy.md`.
