---
name: ralph-pipeline-interactive
description: "Run the complete Ralph v2 pipeline interactively: PRD creation, spec generation, premortem review, and run script generation. Pauses for user input at key decision points. Triggers on: /ralph-pipeline-interactive, interactive ralph pipeline, ralph guided pipeline."
---

# Ralph v2 — Full Pipeline

Run the complete Ralph v2 pipeline from idea to execution-ready project in one session. Each phase builds on the previous, with user interaction at key decision points.

## Core Directive: Ralph Runtime Compatibility

1. **Generate artifacts for `ralph run` only.** Do not generate custom per-story loops that call `claude` directly.
2. **Do not treat model prose as completion.** Story completion is determined by Ralph's state/signal flow, not by freeform "done" text.
3. **Normalize file paths to the worktree project root.** All file paths are relative to the worktree working directory, not the original repo.
4. **Queue must be runnable before Phase 5.** `.ralph/stories.txt` must include at least one active `N.M | Title` entry.

---

## Pipeline Overview

| Phase | What Happens | User Input? |
|-------|-------------|-------------|
| 0. Worktree | Create an isolated git worktree for the feature | Yes — confirm feature slug |
| 1. PRD | Generate a Product Requirements Document | Yes — clarifying questions |
| 2. Commit PRD | Commit the PRD to git | No |
| 3. Specs | Convert PRD into epics, stories, batch queue | Yes — confirm breakdown |
| 4. Commit Specs | Commit specs and stories.txt to git | No |
| 5. Premortem | Analyze plan for failure modes, fix issues | Yes — review findings |
| 6. Commit Fixes | Commit premortem fixes to git | No |
| 7. Run Script | Generate `run-ralph.sh` for autonomous execution | No |

**Important:** Complete each phase fully before moving to the next. Announce each phase transition clearly so the user knows where they are in the pipeline.

---

## Phase 0: Worktree Setup

Create an isolated git worktree so all feature work happens on a dedicated branch, keeping the main branch clean.

### Step 0.1: Derive Feature Slug

After getting the feature description (from the user's initial message or by asking), derive a kebab-case slug. For example:
- "Add user authentication" → `user-authentication`
- "Budget tracking dashboard" → `budget-tracking-dashboard`

Show the user the proposed slug and branch name:

```
Feature branch: ralph/feature-<slug>
Worktree path:  .ralph/worktrees/feature-<slug>
```

**WAIT for the user to confirm or provide a different slug.**

### Step 0.2: Create the Worktree

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

### Step 0.3: Set Working Context

**All subsequent phases (1-7) operate inside the worktree directory.** When using the Bash tool, prefix commands with `cd "$WORKTREE_DIR" &&` or use absolute paths within the worktree. When using Read/Write/Edit tools, use the absolute worktree path.

Create the `.ralph/` directory and initialize `ralph init` inside the worktree if `.ralph/config.json` does not already exist:
```bash
cd "$WORKTREE_DIR" && ralph init
```

If the user's project has a `CLAUDE.md` or other config files in the repo root, they are already available in the worktree (it shares the same git content).

Announce: **"Phase 0 complete — Worktree created at `.ralph/worktrees/feature-<slug>` on branch `ralph/feature-<slug>`. All work will happen in this isolated environment. Moving to Phase 1: PRD Creation."**

---

## Phase 1: PRD Creation

Generate a Product Requirements Document interactively.

### Step 1.1: Get the Feature Description

Ask the user: **"What feature or project do you want to build?"**

If the user has already described the feature, proceed directly to clarifying questions.

### Step 1.2: Ask Clarifying Questions

Ask 3-5 essential clarifying questions with lettered options. Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Target Users:** Who will use this?
- **Technical Constraints:** Any required tech stack, integrations, or platform requirements?

Format questions like this so users can respond "1A, 2C, 3B":

```
1. What is the primary goal?
   A. Option one
   B. Option two
   C. Option three
   D. Other: [please specify]
```

**WAIT for the user to answer before continuing.**

### Step 1.3: Generate the PRD

Based on answers, generate a structured PRD with these sections:

1. **Introduction/Overview** — Brief description and problem statement
2. **Goals** — Specific, measurable objectives
3. **User Stories** — Using format: "As a [user], I want [feature] so that [benefit]" with acceptance criteria
4. **Functional Requirements** — Numbered (FR-1, FR-2, ...), explicit and unambiguous
5. **Non-Goals** — What this will NOT include
6. **Design Considerations** — UI/UX requirements (if applicable)
7. **Technical Considerations** — Constraints, dependencies, integration points
8. **Success Metrics** — How success is measured
9. **Open Questions** — Remaining unknowns

Save to `tasks/prd-[feature-name].md` (kebab-case filename).

Announce: **"Phase 1 complete — PRD saved to `tasks/prd-[name].md`. Moving to Phase 2: Commit."**

---

## Phase 2: Commit PRD

Commit the PRD to git so it's tracked before spec generation.

1. Stage: `tasks/prd-*.md` (the newly created PRD file)
2. Commit message: `docs: add PRD for [feature-name]`
3. If commit fails (no git repo), warn but continue.

Announce: **"Phase 2 complete — PRD committed. Moving to Phase 3: Spec Generation."**

---

## Phase 3: Spec Generation

Convert the PRD into executable story specs. This follows the Ralph v2 spec conversion process.

### Step 3.1: Analyze the PRD

Read the PRD and identify:
- Natural epic boundaries from section structure
- Individual stories within each epic
- Dependencies between stories

### Step 3.2: Group into Epics and Stories

- Each epic gets a sequential number N (1, 2, 3, ...)
- Each story within an epic gets ID `N.M` (e.g., 1.1, 1.2, 2.1)
- Target 3-10 stories per epic
- Order epics by dependency: foundational work first (schema, config), then backend, then frontend, then polish

### Step 3.3: Confirm with User

Show the proposed breakdown:

```
Epic 1: [Name]
  1.1 — [Story title]
  1.2 — [Story title]

Epic 2: [Name]
  2.1 — [Story title]
  2.2 — [Story title]
  ...
```

**WAIT for the user to confirm or request changes.**

### Step 3.4: Create Spec Files

For each story, create `specs/epic-{N}/story-{N.M}-{slug}.md` with this format:

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

[1-2 sentences of additional context if needed.]

## Technical Context
[Brief description of the implementation approach, relevant architecture, or key technical decisions.]

## Acceptance Criteria

### AC1: [Criterion Name]
- **Given** [precondition]
- **When** [action]
- **Then** [expected result]

### AC2: [Criterion Name]
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

**Story sizing rule:** Each story must be completable in ONE Ralph iteration (one context window). If you can't describe the change in 2-3 sentences, split it.

**Path normalization rule (critical):**
- Every `Files to Create/Modify` path must be relative to the current project root.
- Never prepend the current project directory name.
- Example: when project root is `skills/oss-prep/`, use `SKILL.md`, not `skills/oss-prep/SKILL.md`.

**If 5+ stories:** Use parallel Task agents to write specs concurrently for speed. Generate a manifest first, spawn agents, then run a consistency review.

### Step 3.5: Populate stories.txt

Write `.ralph/stories.txt` with batch annotations:

```
# Source: tasks/prd-<name>.md
# Generated: <ISO timestamp>
# Stories: 1.1, 1.2, ..., N.M

# Ralph Story Queue
# Format: ID | Title

# [batch:1] — foundational / independent
1.1 | Story Title
1.2 | Story Title

# [batch:2] — depends on batch 1
2.1 | Story Title
```

### Step 3.6: Validate

Verify:
- Every story ID in `stories.txt` has a matching spec file
- No circular dependencies
- All spec files have valid YAML frontmatter
- Every `Files to Create/Modify` path is project-root-relative (no duplicated root prefix)
- `.ralph/stories.txt` has at least one active story line (`N.M | Title`)
- Report: "Created X specs across Y epics"

Announce: **"Phase 3 complete — Specs generated. Moving to Phase 4: Commit Specs."**

---

## Phase 4: Commit Specs

Commit all generated spec artifacts to git.

1. Stage:
   - `specs/` directory (all spec files)
   - `.ralph/stories.txt`
   - The PRD file (if frontmatter was updated)
2. Commit message: `ralph: add specs for [feature-name] (N stories across M epics)`
3. If commit fails, warn but continue.

Announce: **"Phase 4 complete — Specs committed. Moving to Phase 5: Premortem Review."**

---

## Phase 5: Premortem Review

Perform a structured premortem analysis on the generated specs and stories. The premortem imagines the project has **already failed** and works backward to identify what went wrong — catching issues before they happen.

### Step 5.1: Read All Specs

Read every spec file in `specs/` and the full `stories.txt`.

### Step 5.2: Analyze for Failure Modes

Systematically check each category. For each issue found, note the story ID, the problem, and the severity (critical / warning).

#### Category 1: Story Sizing
- Is any story too large for a single Claude context window?
- Does any story touch more than 5-6 files?
- Does any story require understanding complex existing code that won't fit in context?
- Would a junior developer struggle to implement this in one sitting?

#### Category 2: Dependency & Ordering
- Are there implicit dependencies not captured in `depends_on`?
- Could a story fail because it assumes files/functions created by a same-batch story?
- Are batch assignments correct — can all stories in the same batch truly run in parallel?
- Is there a story that should be earlier (e.g., shared types, config, or utilities used by later stories)?

#### Category 3: Acceptance Criteria Quality
- Are any criteria vague or untestable? ("works correctly", "handles errors properly")
- Are there missing edge cases that would cause Ralph to produce incomplete code?
- Do all stories with tests define what to test specifically?
- Do stories that create APIs define the contract (routes, params, response shape)?

#### Category 4: Missing Stories
- Is there a setup/scaffolding story that should exist but doesn't?
- Are there missing integration stories that wire components together?
- Is there a missing "configuration" or "environment setup" story?
- Do UI stories have corresponding API/backend stories they depend on?

#### Category 5: Technical Risks
- Does any story require external services or APIs not mentioned in Technical Context?
- Are there stories that modify shared state (database schema, global config) that could break parallel execution?
- Are there merge conflict risks between parallel stories that touch the same files?
- Does the plan assume libraries/frameworks are already installed without a setup story?

#### Category 6: Test Coverage Gaps
- Are there stories with no test definitions at all?
- Are there integration points between epics that have no integration tests?
- Are there error/edge cases in the PRD's functional requirements that no story covers?

### Step 5.3: Present Findings

Show the premortem report to the user, organized by severity:

```
## Premortem Report

### Critical Issues (must fix before running)
- [Story X.Y] Issue description — Recommended fix

### Warnings (should fix)
- [Story X.Y] Issue description — Recommended fix

### Observations (consider)
- [Story X.Y] Observation — Suggestion
```

If no issues are found, report: "Premortem clean — no issues detected."

**WAIT for the user to review. Ask: "Should I apply all recommended fixes, or would you like to adjust any?"**

### Step 5.4: Apply Fixes

Based on user approval, modify the spec files and stories.txt:

- **Oversized stories:** Split into smaller stories, update IDs and `depends_on` references, regenerate stories.txt entries
- **Missing dependencies:** Add `depends_on` entries to affected specs
- **Batch corrections:** Move stories to correct batches in stories.txt
- **Vague criteria:** Rewrite acceptance criteria with specific, testable conditions
- **Missing stories:** Create new spec files for gaps identified, add to stories.txt
- **Test gaps:** Add test definitions to specs that lack them
- **Ordering issues:** Reorder stories.txt to reflect correct execution order

After applying fixes, re-run the validation from Step 3.6 to ensure consistency.

Announce: **"Phase 5 complete — Premortem fixes applied. Moving to Phase 6: Commit Fixes."**

---

## Phase 6: Commit Fixes

Commit all premortem fixes to git.

1. Stage all modified files in `specs/` and `.ralph/stories.txt`
2. Commit message: `ralph: premortem fixes for [feature-name] (N issues resolved)`
3. If no fixes were needed, skip this phase.

Announce: **"Phase 6 complete — Fixes committed. Moving to Phase 7: Generate Run Script."**

---

## Phase 7: Generate Run Script

Create a `run-ralph.sh` script in the project root that launches Ralph's autonomous execution loop.

### Script Requirements

The script should:

1. Be executable (`chmod +x`)
2. Invoke the native Ralph runner only (`ralph run ...`) and never call `claude` directly
3. Include preflight checks: `ralph`, `jq`, `.ralph/config.json`, `.ralph/stories.txt`, and non-empty active queue
4. Validate `.ralph/config.json` spec pattern includes both placeholders: `{{epic}}` and `{{id}}`
5. Auto-select mode:
   - `sequential` when specs mostly target one file
   - `parallel` when targets are distributed
   - allow override via `RALPH_RUN_MODE=sequential|parallel|auto`
6. Accept optional flags to pass through to Ralph (e.g., `--no-dashboard`, `-t <timeout>`)
7. Print a summary before starting: story count, batch count, target-file count, selected mode

### Script Template

```bash
#!/usr/bin/env bash
# Run Ralph v2 autonomous implementation loop
# Generated by /ralph-pipeline-interactive on <date>
# PRD: tasks/prd-<name>.md
# Stories: <N> stories across <M> epics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Preflight checks
command -v ralph >/dev/null 2>&1 || { echo "Error: ralph not found on PATH. Run install.sh first."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Error: jq not found on PATH."; exit 1; }
[[ -f .ralph/config.json ]] || { echo "Error: .ralph/config.json not found."; exit 1; }
[[ -f .ralph/stories.txt ]] || { echo "Error: .ralph/stories.txt not found. Run spec generation first."; exit 1; }

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

Save to `run-ralph.sh` in the project root and make it executable.

### Step 7.2: Launch in iTerm2

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

Announce: **"Phase 7 complete — Ralph is now running in a new iTerm2 window (worktree: `feature-<slug>`)."**

---

## Pipeline Complete

After all phases, print the final summary:

```
Ralph v2 Pipeline Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Worktree:   .ralph/worktrees/feature-<slug>
Branch:     ralph/feature-<slug>
PRD:        tasks/prd-[name].md
Specs:      N stories across M epics
Premortem:  X issues found, Y fixed
Run script: ./run-ralph.sh
Execution:  Launched in iTerm2 window

Ralph is running autonomously in an isolated worktree.
Check the iTerm2 window for progress.

When complete, merge back to your main branch:
  cd <project-root>
  git merge ralph/feature-<slug>
  git worktree remove .ralph/worktrees/feature-<slug>
```

---

## Error Recovery

If any phase fails:

1. **Worktree creation fails:** Check for stale locks (`rm -f .git/index.lock`), prune worktrees (`git worktree prune`), and retry. If the branch already exists, ask the user if they want to reuse it or start fresh.
2. **PRD creation fails:** Ask user to clarify their feature description and retry Phase 1.
3. **Git commit fails:** Warn and continue — files are on disk. The user can commit manually.
4. **Spec generation fails:** Show what was generated, ask user if they want to continue with partial specs or retry.
5. **Premortem finds critical issues:** Do NOT skip Phase 5.4 — always fix critical issues before generating the run script.
6. **Run script creation fails:** Provide the script content inline so the user can copy it manually.

---

## Checklist

Before completing the pipeline:

- [ ] Worktree created and working context set
- [ ] PRD saved and committed (in worktree branch)
- [ ] All specs follow the standard format with YAML frontmatter
- [ ] stories.txt has correct batch annotations
- [ ] Premortem review completed (even if no issues found)
- [ ] All premortem fixes committed
- [ ] run-ralph.sh is executable and has correct worktree path
- [ ] Final summary printed with merge instructions
