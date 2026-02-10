# Parallel Engine Hardening — Changelog

## Background

Ralph v2's parallel engine (`lib/parallel.sh`) was tested in production on the Ralph-Pure-Stacks project, executing 14 security remediation stories (epics 19–24) across 4 batches on 2026-02-06. Three anomalies emerged:

1. **Lost work** — Stories 22.3 and 24.1 committed code in worktrees but were classified as failed (no DONE signal detected), force-deleted via `git branch -D`, and never merged
2. **Untracked absorption** — Story 20.1 was absorbed by 20.2 (which implemented both stories' acceptance criteria) but 20.1 was never marked complete
3. **Concurrent orchestrators** — Batches 3 and 4 ran simultaneously because nothing prevented two `parallel_run()` instances

All 14 stories were eventually merged to master through manual recovery (stories 22.3 and 24.1 required manual conflict resolution).

---

## Phase 1: Immediate Fixes (Completed)

Commits `9febfac`, `741d292`, `30f9db5` (2026-02-06):

| Fix | Commit | Description |
|-----|--------|-------------|
| Output capture | `9febfac` | Changed from `> file 2>&1` to `2>&1 \| cat > file` — Claude CLI doesn't flush with direct file redirects in background subshells |
| Worktree timeout | `9febfac` | Wrapped `git worktree add` with 30s timeout to prevent indefinite hangs on locked worktrees |
| Stale lock cleanup | `741d292` | Clean `.git/index.lock`, `.git/HEAD.lock`, and worktree locks before each batch |
| Cleanup always runs | `741d292` | Restructured so worktree/branch cleanup runs even when all stories in a batch fail |
| Signal parsing | `30f9db5` | Full-output scan with "last match wins" instead of single regex match |
| Display count | `9febfac` | Filter completed count by current story queue to prevent inflated progress |
| Security | `30f9db5` | Replace `eval` with function refs in trap registry and `bash -c` in hook execution |

Test coverage: `tests/tier4-workflow/engine-fixes-sequential.bats`, `tests/tier4-workflow/engine-fixes-parallel.bats`

---

## Phase 2: Structural Improvements (Planned)

### Fix 1: Process Lockfile
**Status:** Planned
**Files:** `lib/runner.sh`, `bin/ralph`

Prevent concurrent `parallel_run()` or `_run_sequential()` instances against the same `.ralph/` state directory. PID-based lock file at `.ralph/.lock` with `kill -0` liveness check. Registered via `ralph_on_exit` (not raw `trap EXIT`).

### Fix 2: Commit-Based Fallback Detection
**Status:** Planned
**File:** `lib/parallel.sh`

When a story's output lacks a DONE signal, check if the worktree branch has commits ahead of the integration branch before classifying as failed. If commits exist, mark as "tentative success" and merge. This prevents the 22.3/24.1 data loss scenario.

Helper: `_parallel_has_new_commits(story, base_branch)` using `git rev-list --count`.

Applied to all three failure paths: timeout (exit 124), non-zero exit, and missing signal.

### Fix 3: Progress.txt + Spec Status Sync
**Status:** Planned
**File:** `lib/parallel.sh`

Parallel mode currently calls `state_mark_done()` but never writes to `progress.txt` or updates spec YAML frontmatter. Sequential mode does both (`runner.sh:218`, `runner.sh:203`). Add parity writes after story completion in `_parallel_execute_batch()`.

### Fix 4: Extended State Schema
**Status:** Planned
**File:** `lib/state.sh`

Add `absorbed_stories` (map: absorbed → absorber), `merged_stories` (array), and corresponding functions: `state_mark_absorbed()`, `state_mark_merged()`, `state_is_absorbed()`, `state_absorbed_by()`, `state_get_merged()`. All using `_state_safe_write` for crash safety.

### Fix 5: Reconcile Subcommand
**Status:** Planned
**Files:** `lib/reconcile.sh` (new), `bin/ralph`

`ralph reconcile` scans for orphaned `ralph/story-*` branches with unmerged commits. Dry-run by default, `--apply` to merge. Shows commit count, last commit, and conflict status per branch. Updates state, spec frontmatter, and progress.txt on successful merge.

---

## Discarded: Ralph-Pure-Stacks Local Fork

A separate Claude session created standalone `bin/ralph`, `lib/parallel.sh`, `lib/state.sh`, `lib/signals.sh`, `lib/stories.sh` directly in the Ralph-Pure-Stacks project. These implemented all 5 planned improvements conceptually but contained 8 critical regressions:

1. **Output capture regression** — Used `> file 2>&1` (the original bug pattern)
2. **Signal parsing regression** — Single `=~` match instead of full-scan
3. **Unsafe state writes** — No JSON validation, risk of corruption
4. **Trap overwrite** — `trap EXIT` instead of `ralph_on_exit` registry
5. **No worktree timeout** — Can hang on locked worktrees
6. **No stale lock cleanup** — `.git/index.lock` etc.
7. **macOS incompatibility** — `timeout` instead of `prereqs_timeout_cmd`/`gtimeout`
8. **Bypassed module system** — Didn't use `config_get`, `spec_find`, `prompt_build`, `log_info/warn/error`

**Decision:** Forked files deleted from Ralph-Pure-Stacks. Concepts being ported to canonical ralph-v2 codebase using existing module system and safety patterns. Project state/config/spec updates retained (correctly reflect completed work).
