# End-of-Run Summary — Changelog

## Background

After a parallel run completed, the user saw only `PARALLEL EXECUTION COMPLETE` with zero details. The sequential runner showed only "ALL STORIES COMPLETE!". All the data needed for a rich summary existed in state and git — it just needed assembly.

---

## Implementation (Completed)

Commit `615b4b5` (2026-02-07)

### Files Modified

| File | Changes |
|------|---------|
| `lib/runner.sh` | Added `_STORY_TIMINGS[]`, `_STORY_OUTCOMES[]` associative arrays, per-story timing around Claude invocation, `_run_summary()` function (~240 lines), wired into sequential completion and iteration-limit exits |
| `lib/parallel.sh` | Added `_PARALLEL_STORY_START[]` for per-story timing, `_RALPH_RUN_START_COMMIT`/`_RALPH_RUN_START_TIME` capture, outcome tracking (`done`/`tentative`/`failed`), replaced `box_header "PARALLEL EXECUTION COMPLETE"` with `_run_summary "parallel"` |

### Summary Output Structure

```
╔══════════════════════════════════════════════════════════════════════╗
║                          RUN SUMMARY                               ║
╚══════════════════════════════════════════════════════════════════════╝

  Progress       [████████████████████░] 13/14
  Elapsed        01:23:45
  Avg/story      06:25

  Completed      12
  Tentative      1   (committed code, no DONE signal)    ← parallel only
  Failed         1

────────────────────────────────────────────────────────────────────
  Fastest        02:11      20.1 — Database Schema Migration
  Longest        15:43      22.3 — Auth Token Refresh
────────────────────────────────────────────────────────────────────
  Commits        47
  Insertions     1284 lines
  Deletions      312 lines
  Merged         13 branches                              ← parallel only
────────────────────────────────────────────────────────────────────
  Completed Stories
    ✓ 20.1    — Database Schema Migration                 (02:11)
    ✓ 20.2    — API Endpoint Refactor                     (05:33)

  Tentative (review recommended)                          ← parallel only
    ~ 22.3    — Auth Token Refresh                        (15:43)

  Failed
    ✗ 24.1    — WebSocket Handler                         (10:00)
────────────────────────────────────────────────────────────────────
  Learnings      7 extracted → .ralph/learnings/
────────────────────────────────────────────────────────────────────
  Pending Review
    M  src/auth.ts
    ?? src/temp-debug.log
────────────────────────────────────────────────────────────────────
  → 1 failed. Retry: ralph run -s 24.1
```

### Data Sources

| Metric | Source |
|--------|--------|
| Per-story duration | `_STORY_TIMINGS[]` — epoch diff around Claude invocation |
| Total elapsed | `_RALPH_RUN_START_TIME` captured at run start |
| Avg time/story | Sum of `_STORY_TIMINGS` / count |
| Fastest/longest | Min/max of `_STORY_TIMINGS` (shown only when >1 story) |
| Commits | `git rev-list --count "$start_commit..HEAD"` |
| Insertions/deletions | `git diff --shortstat "$start_commit..HEAD"` |
| Merged branches | Count of successful + tentative stories (parallel only) |
| Learnings | `_display_count_learnings()` from `lib/display.sh` |
| Pending review | `git status --porcelain` (capped at 10 lines) |
| Story outcomes | `_STORY_OUTCOMES[]` — `done`/`tentative`/`failed`/`absorbed` |

### Design Decisions

- **Unified data source:** Both sequential and parallel paths derive summary from `_STORY_OUTCOMES[]`, eliminating cross-batch accumulator complexity
- **Graceful degradation:** Every section is guarded — empty timings skip fastest/longest, no git baseline skips commit stats, etc.
- **Parallel-only sections:** Tentative stories and merged-branch count hidden in sequential mode
- **Duration format:** `HH:MM:SS` when hours > 0, `MM:SS` otherwise
- **Dry-run safe:** Summary not called during `--dry-run` (exits before Claude invocation)

### Test Results

All 145 existing tests pass (tiers 1-4). No regressions.
