# Ralphetamine: Complete System Reference

> Last updated: v2.5.0 (2026-02-17)

Ralphetamine is a modular autonomous implementation loop for Claude Code. It reads story specs, sends them to Claude one at a time (or in parallel batches), tracks success/failure, manages retries with automatic decomposition, and accumulates learnings — all without human intervention.

---

## Component Map

Ralphetamine is organized as a 486-line CLI entry point (`bin/ralph`) that dispatches to 22 bash libraries in `lib/`. Each library owns a single concern.

```
bin/ralph                (486 lines)  CLI entry point, Bash 4+ detection, subcommand dispatch
lib/
├── ui.sh                (185 lines)  Logging, colors, box headers, exit trap registry (ralph_on_exit)
├── prereqs.sh            (91 lines)  Environment checks (claude, jq, git, timeout/gtimeout)
├── config.sh            (160 lines)  Config loading with deep-merge defaults (.ralph/config.json)
├── state.sh             (246 lines)  State persistence via atomic JSON writes (_state_safe_write)
├── stories.sh           (188 lines)  Story queue parsing, batch annotations, skip markers
├── specs.sh             (138 lines)  Spec file discovery and YAML frontmatter parsing
├── prompt.sh            (273 lines)  Template loading, variable substitution, learnings injection
├── signals.sh           (265 lines)  Parse all 10 signal types from Claude output
├── runner.sh            (879 lines)  Sequential execution loop, retry logic, postmortem
├── parallel.sh          (950 lines)  Git worktree parallelization, batch orchestration, merge
├── display.sh           (359 lines)  Append-only dashboard, progress display, live timer
├── learnings.sh         (233 lines)  Learning extraction, storage, and injection into prompts
├── decompose.sh         (309 lines)  Story decomposition into 2-4 sub-stories via Claude
├── metrics.sh           (339 lines)  Token tracking, cost analysis, per-run statistics
├── provenance.sh        (404 lines)  PRD-to-spec traceability with sha256 hashes
├── hitl.sh              (505 lines)  HITL review HTML generation and feedback PRD workflow
├── reconcile.sh         (131 lines)  Orphaned branch detection and merge recovery
├── hooks.sh              (90 lines)  Pre/post lifecycle hooks (pre_iteration, post_story, etc.)
├── testing.sh            (76 lines)  Optional test review phase after story completion
├── interactive.sh       (228 lines)  Init wizard, startup prompts, config generation
├── caffeine.sh           (33 lines)  macOS sleep prevention (caffeinate wrapper)
└── tmux.sh               (30 lines)  Auto-wrap in tmux session
                        ──────
                        6,112 lines total
```

---

## CLI Reference

```
ralph <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize Ralph in the current project (config, templates, stories) |
| `run [options]` | Run the implementation loop (sequential or parallel) |
| `status` | Show current progress summary |
| `stats [options]` | Show run statistics and token usage |
| `stories` | List all stories and their completion status |
| `learnings [topic]` | Show extracted learnings, optionally filtered by topic |
| `reset` | Reset all state (completed stories, retries, current_story) |
| `verify [--list]` | Verify PRD-to-spec provenance integrity via sha256 hashes |
| `reconcile [--apply]` | Find orphaned story branches; `--apply` to merge them |
| `decompose <story-id>` | Manually decompose a story into 2-4 sub-stories |
| `hitl generate` | Generate an interactive HITL review HTML page |
| `hitl feedback <file>` | Generate a remediation PRD from HITL evaluation JSON |

### Run Options

| Flag | Description |
|------|-------------|
| `-n, --iterations NUM` | Number of iterations (0 = run until all done) |
| `-s, --story ID` | Run a specific story only |
| `-r, --resume ID` | Resume from a specific story |
| `-v, --verbose` | Show full Claude output in real-time |
| `-d, --dry-run` | Preview prompt without executing Claude |
| `-t, --timeout SECS` | Timeout per iteration (default: 1800 = 30 min) |
| `--parallel` | Enable parallel batch execution via git worktrees |
| `--no-dashboard` | Disable live dashboard panel |
| `--tmux` | Wrap in tmux session |
| `--no-interactive` | Skip interactive startup prompts |

### Stats Options

| Flag | Description |
|------|-------------|
| `--last N` | Show last N runs |
| `--story ID` | Show stats for a specific story across all runs |

---

## Execution Paths

Ralph has three execution paths. All share the same state machine (`.ralph/state.json`) and signal protocol.

### Sequential (default)

`_run_sequential()` in `lib/runner.sh` — one story at a time, in-process.

```
for each story in stories.txt:
  1. Skip if completed, absorbed, or x-prefixed
  2. Load spec file → build prompt (template + spec + learnings)
  3. Invoke Claude with timeout
  4. Parse signals from output (last match wins)
  5. On DONE → state_mark_done, extract learnings
  6. On FAIL → increment retry, check max_retries
     → If exhausted and decomposition enabled → decompose into sub-stories
     → If decomposition disabled or max_depth reached → halt
  7. On timeout → run postmortem diagnostic (if enabled), then treat as FAIL
```

### Parallel (`--parallel`)

`parallel_run()` in `lib/parallel.sh` — batched worktree execution.

```
1. Parse batch annotations from stories.txt: [batch:0], [batch:1], etc.
2. Run batch-0 and unbatched stories sequentially first
3. For each remaining batch:
   a. Create git worktrees (one per story)
   b. Launch Claude in each worktree concurrently
   c. Wait for all workers, collect results
   d. Retry failed stories sequentially
   e. Merge successful worktree branches in deterministic order
   f. Clean up worktrees and branches
4. On Ctrl+C → kill workers, prune worktrees, clean orphaned branches
```

### Dry-run (`-d`)

Prints the prompt that would be sent to Claude without invoking it. Works in both sequential and parallel modes.

---

## State Machine

Each story follows this lifecycle in `.ralph/state.json`:

```
                        ┌─────────┐
                        │ PENDING │
                        └────┬────┘
                             │ next unfinished story selected
                             ▼
                        ┌─────────┐
                   ┌───>│ CURRENT │ (current_story = ID)
                   │    └────┬────┘
                   │         │ Claude output parsed
                   │         ▼
                   │   ┌───────────┐
                   │   │  Result?  │
                   │   └──┬───┬───┬──┘
                   │      │   │   │
              DONE │   FAIL   │   TIMEOUT
                   │      │   │   │
                   │      ▼   │   ▼
                   │  ┌───────┴──────┐
                   │  │ retries < max│
                   │  └──┬───────┬───┘
                   │  YES│       │NO
                   │     │       ▼
                   │     │  ┌──────────────┐
                   │     │  │ decomposition│
                   │     │  │ enabled?     │
                   │     │  └──┬───────┬───┘
                   │     │  YES│       │NO
                   │     │     ▼       ▼
    ┌──────┐       │     │ ┌────────┐ ┌────────┐
    │ DONE │<──────┘     │ │DECOMP. │ │ HALTED │
    └──────┘             │ └────────┘ └────────┘
       │                 │     │
       │                 │     │ generates 2-4 sub-stories
       │                 │     ▼
       │                 │ sub-stories enter PENDING
       │                 │
       └──── retry ──────┘
```

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `completed_stories` | array | Story IDs that finished successfully |
| `absorbed_stories` | object | Map of absorbed → absorber story IDs |
| `merged_stories` | array | Stories merged from worktrees |
| `decomposed_stories` | object | Map of parent → sub-story ID arrays |
| `current_story` | string/null | Story currently being executed |
| `retry_count` | number | Current retry attempt for active story |
| `run_metadata` | object | Start time, run count, timing info |

### State Transitions

| Transition | completed_stories | current_story | retry_count |
|-----------|-------------------|---------------|-------------|
| PENDING → CURRENT | unchanged | set to story ID | unchanged |
| CURRENT → DONE | story ID added | set to null | reset to 0 |
| CURRENT → RETRY | unchanged | stays set | incremented |
| CURRENT → DECOMPOSED | parent added to decomposed_stories | set to null | reset to 0 |
| CURRENT → HALTED | unchanged | stays set | equals max_retries |

---

## Signal Protocol

Claude communicates results back to Ralph through structured XML tags in its text output. The parser (`lib/signals.sh`) scans the full output using "last match wins" semantics.

### All Signal Types

| Signal | Format | Emitted By |
|--------|--------|------------|
| DONE | `<ralph>DONE X.X</ralph>` | Claude after successful story |
| FAIL | `<ralph>FAIL X.X: reason</ralph>` | Claude after failed story |
| LEARN | `<ralph>LEARN: text</ralph>` | Claude when discovering patterns |
| TEST_REVIEW_DONE | `<ralph>TEST_REVIEW_DONE X.X: result</ralph>` | Test review phase |
| MERGE_DONE | `<ralph>MERGE_DONE: resolved N conflicts</ralph>` | Merge resolution agent |
| MERGE_FAIL | `<ralph>MERGE_FAIL: reason</ralph>` | Merge resolution agent |
| TIMEOUT_POSTMORTEM_DONE | `<ralph>TIMEOUT_POSTMORTEM_DONE X.X</ralph>` | Postmortem diagnostic |
| DECOMPOSE_DONE | `<ralph>DECOMPOSE_DONE X.X: N sub-stories</ralph>` | Decomposition agent |

### Legacy Fallback

For backwards compatibility, these patterns are also recognized:
```
[DONE] Story X.X     → treated as success
[FAIL] Story X.X - reason → treated as failure
```

If neither primary nor legacy signals are found, the story is treated as a failure with reason "No completion signal in output."

---

## Configuration

`.ralph/config.json` is deep-merged with built-in defaults. All keys are optional — defaults apply when absent.

```json
{
    "version": "2.4.0",
    "project": { "name": "my-project" },
    "specs": {
        "pattern": "specs/epic-{{epic}}/story-{{id}}-*.md",
        "id_format": "epic.story",
        "frontmatter_status_field": "status"
    },
    "loop": {
        "max_iterations": 0,
        "timeout_seconds": 1800,
        "max_retries": 3
    },
    "validation": {
        "commands": [],
        "blocked_commands": []
    },
    "claude": {
        "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"]
    },
    "commit": {
        "format": "feat(story-{{id}}): {{title}}",
        "stage_paths": [],
        "auto_commit": true
    },
    "testing_phase": {
        "enabled": false,
        "timeout_seconds": 600
    },
    "learnings": {
        "enabled": true,
        "max_inject_count": 5
    },
    "parallel": {
        "enabled": false,
        "max_concurrent": 8,
        "strategy": "worktree",
        "auto_merge": true,
        "merge_review_timeout": 900,
        "stagger_seconds": 3
    },
    "postmortem": {
        "enabled": true,
        "window_seconds": 300,
        "max_output_chars": 50000
    },
    "decomposition": {
        "enabled": true,
        "max_depth": 2,
        "timeout_seconds": 600
    },
    "caffeine": false,
    "hooks": {
        "pre_iteration": "",
        "post_iteration": "",
        "pre_story": "",
        "post_story": "",
        "pre_worktree": "",
        "pre_worktree_timeout": 120
    }
}
```

### Key Settings

| Path | Default | Description |
|------|---------|-------------|
| `loop.max_iterations` | 0 | Stories to attempt (0 = all remaining) |
| `loop.timeout_seconds` | 1800 | Max time per story (30 min) |
| `loop.max_retries` | 3 | Retry attempts before decomposition/halt |
| `validation.commands` | `[]` | Commands Claude must run after each story |
| `validation.blocked_commands` | `[]` | Forbidden commands |
| `commit.stage_paths` | `[]` | Explicit files to stage (empty = broad staging) |
| `commit.auto_commit` | true | Auto-commit on story success |
| `parallel.max_concurrent` | 8 | Max concurrent worktree workers |
| `parallel.stagger_seconds` | 3 | Delay between worker launches |
| `postmortem.enabled` | true | Run diagnostic after timeouts |
| `postmortem.window_seconds` | 300 | Time reserved for postmortem Claude call |
| `decomposition.enabled` | true | Auto-decompose after max retries |
| `decomposition.max_depth` | 2 | Maximum nesting depth for sub-stories |

---

## Template System

Ralph uses markdown templates stored in `.ralph/templates/` (project-local) or `templates/` (installation defaults). Templates are populated at runtime via `{{variable}}` substitution.

### Runtime Templates

| Template | Used By | Purpose |
|----------|---------|---------|
| `implement.md` | Runner | Main story implementation prompt sent to Claude |
| `test-review.md` | Testing | Post-implementation test review prompt |
| `merge-review.md` | Parallel | Merge conflict resolution prompt |
| `timeout-postmortem.md` | Runner | Diagnostic prompt after story timeout |
| `decompose.md` | Decomposition | Prompt to break a failed story into sub-stories |
| `hitl-feedback.md` | HITL | Remediation PRD generation from review feedback |

### Init Templates

| Template | Purpose |
|----------|---------|
| `init/config.json` | Default config for `ralph init` |
| `init/stories.txt` | Starter story queue template |
| `init/implement.md` | Default implementation prompt template |

### Template Variables

| Variable | Replaced With |
|----------|---------------|
| `{{id}}` | Story ID (e.g., "3.4") |
| `{{epic}}` | Epic number extracted from ID |
| `{{title}}` | Story title from spec frontmatter |
| `{{spec_content}}` | Full spec file contents |
| `{{learnings}}` | Relevant learnings injected for context |
| `{{validation_commands}}` | Commands from config.validation |
| `{{blocked_commands}}` | Forbidden commands from config |

---

## Failure Handling Pipeline

When a story fails, Ralph follows this escalation:

```
FAIL (or timeout, crash, no signal)
  │
  ├── retry_count < max_retries?
  │     YES → increment retry, re-run same story
  │     NO  ↓
  │
  ├── decomposition.enabled and depth < max_depth?
  │     YES → invoke Claude to break story into 2-4 sub-stories
  │           → parent marked as decomposed
  │           → sub-stories (N.M.1, N.M.2, ...) inserted into queue
  │           → continue with next story
  │     NO  ↓
  │
  └── HALT — print "Human intervention required", exit 1
```

### Timeout Handling

When a story times out (exit code 124):

1. Ralph checks if `postmortem.enabled` is true
2. If enabled, computes an effective timeout that reserves `window_seconds` for a diagnostic Claude call
3. Runs a postmortem prompt with the truncated output to identify the root cause
4. Records the postmortem findings, then proceeds to retry/decompose/halt as above

### Story Decomposition

When decomposition triggers (`lib/decompose.sh`):

1. Claude receives the failed story spec, error output, and decomposition template
2. Claude generates 2-4 sub-stories with hierarchical IDs (e.g., 3.1 → 3.1.1, 3.1.2)
3. Sub-story spec files are written to `specs/`
4. Sub-story IDs are inserted into `.ralph/stories.txt` after the parent
5. Parent is recorded in `state.decomposed_stories`
6. Maximum nesting depth is configurable (default: 2 levels)

---

## Runtime Artifacts

```
.ralph/                          # Runtime state directory
├── config.json                  # Project configuration
├── state.json                   # Execution state (atomic JSON writes)
├── stories.txt                  # Ordered story queue with batch annotations
├── .lock                        # PID-based process lock
├── templates/                   # Project-local prompt templates
│   └── implement.md
├── learnings/                   # Extracted learnings by topic
│   └── *.md
├── metrics/                     # Per-run token usage and cost data
│   └── run-*.json
├── provenance/                  # PRD-to-spec traceability hashes
│   └── manifest.json
└── output/                      # Claude output captures
    └── story-*.txt
progress.txt                     # Human-readable [DONE]/[FAIL]/[LEARN] log
ralph.log                        # Timestamped technical debug log
```

---

## Inter-Module Dependencies

```
bin/ralph
  ├── ui.sh (always loaded)
  ├── prereqs.sh (always loaded)
  │
  ├── cmd_run:
  │   ├── config.sh → state.sh → stories.sh → specs.sh
  │   ├── prompt.sh → learnings.sh → signals.sh
  │   ├── runner.sh → display.sh → hooks.sh → testing.sh
  │   ├── decompose.sh → metrics.sh
  │   ├── parallel.sh (if --parallel)
  │   ├── tmux.sh (if --tmux)
  │   └── caffeine.sh (if caffeine=true)
  │
  ├── cmd_init:
  │   ├── config.sh → state.sh → provenance.sh
  │   └── interactive.sh
  │
  ├── cmd_hitl:
  │   └── config.sh → state.sh → hitl.sh
  │
  ├── cmd_reconcile:
  │   └── config.sh → state.sh → stories.sh → reconcile.sh
  │
  ├── cmd_verify:
  │   └── config.sh → state.sh → stories.sh → provenance.sh
  │
  └── cmd_stats:
      └── config.sh → state.sh → metrics.sh
```

---

## Story ID Format

Ralph supports hierarchical story IDs using the pattern `[0-9]+\.[0-9]+(\.[0-9]+)*`:

| Level | Example | Origin |
|-------|---------|--------|
| Base story | `3.1` | PRD-generated spec |
| First decomposition | `3.1.1`, `3.1.2` | Auto-decomposed from 3.1 |
| Second decomposition | `3.1.1.1`, `3.1.1.2` | Auto-decomposed from 3.1.1 |

N-level nesting is supported in parsing, but `decomposition.max_depth` (default: 2) limits how deep auto-decomposition goes.

---

## Story Queue Format

`.ralph/stories.txt`:

```
# Ralph Story Queue
# Format: ID | Title

# [batch:0] — sequential pre-work
1.1 | Initialize Project Structure

# [batch:1] — independent stories (parallel mode)
2.1 | Create Budget View
2.2 | Create Transaction View

# [batch:2]
3.1 | Add Reporting Dashboard

# Prefix with x to skip:
x 3.5 | Deferred Feature
```

- `[batch:0]` and unbatched stories run sequentially before parallel batches
- `[batch:N]` (N > 0) stories run concurrently in parallel mode
- `x` prefix skips a story without removing it from the queue

---

## External Dependencies

| Program | Required | Purpose |
|---------|----------|---------|
| `bash` 4.0+ | Yes | Script execution (auto-detected on macOS) |
| `claude` | Yes | Claude Code CLI — sends prompts, receives output |
| `jq` | Yes | All JSON operations (state, config, metrics) |
| `git` | Yes | Worktrees (parallel), commits, branch management |
| `timeout`/`gtimeout` | Yes | Story execution time limits |
| `shasum` | For verify | PRD-to-spec provenance hashing |

---

## Slash Commands and Skills

Claude Code slash commands and their skill shorthands. Both forms are interchangeable.

### Pipelines

| Full Command | Skill Shorthand | Description |
|-------------|-----------------|-------------|
| `/ralphetamine:pipeline-full-auto` | `/ralph-pipeline-full-auto` | Fully autonomous: PRD → specs → double premortem → run script, zero input |
| `/ralphetamine:pipeline-interactive` | `/ralph-pipeline-interactive` | Interactive: PRD → specs → premortem → run script, with review gates |

### Individual Steps

| Full Command | Skill Shorthand | Description |
|-------------|-----------------|-------------|
| `/ralphetamine:step_1-create-prd-from-ideas` | `/prd` | Generate a PRD from a feature description |
| `/ralphetamine:step_2-create-epics-and-stories-from-prd` | `/ralph` | Convert a PRD into specs + story queue |
| `/ralphetamine:step_3-add-ad-hoc-spec` | `/ralph-create-spec` | Add a single ad-hoc story spec |

### Post-Run

| Full Command | Skill Shorthand | Description |
|-------------|-----------------|-------------|
| `/ralphetamine:reconcile-claude-code` | `/ralph-reconcile-claude-code` | Reconcile orphaned branches (Claude Code mode) |
| `/ralphetamine:reconcile-codex` | `/ralph-reconcile-codex` | Reconcile orphaned branches (Codex mode) |

---

## Project Structure

```
Ralphetamine/
├── bin/ralph              # CLI entry point (Bash 4+ auto-detection, subcommand dispatch)
├── lib/                   # 22 modular bash libraries (see Component Map above)
├── templates/             # Default prompt templates
├── tests/                 # 270+ BATS tests across 4 tiers + integration tests
│   ├── tier1-unit/        # Pure function unit tests
│   ├── tier2-filesystem/  # Tests requiring filesystem state
│   ├── tier3-component/   # Multi-module component tests
│   ├── tier4-workflow/    # End-to-end workflow tests
│   └── integration/       # Real binary integration tests
├── commands/              # Claude Code slash commands
│   └── ralphetamine/     # Pipeline, PRD, spec generation, reconcile commands
├── skills/                # Skill definitions (/ralph, pipelines, reconcile)
├── install.sh             # Symlink installer (PATH + commands + skills)
├── RALPH-REFERENCE.md     # This file — complete system reference
├── CONTRIBUTING.md        # Contribution guidelines
├── CHANGELOG.md           # Version history
└── docs/                  # Additional documentation
    ├── getting-started.md # Full onboarding walk-through
    ├── power-user-guide.md # Configuration, templates, hooks, state
    ├── troubleshooting.md # FAQ organized by symptom
    ├── architecture-flows.md # Execution flow diagrams
    ├── swimlane-diagram.md   # Cross-functional swimlane view
    └── runtime-output-tree.md # Runtime artifacts directory structure
```
