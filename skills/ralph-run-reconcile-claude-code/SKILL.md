---
name: ralph-run-reconcile-claude-code
description: "Audit and reconcile the latest Ralph run in Claude Code. Use when Ralph finishes with failures, tentative outcomes, or suspected missing merges; inspect story branches, state/spec drift, and merge conflicts, then produce or execute a prioritized remediation plan."
---

# Ralph Run Reconcile (Claude Code)

## Overview

Run a deterministic post-run reconcile pass after `ralph run`. Detect missing merges, state drift, and run failures quickly, then apply only the fixes the user approves.

Load `references/reconcile-checks.md` before starting analysis.

## Operating Modes

Use one mode per run:

- `report` (default): collect evidence and produce a remediation plan without code changes.
- `execute-safe`: apply low-risk fixes only, then verify.
- `execute-approved`: apply low/medium/high fixes explicitly approved by the user.

## Workflow

### 1) Capture Baseline

Run and record:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

If the workspace is dirty, continue, but avoid reverting unrelated changes.

### 2) Collect Reconcile Evidence

Run deterministic checks:

```bash
ls -la .ralph 2>/dev/null || true
test -f .ralph/stories.txt && sed -n '1,220p' .ralph/stories.txt || true
test -f .ralph/state.json && jq '.completed_stories, .merged_stories, .retry_counts' .ralph/state.json || true
git for-each-ref --format='%(refname:short)' refs/heads/ralph/story-* || true
ralph status || true
ralph reconcile || true
test -f progress.txt && tail -n 120 progress.txt || true
```

When present, inspect run logs under `ralph-run-terminal-logs/` and `.ralph/logs/`.

### 3) Build Findings Matrix

Use the checklist in `references/reconcile-checks.md` and produce a table with:

- `Finding ID`
- `Severity`
- `Evidence`
- `Impact`
- `Recommended Action`
- `Auto-executable` (`yes` or `no`)

Focus first on orphaned `ralph/story-*` branches with unmerged commits.

### 4) Classify and Plan

Map findings to risk tiers:

- `low`: deterministic and reversible (`ralph reconcile --apply`, queue metadata fix, status alignment).
- `medium`: targeted edits or retries touching implementation files.
- `high`: merge conflicts, broad refactors, or uncertain root cause.

Always provide an ordered execution plan and explicit stop conditions.

### 5) Execute (Only in Execution Modes)

Apply this order:

1. Run `ralph reconcile --apply` if low-risk orphaned branches exist.
2. Re-check state/spec/queue consistency.
3. Run validation commands from `.ralph/config.json` when configured.
4. Re-run only the minimal set of failed stories if needed.

Never run destructive recovery commands (`git reset --hard`, force branch deletes, mass file deletions) unless the user explicitly asks.

### 6) Verify and Report

End with a concise report:

- `Resolved`: list of findings fixed now.
- `Pending`: remaining findings and why they were deferred.
- `Verification`: tests/checks run and outcomes.
- `Next Command`: exact next command for the user.

## Output Contract

When done, provide:

1. `One-line status` (green/yellow/red style summary in plain text).
2. `Findings table` sorted by severity.
3. `Execution log summary` (commands actually run).
4. `Next-step queue` with concrete IDs and owners.

## Cross-Model Safeguard

When the user requests extra assurance, produce a handoff prompt for Codex that includes:

- current branch + SHA
- findings table
- unresolved items
- explicit ask: "challenge these findings and list disagreements"
