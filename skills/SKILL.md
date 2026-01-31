---
name: ralph
description: "Convert a PRD into Ralph v2 story specs and queue. Reads a PRD file and generates specs/epic-{N}/story-{N.M}-{slug}.md files plus .ralph/stories.txt. Triggers on: /ralph, convert prd to specs, generate ralph specs, create story specs."
---

# Ralph v2 — PRD to Specs Converter

Converts a PRD into structured story spec files and a story queue that Ralph's autonomous loop can execute.

---

## The Job

Read a PRD from `tasks/prd-*.md`, decompose it into epics and stories, and generate:
1. Spec files at `specs/epic-{N}/story-{N.M}-{slug}.md`
2. A story queue at `.ralph/stories.txt`

---

## Step-by-Step Process

### 1. Find the PRD

Look for files matching `tasks/prd-*.md`. If multiple exist, ask the user which one to use. If none exist, ask the user to point to the PRD file or run `/prd` first.

### 2. Analyze the PRD

Read the PRD thoroughly and identify:
- Natural epic boundaries from section structure (e.g., "Database Setup", "API Layer", "UI Components")
- Individual stories within each epic
- Dependencies between stories

### 3. Group into Epics and Stories

- Each epic gets a sequential number N (1, 2, 3, ...)
- Each story within an epic gets ID `N.M` (e.g., 1.1, 1.2, 2.1)
- Target 3-10 stories per epic
- Order epics by dependency: foundational work first (schema, config), then backend, then frontend, then polish

### 4. Confirm with User

Before writing any files, show the proposed breakdown:

```
Epic 1: Project Setup
  1.1 — Initialize project structure
  1.2 — Configure database schema

Epic 2: Core API
  2.1 — Create CRUD endpoints
  2.2 — Add validation middleware
  ...
```

Ask the user to confirm or adjust the plan.

### 5. Create Spec Files

Count the total number of stories from the confirmed breakdown.

- **If fewer than 5 stories:** Use the sequential approach (Step 5-seq) below.
- **If 5 or more stories:** Use the parallel approach (Steps 5A → 5B → 5C) below.

---

#### Step 5-seq: Sequential Spec Creation (< 5 stories)

For each story, create `specs/epic-{N}/story-{N.M}-{slug}.md` using the **Spec File Format** defined below. Write each file one at a time, referencing the PRD and the confirmed breakdown directly.

After writing all specs, skip to Step 6.

---

#### Step 5A: Generate Story Manifest (≥ 5 stories)

Before writing any specs, generate a structured manifest at `.ralph/manifest.yml` that gives every parallel agent full visibility into the project:

```yaml
project:
  name: "<from PRD>"
  tech_stack: ["<language>", "<framework>", ...]
  key_directories:
    - path: "src/"
      purpose: "Source code"
    - path: "tests/"
      purpose: "Test files"

stories:
  - id: "1.1"
    epic: 1
    epic_name: "Project Setup"
    title: "Initialize project structure"
    slug: "init-project-structure"
    priority: critical
    estimation: small
    depends_on: []
    user_story: "As a developer, I want a scaffolded project so that..."
    technical_context: "Create directory layout, config files, install deps..."
    key_files:
      - path: "package.json"
        action: create
      - path: "tsconfig.json"
        action: create
    ac_summary:
      - "Project runs with npm start"
      - "TypeScript compiles without errors"
      - "Tests pass"

  - id: "1.2"
    # ... next story
```

**For large PRDs (50+ stories):** When constructing each agent's prompt in Step 5B, include full detail for stories in the same epic, and only `id`, `title`, and `key_files` for stories in other epics. The full manifest is still written to disk but the per-agent prompt is truncated to stay within context limits.

---

#### Step 5B: Parallel Spec Writers (≥ 5 stories)

For each story in the manifest, spawn a Task agent (`subagent_type: general-purpose`) in a **single message** so all agents run concurrently. Each agent receives:

1. **Full PRD content** (read from the PRD file)
2. **Complete manifest** from Step 5A (or truncated version for 50+ story PRDs)
3. **Its specific story assignment** (the story entry from the manifest)
4. **The Spec File Format** template (below)
5. **Consistency rules:**
   - Use file paths exactly as listed in the manifest `key_files` — do not invent alternate paths
   - Match project naming conventions from the PRD (e.g., kebab-case files, PascalCase components)
   - Do not duplicate scope from other stories — check the manifest's `ac_summary` for neighboring stories
   - Include 3-5 acceptance criteria; the final criterion must include validation (typecheck/tests pass)

Each agent writes exactly one file: `specs/epic-{N}/story-{N.M}-{slug}.md`

**Agent failure fallback:** If any parallel agent fails or returns an error, write that story's spec sequentially using the same prompt content. Do not re-run all agents.

---

#### Step 5C: Consistency Review (≥ 5 stories)

After all parallel writers finish, read every generated spec file and review them in a single pass. Check for:

1. **File path inconsistencies** — the same file referenced with different paths across stories (e.g., `src/db.ts` vs `src/database.ts`). Normalize to match the manifest.
2. **Dependency correctness** — a story modifies files created by another story but is missing that story in `depends_on`. Add the missing dependency.
3. **Scope overlap** — two stories implement the same acceptance criterion. Remove the duplicate from the lower-priority story.
4. **AC coverage** — every story has 3-5 criteria and the final criterion includes validation (typecheck/tests pass). Add missing validation criteria.
5. **Naming alignment** — file and test naming patterns are consistent across all specs (e.g., all test files follow `*.test.ts` or `*.spec.ts`, not a mix).

Fix issues in-place using the Edit tool. Report: `"Created X specs across Y epics (Z consistency issues auto-fixed)"`

**Circular dependencies:** If the review finds a dependency cycle, break it by removing the weaker dependency (the one between stories in different epics, or the one for a lower-priority story) and add a comment in the affected spec's Technical Context explaining the removed dependency.

---

#### Step 5D: Cleanup

Delete `.ralph/manifest.yml` — it was only needed during parallel generation.

---

### Spec File Format

Every spec file (`specs/epic-{N}/story-{N.M}-{slug}.md`) must use this exact format:

```markdown
---
id: "N.M"
epic: N
title: "Short Descriptive Title"
status: pending
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

### AC3: [Criterion Name]
- **Given** [precondition]
- **When** [action]
- **Then** [expected result]

## Test Definition

### Unit Tests
- [Test case description]
- [Another test case]

### Integration/E2E Tests (if applicable)
- [Test scenario]

## Files to Create/Modify
- `path/to/file` — [what changes] (create|modify)
- `path/to/another` — [what changes] (create|modify)
```

---

### 6. Populate stories.txt

Write `.ralph/stories.txt` with all stories in execution order, using batch annotations for stories that can run in parallel:

```
# Ralph Story Queue
# Format: ID | Title

# [batch:1] — foundational / independent
1.1 | Initialize Project Structure
1.2 | Configure Database Schema

# [batch:2] — depends on batch 1
2.1 | Create Core API Endpoints
2.2 | Add Input Validation

# [batch:3]
3.1 | Build Dashboard View
3.2 | Build Settings Page
```

### 7. Validate

After writing all files, verify:
- Every story ID in `stories.txt` has a matching spec file in `specs/`
- No circular dependencies in `depends_on` fields
- All spec files have valid YAML frontmatter
- Report the final count: "Created X specs across Y epics"

---

## Story Sizing Rules

**Each story must be completable in ONE Ralph iteration (one context window).**

Ralph spawns a fresh Claude instance per story with no memory of previous work. If a story is too big, it produces broken code.

### Right-sized stories:
- Add a database table and migration
- Create a single UI component
- Implement one API endpoint with validation
- Add a filter or search feature to an existing view

### Too big (split these):
- "Build the entire dashboard" → Split into: layout, each widget, data fetching, filters
- "Add authentication" → Split into: schema, middleware, login UI, session handling
- "Refactor the API" → Split into one story per endpoint or pattern

**Rule of thumb:** If you can't describe the change in 2-3 sentences, it's too big.

---

## Story Ordering

Stories execute in order. Earlier stories must not depend on later ones.

**Correct order:**
1. Project setup / configuration
2. Schema / database changes
3. Backend logic / API endpoints
4. UI components that consume the backend
5. Integration / polish / dashboard views

---

## Acceptance Criteria Format

Use Given-When-Then format for each criterion. Each story should have 2-5 acceptance criteria.

Always include as the final criterion:
- Typecheck passes (for TypeScript projects)
- Tests pass (for stories with testable logic)
- Visual verification (for UI stories): "Verify in browser using dev-browser skill"

---

## Priority and Estimation

**Priority** reflects business importance:
- `critical` — Blocks everything, must be done first
- `high` — Core functionality
- `medium` — Important but not blocking
- `low` — Nice to have, polish

**Estimation** reflects implementation effort:
- `small` — Simple change, < 50 lines, one file
- `medium` — Moderate change, multiple files, some logic
- `large` — Complex change, new patterns, many files

---

## Checklist Before Writing

Before generating specs, verify:

- [ ] Each story is completable in one iteration (small enough)
- [ ] Stories are ordered by dependency (setup → schema → backend → UI)
- [ ] Every story has 2-5 acceptance criteria in Given-When-Then format
- [ ] Acceptance criteria are specific and verifiable
- [ ] No story depends on a later story
- [ ] `depends_on` fields correctly reference prerequisite story IDs
- [ ] UI stories include visual verification criterion
- [ ] stories.txt batch annotations group independent stories together
