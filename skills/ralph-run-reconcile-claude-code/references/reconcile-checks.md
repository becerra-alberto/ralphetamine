# Reconcile Checks

Run checks in this order and stop at the first high-risk blocker.

## 1. Orphaned Branch Scan

- List `ralph/story-*` branches.
- Count unmerged commits per branch versus `HEAD`.
- Mark a finding when commits exist and story is not merged.

Command pattern:

```bash
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/ralph/story-*); do
  echo "== $b =="
  git rev-list --count "HEAD..$b"
  git log -1 --format='%h %s' "$b"
done
```

## 2. Story Ledger Consistency

- Verify each queue ID has a matching spec file.
- Verify completed stories in `.ralph/state.json` align with spec status and merged state.
- Flag drift when any two sources disagree.

## 3. Failure Trail

- Parse recent lines of `progress.txt` for `FAIL`, `TIMEOUT`, `RETRY`, `CONFLICT`.
- Check `.ralph/logs/` and `ralph-run-terminal-logs/` for unresolved merge or runner failures.

## 4. Risk Rubric

- `high`: merge conflict, unclear root cause, multiple contradictory artifacts.
- `medium`: state/spec mismatch requiring code edits or selective reruns.
- `low`: deterministic reconcile, metadata alignment, queue cleanup.

## 5. Minimum Verification

After any execute mode run:

- Re-run `ralph reconcile` (expect clean/no orphaned work).
- Re-run configured validation commands.
- Re-check queue/state/spec consistency.
