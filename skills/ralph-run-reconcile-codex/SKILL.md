---
name: ralph-run-reconcile-codex
description: "Audit and reconcile the latest Ralph run in Codex-driven repositories. Use when Ralph finishes and you want a post-run diagnostic or remediation pass to catch unmerged story branches, failures, state/spec drift, and merge issues, then execute a bounded recovery plan."
---

# Ralph Run Reconcile (Codex)

## Overview

Run a structured reconcile phase after `ralph run` to detect and fix post-run gaps. Prioritize deterministic checks before edits, then apply bounded fixes with clear verification.

Load `references/reconcile-checks.md` before starting analysis.

## Operating Modes

Use one mode per request:

- `report` (default): findings and action plan only.
- `execute-safe`: apply low-risk actions automatically.
- `execute-approved`: apply only explicitly approved medium/high actions.

## Workflow

### 1) Capture Run Context

Collect:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

Treat existing user changes as immutable unless asked otherwise.

### 2) Gather Evidence (Read-Only First)

Run:

```bash
rg --files .ralph 2>/dev/null || true
test -f .ralph/stories.txt && sed -n '1,220p' .ralph/stories.txt || true
test -f .ralph/state.json && jq '.completed_stories, .merged_stories, .retry_counts' .ralph/state.json || true
git for-each-ref --format='%(refname:short)' refs/heads/ralph/story-* || true
ralph status || true
ralph reconcile || true
test -f progress.txt && tail -n 120 progress.txt || true
```

If available, inspect `.ralph/logs/` and `ralph-run-terminal-logs/` for failure signatures.

### 3) Produce Findings Matrix

Use the checklist in `references/reconcile-checks.md`.

Output columns:

- `ID`
- `Severity`
- `Artifact`
- `Problem`
- `Action`
- `Exec Mode` (`safe`, `approved`, `manual`)

Sort by severity, then by user impact.

### 4) Build Recovery Plan

Create an ordered plan with rollback notes:

1. low-risk deterministic fixes
2. medium-risk targeted fixes
3. high-risk/manual interventions

Include exact commands and expected post-condition for each step.

### 5) Execute in Bounded Scope

In execute modes, apply:

1. `ralph reconcile --apply` when orphaned branches are clean-merge candidates.
2. minimal state/spec alignment edits only when evidence is unambiguous.
3. minimal reruns for unresolved failed stories.

Respect strict boundaries:

- avoid destructive git commands unless user explicitly requests.
- avoid reverting unrelated local changes.
- stop when encountering conflicts or ambiguous evidence.

### 6) Verify and Close

Always finish with:

- post-execution `ralph reconcile` result
- status of validation commands from `.ralph/config.json`
- unresolved findings and owner
- explicit next command for the user

## Output Contract

Deliver:

1. `Status summary` (1 line)
2. `Findings matrix` (severity sorted)
3. `Actions executed` (command list)
4. `Verification results`
5. `Remaining queue`

## Cross-Model Safeguard

When requested, generate a Claude Code challenge prompt that asks Claude to dispute the findings matrix and highlight disagreements before any high-risk execution.
