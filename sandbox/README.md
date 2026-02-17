# Ralphetamine — Sandbox Test Matrix

A set of 6 self-contained mock projects for testing different stages of the Ralph pipeline.

## Test Matrix

| Sandbox | Starting Point | Tests | Stories | Key Config |
|---------|---------------|-------|---------|------------|
| `idea/` | Plain text description | `/prd` skill | N/A | N/A |
| `prd-small/` | PRD file (~3 stories) | `/ralph` skill (sequential spec gen) | < 5 | N/A |
| `prd-large/` | PRD file (~7 stories) | `/ralph` skill (parallel spec gen) | 5+ | N/A |
| `run-sequential/` | Specs + stories ready | `ralph run` sequential loop | 3 (chained deps) | Sequential, learnings, validation |
| `run-parallel/` | Specs + stories ready | `ralph run --parallel` | 6 in 3 batches | Parallel, auto-merge, stagger |
| `run-full/` | Specs + stories ready | `ralph run` mixed mode | 5 (mixed seq+parallel) | Testing phase, hooks, learnings, validation |

## Quick Start

```bash
# Initialize all sandboxes
sandbox/run-all.sh setup

# Run a specific sandbox manually
cd sandbox/run-sequential
./setup.sh
ralph run --no-tmux --no-interactive

# Reset everything
sandbox/run-all.sh reset
```

## Sandbox Details

### `idea/` — Test `/prd` Skill
**Input:** `idea.txt` with a plain English project description (md2html converter).
**Test:** Run `/prd` and verify it produces `tasks/prd-*.md`.
**Reset:** Deletes everything in `tasks/`.

### `prd-small/` — Test `/ralph` with < 5 Stories
**Input:** Pre-written PRD for a "todolist" CLI (1 epic, 3 stories).
**Test:** Run `/ralph`, verify sequential spec generation (no `manifest.yml`), `stories.txt` created.
**Reset:** Deletes `specs/`, `.ralph/stories.txt`, `.ralph/manifest.yml`.

### `prd-large/` — Test `/ralph` with 5+ Stories
**Input:** Pre-written PRD for a "bookshelf" CLI (3 epics, 7 stories).
**Test:** Run `/ralph`, verify parallel spec generation (`manifest.yml` created then deleted), consistency review, batch annotations in `stories.txt`.
**Reset:** Deletes `specs/`, `.ralph/stories.txt`, `.ralph/manifest.yml`.

### `run-sequential/` — Test `ralph run` Sequential
**Project:** "Greeter" — bash greeting script.
**3 stories**, all chained: create script -> add tests -> enhance with flags.
**Config:** `parallel.enabled: false`, `learnings.enabled: true`, validation runs test script, `timeout: 300s`, `max_retries: 2`.
**Test:** Sequential execution, dependency chain, learnings accumulation, validation.

### `run-parallel/` — Test `ralph run --parallel`
**Project:** "Bookmarks" — bash JSON bookmark manager.
**6 stories in 3 batches:**
- Batch 0 (sequential): 1.1 init schema, 1.2 seed data
- Batch 1 (parallel): 2.1 list, 2.2 search, 2.3 detail
- Batch 2 (sequential): 3.1 CLI interface
**Config:** `parallel.enabled: true`, `max_concurrent: 3`, `stagger_seconds: 2`, `auto_merge: true`.
**Test:** Worktree creation, concurrent execution, auto-merge, batch ordering.

### `run-full/` — Test Mixed Mode + All Features
**Project:** "Calculator" — bash calculator with parsing and formatting.
**5 stories, mixed sequential + parallel:**
- Epic 1 (sequential): 1.1 project setup, 1.2 core math
- Epic 2 (parallel): 2.1 input handler, 2.2 output formatter
- Epic 3 (sequential): 3.1 integration
**Config:** `parallel.enabled: true`, `max_concurrent: 2`, `testing_phase.enabled: true`, hooks log to `hooks.log`, `learnings.max_inject_count: 3`.
**Test:** Mixed execution, testing phase, hooks firing, learnings injection cap.

## How Each Sandbox Works

### `setup.sh`
1. `git init` if no `.git/` directory
2. Create empty dirs (`src/`, `tests/`) with `.gitkeep`
3. Create `.ralph/learnings/_index.json` as `{}`
4. Initialize `state.json` and `progress.txt`
5. `git add -A && git commit -m "initial: sandbox setup"`

### `reset.sh`
1. Remove runtime state (state.json, progress.txt, learnings, hooks.log)
2. Reset learnings index to `{}`
3. Reset spec frontmatter to `status: pending`
4. Remove generated code (keep `.gitkeep` files)
5. Clean worktrees and extra git branches (parallel sandboxes)
6. `git checkout -- .` to restore committed files
7. `git clean -fd` to remove untracked files

## Notes

- All projects are **pure bash** — no npm, cargo, pip, or other dependencies
- Stories create bash scripts and text files only
- Each sandbox is a self-contained nested git repo
- The `sandbox/` directory is in `.gitignore` for the parent Ralphetamine repo
