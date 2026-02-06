# Post-Mortem: Ralph Parallel Mode — Silent Story Failure

**Date:** 2026-02-06
**Affected Project:** Ralph-Pure-Stacks-ralph-parallel-trial (Stackz security remediation)
**Ralph Version:** v2 (ralph-v2 branch)

---

## Plain English Summary

Ralph was running in parallel mode for the first time on a real project. The first story (19.1) ran sequentially and worked perfectly. Then 8 stories launched in parallel — Claude actually completed all 7 of them successfully, making proper commits in each isolated worktree. But Ralph didn't notice.

The problem: Ralph captures Claude's text output to check for a "DONE" signal. In parallel mode, this output was being written to files, but those files ended up empty — 0 bytes. Without the DONE signal, Ralph assumed all 7 stories failed. It then tried to clean up, but the cleanup also failed silently. When it moved on to the next batch of stories, it got stuck trying to create a new git worktree (the `git worktree add` command hung forever). The whole Ralph process has been frozen since.

**The irony:** The work is done. All 7 branches have proper commits. They just need to be merged and marked as complete. Ralph's accounting is the only thing that broke.

**What needs to happen:**
1. Kill the stuck Ralph instance
2. Manually merge the 7 completed branches and update state
3. Fix the output capture bug so this doesn't happen again
4. Make the worktree cleanup and creation more resilient

---

## Technical Details

### Environment

- **Command:** `ralph run --parallel -v`
- **Project:** Ralph-Pure-Stacks-ralph-parallel-trial (git worktree)
- **Branch:** ralph-parallel-trial
- **Config:** max_concurrent=8, stagger=3s, timeout=1800s
- **Claude flags:** `--print --dangerously-skip-permissions`
- **Stories queue:** 17 stories across batches 1-4

### Timeline of Events

| Time | Event |
|------|-------|
| 10:36:19 | Ralph starts, displays dashboard (with display bug: "116 / 17 stories") |
| 10:36:50 | Story 19.1 starts (batch 1, sequential) |
| 10:46:18 | Story 19.1 completes — DONE signal captured, state updated, 1775 bytes output |
| 10:46:19 | Batch 2 begins: 8 stories to run in parallel |
| 10:46:19–10:46:36 | Worktrees created for 19.2, 19.3, 21.1, 21.2, 21.3, 23.1, 23.2, 23.4 |
| 10:46:20–10:46:36 | Claude processes spawned (PIDs 75999, 76524, 77088, 77669, etc.) |
| 10:47–11:15 | Claude processes run in worktrees, making commits |
| ~11:15 | All Claude processes exit — wait loop processes results |
| ~11:15 | **All 7 output files are 0 bytes** — all stories marked as "failed" |
| ~11:15 | Merge/cleanup runs — cleanup fails silently, worktrees persist |
| ~12:28 | Batch 3 starts, attempts to create worktree for story-19.4 |
| 12:42 | `git worktree add` for story-19.4 hangs indefinitely (PID 9232) |
| 12:48+ | Ralph parent process (PID 15857) stuck, no progress |

### Root Cause: Empty Output Files

**Sequential runner (verbose, works):**
```bash
# runner.sh:151-152
$timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
    < /dev/null 2>&1 | tee "$output_file" || exit_code=$?
```
Uses `| tee` (pipe-based capture) → captured 1775 bytes for story 19.1.

**Parallel runner (broken):**
```bash
# parallel.sh:220-224
(
    cd "$worktree_dir"
    $timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
        < /dev/null > "$output_file" 2>&1
) &
```
Uses `> "$output_file"` (direct file redirect in background subshell) → 0 bytes for all 7 stories.

**Why:** The Claude CLI's `--print` mode appears to not flush output to direct file redirects in background subshells. When stdout is a pipe (as with `| tee`), output is captured correctly. When stdout is a regular file in a background process group, the CLI either skips output or buffers it without flushing.

**Evidence:**
- All 7 batch 2 output files: exactly 0 bytes (created at 10:46, never written to)
- All 7 batch 2 branches: have proper `feat(story-X.X)` commits with real code changes
- Sequential story 19.1: `last-claude-output.txt` has 1775 bytes with DONE signal

### Secondary Issue: Stale Worktree Blocking

After batch 2 "failed," the cleanup code ran but didn't fully remove worktrees:
```bash
# parallel.sh:358-366
for story in "${_PARALLEL_FAILED[@]}"; do
    git worktree remove "$worktree_dir" --force 2>/dev/null || true
    git branch -D "$branch_name" 2>/dev/null || true
done
```

The `|| true` swallowed errors. Worktrees and branches persisted. When batch 3 started, `git worktree add` for story-19.4 hung because the branch already existed from the failed cleanup. Two worktrees (19.4, 23.4) showed as "locked" in `git worktree list`.

### Tertiary Issue: Display Count Bug

Dashboard showed "116 / 17 stories (17 remaining)" because:
- `state.json` has 120 entries in `completed_stories` (119 from prior epics + 19.1)
- `stories.txt` has 17 entries (current security remediation queue)
- The display uses total completed count without filtering to current queue

### System State at Time of Diagnosis

| Component | State |
|-----------|-------|
| Ralph parent (PID 15857) | Running, blocked by hung child |
| `git worktree add` (PID 9232) | Hung for 8+ minutes on story-19.4 |
| Batch 2 Claude PIDs (75999, 76524, 77088, 77669) | All exited |
| Output files (7 total) | All 0 bytes |
| Batch 2 branches (ralph/story-19.2 through 23.2) | All have commits |
| Batch 2 worktrees | Still exist on disk |
| story-19.4, story-23.4 worktrees | Created, locked, no new commits |
| `state.json` | Only 19.1 from this run |
| `.pids-15857/` directory | Empty (PID files read and deleted during wait loop) |

### Verified Branch Commits

```
ralph/story-19.2 → 5431690 feat(story-19.2): Set Explicit Content Security Policy
ralph/story-19.3 → 20994e8 feat(story-19.3): Update Bundle Identifier
ralph/story-21.1 → c4bef51 feat(story-21.1): Zeroize Vault In-Memory Secrets on Lock
ralph/story-21.2 → da7fa0d feat(story-21.2): Remove Debug and Add Zeroize to API Clients
ralph/story-21.3 → 623efc0 feat(story-21.3): Enforce File Permissions on Vault Files
ralph/story-23.1 → ae826c1 feat(story-23.1): Sanitize VaultError Messages for Frontend
ralph/story-23.2 → a6d4bc8 feat(story-23.2): Sanitize sync_history Error Messages
```

All branched from `84c3b3f feat(story-19.1): Remove Raw SQL IPC Commands`.

---

## Required Fixes

### Fix 1: Output Capture (Critical)

**File:** `lib/parallel.sh:220-224`

Use pipe-based capture (`| cat >`) instead of direct file redirect to match the working sequential pattern:

```bash
# Before (broken):
$timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
    < /dev/null > "$output_file" 2>&1

# After (fixed):
$timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
    < /dev/null 2>&1 | cat > "$output_file"
```

### Fix 2: Worktree Cleanup Robustness

**File:** `lib/parallel.sh:348-370`

Add `git worktree unlock` before removal and `rm -rf` as fallback. Add `git worktree prune` at the end.

### Fix 3: Worktree Creation Timeout

**File:** `lib/parallel.sh:180,187`

Wrap `git worktree add` with `timeout 30` to prevent indefinite hangs.

### Fix 4: Display Count Filter (Minor)

**File:** `bin/ralph` (status/stories display)

Intersect `completed_stories` from state.json with current `stories.txt` IDs for accurate display.

---

## Recovery Steps (for the stuck instance)

1. **Kill processes:** `kill 9232 15857`
2. **Unlock/remove stale worktrees:** story-19.4 and story-23.4
3. **Merge 7 successful branches** into ralph-parallel-trial
4. **Update state.json** with the 7 completed story IDs
5. **Clean up** all batch 2 worktrees and branches
6. **Re-run** Ralph for remaining batches (3 and 4)

---

## Lessons Learned

1. **Never trust `|| true` for critical cleanup** — silent failures cascade into hung processes
2. **Pipe-based output capture is more reliable than file redirect** for CLI tools that may have internal buffering or TTY detection
3. **Always add timeouts to git operations** — `git worktree add` can hang indefinitely
4. **State accounting should intersect with the current queue** — historical completions from prior runs pollute the display
5. **Parallel mode needs integration tests with real Claude CLI** — the output capture difference between sequential and parallel was never tested with the actual tool
