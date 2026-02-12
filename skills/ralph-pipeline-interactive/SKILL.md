---
name: ralph-pipeline-interactive
description: "Run the complete Ralph v2 pipeline interactively: PRD creation, spec generation, premortem review, and run script generation. Pauses for user input at key decision points. Triggers on: /ralph-pipeline-interactive, interactive ralph pipeline, ralph guided pipeline."
---

# Ralph v2 — Full Pipeline

Run the complete Ralph v2 pipeline from idea to execution-ready project in one session. Each phase builds on the previous, with user interaction at key decision points.

---

## Pipeline Overview

| Phase | What Happens | User Input? |
|-------|-------------|-------------|
| 1. PRD | Generate a Product Requirements Document | Yes — clarifying questions |
| 2. Commit PRD | Commit the PRD to git | No |
| 3. Specs | Convert PRD into epics, stories, batch queue | Yes — confirm breakdown |
| 4. Commit Specs | Commit specs and stories.txt to git | No |
| 5. Premortem | Analyze plan for failure modes, fix issues | Yes — review findings |
| 6. Commit Fixes | Commit premortem fixes to git | No |
| 7. Run Script | Generate `run-ralph.sh` for autonomous execution | No |

**Important:** Complete each phase fully before moving to the next. Announce each phase transition clearly so the user knows where they are in the pipeline.

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
2. Run `ralph run --parallel` with appropriate flags
3. Include a preamble that checks prerequisites (ralph on PATH, .ralph/stories.txt exists, git is clean)
4. Accept optional flags to pass through to ralph (e.g., `--no-dashboard`, `-t <timeout>`)
5. Print a summary before starting: number of stories, number of batches, estimated parallel runs

### Script Template

```bash
#!/usr/bin/env bash
# Run Ralph v2 autonomous implementation loop
# Generated by /ralph-pipeline on <date>
# PRD: tasks/prd-<name>.md
# Stories: <N> stories across <M> epics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Preflight checks
command -v ralph >/dev/null 2>&1 || { echo "Error: ralph not found on PATH. Run install.sh first."; exit 1; }
[[ -f .ralph/stories.txt ]] || { echo "Error: .ralph/stories.txt not found. Run /ralph-pipeline first."; exit 1; }

# Count stories and batches
total_stories=$(grep -c '^[0-9]' .ralph/stories.txt || true)
total_batches=$(grep -c '^\# \[batch:' .ralph/stories.txt || true)

echo "Ralph v2 — Autonomous Implementation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Stories: ${total_stories}"
echo "Batches: ${total_batches}"
echo "Mode:    parallel"
echo ""
echo "Starting in 3 seconds... (Ctrl+C to cancel)"
sleep 3

# Run Ralph
ralph run --parallel --no-interactive "$@"
```

Save to `run-ralph.sh` in the project root and make it executable.

### Step 7.2: Launch in iTerm2

After generating the script, **automatically launch it in a new iTerm2 window** so Ralph runs in its own dedicated terminal session, separate from the Claude Code conversation.

Use the Bash tool to run this AppleScript via `osascript`:

```bash
osascript -e '
tell application "iTerm2"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "cd \"'"$PROJECT_DIR"'\" && ./run-ralph.sh"
    end tell
end tell
'
```

Where `$PROJECT_DIR` is the absolute path to the current project root (resolve it via `pwd` before the osascript call).

**Fallback:** If iTerm2 is not installed or the AppleScript fails, fall back to:
```bash
open -a Terminal.app "$(pwd)/run-ralph.sh"
```
If both fail, tell the user: "Could not auto-launch. Run `./run-ralph.sh` manually."

Announce: **"Phase 7 complete — Ralph is now running in a new iTerm2 window."**

---

## Pipeline Complete

After all phases, print the final summary:

```
Ralph v2 Pipeline Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRD:        tasks/prd-[name].md
Specs:      N stories across M epics
Premortem:  X issues found, Y fixed
Run script: ./run-ralph.sh
Execution:  Launched in iTerm2 window

Ralph is running autonomously. Check the iTerm2 window for progress.
```

---

## Error Recovery

If any phase fails:

1. **PRD creation fails:** Ask user to clarify their feature description and retry Phase 1.
2. **Git commit fails:** Warn and continue — files are on disk. The user can commit manually.
3. **Spec generation fails:** Show what was generated, ask user if they want to continue with partial specs or retry.
4. **Premortem finds critical issues:** Do NOT skip Phase 5.4 — always fix critical issues before generating the run script.
5. **Run script creation fails:** Provide the script content inline so the user can copy it manually.

---

## Checklist

Before completing the pipeline:

- [ ] PRD saved and committed
- [ ] All specs follow the standard format with YAML frontmatter
- [ ] stories.txt has correct batch annotations
- [ ] Premortem review completed (even if no issues found)
- [ ] All premortem fixes committed
- [ ] run-ralph.sh is executable and has correct project path
- [ ] Final summary printed with next steps
