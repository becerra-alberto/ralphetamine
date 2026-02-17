# Getting Started

> Last updated: v2.5.0 (2026-02-17)

This guide walks you through installing Ralphetamine and running your first feature end-to-end.

---

## Prerequisites

| Requirement | Why | Check |
|-------------|-----|-------|
| [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | Ralphetamine sends prompts to Claude via its CLI | `claude --version` |
| Bash 4.0+ | Required for associative arrays and modern shell features | `bash --version` |
| `jq` | All JSON operations (state, config, metrics) | `jq --version` |
| `git` | Worktrees, commits, branch management | `git --version` |
| `coreutils` | Provides `timeout` (Linux) or `gtimeout` (macOS via Homebrew) | `timeout --version` or `gtimeout --version` |

**macOS note:** The system `/bin/bash` is version 3.2. Ralphetamine auto-detects Homebrew Bash 4+ at `/opt/homebrew/bin/bash` or `/usr/local/bin/bash` and re-execs itself. Install via `brew install bash coreutils`.

**Quick verification:**

```bash
claude --version && bash --version | head -1 && jq --version && git --version
```

---

## Installation

```bash
git clone git@github.com:becerra-alberto/Ralphetamine.git
cd Ralphetamine
./install.sh
```

What `install.sh` does:

1. Symlinks `bin/ralph` to `~/.local/bin/ralph` (adds it to your PATH)
2. Installs Claude Code slash commands to `~/.claude/commands/`
3. Installs skills (`/ralph`, `/ralph-pipeline-full-auto`, `/ralph-pipeline-interactive`, reconcile skills) to `~/.claude/skills/`

If `~/.local/bin` is not in your PATH, the installer will show you what to add to your shell profile.

---

## Understanding the Two Interfaces

Ralphetamine has two interfaces that work together:

| Interface | Where | What It Does |
|-----------|-------|--------------|
| **Slash commands** (planning) | Inside Claude Code | Generate PRDs, create specs, run pipelines, reconcile |
| **CLI** (execution) | Your terminal | `ralph run`, `ralph status`, `ralph stats`, etc. |

**Pipelines** chain both interfaces: a slash command handles planning (PRD, specs, premortem), then generates a shell script that calls `ralph run` for execution.

---

## Command Names

Each slash command has a full name and a skill shorthand. Both work identically:

| What | Full Slash Command | Skill Shorthand |
|------|-------------------|-----------------|
| Full-auto pipeline | `/ralph-v2:pipeline-full-auto` | `/ralph-pipeline-full-auto` |
| Interactive pipeline | `/ralph-v2:pipeline-interactive` | `/ralph-pipeline-interactive` |
| Generate PRD | `/ralph-v2:step_1-create-prd-from-ideas` | `/prd` |
| Generate specs | `/ralph-v2:step_2-create-epics-and-stories-from-prd` | `/ralph` |
| Add ad-hoc spec | `/ralph-v2:step_3-add-ad-hoc-spec` | `/ralph-create-spec` |
| Reconcile (Claude Code) | `/ralph-v2:reconcile-claude-code` | `/ralph-reconcile-claude-code` |
| Reconcile (Codex) | `/ralph-v2:reconcile-codex` | `/ralph-reconcile-codex` |

---

## Your First Feature: Full-Auto

The fastest path from idea to working code. Open Claude Code in your project directory and run:

```
> /ralph-pipeline-full-auto

  Add a REST API for bookmarks with CRUD endpoints, tag-based filtering,
  and full-text search. Use Express + SQLite. Include integration tests.
```

Ralphetamine takes over and runs four phases with zero user input:

### Phase 1: PRD Generation

Claude asks itself clarifying questions and generates a complete Product Requirements Document at `tasks/prd-*.md`. This includes data models, API design decisions, error handling strategy, and acceptance criteria.

### Phase 2: Spec Generation

The PRD is decomposed into epics and stories. Each story gets a spec file at `specs/epic-{N}/story-{N.M}-{slug}.md` with:
- Acceptance criteria
- Test definitions
- File lists
- Dependencies on other stories

A story queue is written to `.ralph/stories.txt` with batch annotations for parallel execution.

### Phase 3: Double Premortem

Two passes of risk analysis catch dependency gaps, scope issues, and integration risks before any code is written. Specs are adjusted based on findings.

### Phase 4: Run Script

Ralphetamine generates `run-ralph.sh` and launches `ralph run` in a new terminal window. Stories start implementing immediately.

Come back to committed, tested code.

---

## Your First Feature: Interactive

Same pipeline, but with review checkpoints. Use this when you want control over decisions:

```
> /ralph-pipeline-interactive

  Build a real-time notification system with WebSocket delivery,
  notification preferences per user, read/unread tracking, and
  a notification center dropdown in the header.
```

The interactive pipeline pauses at key decision points:

**Phase 1: PRD** — Claude asks 3-5 clarifying questions with multiple-choice options. Answer like `1A, 2C, 3B`. Example questions:
- WebSocket library? (socket.io / ws / native)
- Persistence? (PostgreSQL / Redis / in-memory)
- Notification types? (system / user-to-user / both)

**Phase 1b: Vision Party** — Three-perspective review evaluates the idea. You can skip or engage.

**Phase 2: Specs** — Shows the proposed epic/story breakdown for you to confirm or adjust:
```
Epic 1: WebSocket Infrastructure (stories 1.1-1.3)
Epic 2: Notification Service (stories 2.1-2.4)
Epic 3: UI Components (stories 3.1-3.2)
```

**Phase 3: Premortem** — Presents failure modes and lets you decide which fixes to apply.

**Phase 4: Run Script** — Same as full-auto from here.

---

## Your First Feature: Manual

If you already have a PRD, or want to run each step individually:

### Step 1: Generate a PRD

```
> /prd

  I want to add a tagging system to our blog platform. Users should be
  able to create tags, assign multiple tags to posts, and filter posts
  by tag. Tags should have a color and an icon.
```

Claude asks 3-5 clarifying questions, then generates `tasks/prd-*.md`.

### Step 2: Generate Specs

```
> /ralph
```

Claude reads the PRD, generates spec files and populates `.ralph/stories.txt` with batch annotations.

### Step 3: (Optional) Add Ad-Hoc Specs

```
> /ralph-create-spec
```

Add a single story spec without re-running the full PRD-to-spec flow.

### Step 4: Initialize and Run

```bash
ralph init          # creates .ralph/ directory with config and templates
ralph run           # sequential — one story at a time
ralph run --parallel  # concurrent — independent batches in worktrees
ralph run -d        # dry run — preview prompts without executing
```

---

## After a Run

```bash
ralph status        # progress summary — completed, failed, remaining
ralph stats         # token usage, cost breakdown, timing per story
ralph stories       # list all stories with completion status
ralph learnings     # see what Ralph learned across stories
ralph reconcile     # find orphaned story branches from crashed runs
```

If stories failed or the run was interrupted, `ralph run` picks up where it left off — the crash-safe state machine tracks every story's progress.

### Reconciliation

After a parallel run, some story branches may not have merged cleanly. Use the reconcile slash commands:

```
> /ralph-reconcile-claude-code    # for Claude Code runs
> /ralph-reconcile-codex          # for Codex runs
```

These find orphaned branches, review what was implemented, and merge recoverable work.

---

## Tips for Good Input

- **Be specific about tech stack** when you have preferences: "Use Express + SQLite"
- **Be vague when you want Ralph to decide**: just "Add dark mode support" — Ralph will generate its own clarifying decisions
- **Include acceptance criteria** in the description when they matter
- **Mention constraints** like backward compatibility or timeline
- **Use interactive mode** for complex features where you want review checkpoints
- **Use manual steps** when you already have a PRD or want to add one-off stories

---

## Next Steps

- [Power User Guide](power-user-guide.md) — configuration, templates, hooks, state machine, scripting
- [Troubleshooting](troubleshooting.md) — common issues and solutions
- [System Reference](../RALPH-REFERENCE.md) — complete CLI, config schema, module map
- [Architecture Flows](architecture-flows.md) — execution flow diagrams
