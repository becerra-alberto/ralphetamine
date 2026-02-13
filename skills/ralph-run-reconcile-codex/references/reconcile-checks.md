# Reconcile Checks

Run checks in order and treat high-severity blockers as stop conditions.

## 1. Unmerged Story Branches

- Enumerate `ralph/story-*` branches.
- Compute commits ahead of `HEAD`.
- Mark each branch as `clean merge` or `conflict risk`.

Command pattern:

```bash
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/ralph/story-*); do
  echo "== $b =="
  git rev-list --count "HEAD..$b"
  git log -1 --format='%h %s' "$b"
  git merge --no-commit --no-ff "$b" >/dev/null 2>&1 && echo "clean" || echo "conflict"
  git merge --abort >/dev/null 2>&1 || true
done
```

## 2. Queue and State Drift

- Ensure every queue ID in `.ralph/stories.txt` has a spec file.
- Compare queue/spec/status with `.ralph/state.json` (`completed_stories`, `merged_stories`, `retry_counts`).
- Flag mismatches with concrete evidence.

## 3. Failure Signals

- Read recent `progress.txt` events for `FAIL`, `TIMEOUT`, `RETRY`, `CONFLICT`.
- Inspect `.ralph/logs/` and `ralph-run-terminal-logs/` for unresolved merge/retry loops.

## 4. Severity Rules

- `high`: merge conflict, contradictory state artifacts, uncertain remediation.
- `medium`: selective reruns, targeted state/spec edits, partial run corruption.
- `low`: deterministic reconcile, metadata cleanup, orphan merge with no conflicts.

## 5. Verification Gate

After execute mode:

- run `ralph reconcile` and confirm no remaining orphan findings.
- run configured validation commands.
- confirm queue/state/spec alignment.
