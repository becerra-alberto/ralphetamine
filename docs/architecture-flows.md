# Ralphetamine Architecture Flow Diagrams

Reference diagrams for every supported execution path in Ralphetamine.
Each diagram reads left-to-right and maps directly to the source in `lib/` and `bin/ralph`.

---

## 1. Overview — Full Pipeline (Idea to Done)

The complete lifecycle from a PRD through autonomous implementation.

```
                                            < 5 stories              Sequential
                                           +------------> Serial -----> Spec
                                           |              Writing      Files
                                           |                            |
  +------+      +-----+      +----------+  |                            v
  | Idea | ---> | PRD | ---> | Decompose| -+               +-------------------+
  +------+      +-----+      | to Epics |  |               | .ralph/stories.txt|
                              +----------+  |               +--------+----------+
                                           |                         |
                                           | >= 5 stories            |
                                           +----------> Manifest --> |
                                                        Parallel    |
                                                        Writers --> |
                                                        Review  --> |
                                                                    |
                         +------------------------------------------+
                         |
                         v
                  +-------------+
                  | ralph run   |
                  | (CLI entry) |
                  +------+------+
                         |
              +----------+----------+
              |                     |
              v                     v
       +-----------+         +------------+
       | Sequential|         | Parallel   |
       | Loop      |         | Batches    |
       +-----+-----+         +-----+------+
             |                      |
             v                      v
       +-----------+         +-----------+
       | Per-Story |         | Worktrees |
       | Claude    |         | + Claude  |
       | Invocation|         | per story |
       +-----+-----+         +-----+-----+
             |                      |
             v                      v
       +-----------+         +-----------+
       | Parse     |         | Collect   |
       | Signals   |         | Results   |
       +--+--+--+--+         +-----+-----+
          |  |  |                   |
     DONE |  |  | FAIL              v
          |  |  |            +-----------+
          |  |  +---> Retry  | Merge     |
          |  |        Cycle  | Branches  |
          |  |               +-----------+
          |  +----> LEARN
          |         Extract
          v
    +------------+        +------------+
    | Mark Done  | -----> | Test Review|  (optional 2nd Claude call)
    | Commit Log |        | Phase      |
    +-----+------+        +------------+
          |
          v
    +------------+
    | Next Story |  (loop continues until all stories complete
    | or Exit    |   or max retries exceeded)
    +------------+
```

Source: `bin/ralph:86-194` (`cmd_run`), `lib/runner.sh:5-196`, `lib/parallel.sh:12-106`

---

## 2. PRD to Spec Generation

Two paths based on story count. Threshold: 5 stories.

```
+-----+      +---------+      +---------+
| PRD | ---> | Analyze | ---> | Confirm |
+-----+      | & Split |      | w/ User |
              | Epics   |      +---------+
              +---------+           |
                                    v
                             Count stories
                                    |
                  +-----------------+-----------------+
                  |                                   |
                  v                                   v
           < 5 stories                         >= 5 stories
                  |                                   |
                  v                                   v
       +------------------+                +-------------------+
       | Step 5-seq:      |                | Step 5A:          |
       | Write each spec  |                | Generate manifest |
       | file one-by-one  |                | .ralph/manifest   |
       +--------+---------+                +--------+----------+
                |                                   |
                |                                   v
                |                          +-------------------+
                |                          | Step 5B:          |
                |                          | Spawn 1 Task agent|
                |                          | per story (all    |
                |                          | concurrent in one |
                |                          | message)          |
                |                          +--------+----------+
                |                                   |
                |                          50+ stories? Truncate
                |                          manifest per-agent
                |                                   |
                |                                   v
                |                          +-------------------+
                |                          | Step 5C:          |
                |                          | Consistency review|
                |                          | - Path alignment  |
                |                          | - Dep correctness |
                |                          | - Scope overlap   |
                |                          | - AC coverage     |
                |                          | - Naming patterns |
                |                          | - Circular deps   |
                |                          +--------+----------+
                |                                   |
                |                                   v
                |                          +-------------------+
                |                          | Step 5D:          |
                |                          | Delete manifest   |
                |                          +--------+----------+
                |                                   |
                +-----------------------------------+
                                    |
                                    v
                          +-------------------+
                          | Step 6:           |
                          | Write stories.txt |
                          | w/ batch tags     |
                          +--------+----------+
                                   |
                                   v
                          +-------------------+
                          | Step 7:           |
                          | Validate specs,   |
                          | deps, YAML        |
                          +-------------------+
```

Source: `skills/SKILL.md:1-320`

---

## 3. Sequential Execution Loop

The default `_run_sequential()` cycle in `lib/runner.sh`.

```
                         +------------------+
                         | _run_sequential  |
                         | iterations,      |
                         | timeout, verbose |
                         +--------+---------+
                                  |
                                  v
                         +------------------+
                    +--->| Iteration check  |
                    |    | (limit reached?) |
                    |    +--------+---------+
                    |             |
                    |        no   |  yes
                    |             |  +--> break
                    |             v
                    |    +------------------+
                    |    | stories_find_next|
                    |    | (or specific_story)
                    |    +--------+---------+
                    |             |
                    |        found |  none --> "ALL STORIES COMPLETE" --> return 0
                    |             v
                    |    +------------------+
                    |    | spec_find(story) |
                    |    +--------+---------+
                    |             |
                    |             v
                    |    +------------------+
                    |    | prompt_build     |
                    |    | (inject learnings|
                    |    |  + spec + config)|
                    |    +--------+---------+
                    |             |
                    |             v
                    |    +------------------+
                    |    | hooks_run        |
                    |    | ("pre_story")    |
                    |    +--------+---------+
                    |             |
                    |             v
                    |    +------------------+
                    |    | state_set_current|
                    |    +--------+---------+
                    |             |
                    |             v
                    |    +---------------------+
                    |    | timeout claude      |
                    |    | --print             |
                    |    | --dangerously-skip  |
                    |    | "$prompt"           |
                    |    +--------+------------+
                    |             |
                    |             v
                    |    +---------------------+
                    |    | Check exit code     |
                    |    +--+--------+----+----+
                    |       |        |    |
                    |  124  |   !=0  |    | 0
                    |  (timeout)     |    |
                    |       |   (error)   |
                    |       v        v    v
                    |    +--------+  | +-----------------------+
                    |    |FAILURE |<-+ | learnings_extract     |
                    |    |HANDLER |    +-----------+-----------+
                    |    +---+----+                |
                    |        |                     v
                    |        |             +-------+-------+
                    |        |             | Parse signals  |
                    |        |             +--+------+---+-+
                    |        |          DONE  |      |   |  no signal
                    |        |           +----+  FAIL|   +-----+
                    |        |           |       +---+         |
                    |        |           v       v             v
                    |        |     ID match? _handle      _handle
                    |        |      |    |   _failure     _failure
                    |        |  yes |  no|      ^             ^
                    |        |      |    +------+             |
                    |        |      v                         |
                    |        | +-------------+                |
                    |        | | state_mark  |                |
                    |        | | _done       |                |
                    |        | +------+------+                |
                    |        |        |                       |
                    |        |        v                       |
                    |        | +--------------+               |
                    |        | | test_review? |               |
                    |        | | (optional)   |               |
                    |        | +------+-------+               |
                    |        |        |                       |
                    |        |        v                       |
                    |        | +-------------+                |
                    |        | | hooks_run   |                |
                    |        | | post_story  |                |
                    |        | +------+------+                |
                    |        |        |                       |
                    +--------+--------+-----------------------+
                    (loop)
```

Source: `lib/runner.sh:5-196`

---

## 4. Parallel Execution Loop (Batch Mode)

`parallel_run()` with git worktrees in `lib/parallel.sh`.

```
+--------------------+
| parallel_run()     |
| Requires Bash 4.0+ |
+--------+-----------+
         |
         v
  Read config:
  max_concurrent, stagger_seconds, auto_merge
         |
         v
  current_batch = 1
         |
    +----+----+
    |         |
    v         |
+-----------+ |
| Get batch | |
| members   | |
| (filter   | |
| completed)| |
+-----+-----+ |
      |        |
      v        |
  0 stories?   |
   |       |   |
  yes      no  |
   |       |   |
   v       |   |
 Next      |   |
 batch     |   |
 exists?   |   |
  |    |   |   |
 yes   no  |   |
  |    |   |   |
  |    v   |   |
  | batch>1|   |
  |  ?     |   |
  | yes: break |
  | no: run    |
  | sequential |
  | (fallback) |
  |        |   |
  +------->+   |
           v   |
      1 story? |
       |    |  |
      yes   no |
       |    |  |
       v    |  |
  Run in-   |  |
  place     |  |
  (seq 1)   |  |
       |    v  |
       | +-----+-----------+                   +------------------+
       | | _parallel       |                   | For each story:  |
       | | _execute_batch  | ----------------> |                  |
       | +-----------------+                   | 1. Wait if at    |
       |                                       |    max_concurrent|
       |                                       | 2. git worktree  |
       |                                       |    add story-N.M |
       |                                       | 3. prompt_build  |
       |                                       | 4. (cd worktree; |
       |                                       |    claude) &     |
       |                                       | 5. Record PID    |
       |                                       | 6. Sleep stagger |
       |                                       +--------+---------+
       |                                                |
       |                                                v
       |                                       +------------------+
       |                                       | Wait all PIDs    |
       |                                       | Collect results: |
       |                                       | exit 124=timeout |
       |                                       | exit!=0=error    |
       |                                       | exit 0 + DONE=ok |
       |                                       | else=failed      |
       |                                       +--------+---------+
       |                                                |
       |                                                v
       |                                       +------------------+
       |                                       | _PARALLEL_       |
       |                                       | SUCCESSFUL[]     |
       |                                       | _PARALLEL_       |
       |                                       | FAILED[]         |
       |                                       +--------+---------+
       |                                                |
       v                                                v
  +----+----+                                  +------------------+
  | Next    |  <---------- auto_merge? ------> | _parallel_merge  |
  | batch++ |             no: leave            | _batch()         |
  +---------+             worktrees            | (see Diagram 9)  |
                                               +------------------+
```

Source: `lib/parallel.sh:12-268`

---

## 5. Single Story Execution Detail

What happens inside one Claude invocation. Claude may use three sub-strategies.

```
+-------------------+
| Ralph invokes     |
| Claude with       |
| implement.md      |
| prompt            |
+--------+----------+
         |
         v
+-------------------+
| Claude reads spec |
| + learnings       |
| + config rules    |
+--------+----------+
         |
         v
  Claude decides strategy
  (internal to Claude)
         |
         +-------------------+--------------------+
         |                   |                    |
         v                   v                    v
  +-----------+     +---------------+     +-------------+
  | Strategy  |     | Strategy B:   |     | Strategy C: |
  | A: Serial |     | Parallel      |     | Hybrid      |
  |           |     | Sub-Agents    |     |             |
  | Claude    |     |               |     | Some files  |
  | implements|     | Claude spawns |     | serial,     |
  | all files |     | Task agents   |     | some via    |
  | inline,   |     | for indepen-  |     | Task agents |
  | one by one|     | dent files    |     |             |
  +-----------+     +---------------+     +-------------+
         |                   |                    |
         +-------------------+--------------------+
         |
         v
+-------------------+
| Run validation    |
| commands from     |
| config (typecheck |
| tests, lint)      |
+--------+----------+
         |
         v
+-------------------+
| git commit with   |
| configured format |
| feat(story-N.M):  |
+--------+----------+
         |
         v
+----+--------+----+
|    |        |    |
v    v        v    v
DONE FAIL   LEARN  (emitted as structured signals)
tag  tag    tag(s)
```

Source: `templates/implement.md`, `lib/prompt.sh:123-189`

---

## 6. Failure and Retry Cycle

All failure triggers and the retry state machine up to `max_retries`.

```
+-------------------+     +------------------+     +-------------------+
| Timeout           |     | Non-zero exit    |     | No completion     |
| (exit code 124)   |     | code from Claude |     | signal in output  |
+--------+----------+     +--------+---------+     +--------+----------+
         |                         |                         |
         v                         v                         v
+--------+---------+     +---------+--------+     +----------+---------+
| "Timeout after   |     | "Exit code N"    |     | "No completion     |
|  ${timeout}s"    |     +--------+---------+     |  signal in output" |
+--------+---------+              |               +----------+---------+
         |                        |                          |
         |    +---------+---------+----------+               |
         |    |                              |               |
         |    v                              v               |
         |  +-------------------+  +-------------------+    |
         |  | DONE signal but   |  | Explicit FAIL     |    |
         |  | wrong story ID    |  | signal from Claude|    |
         |  | "Mismatched DONE" |  | (extracted reason)|    |
         |  +--------+----------+  +--------+----------+    |
         |           |                      |               |
         +-----------+----------------------+---------------+
                                  |
                                  v
                     +------------------------+
                     | _handle_failure()      |
                     | runner.sh:198-231      |
                     +------------------------+
                                  |
                                  v
                     +------------------------+
                     | state_increment_retry  |
                     | (story) -> retry_count |
                     +------------------------+
                                  |
                                  v
                     +------------------------+
                     | Log [FAIL] to          |
                     | progress.txt           |
                     +------------------------+
                                  |
                                  v
                     +------------------------+
                     | retry_count >=         |
                     | max_retries?           |
                     +-----+----------+-------+
                           |          |
                      yes  |          |  no
                           v          v
              +-------------------+  +-------------------+
              | "MAX RETRIES      |  | Return to loop    |
              |  EXCEEDED"        |  | (story NOT marked |
              | "Human            |  |  done, so         |
              |  intervention     |  |  stories_find_next|
              |  required"        |  |  returns same     |
              | exit 1            |  |  story again)     |
              +-------------------+  +-------------------+
```

Source: `lib/runner.sh:124-191` (triggers), `lib/runner.sh:198-231` (`_handle_failure`)

---

## 7. Learning Accumulation Cycle

Extract, categorize, score, and inject learnings across stories.

```
+------------------+
| Claude output    |
| (from any story) |
+--------+---------+
         |
         v
+---------------------+
| signals_parse       |
| _learnings()        |
| Extract all         |
| <ralph>LEARN: text  |
| </ralph> tags       |
+--------+------------+
         |
         v
+---------------------+
| _learnings          |
| _categorize(text)   |
| Keyword matching:   |
| testing, framework, |
| data-model, tooling,|
| patterns, gotchas   |
| (fallback:          |
|  uncategorized)     |
+--------+------------+
         |
         v
+---------------------+         +-------------------------+
| Store in .ralph/    |         | .ralph/learnings/       |
| learnings/          | ------> | _index.json             |
| {category}.md       |         | testing.md              |
| "- [Story N.M] txt" |         | framework.md            |
+--------+------------+         | data-model.md           |
         |                      | tooling.md              |
         |                      | patterns.md             |
         |                      | gotchas.md              |
         |                      +-------------------------+
         |
         v  (on next story's prompt_build)
+---------------------+
| learnings_select    |
| _relevant(spec, 5)  |
+--------+------------+
         |
         v
+---------------------+
| For each stored     |
| learning line:      |
| - Lowercase both    |
|   learning + spec   |
| - Count word        |
|   overlaps (>=4 ch) |
| - Score = overlap   |
|   count             |
+--------+------------+
         |
         v
+---------------------+
| Sort by score desc  |
| Return top 5        |
+--------+------------+
         |
         v
+---------------------+
| Inject into         |
| {{#if LEARNINGS}}   |
| block in            |
| implement.md        |
| template            |
+---------------------+
```

Source: `lib/learnings.sh:45-146`, `lib/prompt.sh:157-186`

---

## 8. Testing Phase (Optional)

Post-DONE second Claude invocation. Non-fatal — failures are logged, not retried.

```
                   +-------------------+
                   | Story N.M marked  |
                   | DONE by main loop |
                   +--------+----------+
                            |
                            v
                   +-------------------+
                   | config:           |
                   | .testing_phase    |
                   | .enabled == true? |
                   +---+----------+----+
                       |          |
                  false|          | true
                       |          v
                       |  +---------------------------+
                       |  | prompt_build_test_review  |
                       |  | (story_id, spec_path)     |
                       |  | Load test-review.md       |
                       |  | template                  |
                       |  +------------+--------------+
                       |               |
                       |               v
                       |  +---------------------------+
                       |  | timeout claude            |
                       |  | (timeout from config:     |
                       |  |  .testing_phase           |
                       |  |  .timeout_seconds = 600)  |
                       |  +-----+------------+--------+
                       |        |            |
                       |   exit 124     exit != 0
                       |   (timeout)    (error)
                       |        |            |
                       |        v            v
                       |  +-----------+  +-----------+
                       |  | Log warn  |  | Log warn  |
                       |  | NON-FATAL |  | NON-FATAL |
                       |  | return 0  |  | return 0  |
                       |  +-----------+  +-----------+
                       |
                       |       exit 0
                       |        |
                       |        v
                       |  +---------------------------+
                       |  | learnings_extract         |
                       |  | (review output, story_id) |
                       |  +------------+--------------+
                       |               |
                       |               v
                       |  +---------------------------+
                       |  | Parse TEST_REVIEW_DONE    |
                       |  | signal                    |
                       |  +-----+-----------+---------+
                       |        |           |
                       |   found|      not found
                       |        |           |
                       |        v           v
                       |  +-----------+ +-----------+
                       |  | Log result| | Log warn  |
                       |  | Append    | | NON-FATAL |
                       |  | [TEST_    | +-----------+
                       |  | REVIEW]   |      |
                       |  | to        |      |
                       |  | progress  |      |
                       |  +-----------+      |
                       |        |            |
                       +--------+------------+
                                |
                                v
                       +-------------------+
                       | Return to main    |
                       | loop (always 0)   |
                       +-------------------+
```

Source: `lib/testing.sh:5-76`

---

## 9. Parallel Merge and Conflict Resolution

Per-branch merge after parallel batch execution.

```
+-----------------------+
| _parallel_merge_batch |
| (all batch stories)   |
+-----------+-----------+
            |
            v
  _PARALLEL_SUCCESSFUL empty?
       |             |
      yes            no
       |             |
       v             v
    return     For each successful story:
       0             |
                     v
            +------------------+
            | git merge        |
            | --no-ff          |
            | ralph/story-N.M  |
            +--+----------+----+
               |          |
          clean|     conflict
          merge|          |
               |          v
               |  +----------------------------+
               |  | _parallel_resolve_conflict |
               |  +----------------------------+
               |              |
               |              v
               |  +----------------------------+
               |  | git diff --diff-filter=U   |
               |  | (get conflict file list)   |
               |  +----------------------------+
               |              |
               |         no conflicts?
               |          |        |
               |         yes       no
               |          |        |
               |       return 0    v
               |              +----------------------------+
               |              | Load merge-review template |
               |              | Substitute:                |
               |              |  STORY_ID, BRANCH_NAME,    |
               |              |  CONFLICT_FILES,           |
               |              |  CONFLICT_DIFF             |
               |              |  (truncated 500 lines /    |
               |              |   30000 chars)             |
               |              +-------------+--------------+
               |                            |
               |                            v
               |              +----------------------------+
               |              | timeout claude             |
               |              | (merge_review_timeout=900s)|
               |              +-----+--------+-------------+
               |                    |        |
               |               exit!=0  exit 0
               |                    |        |
               |                    v        v
               |              +--------+ +----------+----------+
               |              | Abort  | | Parse signal        |
               |              | merge  | +---+------+-----+----+
               |              +--------+     |      |     |
               |                   ^    MERGE|  MERGE| no signal
               |                   |    _DONE|  _FAIL|     |
               |                   |         |      |     |
               |                   |         v      v     v
               |                   |     +------+ +--------+
               |                   |     | OK   | | Abort  |
               |                   |     | merge| | merge  |
               |                   |     |merged| +--------+
               |                   |     +------+     |
               |                   +------------------+
               |
               v
  +----------------------------+
  | Cleanup:                   |
  | Successful: remove         |
  |   worktree + delete branch |
  | Failed: remove worktree,   |
  |   KEEP branch (for         |
  |   investigation)           |
  +----------------------------+
```

Source: `lib/parallel.sh:271-394`

---

## 10. Session Wrapping (tmux + dashboard + caffeine)

Entry flow from CLI invocation through session setup to execution dispatch.

```
+-------------------+
| $ ralph run       |
| [--parallel]      |
| [-s ID] [-n N]    |
| [--no-tmux] ...   |
+--------+----------+
         |
         v
+-------------------+
| Source 14 libs:   |
| config, state,    |
| stories, specs,   |
| prompt, signals,  |
| hooks, caffeine,  |
| tmux, runner      |
| + optional:       |
| learnings, test,  |
| parallel,         |
| interactive,      |
| display           |
+--------+----------+
         |
         v
+-------------------+
| prereqs_check     |
| prereqs_check     |
| _project          |
+--------+----------+
         |
         v
+-------------------+
| config_load       |
| (deep-merge       |
|  defaults +       |
|  .ralph/config)   |
+--------+----------+
         |
         v
+-------------------+
| Parse CLI flags   |
| Save original_args|
+--------+----------+
         |
         v
  --no-tmux passed?
     |          |
    yes         no
     |          |
     |          v
     |  +-------------------+
     |  | tmux_ensure()     |
     |  | Already in tmux?  |--yes--> continue
     |  | tmux installed?   |--no---> continue
     |  +--------+----------+
     |           |
     |      Session exists?
     |       |          |
     |      yes         no
     |       |          |
     |       v          v
     |  exec tmux   exec tmux
     |  attach      new-session
     |  (re-runs    (re-runs
     |   ralph      ralph with
     |   inside     original_args
     |   session)   inside tmux)
     |       |          |
     |    [ralph restarts inside tmux]
     |
     v
  --no-interactive?
  specific_story?
  dry_run?
     |          |
    yes (skip)  no (eligible)
     |          |
     |          v
     |  +----------------------------+
     |  | interactive_run_prompt()   |
     |  | 5-choice menu:             |
     |  | 1. Run all remaining       |
     |  | 2. Run specific story      |
     |  | 3. Run N iterations        |
     |  | 4. Dry run preview         |
     |  | 5. Exit                    |
     |  | + verbose, timeout,        |
     |  |   caffeine toggles         |
     |  | Sets RALPH_RUN_* env vars  |
     |  +------------+---------------+
     |               |
     +---------------+
             |
             v
  +-------------------+
  | --no-dashboard?   |
  |  yes: export      |
  |  RALPH_DASHBOARD  |
  |  =false           |
  +--------+----------+
             |
             v
  +-------------------+
  | Caffeine:         |
  | config .caffeine  |
  | == true OR        |
  | interactive       |
  | requested?        |
  +----+-------+------+
       |       |
      yes      no
       |       |
       v       |
  caffeinate   |
  -dims &      |
  (register    |
   cleanup)    |
       |       |
       +-------+
             |
             v
  +-------------------+
  | state_init()      |
  | (create/bootstrap |
  |  state.json)      |
  +--------+----------+
             |
             v
  +-------------------+
  | --parallel OR     |
  | config .parallel  |
  | .enabled?         |
  +----+--------+-----+
       |        |
      yes       no
       |        |
       v        v
  parallel   _run_sequential()
  _run()     (Diagram 3)
  (Diagram 4)
```

Source: `bin/ralph:86-194`, `lib/tmux.sh:4-28`, `lib/interactive.sh:126-199`, `lib/caffeine.sh:1-34`

---

## Signal Reference

All structured signals parsed by `lib/signals.sh`:

| Signal | Format | Parser |
|--------|--------|--------|
| DONE | `<ralph>DONE X.X</ralph>` | `signals_parse_done` |
| DONE (legacy) | `[DONE] Story X.X` | `signals_parse_done` |
| FAIL | `<ralph>FAIL X.X: reason</ralph>` | `signals_parse_fail` |
| FAIL (legacy) | `[FAIL] Story X.X - reason` | `signals_parse_fail` |
| LEARN | `<ralph>LEARN: text</ralph>` | `signals_parse_learnings` |
| TEST_REVIEW_DONE | `<ralph>TEST_REVIEW_DONE X.X: result</ralph>` | `signals_parse_test_review_done` |
| MERGE_DONE | `<ralph>MERGE_DONE: message</ralph>` | `signals_parse_merge_done` |
| MERGE_FAIL | `<ralph>MERGE_FAIL: reason</ralph>` | `signals_parse_merge_fail` |

---

## Module Dependency Map

```
bin/ralph (entry)
  |
  +-- lib/ui.sh           (always loaded: logging, colors, exit traps)
  +-- lib/prereqs.sh      (always loaded: tool checks)
  |
  +-- [on cmd_run]:
      +-- lib/config.sh   (config loading, defaults, jq queries)
      +-- lib/state.sh    (state.json CRUD, retry tracking)
      +-- lib/stories.sh  (stories.txt parsing, batch queries)
      +-- lib/specs.sh    (spec file finding, reading, YAML parsing)
      +-- lib/prompt.sh   (template loading, substitution, conditionals)
      +-- lib/signals.sh  (DONE/FAIL/LEARN/MERGE signal parsing)
      +-- lib/hooks.sh    (pre/post story/iteration hook execution)
      +-- lib/caffeine.sh (macOS sleep prevention)
      +-- lib/tmux.sh     (session wrapping, re-exec)
      +-- lib/runner.sh   (_run_sequential, _handle_failure)
      |
      +-- [optional]:
          +-- lib/learnings.sh   (extraction, categorization, scoring)
          +-- lib/testing.sh     (post-DONE test review phase)
          +-- lib/parallel.sh    (worktree-based parallel execution)
          +-- lib/interactive.sh (init wizard, run prompt menu)
          +-- lib/display.sh     (real-time TUI dashboard)
```
