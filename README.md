# Ralphetamine

> v2.5.0

[![CI](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml/badge.svg)](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/becerra-alberto/Ralphetamine)](https://opensource.org/licenses/MIT)

**Build big, complex features with Claude Code — without the session falling apart halfway through.**

Ralphetamine is an autonomous execution pipeline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) designed for long-running, multi-file development work. Instead of one long, fragile chat that slowly degrades, Ralphetamine breaks the work into small, well-scoped stories. Each story runs in a clean context, and progress is tracked outside the model so nothing important gets lost.

This enables multi-hour autonomous development sessions without drift or regress.

```
> /ralph-pipeline-full-auto

  Add a REST API for bookmarks with CRUD endpoints, tag-based filtering,
  and full-text search. Use Express + SQLite. Include integration tests.
```

Ralphetamine takes your description and runs the full pipeline: **PRD** → **specs** → **premortem** → **autonomous execution**. Come back to committed, tested code.

---

## Why Ralphetamine

Long AI coding sessions degrade. Context compacts. Earlier architectural decisions disappear. Bugs reappear. The model forgets what it already implemented.

Ralphetamine prevents that by enforcing strict story boundaries and externalized state. Instead of relying on conversational memory, it turns AI-driven development into a controlled execution loop.

## Core Capabilities

**Automatic premortem analysis and story enrichment.** Before execution, stories are stress-tested for edge cases, missing constraints, and architectural risks, then enriched with clarifications so failures are prevented upfront rather than discovered late.

**Acceptance criteria generation.** Each story includes explicit, testable acceptance criteria so completion is objective, verifiable, and enforced by validation commands rather than subjective judgment.

**Automatic retries and failure handling.** When a story fails validation or times out, the engine applies structured retry strategies instead of forcing you to manually restate context or restart the session.

**Intelligent story decomposition.** If a story is too large or repeatedly fails, it is automatically broken into smaller, more tractable stories that can succeed in isolation.

**Runtime learnings.** Stories can emit structured learnings that are persisted and injected into future contexts, allowing the system to adapt across a run instead of repeating mistakes.

**Crash-safe state management.** Execution state is stored externally in `.ralph/state.json` with atomic writes, so progress survives model crashes, CLI restarts, or machine interruptions.

**Resumable runs.** You can stop and restart at any time, and `ralph run` continues from the last completed story rather than starting over.

**Sequential or parallel execution across git worktrees.** Stories can run one by one for safety or in parallel in isolated worktrees for speed, with controlled merge handling and retry isolation.

**Postmortem diagnostics.** Structured failure analysis identifies root causes after timeouts or repeated failures and feeds that information back into retries and future stories.

**Built-in validation.** Configure test commands, linters, and typechecks that must pass after each story. Block dangerous commands. Scope commits to specific files. Ralphetamine enforces your quality gates on every iteration.

**Full observability.** Live dashboard during runs. Token usage and cost tracking via `ralph stats`. PRD-to-spec provenance with SHA-256 hashes via `ralph verify`. Human-in-the-loop review pages via `ralph hitl generate`.

**Production-hardened.** 270+ tests across 4 BATS tiers plus integration tests. 22 modular Bash libraries. 10 documented architectural invariants derived from real incidents. Battle-tested on multi-epic projects.

All of this works together to turn long AI coding sessions into a controlled, repeatable execution pipeline instead of an unpredictable conversation.

---

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

1. **PRD** — structured product requirements document
2. **Specs** — epics and story specs with acceptance criteria
3. **Premortem** — risk analysis to catch integration gaps
4. **Execution** — autonomous implementation

Stories start implementing immediately. Come back to a working feature.

### Want More Control?

Use the interactive pipeline instead:

```
> /ralph-pipeline-interactive

  Migrate the authentication system from session cookies to JWT tokens.
```

Same pipeline, but it pauses at key decision points — clarifying questions during PRD, epic/story breakdown for approval, and premortem findings for review. You steer the plan, Ralphetamine handles the execution.

---

## CLI Reference

```bash
# Pipeline slash commands (inside Claude Code)
/ralph-pipeline-full-auto       # full autonomous pipeline
/ralph-pipeline-interactive     # pipeline with decision points
/prd                            # generate a PRD from a description
/ralph                          # convert a PRD into story specs + queue
/ralph-create-spec              # add a single ad-hoc story spec

# Execution
ralph run                       # sequential — one story at a time
ralph run --parallel            # concurrent — independent batches in worktrees
ralph run -d                    # dry run — preview prompts without executing
ralph run -s 3.4                # run a specific story
ralph run -r 4.1                # resume from story 4.1

# Inspection
ralph status                    # progress summary
ralph stats                     # token usage and cost breakdown
ralph stories                   # list all stories with completion status
ralph learnings                 # see what Ralph learned

# Recovery
ralph reconcile                 # find and recover orphaned story branches
ralph decompose <id>            # manually decompose a story
ralph reset                     # reset all state

# Verification
ralph verify                    # PRD-to-spec provenance check
ralph hitl generate             # generate human-in-the-loop review page
```

---

## Safety

Ralphetamine runs Claude Code with `--dangerously-skip-permissions`. Treat this as full local code execution.

Mitigations:

- Run in a dedicated repo with clean git status
- Configure `validation.blocked_commands` to prevent destructive operations
- Set `commit.stage_paths` to scope commits to known files
- Review `claude.flags` in your config before running

See the [Troubleshooting guide](docs/troubleshooting.md#safety) for more detail.

---

## Documentation

### Getting Started

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Prerequisites, installation, first feature walk-through |
| [Troubleshooting](docs/troubleshooting.md) | FAQ organized by symptom |

### Configuration & Usage

| Guide | Description |
|-------|-------------|
| [Power User Guide](docs/power-user-guide.md) | Config deep-merge, timeouts, retries, prompt templates, hooks, story queue features, state machine, metrics |
| [System Reference](RALPH-REFERENCE.md) | Complete CLI, config schema, module map, signal protocol |
| [Example Stories](docs/fake-user-stories-examples.md) | Sample story specs, queue files with batch annotations and skip markers |

### Architecture

| Guide | Description |
|-------|-------------|
| [Architecture Flows](docs/architecture-flows.md) | End-to-end execution flow diagrams |
| [Swimlane Diagram](docs/swimlane-diagram.md) | Cross-functional diagram: control flow, Claude I/O, project artifacts, human outputs |
| [Runtime Output Tree](docs/runtime-output-tree.md) | Every piece of information Ralph produces during execution, organized by phase |

### Design Documents

| Guide | Description |
|-------|-------------|
| [Run Summary Design](docs/changelog-run-summary.md) | Design doc for end-of-run summary feature |

### Project

| Guide | Description |
|-------|-------------|
| [Changelog](CHANGELOG.md) | Version history |
| [Contributing](CONTRIBUTING.md) | How to file issues and contribution guidelines |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Contributor Covenant v2.1 |
| [Security](SECURITY.md) | Vulnerability reporting policy |
| [Governance](GOVERNANCE.md) | Project governance model |
| [Support](SUPPORT.md) | Support policy and expectations |

## License

MIT. See [`LICENSE`](LICENSE).
