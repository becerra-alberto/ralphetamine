# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ralph v2 is an autonomous implementation loop for Claude Code. It reads story specs, sends them to Claude one at a time, tracks success/failure, manages retries, and accumulates learnings — all without human intervention.

- **Language:** Bash 3.2+ (macOS compatible)
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
```

## Key Conventions

- All shell scripts must be compatible with **Bash 3.2** (macOS default)
- Amounts/numeric values stored as integers where applicable
- State tracked in `.ralph/state.json` (JSON via jq)
- Story specs follow the pattern `specs/epic-{N}/story-{N.M}-{slug}.md`
- Claude communication uses structured signals: `<ralph>DONE X.X</ralph>`, `<ralph>FAIL X.X: reason</ralph>`, `<ralph>LEARN: text</ralph>`
