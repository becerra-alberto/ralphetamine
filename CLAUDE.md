# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ralph v2 is an autonomous implementation loop for Claude Code. It reads story specs, sends them to Claude one at a time, tracks success/failure, manages retries, and accumulates learnings — all without human intervention.

- **Language:** Bash 4.0+ (auto-detected on macOS via self-re-exec)
- **Dependencies:** jq, git, coreutils (for timeout/gtimeout)
- **CLI:** `claude` (Claude Code CLI)

## Project Structure

```
ralph-v2/
├── bin/ralph              # CLI entry point
├── lib/                   # 16 modular bash libraries
├── templates/             # Default prompt templates
├── tests/                 # 5-tier BATS test suite
├── commands/              # Claude Code slash command skills
├── skills/                # Skill definitions
├── install.sh             # Symlink installer
└── .ralph/                # Runtime state (per-project)
```

## Running Tests

```bash
# All tiers
tests/libs/bats-core/bin/bats tests/tier1-unit/ tests/tier2-filesystem/ tests/tier3-component/ tests/tier4-workflow/ tests/tier5-e2e/

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
