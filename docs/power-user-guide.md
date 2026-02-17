# Power User Guide

> Last updated: v2.5.0 (2026-02-17)

Everything you need to customize and extend Ralphetamine. Assumes you've completed the [Getting Started](getting-started.md) guide.

---

## Configuration Deep Dive

`.ralph/config.json` is deep-merged with built-in defaults. All keys are optional — unspecified keys use defaults. See [RALPH-REFERENCE.md](../RALPH-REFERENCE.md) for the full default config blob.

### Timeouts and Retries

```json
{
  "loop": {
    "timeout_seconds": 1800,
    "max_retries": 3,
    "max_iterations": 0
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `timeout_seconds` | 1800 | Max time per story (30 min). Increase for complex stories. |
| `max_retries` | 3 | Retry attempts before decomposition or halt. |
| `max_iterations` | 0 | Stories to attempt per run. 0 = all remaining. |

### Validation

```json
{
  "validation": {
    "commands": [
      { "name": "typecheck", "cmd": "npm run check", "required": true },
      { "name": "tests", "cmd": "npm run test", "required": true },
      { "name": "lint", "cmd": "npm run lint", "required": false }
    ],
    "blocked_commands": ["rm -rf", "DROP TABLE", "docker rm"]
  }
}
```

- **required: true** — story fails if this command fails
- **required: false** — warning only, story continues
- **blocked_commands** — if Claude's output contains any of these strings, the iteration is rejected

### Parallel Execution

```json
{
  "parallel": {
    "enabled": false,
    "max_concurrent": 8,
    "strategy": "worktree",
    "auto_merge": true,
    "merge_review_timeout": 900,
    "stagger_seconds": 3
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `max_concurrent` | 8 | Max simultaneous worktree workers |
| `stagger_seconds` | 3 | Delay between worker launches (avoids API rate limits) |
| `merge_review_timeout` | 900 | Timeout for merge conflict resolution Claude call |
| `auto_merge` | true | Automatically merge worktrees after batch completes |

### Commits

```json
{
  "commit": {
    "format": "feat(story-{{id}}): {{title}}",
    "stage_paths": ["src/", "tests/", "package.json"],
    "auto_commit": true
  }
}
```

- **stage_paths** — when non-empty, only these paths are staged for commit (limits blast radius)
- **format** — supports `{{id}}` and `{{title}}` variables

### Learnings

```json
{
  "learnings": {
    "enabled": true,
    "max_inject_count": 5
  }
}
```

Ralph extracts `<ralph>LEARN: text</ralph>` signals from Claude's output and stores them in `.ralph/learnings/`. On each iteration, the top N most relevant learnings are injected into the prompt.

### Postmortem

```json
{
  "postmortem": {
    "enabled": true,
    "window_seconds": 300,
    "max_output_chars": 50000
  }
}
```

When a story times out, Ralph reserves `window_seconds` from the total timeout to run a diagnostic Claude call. The postmortem prompt receives truncated output (up to `max_output_chars`) and produces a diagnosis that's stored for future reference.

### Decomposition

```json
{
  "decomposition": {
    "enabled": true,
    "max_depth": 2,
    "timeout_seconds": 600
  }
}
```

After `max_retries` failures, Ralph invokes Claude to break the story into 2-4 smaller sub-stories with hierarchical IDs (e.g., 3.1 becomes 3.1.1, 3.1.2). The `max_depth` limits nesting — at depth 2, sub-sub-stories won't decompose further.

### Lifecycle Hooks

```json
{
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

Each hook is a shell command string. Empty string = disabled.

| Hook | When | Environment Variables |
|------|------|-----------------------|
| `pre_iteration` | Before each loop iteration | `RALPH_STORY_ID`, `RALPH_PROJECT` |
| `post_iteration` | After each loop iteration | `RALPH_STORY_ID`, `RALPH_STATUS`, `RALPH_PROJECT` |
| `pre_story` | Before Claude is invoked for a story | `RALPH_STORY_ID`, `RALPH_SPEC_FILE` |
| `post_story` | After a story completes (success or fail) | `RALPH_STORY_ID`, `RALPH_STATUS`, `RALPH_OUTPUT_FILE` |
| `pre_worktree` | Before a parallel worktree is created | `RALPH_STORY_ID`, `RALPH_WORKTREE_DIR` |

`pre_worktree_timeout` (default: 120s) limits how long the pre_worktree hook can run before being killed.

Hooks run with `set -e` semantics — a non-zero exit from `pre_*` hooks aborts the operation. `post_*` hooks are fire-and-forget.

### Claude CLI Flags

```json
{
  "claude": {
    "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"]
  }
}
```

Ralph always ensures `--print` and `--output-format json` are present (required for signal parsing and metric collection). You can add additional flags like `--model` or `--max-turns`.

### Other Settings

| Key | Default | Description |
|-----|---------|-------------|
| `caffeine` | false | Prevent macOS sleep during runs (`caffeinate` wrapper) |
| `testing_phase.enabled` | false | Run a separate test-review Claude call after each story |
| `testing_phase.timeout_seconds` | 600 | Timeout for the test review call |

---

## Prompt Template Customization

Ralph uses markdown templates with `{{variable}}` substitution. Templates are loaded from `.ralph/templates/` (project-local, takes priority) or `templates/` (installation defaults).

### Available Templates

| Template | Purpose | Key Variables |
|----------|---------|---------------|
| `implement.md` | Main story implementation prompt | `{{id}}`, `{{title}}`, `{{spec_content}}`, `{{learnings}}`, `{{validation_commands}}`, `{{blocked_commands}}` |
| `test-review.md` | Post-implementation test review | `{{id}}`, `{{title}}`, `{{spec_content}}` |
| `merge-review.md` | Merge conflict resolution | `{{id}}`, `{{conflicts}}` |
| `timeout-postmortem.md` | Diagnostic after timeout | `{{id}}`, `{{output}}` |
| `decompose.md` | Story decomposition prompt | `{{id}}`, `{{spec_content}}`, `{{error_output}}` |
| `hitl-feedback.md` | Remediation PRD from review | `{{feedback}}` |

### Customizing

1. Copy the default template: `cp templates/implement.md .ralph/templates/implement.md`
2. Edit the copy — Ralph will use the project-local version
3. All `{{variable}}` placeholders are replaced at runtime

Example: adding a project-specific coding standard to every prompt:

```markdown
<!-- .ralph/templates/implement.md -->
## Story {{id}}: {{title}}

### Project Standards
- Use TypeScript strict mode
- All functions must have JSDoc comments
- No default exports

### Spec
{{spec_content}}

### Learnings from Previous Stories
{{learnings}}
```

---

## Story Queue Advanced Features

`.ralph/stories.txt` supports batch annotations, skip markers, and hierarchical IDs.

### Format

```
# Ralph Story Queue
# Format: ID | Title

# [batch:0] — sequential pre-work (always runs first)
1.1 | Initialize Project Structure

# [batch:1] — independent stories (run concurrently in parallel mode)
2.1 | Create Budget View
2.2 | Create Transaction View

# [batch:2] — depends on batch 1
3.1 | Add Reporting Dashboard

# Prefix with x to skip:
x 3.5 | Deferred Feature
```

### Batch Behavior

- **`[batch:0]`** and unbatched stories run sequentially before any parallel batches
- **`[batch:N]`** (N > 0) stories run concurrently in parallel mode, sequentially otherwise
- Batches execute in order: all batch-1 stories complete before batch-2 starts
- Within a batch, stories run simultaneously in separate git worktrees

### Skip Markers

Prefix a story ID with `x ` (x followed by space) to skip it without removing it from the queue:

```
x 3.5 | Deferred Feature    # skipped
3.6 | Active Feature         # will run
```

### Hierarchical IDs

Story IDs use the format `N.M` (epic.story). When decomposition creates sub-stories, they get hierarchical IDs:

| Level | Example | Origin |
|-------|---------|--------|
| Base story | `3.1` | PRD-generated |
| First decomposition | `3.1.1`, `3.1.2` | Auto-decomposed from 3.1 |
| Second decomposition | `3.1.1.1`, `3.1.1.2` | Auto-decomposed from 3.1.1 |

### Manual Editing

You can manually edit `stories.txt` while Ralph is **not** running:
- Add new stories (ensure matching spec files exist in `specs/`)
- Reorder stories within a batch
- Add/remove skip markers
- Change batch annotations

Never edit `stories.txt` while Ralph is running — the state machine tracks progress by story ID and concurrent edits can cause inconsistencies.

---

## State Machine

Ralph tracks all progress in `.ralph/state.json` with atomic writes (write to temp file, validate JSON, rename).

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `completed_stories` | array | Story IDs that finished successfully |
| `absorbed_stories` | object | Map of absorbed story ID to absorber story ID |
| `merged_stories` | array | Stories merged from worktrees |
| `decomposed_stories` | object | Map of parent ID to array of sub-story IDs |
| `current_story` | string/null | Story currently being executed |
| `retry_count` | number | Current retry attempt for active story |
| `run_metadata` | object | Start time, run count, timing |

### Manual Recovery

```bash
# View current state
jq . .ralph/state.json

# Clear current story (if stuck)
jq '.current_story = null | .retry_count = 0' .ralph/state.json > tmp.json && mv tmp.json .ralph/state.json

# Mark a story as completed manually
jq '.completed_stories += ["3.1"]' .ralph/state.json > tmp.json && mv tmp.json .ralph/state.json

# Full reset
ralph reset
```

**Safe operations:** reading state, marking additional stories complete, clearing current_story.

**Dangerous operations:** removing stories from completed_stories (can cause re-execution), modifying decomposed_stories (can create orphaned sub-stories).

---

## Metrics and Observability

### Per-Run Data

Each run writes a JSON file to `.ralph/metrics/run-*.json` with:
- Start/end timestamps
- Stories attempted and completed
- Token usage per story (input, output, cache reads/writes)
- Cost per story and total cost
- Timing per story

### CLI Commands

```bash
ralph stats              # summary of all runs
ralph stats --last 3     # last 3 runs
ralph stats --story 3.1  # stats for story 3.1 across all runs
```

### Live Dashboard

During runs, Ralph shows an append-only dashboard with:
- Current story and retry count
- Elapsed time with live timer
- Completed/failed/remaining counts

Disable with `--no-dashboard`.

### Log Files

- `ralph.log` — timestamped technical debug log (every state change, signal parse, config load)
- `progress.txt` — human-readable `[DONE]`/`[FAIL]`/`[LEARN]` log
- `.ralph/output/story-*.txt` — raw Claude output for each story iteration

---

## PRD-to-Spec Provenance

Ralph maintains a SHA-256 hash chain from PRD to specs:

```bash
ralph verify           # check integrity of all PRD-to-spec links
ralph verify --list    # list all tracked artifacts with hashes
```

The provenance manifest at `.ralph/provenance/manifest.json` records:
- PRD file hash at spec generation time
- Each spec file hash at generation time
- Timestamp and generator version

If a spec is modified after generation, `ralph verify` flags the discrepancy.

---

## Signal Protocol Reference

Claude communicates with Ralph through structured XML tags. The parser scans the full output and uses "last match wins" semantics (Claude may emit multiple signals in a single run).

| Signal | Format | Emitter |
|--------|--------|---------|
| DONE | `<ralph>DONE X.X</ralph>` | Story implementation |
| FAIL | `<ralph>FAIL X.X: reason</ralph>` | Story implementation |
| LEARN | `<ralph>LEARN: text</ralph>` | Story implementation |
| TEST_REVIEW_DONE | `<ralph>TEST_REVIEW_DONE X.X: result</ralph>` | Test review phase |
| MERGE_DONE | `<ralph>MERGE_DONE: resolved N conflicts</ralph>` | Merge resolution |
| MERGE_FAIL | `<ralph>MERGE_FAIL: reason</ralph>` | Merge resolution |
| TIMEOUT_POSTMORTEM_DONE | `<ralph>TIMEOUT_POSTMORTEM_DONE X.X</ralph>` | Postmortem diagnostic |
| DECOMPOSE_DONE | `<ralph>DECOMPOSE_DONE X.X: N sub-stories</ralph>` | Decomposition |

### Legacy Fallback

For backwards compatibility, these patterns are also recognized:

```
[DONE] Story X.X       → treated as success
[FAIL] Story X.X - reason → treated as failure
```

If neither primary nor legacy signals are found, the story is treated as a failure with reason "No completion signal in output."
