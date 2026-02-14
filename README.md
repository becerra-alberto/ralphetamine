# Ralph v2

> v2.4.0 (2026-02-13)

[![CI](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml/badge.svg)](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/becerra-alberto/Ralphetamine)](https://opensource.org/licenses/MIT)

Autonomous implementation loop for Claude Code. Ralph reads story specs, sends them to Claude one at a time, tracks success/failure, manages retries, and accumulates learnings — all without human intervention.

## Prerequisites

- **Bash** 4.0+ (auto-detected on macOS via Homebrew; `brew install bash`)
- **Claude Code CLI** (`claude`) installed and authenticated
- **jq** — `brew install jq`
- **git** — for state tracking and parallel mode worktrees
- **timeout** or **coreutils** — `brew install coreutils` (provides `gtimeout` on macOS)

## Installation

### 1. Clone ralph-v2

```bash
cd ~/Desktop/Tools  # or wherever you keep tools
git clone git@github.com:becerra-alberto/Ralphetamine.git Ralphetamine
```

### 2. Install to PATH

```bash
cd ralph-v2
./install.sh
```

This symlinks `bin/ralph` to `~/.local/bin/ralph`. If `~/.local/bin` isn't in your PATH, add it:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Verify

```bash
ralph --version
# Ralph v2.0.0
```

## Quick Start — New Project

### Step 1: Set up your project

Start with your project codebase (SvelteKit, Next.js, whatever). Navigate to the project root.

### Step 2: Initialize Ralph

```bash
cd your-project
ralph init
```

The init wizard creates:
- `.ralph/config.json` — loop settings, validation commands, timeouts
- `.ralph/stories.txt` — empty story queue (you'll populate this next)
- `.ralph/templates/` — prompt templates Ralph sends to Claude
- `.ralph/learnings/` — knowledge base that grows as stories complete

### Step 3: Create your PRD

Use Claude Code to generate a PRD for your project:

```
/prd
```

This creates a structured PRD in `tasks/prd-<name>.md`.

### Step 4: Generate specs and story queue

Use Claude Code to convert the PRD into epics, story specs, and a story queue:

```
/ralph
```

This reads your PRD and generates:
- `specs/epic-{N}/story-{N.M}-{slug}.md` — one spec file per story
- `.ralph/stories.txt` — ordered execution queue with batch annotations

### Step 5: Run Ralph

```bash
ralph run
```

Ralph will loop through each story, send the spec to Claude, and track results.

### Step 6 (Optional): Reconcile the run

After a run completes, trigger a structured post-run review:

```
/ralph-reconcile-claude-code
```

or:

```
/ralph-reconcile-codex
```

## Claude Code Slash Commands

These commands run inside Claude Code chat (not your shell). Open the project in
Claude Code and use:

```
/prd
```

Generates a PRD under `tasks/prd-*.md`.

```
/ralph
```

Converts a PRD into `specs/` and `.ralph/stories.txt` using the `skills/SKILL.md`
definition.

```
/create-spec
```

Adds a single new story spec and appends it to `.ralph/stories.txt` using
`commands/create-spec.md`.

```
/ralph-reconcile-claude-code
```

Audits and reconciles the latest Ralph run using
`skills/ralph-run-reconcile-claude-code/SKILL.md`.

```
/ralph-reconcile-codex
```

Audits and reconciles the latest Ralph run using
`skills/ralph-run-reconcile-codex/SKILL.md`.

```
/ralph-v2:pipeline-interactive
```

Runs the full Ralph pipeline interactively: PRD creation, spec generation,
premortem review, and run script generation — with user input at decision points.

```
/ralph-v2:pipeline-full-auto
```

Runs the full Ralph pipeline autonomously with zero user input: PRD, specs,
double premortem, and run script generation.

If a slash command isn't recognized, restart Claude Code and ensure the repo
contains `skills/` and `commands/`.

## Usage

```bash
ralph init                  # Initialize Ralph in current project
ralph run                   # Run the implementation loop
ralph run -s 3.4            # Run a specific story only
ralph run -n 5 -v           # Run 5 iterations, verbose output
ralph run -d                # Dry run — preview prompts without executing
ralph run -r 4.1            # Resume from story 4.1
ralph run --parallel        # Enable parallel execution (Bash 4.0+)
ralph status                # Show progress summary
ralph stats                 # Show run statistics and token usage
ralph stats --last 3        # Show last 3 runs
ralph stories               # List all stories with completion status
ralph learnings             # Show extracted learnings
ralph learnings testing     # Show learnings for a specific topic
ralph verify                # Verify PRD-to-spec provenance integrity
ralph reconcile             # Find orphaned story branches (dry-run)
ralph reconcile --apply     # Find and merge orphaned branches
ralph decompose 3.4         # Manually decompose a story into sub-stories
ralph reset                 # Reset all state (completed stories, retries)
```

## HITL Review (Human-in-the-Loop)

Generate an interactive review page from completed stories:

```bash
ralph hitl generate
```

Defaults to `docs/hitl-review.html` and opens it in a browser when
`.hitl.open_after_generate` is `true`.

Export your review results as JSON from the page, then generate a remediation PRD:

```bash
ralph hitl feedback path/to/hitl-evaluation.json
```

This writes `docs/hitl-remediation-prd.md`.

## How It Works

Each iteration of the loop:

1. **Select** — finds the next uncompleted story from `.ralph/stories.txt`
2. **Load** — reads the spec file from `specs/epic-X/story-X.X-*.md`
3. **Build prompt** — injects spec content, validation commands, and relevant learnings into the prompt template
4. **Invoke Claude** — runs `claude --print --dangerously-skip-permissions --output-format json` with the full prompt
5. **Parse signals** — looks for `<ralph>DONE X.X</ralph>` or `<ralph>FAIL X.X: reason</ralph>` in output
6. **Update state** — marks the story done or increments retry count (up to 3 retries)
7. **Extract learnings** — captures any `<ralph>LEARN: text</ralph>` signals for future stories

## Configuration

`.ralph/config.json` controls all behavior:

```json
{
  "version": "2.0.0",
  "project": { "name": "my-project" },
  "specs": { "pattern": "specs/epic-{{epic}}/story-{{id}}-*.md" },
  "loop": {
    "max_iterations": 0,
    "timeout_seconds": 1800,
    "max_retries": 3
  },
  "validation": {
    "commands": [
      { "name": "typecheck", "cmd": "npm run check", "required": true },
      { "name": "tests", "cmd": "npm run test", "required": true }
    ],
    "blocked_commands": ["rm -rf", "DROP TABLE"]
  },
  "claude": { "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"] },
  "commit": {
    "format": "feat(story-{{id}}): {{title}}",
    "stage_paths": [],
    "auto_commit": true
  },
  "learnings": { "enabled": true, "max_inject_count": 5 },
  "parallel": { "enabled": false, "max_concurrent": 8 },
  "caffeine": false
}
```

Key settings:
- **`validation.commands`** — commands Claude must run after each story (tests, lint, typecheck)
- **`validation.blocked_commands`** — commands Claude is forbidden from running
- **`loop.timeout_seconds`** — max time per story before timeout (default 30 min)
- **`loop.max_retries`** — retry attempts per story before stopping (default 3)
- **`commit.stage_paths`** — optional explicit list of files to stage (prevents broad staging like `git add -A`)
- **`caffeine`** — prevent macOS from sleeping during long runs

For single-file skills/projects, set `commit.stage_paths` to that file (for example `["SKILL.md"]`).

## Safety & Risks

Ralph runs the Claude Code CLI with `--dangerously-skip-permissions` and can execute
commands generated by the model. Treat this as full local code execution.

Recommended safety practices:
- Run in a dedicated repo with clean git status and backups.
- Configure `validation.blocked_commands` and prefer read-only checks first.
- Set `commit.stage_paths` for tightly scoped commits when stories target known files.
- Review or disable `commit.auto_commit` if you need manual control.
- In parallel mode, avoid running two Ralph instances against the same `.ralph/` state.
- Parallel mode is core functionality and is actively hardened.

## Story Queue Format

`.ralph/stories.txt`:

```
# Ralph Story Queue
# Format: ID | Title

# [batch:1] — independent stories (parallel mode)
1.1 | Initialize Project Structure
1.2 | Setup Database Schema

# [batch:2]
2.1 | Create Budget View
2.2 | Create Transaction View

# Prefix with x to skip:
x 3.5 | Deferred Feature
```

## Spec File Format

Each spec lives at `specs/epic-{N}/story-{N.M}-{slug}.md`:

```markdown
---
id: "1.1"
epic: 1
title: "Initialize Project"
status: pending
priority: critical
estimation: small
---

# Story 1.1: Initialize Project

## User Story
As a developer, I want ...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Test Definition
- Unit: test that X works
- Integration: test that Y connects to Z

## Files to Create/Modify
- src/lib/component.svelte (create)
- src/routes/+page.svelte (modify)
```

## Project Structure

```
ralph-v2/
├── bin/ralph              # CLI entry point (486 lines)
├── lib/                   # 22 modular bash libraries (6,112 lines)
│   ├── ui.sh              # Logging, colors, exit trap registry
│   ├── prereqs.sh         # Environment checks
│   ├── config.sh          # Config loading with defaults
│   ├── state.sh           # State persistence (state.json)
│   ├── stories.sh         # Story queue parsing
│   ├── specs.sh           # Spec file discovery and parsing
│   ├── prompt.sh          # Template loading and substitution
│   ├── signals.sh         # Parse Claude output signals
│   ├── runner.sh          # Sequential execution loop
│   ├── parallel.sh        # Git worktree parallelization
│   ├── display.sh         # Append-only dashboard and progress
│   ├── learnings.sh       # Learning extraction and injection
│   ├── decompose.sh       # Story decomposition into sub-stories
│   ├── metrics.sh         # Token tracking and cost analysis
│   ├── provenance.sh      # PRD-to-spec traceability
│   ├── hitl.sh            # HITL review and feedback PRD
│   ├── reconcile.sh       # Orphaned branch recovery
│   ├── hooks.sh           # Pre/post lifecycle hooks
│   ├── testing.sh         # Optional test review phase
│   ├── interactive.sh     # Init wizard and startup prompts
│   ├── caffeine.sh        # macOS sleep prevention
│   └── tmux.sh            # Auto-wrap in tmux session
├── templates/             # Default prompt templates
│   ├── implement.md       # Main story implementation prompt
│   ├── test-review.md     # Test review phase prompt
│   ├── merge-review.md    # Parallel merge review prompt
│   ├── timeout-postmortem.md  # Diagnostic prompt after timeout
│   ├── decompose.md       # Story decomposition prompt
│   ├── hitl-feedback.md   # HITL remediation PRD prompt
│   └── init/              # Templates for ralph init
├── tests/                 # 4-tier BATS test suite (265+ tests) + 25 integration tests
│   ├── tier1-unit/        # Pure unit tests
│   ├── tier2-filesystem/  # Filesystem integration
│   ├── tier3-component/   # Component integration
│   ├── tier4-workflow/    # CLI command tests
│   └── integration/       # Real binary integration tests
└── install.sh             # Symlink installer
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

## Signals

Ralph communicates with Claude through structured signals in the prompt template. Claude is instructed to output:

| Signal | Meaning |
|--------|---------|
| `<ralph>DONE X.X</ralph>` | Story completed successfully |
| `<ralph>FAIL X.X: reason</ralph>` | Story failed with reason |
| `<ralph>LEARN: text</ralph>` | Pattern or gotcha discovered |

Legacy formats (`[DONE] Story X.X`, `[FAIL] Story X.X - reason`) are also supported.

## Documentation

- `docs/README.md` — documentation index
- `RALPH-REFERENCE.md` — complete system reference
- `docs/architecture-flows.md` — architecture flow diagrams
- `docs/changelog-run-summary.md` — execution run summary changelog

## Contributing

See `CONTRIBUTING.md`. Issues are accepted for tracking and discussion. PRs are by
invitation only.

## Governance

See `GOVERNANCE.md`.

## Support

See `SUPPORT.md`. There is no support SLA or guaranteed response.

## Security

See `SECURITY.md` for how to report vulnerabilities.

## Code of Conduct

See `CODE_OF_CONDUCT.md`.

## License

MIT. See `LICENSE`.
