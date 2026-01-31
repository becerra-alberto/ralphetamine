# Ralph v2

Autonomous implementation loop for Claude Code. Ralph reads story specs, sends them to Claude one at a time, tracks success/failure, manages retries, and accumulates learnings — all without human intervention.

## Prerequisites

- **Bash** 3.2+ (macOS default works)
- **Claude Code CLI** (`claude`) installed and authenticated
- **jq** — `brew install jq`
- **git** — for state tracking and parallel mode worktrees
- **timeout** or **coreutils** — `brew install coreutils` (provides `gtimeout` on macOS)

## Installation

### 1. Clone ralph-v2

```bash
cd ~/Desktop/Tools  # or wherever you keep tools
git clone <ralph-v2-repo-url> ralph-v2
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

### Step 4: Convert PRD to Ralph format

Use Claude Code to convert the PRD into epics and stories:

```
/ralph
```

This produces `prd.json` with structured epics and stories.

### Step 5: Generate specs and story queue

Ask Claude Code to read `prd.json` and generate the Ralph artifacts:

```
Read prd.json and create Ralph story specs and queue:

1. For each epic/story in prd.json, create a spec file at:
   specs/epic-{N}/story-{N.M}-{slug}.md

   Use this YAML frontmatter format:
   ---
   id: "N.M"
   epic: N
   title: "Story Title"
   status: pending
   priority: critical|high|medium|low
   estimation: small|medium|large
   ---

   Include: User Story, Technical Context, Acceptance Criteria,
   Test Definition, and Files to Create/Modify sections.

2. Populate .ralph/stories.txt with all story IDs and titles:
   1.1 | Initialize Project
   1.2 | Setup Database
   ...
```

### Step 6: Run Ralph

```bash
ralph run
```

Ralph will loop through each story, send the spec to Claude, and track results.

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
ralph stories               # List all stories with completion status
ralph learnings             # Show extracted learnings
ralph learnings testing     # Show learnings for a specific topic
ralph reset                 # Reset all state (completed stories, retries)
```

## How It Works

Each iteration of the loop:

1. **Select** — finds the next uncompleted story from `.ralph/stories.txt`
2. **Load** — reads the spec file from `specs/epic-X/story-X.X-*.md`
3. **Build prompt** — injects spec content, validation commands, and relevant learnings into the prompt template
4. **Invoke Claude** — runs `claude --print --dangerously-skip-permissions` with the full prompt
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
  "claude": { "flags": ["--print", "--dangerously-skip-permissions"] },
  "commit": { "format": "feat(story-{{id}}): {{title}}", "auto_commit": true },
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
- **`caffeine`** — prevent macOS from sleeping during long runs

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
├── bin/ralph              # CLI entry point
├── lib/                   # 16 modular bash libraries
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
│   ├── learnings.sh       # Learning extraction and injection
│   ├── testing.sh         # Optional test review phase
│   ├── hooks.sh           # Pre/post lifecycle hooks
│   ├── interactive.sh     # Init wizard and startup prompts
│   ├── caffeine.sh        # macOS sleep prevention
│   └── tmux.sh            # Auto-wrap in tmux session
├── templates/             # Default prompt templates
│   ├── implement.md       # Main story implementation prompt
│   ├── test-review.md     # Test review phase prompt
│   ├── merge-review.md    # Parallel merge review prompt
│   └── init/              # Templates for ralph init
├── tests/                 # 5-tier BATS test suite (132 tests)
│   ├── tier1-unit/        # Pure unit tests
│   ├── tier2-filesystem/  # Filesystem integration
│   ├── tier3-component/   # Component integration
│   ├── tier4-workflow/    # CLI command tests
│   └── tier5-e2e/         # Full pipeline E2E
└── install.sh             # Symlink installer
```

## Running Tests

```bash
# All tiers
tests/libs/bats-core/bin/bats tests/tier1-unit/ tests/tier2-filesystem/ tests/tier3-component/ tests/tier4-workflow/ tests/tier5-e2e/

# Individual tier
tests/libs/bats-core/bin/bats tests/tier1-unit/
```

## Signals

Ralph communicates with Claude through structured signals in the prompt template. Claude is instructed to output:

| Signal | Meaning |
|--------|---------|
| `<ralph>DONE X.X</ralph>` | Story completed successfully |
| `<ralph>FAIL X.X: reason</ralph>` | Story failed with reason |
| `<ralph>LEARN: text</ralph>` | Pattern or gotcha discovered |

Legacy formats (`[DONE] Story X.X`, `[FAIL] Story X.X - reason`) are also supported.
