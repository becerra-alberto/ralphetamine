# Ralph v2 — Fully Autonomous Pipeline

Run the complete Ralph v2 pipeline from idea to execution-ready project with **zero user interaction**. Every decision point uses structured self-evaluation: weigh risks, cons, and value — then proceed with the strongest proposal.

Includes **worktree isolation** (so the main branch stays clean) and a **double premortem** — a second review pass that accounts for changes made by the first — to compensate for the lack of human oversight.

For the interactive version with user checkpoints, use `/ralph-v2:pipeline-interactive`.

---

## Core Directive: Context Window Preservation

**At every phase, maximally delegate work to sub-agents via the Task tool.** The main conversation context is a finite resource that must survive the entire pipeline. Follow these rules:

1. **Delegate all heavy reading and writing to sub-agents.** PRD generation, spec writing, premortem analysis, and consistency reviews should each run in their own Task agent. The main context only orchestrates, passes results forward, and makes git commits.
2. **Never read full file contents into the main context when a sub-agent can do it.** If a phase needs to read 10 spec files and analyze them, spawn a sub-agent for that.
3. **Pass forward only summaries.** When a sub-agent returns, extract the minimal information needed for the next phase (file paths, story count, issue list) — not the full content.
4. **Parallelize independent sub-agents.** Spec writers, premortem analyzers, and validation checks that don't depend on each other should run concurrently in a single message.

## Core Directive: Non-Interactive File Writes

This pipeline is fully autonomous. **Do not pause to request write approval from the user.**

1. **Create missing paths proactively.** Before writing any new artifact, ensure parent directories exist (`mkdir -p` behavior).
2. **Use a create-capable write path for new files.** If a file does not exist (for example `skills/oss-prep/SKILL.md`), create it directly instead of attempting edit-only operations.
3. **Retry with an alternate write method once.** If first write attempt fails, retry using a different mechanism (for example: write tool then patch tool, or patch tool then write tool).
4. **Never ask "Could you approve this write?"** in full-auto mode. If the runtime hard-blocks all writes after retries, log a structured blocker and continue as far as possible.
5. **Record blocked writes** in `.ralph/write-blockers.md` using:
   - target path
   - reason/error text
   - whether content was generated
   - next command for manual recovery

## Core Directive: Ralph Runtime Compatibility

1. **Generate artifacts for `ralph run` only.** Do not generate custom per-story loops that call `claude` directly.
2. **Do not treat model prose as completion.** Story completion is determined by Ralph state/signal flow, not by freeform "done" text.
3. **Normalize file paths to the worktree project root.** All file paths are relative to the worktree working directory, not the original repo.
4. **Queue must be runnable before commit.** `.ralph/stories.txt` must include at least one active `N.M | Title` entry.

---

## Pipeline Overview

| Phase | What Happens | Autonomous? |
|-------|-------------|-------------|
| 0. Worktree | Create isolated git worktree for the feature | Auto — slug derived from description |
| 1. PRD | Generate a Product Requirements Document | Self-directed — Claude decides scope |
| 2. Commit PRD | Commit the PRD to git | Auto |
| 3. Specs | Convert PRD into epics, stories, batch queue | Self-directed — Claude decides breakdown |
| 4. Commit Specs | Commit specs and stories.txt to git | Auto |
| 5. Premortem 1 | Analyze plan for failure modes, apply fixes | Self-directed — Claude evaluates and fixes |
| 6. Commit Fixes | Commit premortem 1 fixes to git | Auto |
| 7. Premortem 2 | Re-analyze after fixes, catch cascading issues | Self-directed — Claude evaluates and fixes |
| 8. Commit Fixes | Commit premortem 2 fixes to git | Auto |
| 9. Run Script | Generate `run-ralph.sh` for autonomous execution | Auto |

**No user input is requested at any phase.** Announce each phase transition clearly so the user can follow progress.

---

## Phase 0: Worktree Setup

Create an isolated git worktree so all feature work happens on a dedicated branch, leaving the main branch clean for continued development.

### Autonomous Slug Derivation

Derive a kebab-case feature slug from the user's feature description. Use the first 3-4 meaningful words, lowercase, hyphen-separated:
- "Add user authentication" → `user-authentication`
- "Budget tracking dashboard" → `budget-tracking-dashboard`

### Create the Worktree

Run the following steps using the Bash tool:

1. **Clean stale state:**
   ```bash
   rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
   git worktree prune 2>/dev/null || true
   ```

2. **Create the worktree:**
   ```bash
   git worktree add .ralph/worktrees/feature-<slug> -b ralph/feature-<slug>
   ```
   If the branch or worktree already exists (from a previous run), clean up and retry:
   ```bash
   git worktree unlock .ralph/worktrees/feature-<slug> 2>/dev/null || true
   git worktree remove .ralph/worktrees/feature-<slug> --force 2>/dev/null || true
   rm -rf .ralph/worktrees/feature-<slug> 2>/dev/null || true
   git worktree prune 2>/dev/null || true
   git branch -D ralph/feature-<slug> 2>/dev/null || true
   git worktree add .ralph/worktrees/feature-<slug> -b ralph/feature-<slug>
   ```

3. **Resolve the absolute worktree path** and store it for all subsequent phases:
   ```bash
   WORKTREE_DIR="$(cd .ralph/worktrees/feature-<slug> && pwd)"
   ```

### Set Working Context

**All subsequent phases (1-9) operate inside the worktree directory.** When using the Bash tool, prefix commands with `cd "$WORKTREE_DIR" &&` or use absolute paths within the worktree. When using Read/Write/Edit tools, use the absolute worktree path.

Create the `.ralph/` directory and initialize `ralph init` inside the worktree if `.ralph/config.json` does not already exist:
```bash
cd "$WORKTREE_DIR" && ralph init
```

Announce: **"Phase 0 complete — Worktree created at `.ralph/worktrees/feature-<slug>` on branch `ralph/feature-<slug>`. All work will happen in this isolated environment."**

---

## Phase 1: PRD Creation

**Sub-agent delegation:** Spawn a Task agent (subagent_type: general-purpose, model: opus) to generate the full PRD. Pass it the user's feature description and the PRD format below. The sub-agent writes the file directly. The main context only receives the file path and a one-paragraph summary.

### Autonomous Decision Protocol

Where the interactive version would ask the user clarifying questions, instead:

1. **Identify the 3-5 questions** you would normally ask.
2. **For each question, evaluate the options** by reasoning through:
   - Which option produces the most broadly useful, maintainable result?
   - Which option has the lowest risk of requiring rework?
   - Which option best matches the user's stated intent?
3. **Select the safest, most conventional answer** for each question. Prefer:
   - Broader scope over narrow (cover the full use case, not a partial one)
   - Standard approaches over clever ones
   - Explicit behavior over implicit
4. **Document your choices** at the top of the PRD in a `## Design Decisions` section so the user can review what was decided on their behalf.

### PRD Format

The sub-agent must generate a PRD with these sections:

1. **Design Decisions** — What was auto-decided and why (unique to full-auto mode)
2. **Introduction/Overview** — Brief description and problem statement
3. **Goals** — Specific, measurable objectives
4. **User Stories** — "As a [user], I want [feature] so that [benefit]" with acceptance criteria
5. **Functional Requirements** — Numbered (FR-1, FR-2, ...), explicit and unambiguous
6. **Non-Goals** — What this will NOT include (be generous — narrow scope reduces failure risk)
7. **Design Considerations** — UI/UX requirements (if applicable)
8. **Technical Considerations** — Constraints, dependencies, integration points
9. **Success Metrics** — How success is measured
10. **Open Questions** — Flag remaining unknowns (these become premortem inputs later)

Save to `tasks/prd-[feature-name].md`.

Announce: **"Phase 1 complete — PRD saved. Design decisions documented in the PRD header."**

---

## Phase 2: Commit PRD

1. Stage: `tasks/prd-*.md` (the newly created PRD file)
2. Commit message: `docs: add PRD for [feature-name]`
3. If commit fails, warn but continue.

Announce: **"Phase 2 complete — PRD committed. Moving to Phase 3."**

---

## Phase 3: Spec Generation

**Sub-agent delegation:** This phase is the heaviest. Maximize sub-agent usage:

- **Analysis sub-agent:** Spawn one Task agent to read the PRD and produce a proposed epic/story breakdown (just the outline — IDs, titles, batch assignments, dependencies). This agent does NOT write spec files.
- **Spec writer sub-agents:** After the analysis agent returns, spawn one Task agent per story (or per epic if < 5 stories total) to write the actual spec files. Launch all writers in a single message for maximum parallelism.
- **Consistency review sub-agent:** After all writers finish, spawn one Task agent to read all generated specs and run the consistency checks.

### Autonomous Decision Protocol

Where the interactive version would show the breakdown and ask the user to confirm:

1. **Evaluate the proposed breakdown** by asking:
   - **Sizing risk:** Is any story too large for a single Claude context window? If it touches > 5 files or requires understanding > 500 lines of existing code, split it.
   - **Dependency risk:** Are there implicit dependencies between stories in the same batch? If two stories in the same batch both write to the same file, move one to a later batch.
   - **Coverage risk:** Does the breakdown cover all functional requirements? Cross-reference FR numbers.
   - **Ordering risk:** Could any story fail because it assumes setup from a later story?
2. **Apply corrections** to the breakdown before generating specs.
3. **Log the breakdown** (epic names, story IDs and titles) in the main context for forward reference.

### Spec File Format

Every spec file (`specs/epic-{N}/story-{N.M}-{slug}.md`) must use this exact format:

```markdown
---
id: "N.M"
epic: N
title: "Short Descriptive Title"
status: pending
source_prd: "tasks/prd-<name>.md"
priority: critical|high|medium|low
estimation: small|medium|large
depends_on: []
---

# Story N.M — Short Descriptive Title

## User Story
As a [role], I want [capability] so that [benefit].

## Technical Context
[Implementation approach, architecture, key decisions.]

## Acceptance Criteria

### AC1: [Criterion Name]
- **Given** [precondition]
- **When** [action]
- **Then** [expected result]

## Test Definition

### Unit Tests
- [Test case description]

### Integration/E2E Tests (if applicable)
- [Test scenario]

## Files to Create/Modify
- `path/to/file` — [what changes] (create|modify)
```

**Path normalization rule (critical):**
- Every `Files to Create/Modify` path must be relative to the current project root.
- Never prepend the current project directory name.
- Example: when project root is `skills/oss-prep/`, use `SKILL.md`, not `skills/oss-prep/SKILL.md`.

### stories.txt Format

```
# Source: tasks/prd-<name>.md
# Generated: <ISO timestamp>
# Stories: 1.1, 1.2, ..., N.M

# Ralph Story Queue
# Format: ID | Title

# [batch:1] — foundational / independent
1.1 | Story Title

# [batch:2] — depends on batch 1
2.1 | Story Title
```

### Validation

The consistency review sub-agent must verify:
- Every story ID in `stories.txt` has a matching spec file
- No circular dependencies
- All spec files have valid YAML frontmatter
- File path references are consistent across specs
- No scope overlap between stories in the same batch
- Every `Files to Create/Modify` path is project-root-relative (no duplicated root prefix)
- `.ralph/stories.txt` has at least one active story line (`N.M | Title`)

Announce: **"Phase 3 complete — Created X specs across Y epics. Moving to Phase 4."**

---

## Phase 4: Commit Specs

1. Stage: `specs/`, `.ralph/stories.txt`, PRD file (if frontmatter updated)
2. Commit message: `ralph: add specs for [feature-name] (N stories across M epics)`
3. If commit fails, warn but continue.

Announce: **"Phase 4 complete — Specs committed. Moving to Phase 5: Premortem 1."**

---

## Phase 5: Premortem 1 — Initial Review

**Sub-agent delegation:** Spawn a single Task agent (model: opus) to perform the full premortem analysis. Pass it the list of spec file paths and stories.txt path. The agent reads all files, runs the analysis, applies fixes, writes the report, and returns a summary. The main context receives only the summary.

The premortem imagines the project has **already failed** and works backward to identify what went wrong.

### Failure Mode Categories

#### Category 1: Story Sizing
- Is any story too large for a single Claude context window?
- Does any story touch more than 5-6 files?
- Does any story require understanding complex existing code?

#### Category 2: Dependency & Ordering
- Are there implicit dependencies not captured in `depends_on`?
- Could a story fail because it assumes files from a same-batch story?
- Are batch assignments correct?

#### Category 3: Acceptance Criteria Quality
- Are any criteria vague or untestable?
- Are there missing edge cases?
- Do API stories define the contract?

#### Category 4: Missing Stories
- Is there a setup/scaffolding story that should exist?
- Are there missing integration stories?
- Do UI stories have corresponding backend stories?

#### Category 5: Technical Risks
- Does any story require external services not mentioned?
- Are there merge conflict risks between parallel stories?
- Does the plan assume libraries are already installed?

#### Category 6: Test Coverage Gaps
- Are there stories with no test definitions?
- Are there integration points with no integration tests?

### Autonomous Fix Protocol

1. **For each finding, evaluate:** likelihood of causing failure, risk of the fix, cost of the fix.
2. **Apply all critical fixes unconditionally.**
3. **Apply warnings if the fix is low-risk.** Skip only if the fix introduces complexity.
4. **Log all decisions** to `.ralph/premortem-1-report.md`.

Announce: **"Phase 5 complete — Premortem 1: X issues found, Y fixed, Z skipped."**

---

## Phase 6: Commit Premortem 1 Fixes

1. Stage: `specs/`, `.ralph/stories.txt`, `.ralph/premortem-1-report.md`
2. Commit message: `ralph: premortem 1 fixes for [feature-name] (N issues resolved)`
3. If no fixes were needed, skip this commit but still proceed to Premortem 2.

Announce: **"Phase 6 complete — Moving to Phase 7: Premortem 2."**

---

## Phase 7: Premortem 2 — Post-Fix Verification

**Sub-agent delegation:** Spawn a fresh Task agent (model: opus). This agent receives:
1. Spec file paths and stories.txt path (reads current state)
2. Premortem 1 report path (`.ralph/premortem-1-report.md`) for context on what changed
3. Instructions to focus on **cascading effects** of the fixes

This second premortem exists because fixes can create new problems:
- Splitting a story may have left a dependency gap
- Adding a new story may have created a batch ordering conflict
- Rewriting acceptance criteria may have introduced scope overlap
- Adding `depends_on` references may have created circular dependencies

### Additional Focus Areas for Premortem 2

#### Category 7: Fix Cascades
- Did any story split produce sub-stories that overlap with existing stories?
- Did new `depends_on` entries create circular dependencies?
- Did batch reassignments create a batch with too many stories (> 4)?
- Are newly added stories properly in `stories.txt` with correct batch annotations?
- Did AC rewrites accidentally narrow scope below PRD requirements?

#### Category 8: Holistic Coherence
- Does the execution order in stories.txt make narrative sense?
- Would a developer reading just the titles understand the build progression?
- Is the total story count reasonable? (Heuristic: ~1 story per FR, +/- 30%)
- Are estimation labels consistent? (6-file story shouldn't be `small`)

### Autonomous Fix Protocol (same as Premortem 1)

Apply critical fixes unconditionally. Apply low-risk warning fixes. Log to `.ralph/premortem-2-report.md`.

Announce: **"Phase 7 complete — Premortem 2: X issues found, Y fixed."**

---

## Phase 8: Commit Premortem 2 Fixes

1. Stage: `specs/`, `.ralph/stories.txt`, `.ralph/premortem-2-report.md`
2. Commit message: `ralph: premortem 2 fixes for [feature-name] (N issues resolved)`
3. If no fixes needed, commit the clean report anyway.

Announce: **"Phase 8 complete — Moving to Phase 9: Run Script."**

---

## Phase 9: Generate Run Script

Create `run-ralph.sh` in the project root:

```bash
#!/usr/bin/env bash
# Run Ralph v2 autonomous implementation loop
# Generated by /ralph-pipeline-full-auto on <date>
# PRD: tasks/prd-<name>.md
# Stories: <N> stories across <M> epics
# Premortems: 2 passes completed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Preflight checks
command -v ralph >/dev/null 2>&1 || { echo "Error: ralph not found on PATH. Run install.sh first."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Error: jq not found on PATH."; exit 1; }
[[ -f .ralph/config.json ]] || { echo "Error: .ralph/config.json not found."; exit 1; }
[[ -f .ralph/stories.txt ]] || { echo "Error: .ralph/stories.txt not found."; exit 1; }

active_stories=$(grep -cE '^[[:space:]]*[0-9]+(\.[0-9]+)+[[:space:]]*\|' .ralph/stories.txt || true)
if [[ "$active_stories" -eq 0 ]]; then
    echo "Error: .ralph/stories.txt has no active stories."
    echo "Regenerate the queue before running Ralph."
    exit 1
fi

spec_pattern=$(jq -r '.specs.pattern // ""' .ralph/config.json 2>/dev/null || echo "")
if [[ "$spec_pattern" != *"{{epic}}"* || "$spec_pattern" != *"{{id}}"* ]]; then
    echo "Error: invalid .ralph/config.json specs.pattern: $spec_pattern"
    echo "Expected: specs/epic-{{epic}}/story-{{id}}-*.md"
    exit 1
fi

# Count stories and batches
total_stories=$(grep -cE '^[[:space:]]*[0-9]+(\.[0-9]+)+[[:space:]]*\|' .ralph/stories.txt || true)
total_batches=$(grep -c '^[[:space:]]*# \[batch:' .ralph/stories.txt || true)

# Infer conflict risk from Files to Create/Modify sections.
target_count=$(
  {
    while IFS= read -r spec; do
      awk '
        /^## Files to Create\/Modify/ {in_files=1; next}
        /^## / {in_files=0}
        in_files && /^- `/ {
          line=$0
          sub(/^- `/, "", line)
          sub(/`.*/, "", line)
          gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
          if (length(line) > 0) print line
        }
      ' "$spec"
    done < <(find specs -type f -name 'story-*.md' 2>/dev/null)
  } | sort -u | sed '/^$/d' | wc -l | tr -d ' '
)

run_mode="${RALPH_RUN_MODE:-auto}"
if [[ "$run_mode" == "auto" ]]; then
    if [[ "${target_count:-0}" -le 1 ]]; then
        run_mode="sequential"
    else
        run_mode="parallel"
    fi
fi

echo "Ralph v2 — Autonomous Implementation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Stories: ${total_stories}"
echo "Batches: ${total_batches}"
echo "Targets: ${target_count:-0} unique file paths"
echo "Mode:    ${run_mode}"
echo ""
echo "Starting in 3 seconds... (Ctrl+C to cancel)"
sleep 3

# Run Ralph
if [[ "$run_mode" == "parallel" ]]; then
    ralph run --parallel --no-interactive "$@"
else
    ralph run --no-interactive "$@"
fi
```

Save and `chmod +x run-ralph.sh`.

### Step 9.2: Launch in iTerm2

After generating the script, **automatically launch it in a new iTerm2 window** so Ralph runs in its own dedicated terminal session inside the worktree.

Use the Bash tool to run this AppleScript via `osascript`:

```bash
osascript -e '
tell application "iTerm2"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "cd \"'"$WORKTREE_DIR"'\" && ./run-ralph.sh"
    end tell
end tell
'
```

Where `$WORKTREE_DIR` is the absolute path to the worktree directory (resolved in Phase 0).

**Fallback:** If iTerm2 is not installed or the AppleScript fails, fall back to:
```bash
cd "$WORKTREE_DIR" && open -a Terminal.app "./run-ralph.sh"
```
If both fail, tell the user: "Could not auto-launch. Run `./run-ralph.sh` from the worktree directory manually."

Announce: **"Phase 9 complete — Ralph is running in a new iTerm2 window (worktree: `feature-<slug>`)."**

---

## Pipeline Complete

Print the final summary:

```
Ralph v2 Full-Auto Pipeline Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Worktree:     .ralph/worktrees/feature-<slug>
Branch:       ralph/feature-<slug>
PRD:          tasks/prd-[name].md
Specs:        N stories across M epics
Premortem 1:  X issues found, Y fixed
Premortem 2:  X issues found, Y fixed
Reports:      .ralph/premortem-1-report.md
              .ralph/premortem-2-report.md
Run script:   ./run-ralph.sh
Execution:    Launched in iTerm2 window

Ralph is running autonomously in an isolated worktree.
Check the iTerm2 window for progress.
Premortem reports are available for review at any time.

When complete, merge back to your main branch:
  cd <project-root>
  git merge ralph/feature-<slug>
  git worktree remove .ralph/worktrees/feature-<slug>

→ Then update the changelog:
  /bonbon:ai-dev-toolkit:dev:1-changelog
```

---

## Error Recovery

1. **Worktree creation fails:** Clean stale locks (`rm -f .git/index.lock`), prune worktrees (`git worktree prune`), and retry. If the branch already exists, delete it and recreate.
2. **PRD generation fails:** Retry with simpler scope interpretation.
3. **Git commit fails:** Warn and continue.
4. **Spec sub-agent fails:** Retry that story's spec sequentially.
5. **Premortem finds critical issues:** Always fix. Never skip Premortem 2 even if Premortem 1 was clean.
6. **Run script creation fails:** Output script content inline.
7. **Write permission/file-creation failure:** Retry with alternate write method and explicit directory creation. If still blocked, add an entry to `.ralph/write-blockers.md` and continue without asking for interactive approval.

---

## Sub-Agent Prompt Templates

### PRD Writer Agent

```
You are generating a PRD for: [feature description].
This is fully autonomous — no user to ask. You must:
1. Identify 3-5 clarifying questions you would ask
2. Choose the safest, most conventional answer for each
3. Document choices in a "Design Decisions" section
Write to: tasks/prd-[name].md
Maximally use sub-agents for any research or exploration needed.
[Full PRD format]
```

### Spec Writer Agent

```
You are writing a single Ralph v2 story spec.
Project: [one-paragraph summary]
Breakdown: [epic/story outline]
Your assignment: Story [N.M] — [title]
Write to: specs/epic-{N}/story-{N.M}-{slug}.md
[Spec format]
Do not read or modify other specs. Focus only on your assigned story.
```

### Premortem Agent

```
Perform a premortem analysis on this Ralph v2 project.
Read all specs in specs/ and .ralph/stories.txt.
[If PM2: Also read .ralph/premortem-1-report.md]
Check all failure categories. For each issue: assess value/risk/cost, classify severity, apply fixes.
Write report to .ralph/premortem-[N]-report.md.
Maximally use sub-agents if you need to explore the codebase for context.
```
