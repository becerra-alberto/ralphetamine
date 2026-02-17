# Ralphetamine — Runtime Output Tree

This document maps every piece of information Ralph produces during execution. It's organized as a tree where each branch represents a distinct output channel, phase, or data stream. A UX designer can use this to understand what information exists, when it appears, and how it relates to the user's mental model of "is my code getting built?"

```
RALPH RUNTIME
│
├── 1. STARTUP & CONFIGURATION
│   │
│   │   Before any code is generated, Ralph establishes context. The user
│   │   needs to know: what project, how many stories, what mode, what
│   │   constraints. This is the "mission briefing" phase.
│   │
│   ├── Interactive Prompt (default mode)
│   │   │
│   │   │   When running without --no-interactive, Ralph presents a menu.
│   │   │   This is the only moment the user makes decisions. Everything
│   │   │   after this is autonomous. The prompt shows project name, current
│   │   │   progress (X / Y stories, Z remaining), and the next story up.
│   │   │
│   │   ├── Project Name .............. from .ralph/config.json
│   │   ├── Progress Snapshot ......... "3 / 12 stories (9 remaining)"
│   │   ├── Next Story ................ "4.1 — User Authentication"
│   │   ├── Run Mode Choice ........... 1) all  2) specific  3) N iterations  4) dry run  5) exit
│   │   ├── Verbose Toggle ............ y/N
│   │   ├── Timeout Override .......... seconds or Enter for default
│   │   └── Caffeinate Toggle ......... macOS only, prevents sleep
│   │
│   ├── Run Header (box)
│   │   │
│   │   │   A double-line ASCII box announces the run. This is the last
│   │   │   thing printed before the loop starts. It serves as a visual
│   │   │   anchor — the user can scroll up to find it.
│   │   │
│   │   │   ╔════════════════════════════════════════════════════════╗
│   │   │   ║            RALPH IMPLEMENTATION LOOP                  ║
│   │   │   ╚════════════════════════════════════════════════════════╝
│   │   │
│   │   ├── Project ................... name
│   │   ├── Stories ................... "3 / 12 completed"
│   │   ├── Iterations ................ "unlimited" or N
│   │   ├── Timeout ................... "1800s per story"
│   │   ├── Story (if -s flag) ........ "4.1 (specific)"
│   │   └── Resume (if -r flag) ....... "from 4.1"
│   │
│   └── Parallel Config (if --parallel)
│       ├── Max Concurrent ............ from config, default 8
│       ├── Stagger Delay ............. seconds between spawns
│       └── Story Count ............... "9 remaining of 12 total"
│
│
├── 2. SEQUENTIAL EXECUTION LOOP
│   │
│   │   The main loop. Each story gets one "iteration." The loop repeats
│   │   until all stories are done, the iteration limit is hit, or the
│   │   user interrupts. The rhythm is: header → invoke → wait → parse →
│   │   outcome → next. During the wait, the terminal is mostly quiet
│   │   except for heartbeats.
│   │
│   ├── Iteration Header
│   │   │
│   │   │   ┌────────────────────────────────────────────────────────┐
│   │   │   │  Iteration 1   of 5                                    │
│   │   │   └────────────────────────────────────────────────────────┘
│   │   │
│   │   └── Current / Total
│   │
│   ├── Story Announcement
│   │   │
│   │   │   Printed once per story attempt. Tells the user what's about
│   │   │   to be built and where the spec lives on disk.
│   │   │
│   │   ├── Story ID + Title .......... "Starting story 4.1: User Authentication"
│   │   └── Spec Path ................. "specs/epic-4/story-4.1-user-authentication.md"
│   │
│   ├── Pre-Story Hook ................ [DEBUG] only, runs shell command from config
│   │
│   ├── Claude Invocation
│   │   │
│   │   │   The core event. Ralph hands the rendered prompt to Claude CLI
│   │   │   with a timeout. The effective timeout is the configured timeout
│   │   │   minus a postmortem window (default 300s). This is the longest
│   │   │   phase — typically 5-30 minutes of silence.
│   │   │
│   │   ├── Timeout Info .............. "Invoking Claude (timeout: 1500s of 1800s)"
│   │   ├── Verbose Stream ............ if -v, raw Claude output streams via tee
│   │   └── Return Info ............... "Claude returned: exit_code=0 output_length=4523"
│   │
│   ├── Heartbeat (during wait)
│   │   │
│   │   │   Every 5 minutes (configurable), a single line is appended to
│   │   │   confirm Ralph is alive. This is the only sign of life during
│   │   │   long Claude invocations. Without it, the user might think
│   │   │   the process has hung.
│   │   │
│   │   └── Format .................... "[14:35:00] ... running story 4.1 (elapsed: 00:23:15)"
│   │
│   ├── Signal Parsing
│   │   │
│   │   │   After Claude returns, Ralph scans the full output for structured
│   │   │   signals. It uses "last match wins" — Claude may emit multiple
│   │   │   signals, and the final one is authoritative. This phase is
│   │   │   invisible to the user unless something unexpected happens.
│   │   │
│   │   ├── DONE Signal ............... <ralph>DONE 4.1</ralph>
│   │   ├── FAIL Signal ............... <ralph>FAIL 4.1: reason</ralph>
│   │   ├── LEARN Signal(s) ........... <ralph>LEARN: insight text</ralph>
│   │   ├── Mismatched ID Warning ..... "DONE signal for 4.2 but expected 4.1"
│   │   └── No Signal Warning ......... "No completion signal found"
│   │
│   ├── Outcome Display
│   │   │
│   │   │   A single, dense line summarizing what happened. This is the
│   │   │   most important line in the entire output — it tells the user
│   │   │   whether the story shipped. Includes duration, token count,
│   │   │   and cost. Green for success, red for failure.
│   │   │
│   │   ├── Success ................... "[OK] Story 4.1 completed! (5m 35s, 42000 tokens, $0.38)"
│   │   └── Failure ................... "[FAIL] Story 4.1 failed: Timeout after 1500s (5m 35s, 42000 tokens, $0.38)"
│   │
│   ├── Metrics Extraction
│   │   │
│   │   │   Token counts and cost are parsed from the Claude CLI JSON
│   │   │   envelope. These are persisted per-story for the summary and
│   │   │   for historical analytics.
│   │   │
│   │   ├── Tokens In ................. input tokens consumed
│   │   ├── Tokens Out ................ output tokens generated
│   │   ├── Cost (USD) ................ computed from token counts
│   │   └── Turns ..................... number of API round-trips (⚠ if > 6)
│   │
│   ├── Post-Story Hook ............... [DEBUG] only, runs shell command from config
│   │
│   └── Testing Specialist (optional)
│       │
│       │   A second Claude pass focused only on test quality. Gated by
│       │   config flag testing_phase.enabled. Non-fatal — if it fails or
│       │   times out, the story is still considered done.
│       │
│       ├── Start ..................... "[INFO] Testing specialist: reviewing story 3.1"
│       ├── Success ................... "[OK] Testing specialist: all tests passing"
│       ├── Timeout ................... "[WARN] Testing specialist: timed out after 600s (non-fatal)"
│       └── Failure ................... "[WARN] Testing specialist: failed (exit code 1, non-fatal)"
│
│
├── 3. PARALLEL EXECUTION
│   │
│   │   Parallel mode replaces the sequential loop with a phased pipeline:
│   │   foundation stories run first (sequentially), then batches run
│   │   concurrently in git worktrees, then results merge back. The user's
│   │   mental model shifts from "one at a time" to "waves of work."
│   │
│   ├── Phase 0: Unbatched Stories (sequential)
│   │   │
│   │   │   Stories not assigned to any batch. These are typically
│   │   │   prerequisites that must exist before any parallel work.
│   │   │
│   │   │   ── Unbatched Stories (sequential) ──────────────────────
│   │   │
│   │   ├── Story List ................ "  1.1 | Project Setup"
│   │   └── (same output as sequential loop per story)
│   │
│   ├── Phase 1: Batch 0 — Foundation (sequential)
│   │   │
│   │   │   Batch 0 is special: it runs sequentially even in parallel mode.
│   │   │   These are stories that other batches depend on.
│   │   │
│   │   │   ── Batch 0: Foundation (sequential) ────────────────────
│   │   │
│   │   ├── Story List ................ numbered, indented
│   │   └── (same output as sequential loop per story)
│   │
│   ├── Phase 2: Batch N — Parallel Execution
│   │   │
│   │   │   The main event. Multiple Claude instances run simultaneously,
│   │   │   each in an isolated git worktree. The user sees spawning
│   │   │   events, then silence (with heartbeats), then results.
│   │   │
│   │   │   ── Batch 1: Parallel Execution ─────────────────────────
│   │   │
│   │   ├── Story List ................ all stories in this batch
│   │   ├── Worktree Creation ......... "[INFO] Creating worktree: story-3.1 (branch: ralph/story-3.1)"
│   │   ├── Worker Spawn .............. "[INFO] Spawned Claude for story 3.1 (PID 12345)"
│   │   ├── Stagger Delay ............. implicit, N seconds between spawns
│   │   ├── Waiting ................... "[INFO] Waiting for 4 parallel Claude instances..."
│   │   │
│   │   ├── Parallel Heartbeat
│   │   │   │
│   │   │   │   Different from sequential heartbeat — shows worker count.
│   │   │   │
│   │   │   └── Format ................ "[14:35:00] ... parallel batch running (workers: 3/8, elapsed: 00:23:15)"
│   │   │
│   │   └── Result Classification
│   │       │
│   │       │   Each story gets classified into one of several outcomes.
│   │       │   "Tentative" is unique to parallel mode — it means the branch
│   │       │   has commits and passes validation, but Claude didn't emit
│   │       │   a DONE signal (possibly timed out mid-work).
│   │       │
│   │       ├── Done .................. "[OK] Story 3.1: completed"
│   │       ├── Tentative ............. "[WARN] Story 3.2: no DONE signal but branch has commits and passes validation"
│   │       ├── Timeout (no work) ..... "[WARN] Story 3.3: timed out (no commits)"
│   │       ├── Failed Validation ..... "[WARN] Story 3.4: has commits but failed validation"
│   │       ├── Error Exit ............ "[WARN] Story 3.4: failed exit code 1 (no commits)"
│   │       └── Batch Summary ......... "[INFO] Batch results: 2 succeeded, 2 failed"
│   │
│   ├── Phase 3: Retry (sequential fallback)
│   │   │
│   │   │   Failed stories get retried one at a time. This catches flaky
│   │   │   timeouts and gives stories a second chance with sequential focus.
│   │   │
│   │   │   ── Retry Phase ─────────────────────────────────────────
│   │   │
│   │   ├── Announcement .............. "Retrying 2 failed stories sequentially (up to 3 attempts each)"
│   │   ├── Per Retry ................. "Retry 1/3 for story 3.3"
│   │   ├── Retry Success ............. "[OK] Story 3.3: completed on retry 1"
│   │   ├── Retry Failure ............. "[WARN] Story 3.4: retry 1 failed"
│   │   └── Exhausted ................. "[ERROR] Story 3.4: exhausted 3 retries"
│   │
│   └── Phase 4: Merge
│       │
│       │   All successful branches merge back into the main branch in
│       │   story-ID order. This is where parallel work becomes real.
│       │   Merge conflicts trigger a Claude resolution agent.
│       │
│       │   ── Merge Phase ─────────────────────────────────────────
│       │
│       ├── Announcement .............. "Merging 3 branches (sorted by story ID)..."
│       ├── Clean Merge ............... "[OK] Merged story 3.1"
│       ├── Conflict Detected ......... "[WARN] Merge conflict on story 3.3"
│       ├── Resolution Agent .......... "[INFO] Spawning conflict resolution agent for story 3.3"
│       ├── Resolution Success ........ "[OK] Merge resolved: resolved 2 conflicts"
│       ├── Resolution Failure ........ "[ERROR] Could not resolve merge conflict for story 3.4"
│       ├── Conflict Logs ............. "Merge conflict details saved to .ralph/logs/merge-conflict-3.4.log"
│       ├── Preserved Branch .......... "Branch ralph/story-3.4 preserved (merge failed)"
│       └── Auto-Merge Disabled ....... lists worktree paths for manual review
│
│
├── 4. FAILURE HANDLING
│   │
│   │   Failure is not an edge case — it's a core flow. Stories fail for
│   │   many reasons: timeouts, bad code, test failures, flaky deps.
│   │   Ralph's response escalates: retry → postmortem → decompose →
│   │   human intervention. The user needs to see this escalation clearly.
│   │
│   ├── Failure Reasons
│   │   ├── Timeout ................... "Story 4.1 timed out after 1500s"
│   │   ├── Error Exit ................ "Story 4.1 failed (exit code: 1)"
│   │   ├── FAIL Signal ............... "Story 4.1 failed: tests failing"
│   │   ├── No Signal ................. "No completion signal found"
│   │   └── Mismatched Signal ......... "DONE signal for 4.2 but expected 4.1"
│   │
│   ├── Retry Tracking
│   │   │
│   │   │   Each retry increments a counter. The user sees attempt N of M.
│   │   │   Retries carry accumulated learnings from previous failures,
│   │   │   so later attempts are better-informed.
│   │   │
│   │   └── Format .................... "Story 4.1 failed (attempt 2/3): Timeout after 1500s"
│   │
│   ├── Timeout Postmortem
│   │   │
│   │   │   When a story times out, Ralph reserves a window (default 300s)
│   │   │   to run a diagnostic Claude pass. This analyzes the partial
│   │   │   output and generates a learning for the next attempt. The
│   │   │   effective story timeout is reduced by this window.
│   │   │
│   │   ├── Start ..................... "[INFO] Running timeout postmortem for story 4.1 (window: 300s)"
│   │   ├── Success ................... "[INFO] Postmortem completed for story 4.1"
│   │   ├── Self-Timeout .............. "[WARN] Postmortem itself timed out after 300s (partial output persisted)"
│   │   ├── Output File ............... .ralph/last-postmortem-output.txt
│   │   └── Report File ............... .ralph/learnings/timeouts/4.1.md
│   │
│   ├── Max Retries Exceeded (box)
│   │   │
│   │   │   ╔════════════════════════════════════════════════════════╗
│   │   │   ║                  MAX RETRIES EXCEEDED                 ║
│   │   │   ╚════════════════════════════════════════════════════════╝
│   │   │
│   │   ├── Story ID + Failure Count .. "Story 4.1 failed 3 times."
│   │   ├── Human Intervention ........ "Human intervention required."
│   │   ├── Last Failure Reason ....... "Last failure: Timeout after 1500s"
│   │   └── Recovery Command .......... "To retry: ralph run -s 4.1"
│   │
│   └── Automatic Decomposition
│       │
│       │   After max retries, Ralph attempts to break the story into
│       │   2-4 smaller sub-stories. This is the "graceful degradation"
│       │   path — instead of giving up, it tries simpler work.
│       │
│       ├── Trigger ................... "Max retries hit — attempting automatic decomposition of story 4.1"
│       ├── Progress .................. "Attempting decomposition of story 4.1"
│       ├── Spec Creation ............. "Created spec: specs/epic-4/story-4.1.1-setup-auth-schema.md"  (×N)
│       ├── Success ................... "[OK] Story 4.1 decomposed into 3 sub-stories: 4.1.1 4.1.2 4.1.3"
│       ├── Depth Guard ............... "Story 4.1.1.1 at depth 2 (max: 2) — refusing to decompose further"
│       ├── Already Decomposed ........ "Story 4.1 already decomposed — skipping"
│       └── Agent Declined ............ "Decomposition agent declined: Story is atomic and cannot be split"
│
│
├── 5. LEARNINGS SYSTEM
│   │
│   │   Learnings are insights extracted from Claude's output during
│   │   execution. They accumulate across stories and retries, and are
│   │   injected into future prompts. This is Ralph's "memory" within
│   │   a single project run.
│   │
│   ├── Extraction (during signal parsing)
│   │   │
│   │   │   LEARN signals are parsed from Claude's output. Multiple
│   │   │   learnings can come from a single story. They are categorized
│   │   │   automatically: testing, framework, data-model, tooling,
│   │   │   patterns, gotchas, uncategorized.
│   │   │
│   │   └── Signal .................... <ralph>LEARN: Always run migrations before seeding</ralph>
│   │
│   ├── Storage
│   │   ├── By Category ............... .ralph/learnings/{category}.md
│   │   ├── Timeout Reports ........... .ralph/learnings/timeouts/{story_id}.md
│   │   └── Format .................... "- [Story 3.1] Always mock auth middleware before testing"
│   │
│   └── CLI Display (ralph learnings)
│       │
│       │   Shows accumulated learnings organized by topic with counts.
│       │
│       ├── Topic List ................ "testing: 12 entries  |  framework: 8 entries"
│       └── Total ..................... "Total: 28 learnings"
│
│
├── 6. PERSISTENT FILES (written during run)
│   │
│   │   These files are the durable artifacts of a run. They persist after
│   │   Ralph exits and are used for resume, analytics, debugging, and
│   │   the end-of-run summary.
│   │
│   ├── progress.txt (append-only event log)
│   │   │
│   │   │   One line per event. Human-readable. Never truncated or rotated.
│   │   │   This is the "flight recorder" — the simplest way to understand
│   │   │   what happened across the entire run.
│   │   │
│   │   ├── [DONE] Story 3.1 - Dashboard Widget - Wed 12 Feb 2026 14:35:00 EST
│   │   ├── [DONE] Story 3.2 - Settings Page - ... (tentative: commits detected, validated)
│   │   ├── [DONE] Story 3.3 - Notifications - ... (retry 2)
│   │   ├── [FAIL] Story 3.4 - User Profile - Timeout after 1500s - ... (attempt 2/3)
│   │   ├── [LEARN] Always run migrations before seeding
│   │   ├── [TIMEOUT_POSTMORTEM] Story 3.4 - ...
│   │   ├── [DECOMPOSED] Story 3.4 → 3.4.1 3.4.2 3.4.3 - ...
│   │   ├── [TEST_REVIEW] Story 3.1 - all tests passing - ...
│   │   └── [RECONCILED] Story 5.1 - Orphan Feature - ...
│   │
│   ├── state.json (current state machine)
│   │   │
│   │   │   The source of truth for resume. Written atomically via
│   │   │   _state_safe_write (temp file + JSON validation + mv).
│   │   │
│   │   ├── completed_stories ......... ["1.1", "1.2", "2.1"]
│   │   ├── absorbed_stories .......... { "2.3": "2.1" }     (story absorbed by another)
│   │   ├── merged_stories ............ ["1.1", "2.1"]        (parallel only)
│   │   ├── decomposed_stories ........ { "3.1": ["3.1.1", "3.1.2"] }
│   │   ├── current_story ............. "4.1"
│   │   └── retry_count ............... 2
│   │
│   ├── ralph.log (main log, rotated at 1MB)
│   │   │
│   │   │   Every log_*() call writes here with timestamps. Includes
│   │   │   debug-level output even when verbose mode is off. This is
│   │   │   the debugging artifact.
│   │   │
│   │   └── Format .................... "[YYYY-MM-DD HH:MM:SS] [LEVEL] message"
│   │
│   ├── Claude Output Files
│   │   ├── .ralph/last-claude-output.txt ......... last sequential story output (overwritten)
│   │   ├── .ralph/last-postmortem-output.txt ..... last postmortem output
│   │   ├── .ralph/last-decompose-output.txt ...... last decomposition output
│   │   ├── .ralph/worktrees/output-{story}.txt ... per-story parallel output
│   │   └── .ralph/logs/merge-conflict-{story}.log  merge conflict diagnostics
│   │
│   └── Per-Run Metrics JSON
│       │
│       │   Written at end of run to .ralph/runs/run-{ISO-timestamp}.json.
│       │   Used by `ralph stats` for historical analytics.
│       │
│       ├── timestamp ................. ISO 8601
│       ├── mode ...................... "sequential" | "parallel"
│       ├── duration_secs ............. total wall clock
│       ├── stories ................... per-story: outcome, duration, tokens, cost, turns
│       ├── totals .................... completed, tentative, failed, absorbed, tokens, cost
│       ├── git ....................... commits, insertions, deletions
│       └── learnings_extracted ....... count
│
│
├── 7. END-OF-RUN SUMMARY
│   │
│   │   The summary is the single most important output. It appears once
│   │   at the very end and consolidates everything that happened. A user
│   │   who stepped away should be able to read only this and know exactly
│   │   what shipped, what failed, and what to do next.
│   │
│   │   ╔════════════════════════════════════════════════════════════╗
│   │   ║                       RUN SUMMARY                        ║
│   │   ╚════════════════════════════════════════════════════════════╝
│   │
│   ├── Progress Bar .................. [████████████░░░░░░░░] 8/12
│   ├── Elapsed Time .................. 01:23:45
│   ├── Avg Per Story ................. 08:15
│   │
│   ├── Outcome Counts
│   │   ├── Completed ................. 5
│   │   ├── Tentative ................. 1   (parallel only — has code, no DONE signal)
│   │   ├── Failed .................... 2
│   │   └── Absorbed .................. 1   (story covered by another story's work)
│   │
│   ├── Timing Extremes
│   │   ├── Fastest ................... "05:12  3.1 — Dashboard Widget"
│   │   └── Longest ................... "15:30  3.4 — User Profile"
│   │
│   ├── Git Stats
│   │   ├── Commits ................... 12
│   │   ├── Insertions ................ 450 lines
│   │   ├── Deletions ................. 120 lines
│   │   └── Merged Branches ........... 3   (parallel only)
│   │
│   ├── Story Lists (color-coded)
│   │   ├── Completed (✓ green) ....... story ID, title, duration
│   │   ├── Tentative (~ yellow) ...... story ID, title, duration  (parallel only)
│   │   └── Failed (✗ red) ............ story ID, title, duration
│   │
│   ├── Learnings Count ............... "8 extracted → .ralph/learnings/"
│   │
│   ├── Pending Git Review
│   │   │
│   │   │   Shows uncommitted/unstaged changes so the user knows what
│   │   │   to review. Truncated with "... and N more" for large diffs.
│   │   │
│   │   ├── Modified Files ............ M  src/auth.ts
│   │   ├── Added Files ............... A  src/schema.sql
│   │   └── Untracked Files ........... ?? .env.example
│   │
│   ├── Token Usage Table
│   │   │
│   │   │   Per-story breakdown of API consumption. The ⚠ flag on high
│   │   │   turn counts warns that context compaction likely happened,
│   │   │   meaning Claude may have lost context mid-story.
│   │   │
│   │   ├── Columns ................... Story | Tokens In | Tokens Out | Cost | Turns
│   │   └── Warning Flag .............. ⚠ when turns > 6
│   │
│   ├── Next Action
│   │   ├── If failures exist ......... "→ 2 failed. Retry first: ralph run -s 3.4"
│   │   ├── If all complete ........... "ALL STORIES COMPLETE!" (box)
│   │   └── If iteration limit hit .... "Reached iteration limit (5)" (box)
│   │
│   └── HITL Review
│       ├── Auto-generated ............ "docs/hitl-review.html"
│       └── Manual prompt ............. "→ Review what was built: ralph hitl"
│
│
├── 8. TIMING & LIFECYCLE
│   │
│   │   Timing pervades the entire system. The user needs to understand
│   │   three clocks: wall clock (total elapsed), per-story clock
│   │   (individual durations), and the timeout budget (how much time
│   │   Claude gets vs. how much is reserved for postmortem).
│   │
│   ├── Wall Clock
│   │   ├── RALPH_START_TIME .......... epoch seconds, set at display_init()
│   │   ├── _RALPH_RUN_START_TIME ..... set at loop start
│   │   └── Elapsed Display ........... HH:MM:SS in heartbeats and summary
│   │
│   ├── Per-Story Timing
│   │   ├── _STORY_TIMINGS[id] ....... duration in seconds
│   │   ├── Display Format ............ "Xm XXs" or "Xs" for short
│   │   ├── Fastest / Longest ......... shown in summary
│   │   └── Average ................... computed for summary
│   │
│   ├── Timeout Budget
│   │   │
│   │   │   effective_timeout = total_timeout - postmortem_window
│   │   │   If remaining < 60s, postmortem is skipped entirely.
│   │   │
│   │   ├── Total Timeout ............. from config, default 1800s
│   │   ├── Postmortem Window ......... from config, default 300s
│   │   └── Effective Timeout ......... shown in "Invoking Claude" log
│   │
│   └── Heartbeat Interval ............ default 300s (5 min), configurable
│
│
├── 9. VISUAL SYSTEM
│   │
│   │   All output is append-only — no scroll regions, no cursor
│   │   manipulation, no ncurses. This makes it safe for tmux, script
│   │   capture, and CI. Colors are stripped when NO_COLOR is set,
│   │   CI=true, TERM=dumb, or stdout is not a TTY.
│   │
│   ├── Color Palette
│   │   ├── Green (\033[0;32m) ........ success, completions, ✓
│   │   ├── Red (\033[0;31m) .......... errors, failures, ✗
│   │   ├── Yellow (\033[0;33m) ....... warnings, tentative, ~
│   │   ├── Cyan (\033[0;36m) ......... informational
│   │   ├── Dim (\033[2m) ............. labels, secondary text, metrics
│   │   ├── Bold (\033[1m) ............ project name in interactive prompt
│   │   └── Reset (\033[0m) ........... after every colored span
│   │
│   ├── Box Drawing Characters
│   │   ├── Double-line ............... ╔ ═ ╗ ║ ╚ ╝   (major headers)
│   │   ├── Single-line ............... ┌ ─ ┐ │ └ ┘   (iteration headers)
│   │   └── Divider ................... ─ × 68           (section breaks)
│   │
│   ├── Progress Bar
│   │   └── Format .................... [████████░░░░░░░░░░░░] 5/12   (default width 20)
│   │
│   ├── Key-Value Layout
│   │   └── Format .................... 14-char dim key column + value
│   │
│   └── Log Prefixes
│       ├── [OK] ...................... green
│       ├── [ERROR] ................... red
│       ├── [WARN] .................... yellow
│       ├── [INFO] .................... cyan
│       ├── [DEBUG] ................... dim (verbose only)
│       └── [CRASH] ................... red, to stderr + ralph.log
│
│
├── 10. CRASH & RECOVERY
│   │
│   │   Ralph assumes it will crash. Every startup checks for stale
│   │   state and cleans up. The user needs to know: did it crash,
│   │   and can it resume?
│   │
│   ├── Process Lock
│   │   ├── Active Lock ............... "[ERROR] Another Ralph instance is running (PID 12345)"
│   │   ├── Stale Lock ................ "[WARN] Removing stale lock (PID 12345 no longer running)"
│   │   └── Manual Override ........... "If this is stale, remove .ralph/.lock manually"
│   │
│   ├── Crash Handler (ERR trap)
│   │   ├── Log Line .................. "[CRASH] exit=N cmd='command' func=funcname line=N"
│   │   ├── Stack Trace ............... "[CRASH] stack: func1 func2 func3"
│   │   └── Stderr .................... "[RALPH CRASH] exit=N cmd='command' func=funcname line=N"
│   │
│   └── Resume Behavior
│       │
│       │   On restart, Ralph reads state.json and skips completed stories.
│       │   The user sees the normal run header but progress shows where
│       │   it left off. No explicit "resuming from crash" message.
│       │
│       └── Implicit .................. progress bar shows prior completions
│
│
└── 11. CLI COMMANDS (non-run outputs)
    │
    │   These are outputs from commands the user runs between or instead
    │   of `ralph run`. They query state without modifying it.
    │
    ├── ralph status
    │   ├── Progress .................. "5 / 12 stories (7 remaining)"
    │   ├── Current Story ............. story ID
    │   ├── Retry Count ............... current retry count
    │   └── All Complete .............. "[OK] All stories complete!"
    │
    ├── ralph stories
    │   │
    │   │   Color-coded list of all stories and their status.
    │   │
    │   ├── [done] green .............. completed stories
    │   ├── [curr] yellow ............. current story
    │   └── [    ] dim ................ pending stories
    │
    ├── ralph stats
    │   │
    │   │   Historical analytics from persisted run JSON files.
    │   │
    │   ├── Last Run Summary .......... mode, duration, outcome counts
    │   ├── Token Usage Table ......... per-story tokens, cost, turns
    │   ├── Cumulative Stats .......... total runs, stories, cost
    │   └── Cost Trend ................ ASCII bar chart by date
    │
    ├── ralph verify
    │   │
    │   │   Provenance checking — ensures specs match PRDs.
    │   │
    │   ├── PRD Coverage .............. "[OK] PRD epic-1/prd.md — 4/4 stories present"
    │   ├── Hash Mismatch ............. "[WARN] PRD modified since conversion"
    │   ├── Missing Stories ........... "[WARN] Story 3.5 in provenance but missing from stories.txt"
    │   └── Orphaned Specs ............ "[WARN] story-3.6-orphaned.md not tracked by any PRD"
    │
    ├── ralph reconcile
    │   │
    │   │   Recovers work from orphaned git branches (crashed parallel runs).
    │   │
    │   ├── Branch Listing ............ branch name, story ID, commit count, last commit
    │   ├── Merge Preview ............. "clean (no conflicts)" or "CONFLICTS detected"
    │   ├── Dry Run (default) ......... "Found 2 orphaned branches with unmerged work"
    │   └── Apply Mode ................ merge results per branch
    │
    └── ralph hitl
        │
        │   Human-in-the-loop review — generates a checklist from specs.
        │
        ├── Generate .................. "HITL review generated: docs/hitl-review.html"
        └── Feedback → PRD ........... "Remediation PRD generated: docs/hitl-remediation-prd.md"
```

---

## Appendix: Rendered Dashboard Views

These are the actual screens a user sees, pulled directly from the source code.
Source file references are included so a designer can trace each view back to
the function that renders it.

---

### View 1: Interactive Startup Menu

**Source:** `lib/interactive.sh:126-206`
**When:** At the start of every `ralph run` (unless `--no-interactive`)
**Purpose:** The only moment the user makes decisions. Everything after is autonomous.

```
Ralph — my-project

  Progress: 3 / 12 stories (9 remaining)
  Next up:  4.1 — User Authentication

How would you like to run?
  1) Run all remaining stories
  2) Run a specific story
  3) Run N iterations
  4) Dry run (preview prompt)
  5) Exit

Choice [1]:

Verbose output? [y/N]:
Timeout override (seconds, Enter for default):
Prevent sleep (caffeine)? [y/N]:              <- macOS only
```

---

### View 2: Run Header

**Source:** `lib/runner.sh:249-258`, `lib/ui.sh:118-129` (box_header), `lib/ui.sh:131-135` (box_kv)
**When:** Immediately after interactive prompt (or at start in non-interactive mode)
**Purpose:** Visual anchor — the user can scroll up to find the start of the run.

```
╔════════════════════════════════════════════════════════════════════╗
║                     RALPH IMPLEMENTATION LOOP                     ║
╚════════════════════════════════════════════════════════════════════╝

  Project:       my-project
  Stories:       3 / 12 completed
  Iterations:    unlimited
  Timeout:       1800s per story
  Story:         4.1 (specific)           <- only with -s flag
  Resume:        from 4.1                 <- only with -r flag
```

---

### View 3: Iteration Header

**Source:** `lib/ui.sh:137-144`
**When:** At the start of each story attempt in sequential mode
**Purpose:** Marks iteration boundaries in the scroll-back buffer.

```
┌────────────────────────────────────────────────────────────────────┐
│  Iteration 1   of 5                                                │
└────────────────────────────────────────────────────────────────────┘
```

---

### View 4: Story Outcome Lines

**Source:** `lib/display.sh:101-142`
**When:** After each Claude invocation returns and signals are parsed
**Purpose:** The single most important line per story — did it ship?

Success (green):
```
[OK] Story 4.1 completed! (5m 35s, 42000 tokens, $0.38)
```

Failure (red):
```
[FAIL] Story 4.1 failed: Timeout after 1500s (5m 35s, 42000 tokens, $0.38)
```

---

### View 5: Heartbeats

**Source:** `lib/display.sh:163-225`
**When:** Every 5 minutes (configurable) during Claude invocations
**Purpose:** Proof of life during long silences. Without this, the user thinks it hung.

Sequential:
```
[14:35:00] ... running story 4.1 (elapsed: 00:23:15)
```

Parallel:
```
[14:35:00] ... parallel batch running (workers: 3/8, elapsed: 00:23:15)
```

---

### View 6: Parallel Phase Headers

**Source:** `lib/ui.sh:152-160` (phase_header)
**When:** At each phase transition in parallel mode
**Purpose:** Visual separation between the distinct parallel pipeline phases.

```
── Unbatched Stories (sequential) ──────────────────────────────────

── Batch 0: Foundation (sequential) ────────────────────────────────

── Batch 1: Parallel Execution ─────────────────────────────────────

── Retry Phase ─────────────────────────────────────────────────────

── Merge Phase ─────────────────────────────────────────────────────
```

---

### View 7: Batch Results

**Source:** `lib/display.sh:146-155`
**When:** After all workers in a parallel batch have returned
**Purpose:** Quick tally before the detailed per-story classification.

```
[INFO] Batch results: 3 succeeded, 1 failed
```

---

### View 8: Max Retries Exceeded

**Source:** `lib/runner.sh:555-563`
**When:** After a story fails its final retry attempt (and decomposition either fails or is disabled)
**Purpose:** Escalation to human — clear "you need to intervene" signal.

```
╔════════════════════════════════════════════════════════════════════╗
║                       MAX RETRIES EXCEEDED                        ║
╚════════════════════════════════════════════════════════════════════╝

  Story 4.1 failed 3 times.
  Human intervention required.

  Last failure: Timeout after 1500s

  To retry: ralph run -s 4.1
```

---

### View 9: All Stories Complete

**Source:** `lib/runner.sh:296`
**When:** When the last remaining story is marked done
**Purpose:** The victory screen.

```
╔════════════════════════════════════════════════════════════════════╗
║                       ALL STORIES COMPLETE!                       ║
╚════════════════════════════════════════════════════════════════════╝
```

---

### View 10: Iteration Limit Reached

**Source:** `lib/runner.sh:276`
**When:** When the configured iteration cap is hit before all stories complete
**Purpose:** Tells the user the run stopped by design, not by failure.

```
╔════════════════════════════════════════════════════════════════════╗
║                  Reached iteration limit (5)                      ║
╚════════════════════════════════════════════════════════════════════╝
```

---

### View 11: Run Summary

**Source:** `lib/runner.sh:572-861`
**When:** At the very end of every run (sequential or parallel)
**Purpose:** The single most important output. A user who stepped away reads only this.

```
╔════════════════════════════════════════════════════════════════════╗
║                          RUN SUMMARY                              ║
╚════════════════════════════════════════════════════════════════════╝

  Progress       [████████████░░░░░░░░] 8/12
  Elapsed        01:23:45
  Avg/story      08:15

  Completed      5
  Tentative      1   (committed code, no DONE signal)
  Failed         2
  Absorbed       1

────────────────────────────────────────────────────────────────────
  Fastest        05:12      3.1 — Dashboard Widget
  Longest        15:30      3.4 — User Profile

────────────────────────────────────────────────────────────────────
  Commits        12
  Insertions     450 lines
  Deletions      120 lines
  Merged         3 branches

────────────────────────────────────────────────────────────────────
  Completed Stories
    ✓ 3.1    — Dashboard Widget                         (05:12)
    ✓ 3.2    — Settings Page                            (07:03)

  Tentative (review recommended)
    ~ 3.3    — Notifications                            (12:00)

  Failed
    ✗ 3.4    — User Profile                             (15:30)

────────────────────────────────────────────────────────────────────
  Learnings      8 extracted → .ralph/learnings/

────────────────────────────────────────────────────────────────────
  Pending Review
    M  src/auth.ts
    A  src/schema.sql
    ?? .env.example
    ... and 5 more

────────────────────────────────────────────────────────────────────
  -> 2 failed. Retry first: ralph run -s 3.4

────────────────────────────────────────────────────────────────────
  -> Review what was built: ralph hitl

────────────────────────────────────────────────────────────────────
  Token Usage
    Story      Tokens In Tokens Out     Cost Turns
    3.1           42,000     18,000    $0.38    3
    3.2           38,500     15,200    $0.31    2
    3.4           55,000     22,000    $0.52    7 ⚠
```

---

### View 12: Stats Dashboard (`ralph stats`)

**Source:** `lib/metrics.sh:121-284`
**When:** User runs `ralph stats` between runs
**Purpose:** Historical analytics across all runs — cost trends, cumulative totals.

```
╔══════════════════════════════════════════════════════════════╗
║                   RALPH RUN STATS                            ║
╚══════════════════════════════════════════════════════════════╝

  Last Run: 2026-02-12  |  Mode: parallel  |  Duration: 01:23:45

  ┌─ Stories ─────────────────────────────────────────────────┐
  │  Completed: 5     Tentative: 1     Failed: 2     Absorbed: 0│
  └───────────────────────────────────────────────────────────┘

  ┌─ Token Usage (last run) ──────────────────────────────────┐
  │  Story    │  Tokens In │ Tokens Out │     Cost │ Turns     │
  │  3.1      │     42,000 │     18,000 │    $0.38 │   3       │
  │  3.2      │     38,500 │     15,200 │    $0.31 │   2       │
  │  3.4      │     55,000 │     22,000 │    $0.52 │   7 ⚠     │
  └───────────────────────────────────────────────────────────┘
  ⚠ = high turn count (likely context compaction)

  ┌─ Cumulative (all runs) ───────────────────────────────────┐
  │  Runs: 4   │  Stories: 23    │  Total Cost: $12.45        │
  │  Avg cost/story: $0.54│  Avg tokens: 45K in, 19K out      │
  └───────────────────────────────────────────────────────────┘

  ┌─ Cost Trend ──────────────────────────────────────────────┐
  │  02-09  █████████████████    $3.42    (6 stories)         │
  │  02-10  ████████████         $2.18    (5 stories)         │
  │  02-11  ████████████████████ $4.50    (8 stories)         │
  │  02-12  ███████████          $2.35    (4 stories)         │
  └───────────────────────────────────────────────────────────┘
```

---

### View 13: Per-Story History (`ralph stats --story 3.1`)

**Source:** `lib/metrics.sh:287-325`
**When:** User queries a specific story's history across runs
**Purpose:** Debug a flaky story — see if it fails intermittently, how cost changes.

```
  Story 3.1 across runs:
────────────────────────────────────────────────────────────────────
  Date         Outcome     Tokens In Tokens Out     Cost Turns
  2026-02-09   done           42,000     18,000    $0.38    3
  2026-02-11   failed         38,500     15,200    $0.31    2
  2026-02-12   done           55,000     22,000    $0.52    7
```

---

### View 14: Story List (`ralph stories`)

**Source:** `lib/stories.sh` (stories_list)
**When:** User runs `ralph stories` to see queue status
**Purpose:** Quick glance at what's done, what's current, what's pending.

```
Stories:
────────────────────────────────────────────────────────────────────
  [done]  1.1 | Project Setup
  [done]  1.2 | Database Schema
  [curr]  2.1 | Core API
  [    ]  2.2 | Auth Middleware
  [    ]  3.1 | Dashboard Widget
```

Color coding: `[done]` = green, `[curr]` = yellow, `[    ]` = dim

---

### View 15: Progress Bar Component

**Source:** `lib/ui.sh:166-185`
**When:** Used in run summary and anywhere progress is shown
**Purpose:** At-a-glance completion ratio. Default width 20 characters.

```
[████████░░░░░░░░░░░░] 5/12
[████████████████████] 12/12
[░░░░░░░░░░░░░░░░░░░░] 0/12
```

---

### View 16: Log Level Hierarchy

**Source:** `lib/ui.sh:73-114`
**When:** Throughout the entire run — every log line uses one of these
**Purpose:** Consistent severity signaling. Color + prefix = scannable.

```
[OK]    Story completed              <- green, always shown
[ERROR] Something broke              <- red, to stderr
[WARN]  Something concerning         <- yellow, always shown
[INFO]  Informational                <- cyan, always shown
[DEBUG] Verbose details              <- dim, only when -v flag
[2026-02-12 14:35:00] Raw log line   <- no color prefix, always shown
[CRASH] exit=1 cmd='jq' func=main    <- red, stderr + ralph.log
```

---

### View 17: Init Wizard (`ralph init`)

**Source:** `lib/interactive.sh:6-122`
**When:** First-time project setup
**Purpose:** Guided configuration with sensible defaults.

```
Project name [my-project]:
Spec file pattern [specs/epic-{{epic}}/story-{{id}}-*.md]:

Validation commands (run after each story). Enter empty line to finish.
  Command name (e.g., 'tests', 'lint'): tests
  Shell command: npm test
  Required? (failure blocks commit) [Y/n]:

Blocked commands (never run these). Enter empty line to finish.
  Command to block:

[OK] Created .ralph/config.json
[OK] Created .ralph/stories.txt
[OK] Created .ralph/templates/
[OK] Created .ralph/learnings/
[OK] Installed .claude/commands/create-spec.md

Commands installed. After creating a PRD with /prd, run /ralph to generate specs.
```

---

## Key UX Design Observations

1. **The "silence problem"** — During Claude invocation (5-30 min), the only output is a heartbeat every 5 minutes. This is the biggest UX gap. The user has no visibility into what Claude is doing.

2. **Three outcome states, not two** — Parallel mode introduces "tentative" (code exists but no explicit success signal). This is a third state that needs distinct visual treatment.

3. **Escalation ladder is the narrative** — The story of a failing story goes: attempt → fail → retry → fail → postmortem → retry with learnings → fail → decompose → sub-stories. This escalation is the most interesting thing to visualize.

4. **The summary is the payoff** — Users who walk away need the end-of-run summary to tell the whole story. It's currently dense text; it could be the richest visual.

5. **Cost is a first-class metric** — Token counts, USD cost, and turn counts are tracked per-story. The ⚠ flag on high turn counts indicates degraded quality (context compaction). Cost trends over time are already available.

6. **Everything is append-only** — No cursor movement, no scroll regions. This is a deliberate constraint for tmux/CI compatibility, but it means the current TUI can't show live-updating panels or dashboards.
