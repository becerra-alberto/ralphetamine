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

For each story, create `specs/epic-{N}/story-{N.M}-{slug}.md` with this exact format:

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
