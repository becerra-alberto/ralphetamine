# Feature Discovery Analysis

You are a senior engineering analyst. Your task is to analyze the current state of the **{{PROJECT_NAME}}** project and identify the most valuable next development priorities.

## Context

**Project:** {{PROJECT_NAME}}

**Completed Stories:**
```
{{COMPLETED_STORIES}}
```

**Recent Git Activity (last 20 commits):**
```
{{RECENT_COMMITS}}
```

**TODO/FIXME Items in Codebase:**
```
{{TODO_FIXME}}
```

**README / Project Goals:**
```
{{README}}
```

**Last E2E Test Results:**
```
{{E2E_RESULTS}}
```

**Accumulated Learnings:**
```
{{LEARNINGS}}
```

## Your Task

1. **Use the Read tool** to explore the codebase and understand:
   - Current implementation state vs. stated goals in README
   - Patterns from learnings that suggest recurring gaps
   - Test failures that point to missing functionality
   - TODO/FIXME items that represent real technical debt

2. **Identify actionable gaps** — prioritize by impact:
   - Test failures from E2E results → likely FR-1 priority
   - TODO/FIXME items from active code paths → medium priority
   - README goals not yet implemented → medium priority
   - Patterns from learnings suggesting systemic improvements → lower priority

3. **Generate a focused PRD** with 5–15 stories:
   - Each story should be independently implementable by Claude
   - Stories should be ordered by dependency (blockers first)
   - Use the format: `## Story N.M: <title>` with acceptance criteria

4. **Save the PRD** to: `tasks/prd-discovery-<slug>.md`
   - `<slug>` should be a short kebab-case identifier (e.g., `prd-discovery-test-coverage`)
   - Create the `tasks/` directory if it doesn't exist

5. **Emit a completion signal:**
   - If you generated a PRD: `<ralph>DISCOVERY_DONE: tasks/prd-discovery-<slug>.md</ralph>`
   - If nothing actionable was found: `<ralph>DISCOVERY_SKIP: reason</ralph>`

## Important Constraints

- Only generate stories for genuinely actionable improvements — do not pad with vague enhancements
- Do not repeat stories that are already in `completed_stories`
- Be specific about acceptance criteria — each story should be completable in a single Claude session
- If E2E tests are failing, prioritize fixing those over new features
