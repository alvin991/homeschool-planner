# GitHub Actions — a walkthrough of this repo

A from-scratch tutorial on GitHub Actions workflows, triggers, jobs, steps,
runners (GitHub-hosted and self-hosted), variables and secrets — using this
repo's four actual workflow files as the examples throughout. Companion to
[docker-tutorial.md](docker-tutorial.md); the Cloud Run side of deploys is
in [public-deploy.md](public-deploy.md) ("How a one-click CI deploy works").

## The mental model first

| Concept | What it is | This repo's example |
|---|---|---|
| **Workflow** | One YAML file in `.github/workflows/`: an automated process | `test.yml`, `deploy.yml`, `deploy-cloudrun.yml`, `hello-runner.yml` |
| **Trigger** (`on:`) | The event that starts a run | `push`, `pull_request`, `workflow_dispatch` (manual button) |
| **Run** | One execution of a workflow, for one commit | Each row in the Actions tab |
| **Job** | A group of steps that runs on one machine | `deploy:` in `deploy.yml` |
| **Step** | One command (`run:`) or one packaged action (`uses:`) | `- uses: actions/checkout@v4` |
| **Runner** | The machine that executes a job | GitHub's Ubuntu VM, or your Windows machine (self-hosted) |
| **Action** | Reusable code someone published, used with `uses:` | `actions/checkout`, `google-github-actions/auth` |

In one sentence: an **event** triggers a **workflow**, which creates a
**run**; each **job** in it goes to a **runner**, which executes its
**steps** in order.

## 1. Where workflows live and how GitHub finds them

There is no config file that "registers" a workflow. GitHub automatically
treats **every `.yml` or `.yaml` file in `.github/workflows/`** as a
workflow. A workflow's identity is its **file path**, not its name.

The label in the Actions sidebar comes from the `name:` field inside the
file:

```yaml
name: Deploy (self-hosted)      # deploy.yml — what the sidebar shows
```

If `name:` is missing, the sidebar shows the file path instead. Two files
with the same `name:` show up as two entries with the same label — legal,
but confusing, so keep names unique.

**When does a workflow appear in the sidebar?**

| Where the file is | Shows in sidebar? | Has a "Run workflow" button? |
|---|---|---|
| On `main` (the default branch) | Always | Yes, if it has `on: workflow_dispatch` |
| Only on another branch | Only after it has run at least once there (e.g. via `push`) | No — manual triggers require the file on `main` |

That's why `deploy-cloudrun.yml` had no button until PR #10 was merged to
`main`.

## 2. Triggers, and which copy of the file runs

Each branch can hold its own version of `deploy.yml`. GitHub picks the copy
from **the branch the event belongs to**:

| Trigger | Example | Which branch's file and code run |
|---|---|---|
| `workflow_dispatch` | `deploy.yml`, `deploy-cloudrun.yml`, `hello-runner.yml` | The branch picked in the **"Use workflow from"** dropdown (defaults to `main`) |
| `push` | `test.yml` (`branches: [main]`) | The branch that was pushed |
| `pull_request` | `test.yml` | The PR's branch, merged with its target |

```
Actions → Deploy (self-hosted) → Run workflow
   ┌──────────────────────────────┐
   │ Use workflow from: [main ▼]  │  ← picks both the workflow file AND the code
   │           [Run workflow]     │
   └──────────────────────────────┘
```

`main` being the default branch is what makes the **button** exist; the
dropdown then decides which branch's file and code actually run. Gotcha: if
you pick a branch that doesn't contain that file path, the run fails — it
never "falls back" to a different file.

Why the deploys in this repo are manual-only (`workflow_dispatch`) rather
than `push`: you can stack several commits on `main` and deploy once, instead
of rebuilding on every push. The comment at the top of `deploy.yml` lists
other trigger options (`push: tags: ['v*']`, `push: paths: [...]`).

## 3. Jobs and steps: `run:` vs `uses:`

From `deploy.yml`:

```yaml
jobs:
  deploy:                          # a job id
    runs-on: self-hosted           # which runner gets this job
    steps:
      - uses: actions/checkout@v4  # a packaged action
      - name: Ensure Docker network exists
        shell: powershell
        run: |                     # your own script
          docker network inspect homeschool-net ...
```

- **`run:`** is your own shell script.
- **`uses: owner/repo@version`** runs an action someone published on GitHub.
  `actions/checkout@v4` is the repo `github.com/actions/checkout` at version
  tag `v4` (the latest 4.x release). The runner downloads it and runs it.

**`actions/checkout`** is how the code gets onto the runner. Without it,
the runner has the workflow's steps but **none of your repo's files**. By
default it checks out the commit that triggered the run, using a temporary
token GitHub provides — that's why there's no branch or commit written in
`deploy.yml`.

**Each `run:` step is a fresh shell process.** The runner writes the script
to a temporary file and starts a new `powershell.exe` (or `bash`) for it;
when the step ends, the process exits. Consequences:

- a variable like `$x = 5` set in one step doesn't exist in the next step
- `env:` is declared on the exact step that needs it
  (`DEPLOY_ENV_FILE` in `deploy.yml`'s last step)

**Steps run in order, and a failure stops the job.** After a failed step,
the remaining normal steps are **skipped** (grey in the UI). Steps named
**"Post Run …"** still run — they're cleanup (e.g. deleting credentials) —
followed by "Complete job". A run that shows Post steps as done still
**failed** overall.

## 4. Runners: GitHub-hosted vs. self-hosted

| | GitHub-hosted (`runs-on: ubuntu-latest`) | Self-hosted (`runs-on: self-hosted`) |
|---|---|---|
| Used by | `test.yml`, `deploy-cloudrun.yml` | `deploy.yml`, `hello-runner.yml` |
| Machine | Fresh VM per job, thrown away afterward | Your Windows machine, persistent |
| Shell | bash | PowerShell (`shell: powershell`, i.e. Windows PowerShell 5.1) |
| Has your Docker, files, `.env`? | No | Yes — that's why the self-hosted deploy can use `C:/…/production.env` |

`deploy.yml` uses PowerShell because the runner is Windows: every `run:`
step executes **on the runner itself**, so it must use a shell that machine
has. Its scripts use PowerShell syntax (`$LASTEXITCODE`, `Where-Object`,
`Test-Path`), which wouldn't work in bash.

### How the self-hosted runner gets work

GitHub never connects *into* your machine. The runner service (the
Command Prompt window you started with `run.cmd`) keeps asking GitHub *"any
jobs for me?"* over an outbound HTTPS connection. That's why no ports or
firewall rules need opening at home.

```
 You                GitHub                      Your Windows machine (runner)
  │ click Run         │                                │
  ├──────────────────►│ queue job "deploy"             │
  │                   │◄─────── "any jobs?" ───────────┤ (always polling, outbound)
  │                   ├──────── job message ──────────►│
  │                   │                                │ runs steps locally
  │                   │◄─────── live logs ─────────────┤
  │                   │◄─────── result ✔/✘ ────────────┤
```

The **job message** GitHub sends contains:

- the steps to run
- context: repo, branch, commit SHA
- resolved values of `${{ vars.* }}` and any `${{ secrets.* }}` the job
  references (only the ones it references)
- a temporary `GITHUB_TOKEN`, which `actions/checkout` uses to download the
  code; it expires when the job ends

It does **not** contain your code (checkout downloads it) or your `.env`
contents (GitHub only knows the file's *path*).

The runner window itself only prints job-level lines ("Running job:
deploy", "Job deploy completed with result: Succeeded"). The full per-step
logs are on the run's page in GitHub.

### Self-hosted runners and public repos

Self-hosted runners execute whatever the workflow says, **on your machine**.
On a public repo, a workflow with `runs-on: self-hosted` and an
`on: pull_request` trigger would let a stranger's PR run code on your
server. GitHub recommends self-hosted runners for private repos only. This
repo's self-hosted workflows are `workflow_dispatch`-only, which only people
with write access can trigger, so they're safe either way.

## 5. Variables and secrets

Both live at **Settings → Secrets and variables → Actions**, on different
tabs:

| | Variables tab | Secrets tab |
|---|---|---|
| Used in a workflow as | `${{ vars.NAME }}` | `${{ secrets.NAME }}` |
| Stored | Plain text | Encrypted |
| Shown in logs | Yes | Masked as `***` |
| Good for | Non-sensitive config | Passwords, API keys, tokens |
| This repo | `DEPLOY_ENV_FILE` (a file path) | none |

To get a value into a script, map it into the step's environment:

```yaml
      - name: Build and deploy with Compose (prod)
        env:
          DEPLOY_ENV_FILE: ${{ vars.DEPLOY_ENV_FILE }}   # GitHub → shell env var
        run: docker compose -f docker-compose.prod.yaml up -d --build
```

Then `docker-compose.prod.yaml` reads it from the shell
(`env_file: - ${DEPLOY_ENV_FILE:-.env}`) and loads the real secrets from
that file on the Windows machine.

**Secrets work on self-hosted runners too** — GitHub sends referenced
secrets in the job message over HTTPS, and they exist in plain form on the
runner while the job uses them. You own the machine, so you're trusting
yourself. This repo's choice to keep real secrets in a file on the server
(and only the *path* in GitHub) is equally valid at this scale. The
`deploy-cloudrun.yml` path uses neither: `MONGODB_URI` lives in GCP Secret
Manager, and GCP access comes from Workload Identity Federation (no stored
key at all) — see [public-deploy.md](public-deploy.md).

**`NEXT_PUBLIC_*` variables are different.** Next.js copies them into the
browser JavaScript during `next build`, so they must be available when the
**image is built** (a Docker build arg), not when the container starts.
See `Dockerfile`'s `ARG NEXT_PUBLIC_DEFAULT_STUDENT_ID` and
`cloudbuild.yaml`. Never put a secret in a `NEXT_PUBLIC_*` variable — anyone
can read it in the browser's dev tools.

## 6. The four workflows in this repo

| File | Sidebar name | Trigger | Runner | What it does |
|---|---|---|---|---|
| `test.yml` | Test | push to `main`, every PR | GitHub-hosted | `npm ci`, `vitest run`, `tsc --noEmit` — the CI check |
| `deploy.yml` | Deploy (self-hosted) | manual | Self-hosted Windows | Builds with Compose and restarts `homeschool-app` on the home server |
| `deploy-cloudrun.yml` | Deploy (Cloud Run) | manual | GitHub-hosted | Builds in Cloud Build, deploys to Cloud Run |
| `hello-runner.yml` | Test self-hosted runner | manual | Self-hosted Windows | Smoke test: `whoami` + `docker version`, to check the runner is alive |

The two deploys are independent and each builds whatever commit you choose.
While both are in use, run **both** after merging a change, so the home
server and Cloud Run serve the same code.

## 7. Re-run vs. a new run

| Button | Uses | When to use |
|---|---|---|
| **Re-run jobs** / **Re-run failed jobs** (on an old run) | The **same commit** as the original run — including the old copies of the workflow and any files it reads | Something *outside* the repo changed: an IAM grant, a GitHub variable, the runner came back online |
| **Run workflow** (a new run) | The **latest** commit on the chosen branch | You changed a file in the repo and merged it |

With a single-job workflow, "Re-run jobs" and "Re-run failed jobs" do the
same thing. A re-run still gets fresh credentials (a new `GITHUB_TOKEN`, a
new WIF exchange), so it picks up permission changes immediately — after
GCP finishes propagating them (usually under 2 minutes).

## 8. Reading a run

- **Run list** (Actions → a workflow): one row per run, with the commit and
  branch it ran on. The newest green deploy run is normally what's live.
- **Inside a run**: click the job, then expand a step to see its output.
  The first lines of a `run:` step echo the script and its `env:` — useful
  for checking which values were actually used.
- **Grey step** = skipped (an earlier step failed). **"Post Run …"** steps
  are cleanup and always run.
- A step can fail even though the *work* succeeded. Example from
  2026-10-06: Cloud Build built the image fine, but `gcloud` failed to
  stream its logs and exited with an error, so GitHub marked the step
  failed and skipped the deploy. When in doubt, check the system that did
  the work (Cloud Build history, `docker ps` on the server).

## 9. Command cheat-sheet

With the GitHub CLI (`gh`), from the repo directory:

```bash
gh workflow list                                   # all workflows and their state
gh workflow run deploy-cloudrun.yml --ref main     # same as clicking "Run workflow"
gh run list --workflow=deploy-cloudrun.yml -L 5    # recent runs, with commit + status
gh run watch                                       # follow a run live
gh run view <run-id> --log-failed                  # only the logs of failed steps
gh run rerun <run-id>                              # same as "Re-run jobs"
gh variable list                                   # repo variables (e.g. DEPLOY_ENV_FILE)
```

On the Windows runner machine:

```powershell
cd C:\actions-runner          # or wherever the runner was installed
.\run.cmd                     # start it in a window (if not installed as a service)
```

The runner's per-job working copy of the repo lives under
`<runner folder>\_work\homeschool-planner\homeschool-planner`.

## Where to go from here

- [public-deploy.md](public-deploy.md) → "How a one-click CI deploy works":
  what happens on the GCP side after the workflow's steps start, the four
  identities involved, and rollback.
- Hands-on practice: add `on: push: tags: ['v*']` to a copy of
  `hello-runner.yml` on a branch, push a tag, and watch it appear in the
  sidebar without being on `main` — then delete it. Good way to see
  section 1's rules for yourself.
- Backlog #21 (automate semver tagging) is the natural next CI/CD step,
  and ties tags to Cloud Run deploys after Phase 4 cutover.
