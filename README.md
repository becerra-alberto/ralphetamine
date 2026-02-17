# Ralphetamine

> v2.5.0

[![CI](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml/badge.svg)](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/becerra-alberto/Ralphetamine)](https://opensource.org/licenses/MIT)

**Describe a feature. Get back working code.** Ralphetamine is an autonomous implementation pipeline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Describe what you want in plain English — Ralphetamine generates a PRD, breaks it into story specs, runs a risk premortem, then implements every story autonomously with retries, validation, and learning. No babysitting required.

```
> /ralph-pipeline-full-auto

  Add a REST API for bookmarks with CRUD endpoints, tag-based filtering,
  and full-text search. Use Express + SQLite. Include integration tests.
```

That's it. Ralphetamine takes your description and runs the full pipeline: **PRD** → **specs** → **premortem** → **autonomous implementation**. Come back to committed, tested code.

## Why Ralphetamine

Most AI coding tools help you write code interactively. Ralphetamine takes a different approach: you describe *what* needs to be built, and it handles the *how* — from planning through implementation — autonomously.

**Crash-safe state machine.** Every story's progress is tracked in `.ralph/state.json` with atomic writes. Kill the process, reboot your machine, lose power — `ralph run` picks up exactly where it left off.

**Parallel execution via git worktrees.** Independent stories run concurrently in isolated worktrees, then merge back. Failed stories retry sequentially before the final merge. Annotate batches in your story queue and Ralphetamine handles the orchestration.

**Automatic retry with decomposition.** When a story fails after max retries, Ralphetamine automatically decomposes it into 2-4 smaller sub-stories and retries those instead — breaking down complexity without human intervention.

**Cumulative learning.** Each run extracts `LEARN` signals from Claude's output and injects relevant learnings into future prompts. The knowledge base grows with every story, so later stories benefit from earlier mistakes.

**Built-in validation.** Configure test commands, linters, and typechecks that must pass after each story. Block dangerous commands. Scope commits to specific files. Ralphetamine enforces your quality gates on every iteration.

**Full observability.** Live dashboard during runs. Token usage and cost tracking via `ralph stats`. PRD-to-spec provenance with SHA-256 hashes via `ralph verify`. Human-in-the-loop review pages via `ralph hitl generate`.

**Production-hardened.** 270+ tests across 4 BATS tiers plus real integration tests. 22 modular Bash libraries. 10 documented architectural invariants derived from real incidents. Battle-tested on multi-epic projects.

## Quick Start

### Prerequisites

| Requirement | Check |
|-------------|-------|
| [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | `claude --version` |
| Bash 4.0+ | `bash --version` |
| `jq` | `jq --version` |
| `git` + `coreutils` | `git --version` |

macOS: `brew install bash jq coreutils` (Ralph auto-detects Homebrew Bash).

### Install

```bash
git clone git@github.com:becerra-alberto/Ralphetamine.git
cd Ralphetamine
./install.sh
```

### Your First Feature

Open Claude Code in your project directory:

```
> /ralph-pipeline-full-auto

  Build a CLI expense tracker. Commands: add (amount, category, note),
  list (with date range and category filters), summary (monthly totals
  by category), and export-csv. Store data in a local JSON file.
```

Ralphetamine runs four phases autonomously:

1. **PRD** — generates a structured product requirements document, self-answering all design questions
2. **Specs** — breaks the PRD into epics and story specs with acceptance criteria, test definitions, and file lists
3. **Double premortem** — two passes of risk analysis to catch dependency gaps and integration risks
4. **Run script** — generates `run-ralph.sh` and launches Ralph in a new terminal window

Stories start implementing immediately. Come back to a working feature.

### Want More Control?

Use the interactive pipeline instead:

```
> /ralph-pipeline-interactive

  Migrate the authentication system from session cookies to JWT tokens.
  Keep backward compatibility for 2 weeks via a dual-auth middleware.
  Update all protected routes and add token refresh logic.
```

Same pipeline, but it pauses at key decision points:

- **PRD phase** — asks 3-5 clarifying questions with multiple-choice options (answer like `1A, 2C, 3B`)
- **Spec phase** — shows the proposed epic/story breakdown for you to confirm or adjust
- **Premortem phase** — presents failure modes and lets you decide which fixes to apply

You can also give minimal descriptions and let Ralphetamine make the decisions:

```
> /ralph-pipeline-full-auto

  Add dark mode support to the app.
```

Ralph auto-generates clarifying decisions: CSS variables vs Tailwind, toggle location, system preference detection, persistence strategy.

## How It Works

### The Pipeline

| Phase | Full-Auto | Interactive |
|-------|-----------|-------------|
| PRD generation | Self-answers all questions | Asks 3-5 clarifying questions |
| Vision Party review | Skipped | Optional 3-perspective review |
| Spec generation | Automatic | Shows breakdown for approval |
| Premortem | Double pass (automatic) | Single pass with user review |
| Execution | Autonomous | Autonomous |

### Inside `ralph run`

Each iteration:

1. **Select** the next uncompleted story from `.ralph/stories.txt`
2. **Load** the spec and inject relevant learnings into the prompt
3. **Invoke Claude** with the full prompt and configured timeout
4. **Parse signals** — `<ralph>DONE X.X</ralph>`, `<ralph>FAIL X.X</ralph>`, or `<ralph>LEARN: text</ralph>`
5. **Validate** — run configured test/lint/typecheck commands
6. **Update state** — mark done or increment retry count
7. **Commit** — auto-commit with a structured message

### When Things Fail

```
Failure → retry (up to max_retries)
       → decompose into 2-4 sub-stories (if enabled)
       → halt with "Human intervention required"

Timeout → postmortem diagnostic (identifies root cause)
       → then retry/decompose/halt as above
```

## Running Ralph Manually

### Step-by-Step Slash Commands

```
/prd                          # describe your idea, answer questions, get a PRD
/ralph                        # convert a PRD into story specs + queue
/ralph-create-spec            # add a single ad-hoc story spec
```

### CLI Commands

```bash
ralph init                    # initialize Ralph in a project
ralph run                     # sequential — one story at a time
ralph run --parallel          # concurrent — independent batches in worktrees
ralph run -d                  # dry run — preview prompts without executing
ralph run -s 3.4              # run a specific story
ralph run -n 5 -v             # run 5 iterations, verbose
ralph run -r 4.1              # resume from story 4.1
```

### After a Run

```bash
ralph status                  # progress summary
ralph stats                   # token usage and cost breakdown
ralph stories                 # list all stories with completion status
ralph learnings               # see what Ralph learned
ralph reconcile               # find and recover orphaned story branches
ralph verify                  # PRD-to-spec provenance check
ralph decompose <id>          # manually decompose a story
ralph hitl generate           # generate HITL review page
ralph reset                   # reset all state
```

## Configuration

`.ralph/config.json` controls all behavior. Here are the most common customizations:

**Stories timing out?**
```json
{ "loop": { "timeout_seconds": 3600 } }
```

**Run tests after each story?**
```json
{
  "validation": {
    "commands": [
      { "name": "typecheck", "cmd": "npm run check", "required": true },
      { "name": "tests", "cmd": "npm run test", "required": true }
    ]
  }
}
```

**Enable parallel execution?**
```json
{ "parallel": { "enabled": true } }
```

Annotate batches in `.ralph/stories.txt`:
```
# [batch:1] — independent stories
2.1 | Create User API
2.2 | Create Product API
```

**Block dangerous commands?**
```json
{
  "validation": {
    "blocked_commands": ["rm -rf", "DROP TABLE"]
  }
}
```

See [`RALPH-REFERENCE.md`](RALPH-REFERENCE.md) for the complete configuration schema, and the [Power User Guide](docs/power-user-guide.md) for detailed configuration patterns.

## Safety

Ralphetamine runs Claude Code with `--dangerously-skip-permissions`. Treat this as full local code execution.

Mitigations:

- Run in a dedicated repo with clean git status
- Configure `validation.blocked_commands` to prevent destructive operations
- Set `commit.stage_paths` to scope commits to known files
- Review `claude.flags` in your config before running

See the [Troubleshooting guide](docs/troubleshooting.md#safety) for more detail on what this means and how to limit scope.

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Prerequisites, installation, first feature walk-through |
| [Power User Guide](docs/power-user-guide.md) | Configuration, templates, hooks, state machine, scripting |
| [Troubleshooting](docs/troubleshooting.md) | FAQ organized by symptom |
| [System Reference](RALPH-REFERENCE.md) | Complete CLI, config schema, module map |
| [Architecture Flows](docs/architecture-flows.md) | Execution flow diagrams |
| [Changelog](CHANGELOG.md) | Version history |

## Contributing

Issues are welcome for bugs, feature requests, and discussion. Pull requests are by invitation. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT. See [`LICENSE`](LICENSE).
