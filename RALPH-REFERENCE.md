# Ralph Loop: Complete System Reference

Ralph is a bash script that runs Claude Code in a loop, one story at a time, without human intervention. It picks a story, sends the full spec to Claude, waits for Claude to implement it, checks whether Claude succeeded or failed, and moves on to the next story. If Claude fails, Ralph retries up to 3 times before stopping and asking for help.

---

## Component Map

ralph.sh is a single 613-line bash script organized into four sections:

```
ralph.sh (613 lines)
├── CONFIGURATION (lines 10-41)
│   ├── ITERATIONS=45           How many stories to attempt in one run
│   ├── VERBOSE=false           Whether to show Claude's full output in real-time
│   ├── DRY_RUN=false           Whether to preview prompts without actually running Claude
│   ├── TIMEOUT=1800            Max seconds per story (1800 = 30 minutes)
│   ├── MAX_RETRIES=3           How many times to retry a failing story before giving up
│   └── STORY_ORDER=(...)       The ordered list of every story ID Ralph will attempt
│
├── ARGUMENT PARSER (lines 43-112)
│   Reads command-line flags when you run ./ralph.sh.
│   Each flag overrides a default from the configuration section above.
│   ├── -n NUM       Override ITERATIONS (e.g., -n 10 to only do 10 stories)
│   ├── -v           Turn on VERBOSE mode (see all Claude output live)
│   ├── -d           Turn on DRY_RUN mode (show the prompt but don't run Claude)
│   ├── -s STORY     Run only one specific story (e.g., -s 8.4)
│   ├── -r STORY     Skip all stories before this one, then run normally
│   ├── -t SECS      Override TIMEOUT (e.g., -t 3600 for 1 hour)
│   ├── -l FILE      Change the log file path (default: ralph.log)
│   └── -h           Print usage instructions and exit
│
├── HELPER FUNCTIONS (lines 114-427)
│   These are the building blocks. The main loop calls them as needed.
│   Each one is explained in detail in later sections.
│   ├── log()                  Prints a timestamped message to both the terminal and ralph.log
│   ├── check_prerequisites()  Runs at startup to verify the environment is ready
│   ├── init_state()           Creates state.json from progress.txt on first run
│   ├── get_completed_stories()Returns the list of stories already finished
│   ├── is_story_completed()   Checks if one specific story is in the completed list
│   ├── find_next_story()      Walks through STORY_ORDER to find the first unfinished story
│   ├── get_story_spec_path()  Locates the markdown file for a given story ID
│   ├── get_story_title()      Extracts the human-readable title from the spec filename
│   ├── mark_story_done()      Records a successful story in all tracking files
│   ├── handle_failure()       Records a failed attempt, retries or exits
│   ├── update_spec_status()   Edits the YAML frontmatter in a spec file to change its status
│   ├── append_learnings()     Extracts learning notes from Claude's output
│   └── build_story_prompt()   Constructs the full text prompt sent to Claude
│
└── MAIN LOOP (lines 429-613)
    The heart of the script. For each iteration:
    1. Find the next unfinished story
    2. Locate its spec file
    3. Build a prompt containing the full spec
    4. Call Claude with that prompt
    5. Read Claude's output to determine success or failure
    6. Update tracking files accordingly
```

---

## Everything It Reads

These are all the files ralph.sh opens and reads during execution:

| What | Path | When | How | Why |
|------|------|------|-----|-----|
| Story spec | `specs/epic-{N}/story-{N.M}-*.md` | Each iteration | Reads entire file contents | The spec is embedded directly into the prompt sent to Claude |
| State file | `.ralph/state.json` | Each iteration | Reads JSON fields | To know which stories are done and what's currently running |
| Progress log | `progress.txt` | First run only | Scans for `[DONE]` lines | To bootstrap state.json if it doesn't exist yet |
| CLAUDE.md | `CLAUDE.md` | Startup only | Checks if file exists | Ensures the project has context docs (ralph.sh doesn't read the contents) |
| specs dir | `specs/` | Startup only | Checks if directory exists | Ensures story specs are available |

**About CLAUDE.md:** Ralph.sh only checks that CLAUDE.md exists — it never reads its contents. However, when Claude Code runs (`claude --print`), it automatically discovers and loads CLAUDE.md as project-level instructions. So CLAUDE.md content does reach Claude, just not through ralph.sh.

---

## Everything It Writes

These are all the files ralph.sh creates or modifies:

| What | Path | When | How | Why |
|------|------|------|-----|-----|
| State file | `.ralph/state.json` | Every state change | Writes JSON via jq (a command-line JSON processor) | Tracks which stories are done, what's running, retry count |
| Progress log | `progress.txt` | Every DONE/FAIL/LEARN | Appends a new line to the end of the file | Human-readable log of what happened and when |
| Execution log | `ralph.log` | Every log() call | Appends timestamped messages | Detailed technical log for debugging |
| Spec YAML | `specs/epic-N/story-*.md` | When a story is completed | Uses sed (a text replacement tool) to change `status: pending` to `status: done` | Marks the spec file itself as done |
| State dir | `.ralph/` | First run only | Creates the directory | Houses the state.json file |

---

## External Dependencies

Programs that must be installed on the system for ralph.sh to work:

| Program | What It Does | Where Used | What Happens If Missing |
|---------|-------------|-----------|------------------------|
| `claude` | The Claude Code CLI tool | Main invocation — sends prompt, gets response | Script exits immediately with error |
| `jq` | A command-line tool for reading and writing JSON files | All state.json operations | State tracking silently breaks — completions won't be recorded |
| `timeout` | Wraps a command with a time limit; kills it if it runs too long | Wrapping the Claude invocation | Stories could run forever without being stopped |
| `find` | Searches for files matching a pattern | Locating spec files by story ID | Cannot find spec files |
| `sed` | A text stream editor; used here to replace text in a file | Updating the `status:` line in spec YAML frontmatter | Spec files won't be marked as done |
| `git` | Version control | **Not used by ralph.sh directly.** The prompt tells Claude to run git commands (commit on success, checkout on failure). | Claude can't commit or revert |
| `tee` | Copies output to both the terminal and a file simultaneously | The log() function writes to both stdout and ralph.log | Logging to file won't work |

---

## Main Loop Flow (per iteration)

This is what happens each time ralph.sh goes through one cycle of the loop. Each numbered step is described in plain English with what can go wrong.

```
┌─────────────────────────────────────────────────────────────┐
│ ITERATION i                                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. FIND NEXT STORY                                          │
│     Look through the STORY_ORDER list from top to bottom.    │
│     Skip any story that's already in the "completed" list.   │
│     Return the first one that isn't completed yet.           │
│                                                              │
│     Special cases:                                           │
│     - If -s flag was given: use that exact story, ignore the │
│       list entirely                                          │
│     - If -r flag was given: start scanning from that story   │
│       instead of the beginning                               │
│     - If everything is done: print "ALL COMPLETE!" and exit  │
│                                                              │
│  2. FIND THE SPEC FILE                                       │
│     Given story ID "8.3", extract the epic number "8",       │
│     then search for: specs/epic-8/story-8.3-*.md             │
│     The wildcard (*) matches the slug part of the filename.  │
│                                                              │
│     If no file is found: log an error and skip to the next   │
│     iteration (this story is effectively orphaned).          │
│                                                              │
│  3. RECORD THAT WE'RE STARTING THIS STORY                   │
│     Write to state.json: current_story = "8.3"               │
│     This lets you see what Ralph is working on if you check  │
│     state.json while it's running.                           │
│                                                              │
│  4. BUILD THE PROMPT                                         │
│     Read the entire spec file into memory.                   │
│     Wrap it in a template that tells Claude:                 │
│     - "You are Ralph, an autonomous implementation agent"    │
│     - Here is the full story specification (the spec file)   │
│     - Here is your workflow (read → implement → test → done) │
│     - Here are the critical rules (one story, integer cents, │
│       follow ACs exactly, write all tests, USE TOOLS)        │
│                                                              │
│  5. DRY RUN CHECK                                            │
│     If -d flag was given: print the first 20 lines of the   │
│     prompt so you can preview it, then skip to next          │
│     iteration without calling Claude.                        │
│                                                              │
│  6. CALL CLAUDE                                              │
│     Run this command:                                        │
│       timeout 1800 claude --print                            │
│         --dangerously-skip-permissions "$prompt"             │
│                                                              │
│     What each part means:                                    │
│     - timeout 1800: Kill the process if it runs longer than  │
│       30 minutes. Returns exit code 124 on timeout.          │
│     - claude --print: Run Claude Code in non-interactive     │
│       mode — it processes the prompt and prints the result   │
│       to stdout instead of opening an interactive session.   │
│     - --dangerously-skip-permissions: Allow Claude to use    │
│       all tools (Read, Write, Edit, Bash) without asking     │
│       for permission each time. This is what makes it        │
│       autonomous — no human approval needed per action.      │
│     - "$prompt": The full prompt text from step 4.           │
│                                                              │
│     In verbose mode: output streams to the terminal in       │
│     real-time AND is captured for parsing.                   │
│     In quiet mode: output is captured silently.              │
│                                                              │
│  7. CHECK THE EXIT CODE                                      │
│     After Claude finishes, check how it exited:              │
│     - Exit code 124: The timeout command killed it because   │
│       it ran too long. Treat as a failure.                   │
│     - Any non-zero exit code: Something went wrong (Claude   │
│       crashed, network error, etc.). Treat as a failure.     │
│     - Exit code 0: Claude ran to completion. Proceed to      │
│       parse the output.                                      │
│                                                              │
│  8. PARSE CLAUDE'S OUTPUT                                    │
│     Ralph looks for specific tags in Claude's text output.   │
│     These tags are how Claude communicates back to ralph.sh. │
│                                                              │
│     Always first: extract any LEARN tags (useful insights    │
│     that Claude discovered while working).                   │
│                                                              │
│     Then check for completion signals:                       │
│                                                              │
│     a) <ralph>DONE 8.3</ralph>                               │
│        Claude says it finished successfully.                 │
│        Verify the story ID matches what we asked for.        │
│        If it matches: mark story as done.                    │
│        If it doesn't match: treat as failure (mismatched).   │
│                                                              │
│     b) <ralph>FAIL 8.3: reason text</ralph>                  │
│        Claude says it couldn't complete the story.           │
│        Extract the reason and record the failure.            │
│                                                              │
│     c) No <ralph> tags found at all:                         │
│        Fall back to looking for legacy signals:              │
│        - [DONE] anywhere in output → treat as success        │
│        - [FAIL] anywhere in output → treat as failure        │
│        - Neither found → treat as failure with message       │
│          "No completion signal in output"                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## State Machine (per story)

Each story goes through a simple lifecycle. This diagram shows all possible transitions:

```
                    ┌─────────┐
                    │ PENDING │
                    │         │  The story is in STORY_ORDER but hasn't been
                    │         │  attempted yet (not in completed_stories).
                    └────┬────┘
                         │
                         │ find_next_story() picks it as the next to run
                         ▼
                    ┌──────────┐
              ┌────>│ RUNNING  │  current_story is set to this story ID.
              │     │          │  Claude is working on it.
              │     └────┬─────┘
              │          │
              │          │ Claude's output is parsed
              │          ▼
              │    ┌─────────────┐
              │    │ Parse output│
              │    └──┬───┬───┬──┘
              │       │   │   │
              │  DONE │   │   │ FAIL or no signal
              │       │   │   │
              │       ▼   │   ▼
              │  ┌──────┐ │ ┌───────────────────────┐
              │  │ DONE │ │ │ Have we retried fewer  │
              │  │      │ │ │ than 3 times?          │
              │  │ Story│ │ └───┬───────────────┬───┘
              │  │ added│ │     │               │
              │  │ to   │ │     │ YES           │ NO
              │  │ comp-│ │     │               │
              │  │ leted│ │     ▼               ▼
              │  │ list │ │  Retry count     ┌──────────┐
              │  └──────┘ │  goes up by 1.   │ HALTED   │
              │           │  Main loop       │          │
              │           │  continues.      │ Script   │
              │           │  Same story      │ prints   │
              │           │  will be picked  │ "Human   │
              └───────────┘  again next      │ needed"  │
                             iteration       │ and      │
                             since it's      │ exits    │
                             still not in    │ with     │
                             completed_stories│ code 1  │
                                             └──────────┘
```

What changes in `.ralph/state.json` at each transition:

| Transition | completed_stories | current_story | retry_count |
|-----------|-------------------|---------------|-------------|
| PENDING → RUNNING | unchanged | set to story ID | unchanged |
| RUNNING → DONE | story ID added to array | set to null | reset to 0 |
| RUNNING → RETRY | unchanged | stays as story ID | incremented by 1 |
| RUNNING → HALTED | unchanged | stays as story ID | equals MAX_RETRIES |

---

## Prompt Architecture

This is what Claude actually receives when ralph.sh calls it. There are two layers — one automatic (CLAUDE.md) and one explicit (the prompt):

```
┌──────────────────────────────────────────────────────────────┐
│ What Claude sees during each story iteration                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ LAYER 1: SYSTEM CONTEXT (automatic)                          │
│ ┌──────────────────────────────────────────┐                 │
│ │ Contents of CLAUDE.md                    │                 │
│ │                                          │                 │
│ │ Claude Code automatically finds and      │                 │
│ │ loads this file from the project root.   │                 │
│ │ ralph.sh doesn't send it — Claude Code   │                 │
│ │ does this on its own for any project     │                 │
│ │ that has a CLAUDE.md file.               │                 │
│ │                                          │                 │
│ │ Contains: project architecture, data     │                 │
│ │ model, design tokens, build commands,    │                 │
│ │ conventions (integer cents, etc.)        │                 │
│ └──────────────────────────────────────────┘                 │
│                                                              │
│ LAYER 2: THE PROMPT (built by ralph.sh)                      │
│ ┌──────────────────────────────────────────┐                 │
│ │ "You are Ralph, an autonomous agent..."  │                 │
│ │                                          │                 │
│ │ ## STORY SPECIFICATION                   │                 │
│ │ The entire spec file is pasted here —    │                 │
│ │ YAML frontmatter and all markdown        │                 │
│ │ sections. Claude reads this to know      │                 │
│ │ exactly what to build.                   │                 │
│ │                                          │                 │
│ │ ## WORKFLOW                              │                 │
│ │ Step-by-step instructions telling Claude │                 │
│ │ what to do:                              │                 │
│ │ 1. Read existing code first              │                 │
│ │ 2. Implement by writing/editing files    │                 │
│ │ 3. Validate with npm run check + test    │                 │
│ │ 4. On success: git commit and output     │                 │
│ │    the DONE signal tag                   │                 │
│ │ 5. On failure: git checkout . (revert)   │                 │
│ │    and output the FAIL signal tag        │                 │
│ │ 6. Output LEARN tags for useful insights │                 │
│ │                                          │                 │
│ │ ## CRITICAL RULES                        │                 │
│ │ Hard constraints Claude must follow:     │                 │
│ │ - Complete one story fully before done   │                 │
│ │ - Use integer cents for money            │                 │
│ │ - Follow acceptance criteria exactly     │                 │
│ │ - Write all specified tests              │                 │
│ │ - Must use tools (not just output text)  │                 │
│ └──────────────────────────────────────────┘                 │
│                                                              │
│ AVAILABLE TOOLS                                              │
│ Because --dangerously-skip-permissions is set, Claude can    │
│ use all tools without asking for human approval:             │
│ Read, Write, Edit, Bash, Glob, Grep                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Signal Protocol

The signal protocol is how Claude communicates results back to ralph.sh. Since Claude runs in `--print` mode (non-interactive), its only way to send structured information back is by including specific tags in its text output.

Ralph.sh scans the output text using bash regular expressions:

**Primary signals** (the ones Claude is told to use):
```
<ralph>DONE 8.3</ralph>         "I successfully implemented story 8.3"
<ralph>FAIL 8.3: reason</ralph> "I failed on story 8.3, here's why"
<ralph>LEARN: insight</ralph>   "I discovered something useful"
```

**Legacy fallback** (older format, still recognized):
```
[DONE]                          Anywhere in output = success
[FAIL]                          Anywhere in output = failure
```

**No signal at all:**
If neither primary nor legacy signals are found in the output, ralph.sh treats it as a failure with the reason "No completion signal in output." This handles cases where Claude ran but didn't produce structured output (e.g., got confused, hit a token limit, etc.).

---

## Failure Handling

When a story fails (FAIL signal, timeout, crash, or no signal), here's what happens step by step:

```
1. Read the current retry_count from state.json
   (starts at 0 for each new story)

2. Add 1 to retry_count

3. Write the new retry_count back to state.json
   (current_story stays set to this story)

4. Append a [FAIL] line to progress.txt:
   "[FAIL] Story 8.3 - Reason - timestamp (attempt 2/3)"

5. Is retry_count now >= MAX_RETRIES (default: 3)?

   NO: Return normally. The main loop continues to the next
       iteration. Since this story is still not in completed_stories,
       find_next_story() will pick it again, effectively retrying it.

   YES: Print a large "MAX RETRIES EXCEEDED" banner.
        Print "Human intervention required."
        Print a hint: "./ralph.sh -s 8.3"
        Exit the entire script with code 1.
```

**Important gap:** ralph.sh does NOT clean up dirty git state before retrying. The prompt tells Claude to run `git checkout .` on failure, but if Claude crashed or timed out, it may not have done that. This means the next retry attempt could start with leftover uncommitted changes from the previous attempt.

---

## mark_story_done

When a story succeeds, here's what happens:

```
1. Add the story ID to the completed_stories array in state.json
2. Set current_story to null (nothing running)
3. Reset retry_count to 0
4. Write all of the above to .ralph/state.json
   (writes to a temp file first, then renames it — this prevents
   corruption if the script is interrupted mid-write)
5. Open the spec file and change "status: pending" to "status: done"
   in the YAML frontmatter (using the sed text replacement tool)
6. Append a [DONE] line to progress.txt with a timestamp
7. Write a log message to ralph.log
```

---

## Startup Sequence

When you run `./ralph.sh`, this happens before any stories are attempted:

```
1. CHECK PREREQUISITES
   The script verifies the environment is set up correctly.
   Any failure here stops the script immediately.

   a) Is 'claude' installed and in the PATH?
      If not: print error, exit 1
   b) Does CLAUDE.md exist in the current directory?
      If not: print error, exit 1
   c) Does the specs/ directory exist?
      If not: print error, exit 1
   d) Does .ralph/ directory exist?
      If not: create it (mkdir -p)
   e) Does progress.txt exist?
      If not: create an empty one (touch)

2. INITIALIZE STATE
   If .ralph/state.json already exists, skip this step entirely.
   If it doesn't exist (first run, or someone deleted it):

   a) Read progress.txt line by line
   b) Find all lines matching "[DONE] Story X.Y ..."
   c) Extract the story IDs (e.g., "1.1", "2.3")
   d) Remove duplicates
   e) Build a new state.json with those IDs as completed_stories,
      current_story = null, retry_count = 0

   This means you can recover state by keeping progress.txt —
   state.json is rebuilt from it automatically.

3. PRINT BANNER
   Show a box with: iterations count, timeout, log file path,
   and whether a specific story or resume point was requested.

4. ENTER MAIN LOOP
   Begin iterating through stories.
```

---

## File Relationships

This shows how all the files connect — what reads what, what writes what:

```
                     ┌──────────────────────────┐
                     │                          │
        reads on     │      ralph.sh            │    writes to
        startup      │                          │    every iteration
   ┌─────────────────┤  STORY_ORDER array       ├───────────────────┐
   │                 │  ITERATIONS count         │                   │
   │                 │  TIMEOUT / MAX_RETRIES    │                   │
   │                 └─────────┬────────────────┘                   │
   │                           │                                     │
   ▼                           │ invokes per story                   ▼
┌──────────┐                   │                          ┌─────────────────┐
│ CLAUDE.md│                   ▼                          │ .ralph/         │
│ (checked │        ┌─────────────────────┐               │   state.json    │
│ for      │        │ claude --print      │               │                 │
│ existence│        │ (Claude Code CLI)   │               │ Tracks:         │
│ only)    │        │                     │               │ - completed IDs │
└──────────┘        │ Receives the prompt │               │ - current story │
                    │ and runs tools to   │               │ - retry count   │
   ┌───────────┐    │ implement the story │               └─────────────────┘
   │ specs/    │    │                     │                        │
   │ epic-N/   │──> │ Also auto-loads     │               ┌────────┴────────┐
   │ story-*.md│    │ CLAUDE.md as        │               │                 │
   │           │    │ project context     │               ▼                 ▼
   │ (read by  │    └─────────┬──────────┘        ┌────────────┐   ┌────────────┐
   │ ralph.sh  │              │                   │progress.txt│   │ ralph.log  │
   │ and       │              │ Claude's text     │            │   │            │
   │ embedded  │              │ output (stdout)   │ Human-     │   │ Timestamped│
   │ in prompt)│              ▼                   │ readable   │   │ technical  │
   └───────────┘       ┌─────────────┐            │ history:   │   │ messages   │
        ▲              │ ralph.sh    │            │ [DONE]     │   │ for debug  │
        │              │ parses the  │            │ [FAIL]     │   │            │
        │              │ output for  │            │ [LEARN]    │   │            │
        │ On success:  │ signal tags │            └────────────┘   └────────────┘
        │ sed changes  └─────────────┘
        │ "status: pending"
        │ to "status: done"
        │ in YAML frontmatter
        └──────────────
```

---

## What ralph.sh Does NOT Do

These are things you might expect the script to handle, but they are manual steps done by a human before running the loop:

1. **Create story spec files** — Someone writes `specs/epic-N/story-N.M-slug.md` with the required format (YAML frontmatter + markdown sections). Ralph does not generate stories.

2. **Update STORY_ORDER** — When new stories are added, someone must edit the bash array inside ralph.sh to include the new story IDs. Ralph does not scan the specs/ directory.

3. **Update ITERATIONS** — If more stories are added, someone must increase this number or Ralph will stop before reaching them.

4. **Create directory structure** — `mkdir specs/epic-N` must be done before adding stories to a new epic.

5. **Clean up dirty git state on timeout** — The prompt tells Claude to run `git checkout .` when it fails, but if Claude times out or crashes, the revert never happens. Ralph does not run any git commands itself.

6. **Validate spec format** — If a spec file exists, Ralph uses it regardless of whether it has valid YAML frontmatter, all sections, or is well-formed. There is no schema check.

7. **Respect the depends_on field** — The YAML frontmatter can include `depends_on: ["7.4"]`, but ralph.sh ignores this. Stories run in STORY_ORDER regardless of what depends_on says. It's up to whoever writes the STORY_ORDER array to get the sequencing right.

8. **Manage branches** — Ralph runs on whatever git branch is currently checked out. It does not create branches, switch branches, or merge.

9. **Reset state between retries** — When retrying a failed story, Ralph does not run `git checkout .` first. If the previous attempt left uncommitted changes, the retry starts with that dirty state.

---

## Current State (as of January 30, 2026)

- **78 story IDs** are listed in STORY_ORDER (spanning epics 1 through 12)
- **58 stories completed** — all of epics 1 through 8
- **20 stories remaining** — epics 9, 10, 11, 12
- **ITERATIONS is set to 45** — this is less than the 20 remaining stories, so it would need to be increased before running the loop again
- **Spec files for epics 9-12** — their IDs are in STORY_ORDER, but their spec files in `specs/` need to be verified

---

## No Tie to BMAD

ralph.sh has zero coupling to the BMAD framework. It does not read, reference, or depend on anything in `_bmad/`, `.claude/commands/bmad/`, or any BMAD workflow.

What ralph.sh actually uses from spec files:
- **The file's existence** (to know the story has a spec)
- **The file's full content** (embedded in the prompt for Claude to read)
- **The `status:` YAML field** (only to write "done" into it after success)

Everything else in the YAML frontmatter (`priority`, `estimation`, `depends_on`, `frs`) is read by Claude as part of the embedded spec content, but ralph.sh itself does not parse or act on these fields.

The original story spec files were created by Claude in a single bulk commit, not by any BMAD workflow. The Epic 8 stories were added individually in later commits, also by Claude directly.
