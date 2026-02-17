# Troubleshooting

> Last updated: v2.5.0 (2026-02-17)

Common issues organized by symptom. If your issue isn't listed here, [open a GitHub issue](https://github.com/becerra-alberto/Ralphetamine/issues).

---

## Prerequisites

### `ralph: command not found`

The `ralph` binary isn't on your PATH. After running `./install.sh`, add this to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then restart your shell or run `source ~/.zshrc`.

### `ralph: Bash 4.0+ required`

macOS ships with Bash 3.2. Install a modern Bash via Homebrew:

```bash
brew install bash
```

Ralph auto-detects Homebrew Bash at `/opt/homebrew/bin/bash` or `/usr/local/bin/bash` and re-execs itself. You don't need to change your default shell.

### `claude: command not found`

Install the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code). Verify with `claude --version`.

### `jq: command not found` or `gtimeout: command not found`

```bash
# macOS
brew install jq coreutils

# Debian/Ubuntu
sudo apt install jq coreutils
```

---

## Pipeline Issues

### Slash commands not appearing in Claude Code

After running `./install.sh`, slash commands are installed to `~/.claude/commands/` and skills to `~/.claude/skills/`. If they don't appear:

1. Restart Claude Code (slash commands are loaded at startup)
2. Verify the files exist: `ls ~/.claude/commands/ralph-*.md ~/.claude/skills/ralph*/SKILL.md`
3. Re-run `./install.sh` if files are missing

### `ralph init` fails with missing template

**Known issue:** `ralph init` looks for `commands/create-spec.md` which was renamed to `commands/ralph-v2/step_3-add-ad-hoc-spec.md`. The installer handles this fallback, but if you're running `ralph init` from a stale installation, re-run `./install.sh`.

### Worktree creation fails during parallel pipeline

Git worktrees can fail if stale worktrees exist from a prior crashed run. Ralph cleans these on startup, but if you see errors:

```bash
# List existing worktrees
git worktree list

# Prune stale entries
git worktree prune

# Remove orphaned worktree directories
rm -rf .ralph/worktrees/
```

Then retry the pipeline.

---

## Runtime Issues

### Stories keep timing out

The default timeout is 1800 seconds (30 minutes). If your stories are complex:

```json
{
  "loop": {
    "timeout_seconds": 3600
  }
}
```

If stories consistently time out, consider:
- Breaking them into smaller stories (or let decomposition handle it)
- Reducing spec complexity
- Checking if Claude is stuck on permission prompts (use `--dangerously-skip-permissions` in claude.flags)

### No completion signal in output

Ralph expects `<ralph>DONE X.X</ralph>` or `<ralph>FAIL X.X: reason</ralph>` in Claude's output. If neither is found, the story is treated as a failure. Common causes:

- **Claude timed out** before emitting a signal — increase `loop.timeout_seconds`
- **Output truncation** — Claude's output was too large. Check `.ralph/output/story-*.txt`
- **Prompt issue** — the implementation template may not be requesting the signal. Check `.ralph/templates/implement.md`

### Orphaned worktrees after a crash

If Ralph crashes during parallel execution, git worktrees may be left behind:

```bash
ralph reconcile          # find orphaned branches
ralph reconcile --apply  # merge recoverable work
```

Or use the slash commands:
```
> /ralph-reconcile-claude-code
> /ralph-reconcile-codex
```

### Corrupted state.json

If `.ralph/state.json` becomes corrupted (invalid JSON, unexpected values):

```bash
# View current state
cat .ralph/state.json | jq .

# Reset all state (stories go back to pending)
ralph reset

# Or manually fix a specific field
jq '.current_story = null | .retry_count = 0' .ralph/state.json > tmp.json && mv tmp.json .ralph/state.json
```

### Infinite retries / story never completes

Ralph has two termination mechanisms: retry count and state checks. If a story seems stuck:

1. Check retry count: `jq '.retry_count' .ralph/state.json`
2. Check max retries: `jq '.loop.max_retries' .ralph/config.json` (default: 3)
3. If decomposition is enabled, the story should decompose after max retries
4. Kill the process and run `ralph status` to see where things stand

### Stale lock file

If Ralph exits abnormally, `.ralph/.lock` may persist:

```bash
# Check if the PID in the lock is still running
cat .ralph/.lock
kill -0 $(cat .ralph/.lock) 2>/dev/null && echo "Still running" || echo "Stale lock"

# Remove stale lock
rm .ralph/.lock
```

Ralph checks for stale locks on startup, but manual removal is safe if the process is confirmed dead.

---

## Safety

### What does `--dangerously-skip-permissions` mean?

This Claude Code flag allows Claude to execute any command without asking for permission. Ralph uses it by default because the autonomous loop can't pause for interactive prompts.

**Mitigations:**

- Run Ralph in a dedicated repository with clean git status
- Configure `validation.blocked_commands` to prevent destructive operations:
  ```json
  {
    "validation": {
      "blocked_commands": ["rm -rf", "DROP TABLE", "docker rm"]
    }
  }
  ```
- Use `commit.stage_paths` to scope commits to known files:
  ```json
  {
    "commit": {
      "stage_paths": ["src/", "tests/", "package.json"]
    }
  }
  ```
- Review `claude.flags` in your config before running

---

## Getting Help

When [opening an issue](https://github.com/becerra-alberto/Ralphetamine/issues), include:

- **OS and shell:** e.g., macOS 15.3, zsh
- **Ralph version:** `ralph --version` or check `bin/ralph`
- **Bash version:** `bash --version`
- **Claude Code version:** `claude --version`
- **Steps to reproduce:** exact commands you ran
- **Expected vs actual:** what you expected to happen vs what happened
- **Relevant logs:** `ralph.log`, `progress.txt`, `.ralph/state.json`
