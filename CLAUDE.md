# CLAUDE.md

> Last updated: v2.4.0 (2026-02-13)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ralph v2 is an autonomous implementation loop for Claude Code. It reads story specs, sends them to Claude one at a time, tracks success/failure, manages retries, and accumulates learnings — all without human intervention.

- **Language:** Bash 4.0+ (auto-detected on macOS via self-re-exec)
- **Dependencies:** jq, git, coreutils (for timeout/gtimeout)
- **CLI:** `claude` (Claude Code CLI)

## Repository Remotes

This repo uses a two-remote setup:

- **`origin`** = `ralph-dev` (private) — default push target for daily development
- **`public`** = `ralphetamine` (public) — release-only, explicit push required

See `docs/repo-workflow.md` for full workflow details.

## Project Structure

```
ralph-v2/
├── bin/ralph              # CLI entry point
├── lib/                   # 22 modular bash libraries
├── templates/             # Default prompt templates
├── tests/                 # 4-tier BATS test suite (265+ tests) + integration tests
├── commands/              # Claude Code slash command skills
├── skills/                # Skill definitions
├── install.sh             # Symlink installer
└── .ralph/                # Runtime state (per-project)
```

## Running Tests

```bash
# All BATS tiers
tests/libs/bats-core/bin/bats tests/tier1-unit/ tests/tier2-filesystem/ tests/tier3-component/ tests/tier4-workflow/

# Individual tier
tests/libs/bats-core/bin/bats tests/tier1-unit/

# Integration tests (real ralph binary, real sandbox data)
bash tests/integration/test-retry-termination.sh
```

## Key Conventions

- All shell scripts require **Bash 4.0+** (entry points auto-detect Homebrew Bash on macOS)
- Amounts/numeric values stored as integers where applicable
- State tracked in `.ralph/state.json` (JSON via jq)
- Story specs follow the pattern `specs/epic-{N}/story-{N.M}-{slug}.md`
- Claude communication uses structured signals: `<ralph>DONE X.X</ralph>`, `<ralph>FAIL X.X: reason</ralph>`, `<ralph>LEARN: text</ralph>`

## Testing Policy

- **Every bug fix or behavioral change to the runner/loop must include a real integration test** — not just BATS mocks
- Integration tests live in `tests/integration/` and run the actual `ralph` binary against real sandbox projects
- BATS unit/component tests (tiers 1-3) are for fast feedback on individual functions, but they are **not sufficient** for verifying end-to-end behavior
- Never trust a test that mocks out the thing it's supposed to be testing (e.g., mocking `claude`, `timeout`, and `state.json` all at once proves nothing about real failures)
- Use the `sandbox/` projects as test fixtures — they have real configs, specs, stories, and git repos
- Integration tests must have a safety timeout (e.g., `gtimeout 30`) to prevent infinite loops from hanging CI

## Writing Integration Tests

Pattern for real tests:

1. Copy a sandbox to a temp dir, reset state, init git
2. Put a fake `claude` on PATH **only if** you need deterministic output — for failure/retry tests, prefer short timeouts (`-t 3`) with real Claude so the timeout path exercises real OS signals
3. Run `ralph run` with `--no-tmux --no-interactive --no-dashboard`
4. Assert on real artifacts: `state.json`, `progress.txt`, stdout, exit code

Reference `tests/integration/test-retry-termination.sh` as the canonical example.

## Runtime Modes

Ralph has three execution paths. All share the same state machine (`.ralph/state.json`) and signal protocol.

- **Sequential** (default): `_run_sequential()` in `lib/runner.sh` — one story at a time, in-process. The main loop iterates `stories.txt`, invokes Claude with a timeout, parses signals, and updates state before moving to the next story.
- **Parallel** (`--parallel`): `parallel_run()` in `lib/parallel.sh` — batched worktree execution. Stories annotated with `[batch:N]` run concurrently in git worktrees, then merge back. Unbatched and batch-0 stories run sequentially first. Failed stories retry sequentially before merge.
- **Dry-run** (`-d`): Prints the prompt that would be sent to Claude without invoking it. Works in both sequential and parallel modes.

## Architectural Invariants

These rules are derived from production incidents. Violating them causes subtle, hard-to-debug failures.

1. **State transitions are post-completion only.** `state_mark_done` must come AFTER all phases complete (execution + merge), never after execution alone. Marking done prematurely causes stories to be skipped on resume.

2. **Every loop needs two independent termination mechanisms.** The batch loop uses both state checks (`state_is_completed`) and a local counter. Relying on only one leads to infinite loops when state gets corrupted.

3. **Output capture uses `| cat > file`, not `> file 2>&1`.** Claude CLI buffers output differently than standard Unix tools. The pipe-through-cat pattern ensures the output file gets written even if Claude is killed mid-stream.

4. **Subshells need absolute paths.** Worktree subshells `cd` into the worktree directory, so any file references (output files, PID files) must use absolute paths resolved before the subshell starts.

5. **Crashed state is the normal state.** Ralph must clean stale locks (`.ralph/.lock`, `.git/index.lock`), prune dead worktrees, and remove orphaned branches on every startup. Never assume clean prior exit.

6. **Dashboard timers are exclusive resources.** Stop any existing timer before starting a new display path (e.g., switching from parallel to sequential fallback). Two concurrent timers corrupt the terminal.

7. **Signal parsing: full output scan, last match wins.** Claude may emit multiple signals in a single run. The parser scans the entire output and returns the last DONE/FAIL signal found, not the first.

8. **macOS is the primary platform.** `bin/ralph` auto-detects Homebrew Bash 4+ and re-execs. Use `prereqs_timeout_cmd` for `gtimeout`/`timeout`. Avoid GNU-only flags.

9. **Cross-module array references must be verified at declaration sites.** Module-scope arrays like `_PARALLEL_SUCCESSFUL` are declared at file top. Never assume array names — grep the source to confirm.

10. **BATS tests must NOT use `set -e`.** BATS catches test failures via its own trap mechanism. Adding `set -e` causes false passes (the ERR trap fires before BATS can capture the failure).

## Common Anti-Patterns

Mistakes that have caused real incidents. Check this list before making changes to the runner or parallel engine.

| Anti-Pattern | What Goes Wrong | Fix |
|---|---|---|
| Marking state done after execution but before merge | Stories skipped on resume, merge phase has nothing to merge | Always `state_mark_done` after ALL phases |
| Using `> file 2>&1` for Claude output capture | Output file ends up empty or truncated | Use `\| cat > file` |
| Starting a new dashboard timer without stopping the old one | Terminal corruption, garbled output, timer processes leak | Call `display_stop_live_timer` before any new display path |
| Referencing `_PARALLEL_SUCCESSFUL` without checking declaration | Silent empty-array bugs in a different module | Verify the array name at its declaration site |
| Using `grep` in a pipe under `set -eo pipefail` without `\|\| true` | Pipeline exits 1 when grep has no matches, killing the script | Always append `\|\| true` |
| Using `set -e` in BATS test files | Tests silently pass instead of failing — ERR trap fires before BATS | Never use `set -e` in `.bats` files |
| Assuming git worktree directories exist from a prior run | Worktree create fails, entire batch aborts | Always prune + remove + retry on creation |
| Using `// empty` in jq for boolean values | `false` is treated as falsy and replaced by empty | Use string `"false"` or explicit `// null` for booleans |
