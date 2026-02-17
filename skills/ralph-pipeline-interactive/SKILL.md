---
name: ralph-pipeline-interactive
description: "Run the complete Ralph v2 pipeline interactively: PRD creation, multi-perspective Review Party gates, spec generation, premortem review, and run script generation. Pauses for user input at key decision points. Triggers on: /ralph-pipeline-interactive, interactive ralph pipeline, ralph guided pipeline."
---

# Ralph v2 — Interactive Pipeline

Run the complete Ralph v2 pipeline from idea to execution-ready project in one session. Each phase builds on the previous, with user interaction at key decision points.

**This orchestrates the entire Ralph v2 workflow interactively.** It chains worktree isolation, PRD creation, spec generation, premortem review, and run script generation into a single guided session. For the fully autonomous version, use `/ralph-v2:pipeline-full-auto`.

## Core Directive: Ralph Runtime Compatibility

1. **Generate artifacts for `ralph run` only.** Do not generate custom per-story loops that call `claude` directly.
2. **Do not treat model prose as completion.** Story completion is determined by Ralph's state/signal flow, not by freeform "done" text.
3. **Normalize file paths to the worktree project root.** All file paths are relative to the worktree working directory, not the original repo.
4. **Queue must be runnable before Phase 5.** `.ralph/stories.txt` must include at least one active `N.M | Title` entry.

---

## Review Party Protocol

Three **Review Party** gates are embedded in the pipeline — multi-perspective evaluations where 3 specialist voices assess an artifact. The term "party" comes from BMAD's collaborative multi-agent format.

### How It Works

Since the pipeline runs in a single Claude conversation, personas are **simulated in-prompt** — adopt each voice in sequence, then synthesize. Each persona gives 3-5 bullet points + a 1-sentence verdict (~300 words total per gate). This keeps reviews scannable and fast.

### Skip Mechanism

Each gate independently asks **"Ready for the [Name] Party review, or skip?"** before running. The user can skip any individual gate without affecting the others. If skipped, proceed immediately to the next step.

### Output Files

Gate reports are persisted to `.ralph/reviews/`:
- `vision-party.md` — Gate 1 (pre-PRD)
- `requirements-party.md` — Gate 2 (post-PRD)
- `execution-party.md` — Gate 3 (post-specs)

Create the `.ralph/reviews/` directory if it doesn't exist.

---

## Pipeline Overview

| Phase | What Happens | User Input? |
|-------|-------------|-------------|
| 0. Worktree | Create an isolated git worktree for the feature | Yes — confirm feature slug |
| 1. PRD | Get feature description + clarifying questions | Yes — clarifying questions |
| 1b. Vision Party | Multi-perspective idea evaluation (Review Gate 1) | Yes — review findings |
| 1c. Generate PRD | Generate the PRD from validated idea | No |
| 1d. Requirements Party | Multi-perspective PRD evaluation (Review Gate 2) | Yes — review findings |
| 2. Commit PRD | Commit the PRD to git | No |
| 3. Specs | Convert PRD into epics, stories, batch queue | Yes — confirm breakdown |
| 4. Commit Specs | Commit specs and stories.txt to git | No |
| 5. Execution Coherence Party | Multi-perspective spec evaluation (Review Gate 3) | Yes — review findings |
| 6. Premortem | Analyze plan for failure modes, fix issues | Yes — review findings |
| 7. Commit Fixes | Commit all review fixes to git | No |
| 8. Run Script | Generate `run-ralph.sh` for autonomous execution | No |

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

**All subsequent phases (1-8) operate inside the worktree directory.** When using the Bash tool, prefix commands with `cd "$WORKTREE_DIR" &&` or use absolute paths within the worktree. When using Read/Write/Edit tools, use the absolute worktree path.

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

### Step 1.3: Vision Party (Review Gate 1)

Ask the user: **"Ready for the Vision Party review, or skip?"**

**WAIT for the user to respond.** If they say "skip", proceed directly to Step 1.4.

If proceeding, evaluate the idea from three specialist perspectives before locking it into a PRD:

| Voice | Focus | Key Questions |
|-------|-------|---------------|
| **Visionary Analyst** | Problem-space depth | Is this solving the root problem or a symptom? What's the 10x version? What would make this transformative rather than incremental? |
| **User Advocate** | Human-centered design | Who benefits most and how deeply? What's the emotional journey? What friction points in the user's current workflow are we missing? |
| **Innovation Strategist** | Opportunity space | What adjacent capabilities does this unlock? What's the bleeding-edge approach? What would a competitor ship that makes this obsolete? |

Generate the report in this format and save to `.ralph/reviews/vision-party.md`:

```
## Vision Party Review

### Visionary Analyst
- [Bullet 1: problem depth assessment]
- [Bullet 2: leverage point identified]
- [Bullet 3: transformative potential or reframing]
Verdict: [One sentence summary]

### User Advocate
- [Bullet 1: who benefits and how deeply]
- [Bullet 2: friction/empathy gap identified]
- [Bullet 3: experience opportunity]
Verdict: [One sentence summary]

### Innovation Strategist
- [Bullet 1: adjacent capability unlocked]
- [Bullet 2: bleeding-edge approach or competitive angle]
- [Bullet 3: what would make this obsolete]
Verdict: [One sentence summary]

### Tensions & Synthesis
- [Where voices disagree and what it reveals]

### Recommended Adjustments
- [Specific, actionable changes to incorporate before PRD generation]
```

Present the report to the user. Ask: **"Would you like to incorporate any of these insights before I generate the PRD, or proceed as-is?"**

**WAIT for the user to respond.** If they request changes, note them for PRD generation. Then continue to Step 1.4.

### Step 1.4: Generate the PRD

Based on answers (and any Vision Party insights incorporated), generate a structured PRD with these sections:

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

### Step 1.5: Requirements Party (Review Gate 2)

Ask the user: **"Ready for the Requirements Party review, or skip?"**

**WAIT for the user to respond.** If they say "skip", proceed directly to Phase 2.

If proceeding, evaluate the PRD from three specialist perspectives:

| Voice | Focus | Key Questions |
|-------|-------|---------------|
| **Product Strategist** | Requirements coherence | Do the functional requirements fully cover the goals? Are there contradictions? Is scope appropriate — not too narrow, not bloated? Do success metrics actually measure what matters? |
| **Experience Designer** | User story quality | Are user stories genuinely user-centric or just developer tasks in disguise? Does the UX flow feel natural? Are edge-case user journeys covered? Is there an emotional design thread? |
| **Technical Architect** | Feasibility & design | Are there implicit technical constraints the PRD doesn't acknowledge? Is the design consideration section realistic? Are there architectural decisions being deferred that will bite during implementation? |

Generate the report in this format and save to `.ralph/reviews/requirements-party.md`:

```
## Requirements Party Review

### Product Strategist
- [Bullet 1: goal-requirement alignment check]
- [Bullet 2: scope calibration — too narrow or bloated?]
- [Bullet 3: success metrics assessment]
Verdict: [One sentence summary]

### Experience Designer
- [Bullet 1: user story authenticity — user-centric or developer tasks in disguise?]
- [Bullet 2: UX flow coherence]
- [Bullet 3: edge-case journeys or empathy gaps]
Verdict: [One sentence summary]

### Technical Architect
- [Bullet 1: implicit constraints not acknowledged]
- [Bullet 2: feasibility of design considerations]
- [Bullet 3: deferred decisions that will bite later]
Verdict: [One sentence summary]

### Cross-Cutting Concerns
- [Tensions between voices — where business needs conflict with technical reality or UX]

### Recommended PRD Revisions
- [Specific revisions to apply to the PRD before committing]
```

Present the report to the user. Ask: **"Should I apply these revisions to the PRD, adjust specific items, or commit as-is?"**

**WAIT for the user to respond.** If revisions are accepted, edit the PRD file in-place, then continue.

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

Announce: **"Phase 4 complete — Specs committed. Moving to Phase 5: Execution Coherence Review."**

---

## Phase 5: Execution Coherence Party (Review Gate 3)

Evaluate whether the story breakdown actually serves the vision. This is **strategic** evaluation — the premortem that follows in Phase 6 is **tactical**.

Ask the user: **"Ready for the Execution Coherence Party review, or skip?"**

**WAIT for the user to respond.** If they say "skip", proceed directly to Phase 6.

If proceeding, evaluate the specs from three specialist perspectives:

| Voice | Focus | Key Questions |
|-------|-------|---------------|
| **Systems Thinker** | Holistic coherence | Do the stories compose into the intended whole, or has decomposition lost the narrative? Are there emergent behaviors from story interactions that nobody planned for? Is there a "golden thread" from vision → PRD → specs? |
| **Developer Experience Advocate** | Implementation quality | Will a developer (or Claude) reading each spec understand *why*, not just *what*? Is there enough context to make good judgment calls? Are the stories enjoyable to implement or drudgework? |
| **Quality Strategist** | Acceptance criteria & value | Do the acceptance criteria prove that value was delivered, or just that code was written? Are we testing behavior or implementation details? Would passing all tests mean a user would actually be satisfied? |

Generate the report in this format and save to `.ralph/reviews/execution-party.md`:

```
## Execution Coherence Party Review

### Systems Thinker
- [Bullet 1: do stories compose into the intended whole?]
- [Bullet 2: emergent behaviors from story interactions]
- [Bullet 3: golden thread — vision → PRD → specs alignment]
Verdict: [One sentence summary]

### Developer Experience Advocate
- [Bullet 1: spec clarity — does each spec explain *why*, not just *what*?]
- [Bullet 2: context sufficiency for good judgment calls]
- [Bullet 3: implementation ergonomics — enjoyable or drudgework?]
Verdict: [One sentence summary]

### Quality Strategist
- [Bullet 1: do ACs prove value delivered, or just code written?]
- [Bullet 2: testing behavior vs implementation details]
- [Bullet 3: would passing all tests mean a user is satisfied?]
Verdict: [One sentence summary]

### Integration Concerns
- [Gaps between stories where value falls through the cracks]

### Recommended Spec Adjustments
- [Specific adjustments before the tactical premortem runs]
```

Present the report to the user. Ask: **"Should I apply these adjustments, modify specific items, or proceed to the premortem?"**

**WAIT for the user to respond.** If adjustments are accepted, edit spec files and stories.txt, re-run validation (Step 3.6 logic), recommit specs (`ralph: execution review adjustments for [feature-name]`), then continue.

Announce: **"Phase 5 complete — Execution coherence review done. Moving to Phase 6: Premortem Review."**

---

## Phase 6: Premortem Review

Perform a structured premortem analysis on the generated specs and stories. The premortem imagines the project has **already failed** and works backward to identify what went wrong — catching issues before they happen.

**Note:** This is the **tactical** complement to Phase 5's strategic review. Phase 5 asked "are we building the right thing the right way?" — this phase asks "will the build actually work?"

### Step 6.1: Read All Specs

Read every spec file in `specs/` and the full `stories.txt`.

### Step 6.2: Analyze for Failure Modes

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

### Step 6.3: Present Findings

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

### Step 6.4: Apply Fixes

Based on user approval, modify the spec files and stories.txt:

- **Oversized stories:** Split into smaller stories, update IDs and `depends_on` references, regenerate stories.txt entries
- **Missing dependencies:** Add `depends_on` entries to affected specs
- **Batch corrections:** Move stories to correct batches in stories.txt
- **Vague criteria:** Rewrite acceptance criteria with specific, testable conditions
- **Missing stories:** Create new spec files for gaps identified, add to stories.txt
- **Test gaps:** Add test definitions to specs that lack them
- **Ordering issues:** Reorder stories.txt to reflect correct execution order

After applying fixes, re-run the validation from Step 3.6 to ensure consistency.

Announce: **"Phase 6 complete — Premortem fixes applied. Moving to Phase 7: Commit Fixes."**

---

## Phase 7: Commit Fixes

Commit all review and premortem fixes to git.

1. Stage all modified files in `specs/`, `.ralph/stories.txt`, and `.ralph/reviews/`
2. Commit message: `ralph: premortem fixes for [feature-name] (N issues resolved)`
3. If no fixes were needed, skip this phase.

Announce: **"Phase 7 complete — Fixes committed. Moving to Phase 8: Generate Run Script."**

---

## Phase 8: Generate Run Script

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

# Prevent duplicate loops for the same project.
if [[ -f .ralph/.lock ]]; then
    lock_pid="$(cat .ralph/.lock 2>/dev/null || true)"
    if [[ -n "${lock_pid:-}" ]] && kill -0 "$lock_pid" 2>/dev/null; then
        echo "Ralph appears to already be running for this project (PID $lock_pid)."
        echo "Skipping duplicate launch."
        exit 0
    fi
fi

# Run Ralph
if [[ "$run_mode" == "parallel" ]]; then
    ralph run --parallel --no-interactive "$@"
else
    ralph run --no-interactive "$@"
fi
```

Save to `run-ralph.sh` in the project root and make it executable.

### Step 8.2: Launch in iTerm2

After generating the script, **automatically launch it in a new iTerm2 window** so Ralph runs in its own dedicated terminal session inside the worktree.

Use the Bash tool to run this guarded launcher (checks for an active `.ralph/.lock` first, then launches):

```bash
PROJECT_DIR="$(pwd)"
lock_path="$PROJECT_DIR/.ralph/.lock"
if [[ -f "$lock_path" ]]; then
    lock_pid="$(cat "$lock_path" 2>/dev/null || true)"
fi

if [[ -n "${lock_pid:-}" ]] && kill -0 "$lock_pid" 2>/dev/null; then
    echo "Ralph already running for this project (PID $lock_pid). Skipping terminal launch."
else
    if ! osascript -e '
tell application "iTerm2"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "cd \"'"$WORKTREE_DIR"'\" && ./run-ralph.sh"
    end tell
end tell
'; then
        open -a Terminal.app "$PROJECT_DIR/run-ralph.sh"
    fi
fi
```

Where `$WORKTREE_DIR` is the absolute path to the worktree directory (resolved in Phase 0).

**Fallback:** If iTerm2 is not installed or the AppleScript fails, fall back to:
```bash
cd "$WORKTREE_DIR" && open -a Terminal.app "./run-ralph.sh"
```
If both fail, tell the user: "Could not auto-launch. Run `./run-ralph.sh` from the worktree directory manually."

Announce: **"Phase 8 complete — Ralph is now running in a new iTerm2 window (worktree: `feature-<slug>`)."**

---

## Pipeline Complete

After all phases, print the final summary:

```
Ralph v2 Pipeline Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Worktree:   .ralph/worktrees/feature-<slug>
Branch:     ralph/feature-<slug>
PRD:        tasks/prd-[name].md
Reviews:    .ralph/reviews/ (vision, requirements, execution)
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

→ Then update the changelog:
  # Update CHANGELOG.md and bump version
```

---

## Error Recovery

If any phase fails:

1. **Worktree creation fails:** Check for stale locks (`rm -f .git/index.lock`), prune worktrees (`git worktree prune`), and retry. If the branch already exists, ask the user if they want to reuse it or start fresh.
2. **PRD creation fails:** Ask user to clarify their feature description and retry Phase 1.
3. **Git commit fails:** Warn and continue — files are on disk. The user can commit manually.
4. **Spec generation fails:** Show what was generated, ask user if they want to continue with partial specs or retry.
5. **Review Party gate fails:** Skip the gate and continue — reviews are optional enhancements, not blockers.
6. **Premortem finds critical issues:** Do NOT skip Phase 6.4 — always fix critical issues before generating the run script.
7. **Run script creation fails:** Provide the script content inline so the user can copy it manually.

---

## Checklist

Before completing the pipeline:

- [ ] Worktree created and working context set
- [ ] PRD saved and committed (in worktree branch)
- [ ] Review Party reports saved to `.ralph/reviews/` (for gates not skipped)
- [ ] All specs follow the standard format with YAML frontmatter
- [ ] stories.txt has correct batch annotations
- [ ] Execution coherence review completed or explicitly skipped
- [ ] Premortem review completed (even if no issues found)
- [ ] All review and premortem fixes committed
- [ ] run-ralph.sh is executable and has correct worktree path
- [ ] Final summary printed with merge instructions
