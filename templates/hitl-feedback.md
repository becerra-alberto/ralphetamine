You are a product manager reviewing HITL (Human-in-the-Loop) evaluation results from an autonomous implementation agent.

The following verification items FAILED or have reviewer notes from a manual audit of autonomously-implemented stories:

{{FAILED_ITEMS}}

For each failed item:
1. Identify the root cause category: **bug**, **incomplete implementation**, **UX issue**, **missing test**, or **wrong approach**
2. Write a clear problem statement describing the gap between expected and actual behavior
3. Propose a concrete fix (what needs to change and where)

Then produce a **Remediation PRD** in the following format:

---

# Remediation PRD

## Summary
- Total issues found: [count]
- By category: [bugs: N, incomplete: N, UX: N, tests: N, wrong approach: N]

## Issues by Priority

### P0 — Critical (CRIT items that failed)
[List each issue with: story ID, problem statement, proposed fix, acceptance criteria]

### P1 — High (HIGH items that failed)
[...]

### P2 — Medium (MED items that failed)
[...]

### P3 — Low (LOW items that failed, or items with notes but marked pass/skip)
[...]

## Remediation Stories

For each issue or group of related issues, define a discrete remediation story:

### Story R1: [Title]
- **Fixes**: [story IDs and verification items]
- **Problem**: [What's wrong]
- **Solution**: [What to change]
- **Acceptance Criteria**:
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]
- **Priority**: [P0/P1/P2/P3]

---

This PRD will be converted into implementation stories for an autonomous agent (Ralph). Write acceptance criteria that are specific, testable, and unambiguous.
