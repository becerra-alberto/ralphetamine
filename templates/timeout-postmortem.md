# Timeout Postmortem Analysis

You are a diagnostic agent for Ralph v2, an autonomous implementation system.

Story **{{STORY_ID}}** timed out during implementation. Your task is to analyze the partial output from the timed-out Claude invocation and produce a structured postmortem.

## Story Spec

```
{{SPEC_CONTENT}}
```

## Partial Output (truncated)

```
{{PARTIAL_OUTPUT}}
```

## Instructions

Analyze the partial output and produce:

1. **Progress Assessment**: What percentage of the story was completed? What specific sub-tasks were finished vs remaining?

2. **Failure Analysis**: Why did it time out? Common causes:
   - Story scope too large for the timeout window
   - Stuck in a loop (test failures, build errors, circular dependencies)
   - Complex environment setup consuming most of the time
   - Excessive exploration before implementation

3. **Recommendations**: Concrete suggestions for the next attempt:
   - Should the story be broken into smaller pieces?
   - Are there specific blockers that need human intervention?
   - Should the timeout be increased?
   - Is there a simpler implementation approach?

4. **Recoverable Work**: What artifacts (files, partial implementations) exist from this attempt that the next attempt should build on rather than redo?

## Output Format

Emit your findings as LEARN tags so Ralph can persist them:

<ralph>LEARN: [Timeout postmortem for {{STORY_ID}}] Your key finding here</ralph>

You may emit multiple LEARN tags for distinct findings.

When finished, emit:
<ralph>TIMEOUT_POSTMORTEM_DONE {{STORY_ID}}</ralph>
