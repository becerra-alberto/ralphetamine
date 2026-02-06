# Ralph v2 — ASCII Swimlane Diagram

This diagram maps every code path and output channel in Ralph's execution loop across four swimlanes.

---

```
SWIMLANES:  CONTROL FLOW (runner)  │  CLAUDE CODE (in/out)  │  PROJECT ARTIFACTS  │  HUMAN OUTPUTS
════════════════════════════════════╪════════════════════════╪═════════════════════╪══════════════════════════

  bin/ralph run                     │                        │                     │
  ├─ source 13 libs                 │                        │                     │
  ├─ prereqs_check()                │                        │                     │  stderr: missing tool errs
  ├─ config_load()                  │                        │ read .ralph/        │
  │   merge defaults + config.json  │                        │   config.json       │
  ├─ tmux_ensure()                  │                        │                     │  re-exec in tmux session
  ├─ interactive_run_prompt()       │                        │                     │  menu: iterations/story/
  │   (if --no-interactive: skip)   │                        │                     │    timeout/verbose/dry-run
  ├─ caffeine_start()               │                        │                     │  (macOS sleep prevention)
  ├─ state_init()                   │                        │ create/load         │
  │                                 │                        │  .ralph/state.json  │
  ▼                                 │                        │                     │
┌─────────────────────────────┐     │                        │                     │
│ DISPATCH: parallel or seq?  │     │                        │                     │
└──────┬──────────────┬───────┘     │                        │                     │
       │              │             │                        │                     │
   sequential    parallel_run()     │                        │                     │
       │         (git worktrees,    │                        │                     │
       │          batch dispatch,   │                        │                     │
       │          merge back)       │                        │                     │
       ▼                            │                        │                     │
                                    │                        │                     │
═══ _run_sequential() LOOP START ═══╪════════════════════════╪═════════════════════╪══════════════════════════
                                    │                        │                     │
  display_init()                    │                        │                     │  ┌─────────────────────┐
                                    │                        │                     │  │ DASHBOARD (pinned)  │
                                    │                        │                     │  │ Progress [████░░]   │
                                    │                        │                     │  │ Current / Retries   │
                                    │                        │                     │  │ Elapsed / Learnings │
                                    │                        │                     │  └─────────────────────┘
  box_header("RALPH LOOP")          │                        │                     │  ╔═══════════════════╗
                                    │                        │                     │  ║ Project: my-app   ║
                                    │                        │                     │  ║ Stories: 2/10     ║
                                    │                        │                     │  ║ Timeout: 1800s    ║
                                    │                        │                     │  ╚═══════════════════╝
  ▼                                 │                        │                     │
┌─ ITERATION START ─────────────────┼────────────────────────┼─────────────────────┼──────────────────────────
│                                   │                        │                     │
│  check iteration limit ───────── if exceeded ─────────────────────────────────────► "Reached limit" box
│    │                              │                        │                     │
│    ▼                              │                        │                     │
│  stories_find_next()              │                        │ read .ralph/        │
│    │                              │                        │   stories.txt       │
│    │                              │                        │ read state.json     │
│    │                              │                        │   (completed list)  │
│    ├─ no more stories ─────────── ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─► "ALL COMPLETE!" box
│    │   return 0                   │                        │                     │    exit 0
│    │                              │                        │                     │
│    ▼                              │                        │                     │
│  spec_find(story_id)              │                        │ glob: specs/epic-N/ │
│    │                              │                        │  story-X.X-*.md     │
│    ├─ not found ──────────────────│────────────────────────│─────────────────────► log_error, continue
│    │                              │                        │                     │
│    ▼                              │                        │                     │
│  display_update_current()         │                        │                     │  dashboard: story + title
│  iteration_header()               │                        │                     │  ┌─ Iteration 3/inf ─┐
│                                   │                        │                     │  │ Story: 3.2         │
│                                   │                        │                     │  │ Spec: specs/...    │
│                                   │                        │                     │  └────────────────────┘
│    ▼                              │                        │                     │
│  prompt_build(id, spec)           │                        │                     │
│    ├─ spec_read()                 │                        │ read spec .md file  │
│    ├─ config: validation cmds     │                        │ read config.json    │
│    ├─ config: blocked cmds        │                        │                     │
│    ├─ config: commit format       │                        │                     │
│    ├─ learnings_select_relevant() │                        │ read .ralph/        │
│    │   score by keyword overlap   │                        │  learnings/*.md     │
│    │   return top 5               │                        │                     │
│    ├─ load implement.md template  │                        │                     │
│    ├─ substitute {{VARS}}         │                        │                     │
│    └─ process {{#if}} blocks      │                        │                     │
│                                   │                        │                     │
│    ▼                              │                        │                     │
│ ┌──── DRY RUN? ─────┐            │                        │                     │
│ │ yes: print first   │            │                        │                     │  "[DRY RUN] prompt..."
│ │ 30 lines, continue │            │                        │                     │  (first 30 lines)
│ └────────────────────┘            │                        │                     │
│                                   │                        │                     │
│    ▼                              │                        │                     │
│  hooks_run("pre_story")           │                        │                     │  (user-defined cmd)
│  state_set_current(story)         │                        │ write state.json    │
│                                   │                        │  current_story=X.X  │
│                                   │                        │                     │
│  display_start_live_timer()       │                        │                     │  dashboard: elapsed ticks
│                                   │                        │                     │
│    ▼                              │                        │                     │
│ ┌─────────────────────────────────┼────────────────────────┼─────────────────────┤
│ │         INVOKE CLAUDE           │                        │                     │
│ │                                 │  ┌──────────────────┐  │                     │
│ │  $timeout_cmd $secs claude \    │  │ PROMPT SENT:     │  │                     │
│ │    ${flags} "$prompt"           │  │  Story ID+Title  │  │                     │
│ │    < /dev/null                  │  │  Full spec text  │  │                     │
│ │                                 │  │  Validation cmds │  │                     │
│ │  flags from config:             │  │  Blocked cmds    │  │                     │
│ │   --print                       │  │  Commit format   │  │                     │
│ │   --dangerously-skip-perms      │  │  Top 5 learnings │  │                     │
│ │                                 │  │  Signal instrs   │  │                     │
│ │                                 │  └──────────────────┘  │                     │
│ │                                 │           │            │                     │
│ │                                 │     Claude works...    │  Claude writes:     │
│ │                                 │     (reads, edits,     │   source files,     │
│ │                                 │      runs tests,       │   test files,       │
│ │                                 │      commits code)     │   git commits       │
│ │                                 │           │            │                     │
│ │                                 │  ┌──────────────────┐  │                     │
│ │                                 │  │ OUTPUT RECEIVED: │  │                     │
│ │                                 │  │ <ralph>DONE X.X  │  │                     │
│ │  capture → output_file          │  │ </ralph>         │  │ write .ralph/       │
│ │  capture → exit_code            │  │   — or —         │  │  last-claude-       │
│ │                                 │  │ <ralph>FAIL X.X: │  │  output.txt         │
│ │  verbose? tee to terminal ──────│──│ reason</ralph>   │──│─────────────────────► Claude output stream
│ │                                 │  │   — and/or —     │  │                     │
│ │                                 │  │ <ralph>LEARN:    │  │                     │
│ │                                 │  │ text</ralph>     │  │                     │
│ │                                 │  └──────────────────┘  │                     │
│ └─────────────────────────────────┼────────────────────────┼─────────────────────┤
│                                   │                        │                     │
│  display_stop_live_timer()        │                        │                     │  dashboard: timer stops
│                                   │                        │                     │
│    ▼                              │                        │                     │
│ ┌──────────────────────────────── EXIT CODE ROUTING ────────────────────────────────────────────────────
│ │                                 │                        │                     │
│ ├─ exit_code=124 (TIMEOUT) ───────│────────────────────────│─────────────────────► log_warn "timed out"
│ │   └─► _handle_failure()         │                        │ state: retry++      │  progress.txt: [FAIL]
│ │       _track_local_retry()      │                        │                     │  dashboard: retry N/M
│ │       ├─ under max → continue   │                        │                     │
│ │       └─ at max ────────────────│────────────────────────│─────────────────────► "MAX RETRIES" box
│ │                                 │                        │                     │   exit 1
│ │                                 │                        │                     │
│ ├─ exit_code≠0 (ERROR) ──────────│────────────────────────│─────────────────────► log_error "failed"
│ │   └─► _handle_failure()         │                        │ state: retry++      │  progress.txt: [FAIL]
│ │       _track_local_retry()      │                        │                     │  dashboard: retry N/M
│ │       ├─ under max → continue   │                        │                     │
│ │       └─ at max ────────────────│────────────────────────│─────────────────────► "MAX RETRIES" box
│ │                                 │                        │                     │   exit 1
│ │                                 │                        │                     │
│ └─ exit_code=0 (OK) ─────────────│────────────────────────│─────────────────────│
│       │                           │                        │                     │
│       ▼                           │                        │                     │
│  learnings_extract(output, id)    │  parse all <ralph>     │ write .ralph/       │
│                                   │   LEARN: tags          │  learnings/*.md     │
│                                   │                        │  _index.json        │  progress.txt: [LEARN]
│       │                           │                        │                     │
│       ▼                           │                        │                     │
│ ┌──────────────────────────────── SIGNAL ROUTING ───────────────────────────────────────────────────────
│ │                                 │                        │                     │
│ ├─ <ralph>DONE X.X</ralph> ──────│── id matches? ─────────│─────────────────────│
│ │   │                             │                        │                     │
│ │   ├─ YES (SUCCESS) ────────────│────────────────────────│─────────────────────► log_success "completed!"
│ │   │   state_mark_done()         │                        │ state.json:         │  progress.txt: [DONE]
│ │   │                             │                        │  completed += id    │  dashboard: done++
│ │   │   spec_update_status()      │                        │  retry_count = 0    │
│ │   │                             │                        │ spec: status=done   │
│ │   │                             │                        │                     │
│ │   │   testing_phase? ───────────│── invoke Claude again ─│─────────────────────│
│ │   │   (if enabled)              │   test-review prompt   │                     │  progress.txt:
│ │   │                             │   <ralph>TEST_REVIEW_  │                     │   [TEST_REVIEW]
│ │   │                             │   DONE X.X: result     │                     │
│ │   │                             │   </ralph>             │                     │
│ │   │                             │                        │                     │
│ │   │   reset local_retry=0       │                        │                     │
│ │   │   hooks_run("post_story",   │                        │                     │  (user-defined cmd)
│ │   │     RESULT=done)            │                        │                     │
│ │   │   └─► continue to next ─────│────────────────────────│─────────────────────│
│ │   │                             │                        │                     │
│ │   └─ NO (MISMATCH) ────────────│────────────────────────│─────────────────────► log_warn "mismatch"
│ │       └─► _handle_failure()     │                        │ state: retry++      │  progress.txt: [FAIL]
│ │                                 │                        │                     │
│ ├─ <ralph>FAIL X.X: reason       │                        │                     │
│ │   </ralph> ────────────────────│────────────────────────│─────────────────────► log_error "failed"
│ │   └─► _handle_failure()         │                        │ state: retry++      │  progress.txt: [FAIL]
│ │       _track_local_retry()      │                        │                     │  dashboard: retry N/M
│ │       ├─ under max → continue   │                        │                     │
│ │       └─ at max ────────────────│────────────────────────│─────────────────────► "MAX RETRIES" box
│ │                                 │                        │                     │   exit 1
│ │                                 │                        │                     │
│ └─ NO SIGNAL ─────────────────────│────────────────────────│─────────────────────► log_warn "no signal"
│     └─► _handle_failure()         │                        │ state: retry++      │  progress.txt: [FAIL]
│         _track_local_retry()      │                        │                     │  dashboard: retry N/M
│         ├─ under max → continue   │                        │                     │
│         └─ at max ────────────────│────────────────────────│─────────────────────► "MAX RETRIES" box
│                                   │                        │                     │   exit 1
│                                   │                        │                     │
│  hooks_run("post_iteration")      │                        │                     │  (user-defined cmd)
│                                   │                        │                     │
└─ LOOP BACK TO ITERATION START ────┼────────────────────────┼─────────────────────┼──────────────────────────
                                    │                        │                     │
════════════════════════════════════╪════════════════════════╪═════════════════════╪══════════════════════════
```

## Legend

| Swimlane | What it tracks | Key files |
|----------|---------------|-----------|
| **Control Flow** | Loop logic, branching, retry decisions | `lib/runner.sh`, `bin/ralph` |
| **Claude Code** | Prompt sent in, signals parsed out | `lib/prompt.sh`, `lib/signals.sh`, `templates/implement.md` |
| **Project Artifacts** | Persistent state and accumulated knowledge | `.ralph/state.json`, `.ralph/learnings/`, spec files |
| **Human Outputs** | Everything the operator sees | `lib/display.sh`, `lib/ui.sh`, `progress.txt`, `ralph.log` |

## Retry Defense (Two Layers)

```
Layer 1: state.json (persistent)          Layer 2: local variable (in-memory)
┌──────────────────────────┐              ┌──────────────────────────┐
│ state_increment_retry()  │              │ _track_local_retry()     │
│ Survives crashes         │              │ Catches state I/O fails  │
│ Reset on DONE            │              │ Reset on DONE            │
│ Written via jq + mv      │              │ Pure bash counter        │
└──────────────────────────┘              └──────────────────────────┘
         │                                          │
         └──────── BOTH must be under max_retries ──┘
                   to continue looping
```

## Data Flow Summary

```
  .ralph/stories.txt ──► stories_find_next() ──► story ID
  specs/epic-N/*.md  ──► spec_read()         ──► spec content
  .ralph/config.json ──► config_get()        ──► validation/blocked/commit
  .ralph/learnings/  ──► learnings_select()  ──► top 5 relevant
          │                    │                       │
          └────────────────────┴───────────────────────┘
                               │
                    prompt_build() + implement.md
                               │
                               ▼
                    ┌─────────────────────┐
                    │   claude --print    │
                    │   (with timeout)    │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         <ralph>DONE     <ralph>FAIL     <ralph>LEARN
              │               │               │
              ▼               ▼               ▼
         state.json      retry logic     learnings/*.md ──► next prompt
         progress.txt    progress.txt    progress.txt
         dashboard       dashboard       dashboard
```
