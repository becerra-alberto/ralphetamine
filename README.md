# Ralphetamine

> v2.4.0

[![CI](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml/badge.svg)](https://github.com/becerra-alberto/Ralphetamine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/becerra-alberto/Ralphetamine)](https://opensource.org/licenses/MIT)

**Ship entire features while you sleep.** Ralphetamine is an autonomous implementation loop for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Give it a list of story specs and walk away — it will implement them one by one, run your tests, retry failures, learn from mistakes, and commit the results. No babysitting required.

```
ralph init          # set up in any project
ralph run           # start the loop
ralph run --parallel  # run independent stories concurrently
```

## Why Ralphetamine

Most AI coding tools help you write code interactively. Ralphetamine takes a different approach: you define *what* needs to be built as structured story specs, and it handles the *how* autonomously — including retries, validation, and learning from each story to improve the next.

**Crash-safe state machine.** Every story's progress is tracked in `.ralph/state.json` with atomic writes. Kill the process, reboot your machine, lose power — `ralph run` picks up exactly where it left off.

**Parallel execution via git worktrees.** Independent stories run concurrently in isolated worktrees, then merge back. Failed stories retry sequentially before the final merge. Annotate batches in your story queue and Ralphetamine handles the orchestration.

**Automatic retry with decomposition.** When a story fails after max retries, Ralphetamine can automatically decompose it into 2-4 smaller sub-stories and retry those instead — breaking down complexity without human intervention.

**Cumulative learning.** Each run extracts `LEARN` signals from Claude's output and injects relevant learnings into future prompts. The knowledge base grows with every story, so later stories benefit from earlier mistakes.

**Built-in validation.** Configure test commands, linters, and typechecks that must pass after each story. Block dangerous commands. Scope commits to specific files. Ralphetamine enforces your quality gates on every iteration.

**Full observability.** Live dashboard during runs. Token usage and cost tracking via `ralph stats`. PRD-to-spec provenance with SHA-256 hashes via `ralph verify`. Human-in-the-loop review pages via `ralph hitl generate`.

**Production-hardened.** 270+ tests across 4 BATS tiers plus real integration tests. 22 modular Bash libraries. 10 documented architectural invariants derived from real incidents. Battle-tested on multi-epic projects.

## Quick Start

### Install

```bash
git clone git@github.com:becerra-alberto/Ralphetamine.git
cd Ralphetamine
./install.sh
```

Requires Bash 4.0+, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), `jq`, `git`, and `coreutils` (for `timeout`/`gtimeout` on macOS).

### Initialize in your project

```bash
cd your-project
ralph init
```

The interactive wizard creates `.ralph/config.json`, an empty story queue, prompt templates, and a learnings directory.

### Run the pipeline

Open Claude Code in your project and describe what you want to build:

```
> /ralph-v2:pipeline-full-auto

  Build a budget tracking app with monthly spending categories,
  recurring transactions, and a dashboard that shows spending
  trends over the last 6 months.
```

That's it. Ralphetamine takes your idea and runs the full pipeline autonomously:

1. **PRD** — generates a structured product requirements document, self-answering all design questions
2. **Specs** — breaks the PRD into epics and story specs with acceptance criteria, test definitions, and file lists
3. **Double premortem** — two passes of risk analysis to catch dependency gaps, scope issues, and integration risks before any code is written
4. **Run script** — generates `run-ralph.sh` and launches Ralph in a new terminal window

Stories start implementing immediately. Come back to a working feature.

#### Interactive mode

Want more control? Use the interactive pipeline instead:

```
> /ralph-v2:pipeline-interactive

  Build a budget tracking app with monthly spending categories,
  recurring transactions, and a dashboard with spending trends.
```

Same pipeline, but it pauses at key decision points:

- **PRD phase** — asks 3-5 clarifying questions with multiple-choice options (answer like `1A, 2C, 3B`)
- **Spec phase** — shows the proposed epic/story breakdown for you to confirm or adjust
- **Premortem phase** — presents failure modes and lets you decide which fixes to apply

#### Manual step-by-step

You can also run each phase as a standalone command:

```
/prd                    # describe your idea, answer clarifying questions, get a PRD
/ralph                  # convert a PRD into story specs + queue
/create-spec            # add a single ad-hoc story spec
```

Then start the loop from your terminal:

```bash
ralph run               # sequential — one story at a time
ralph run --parallel    # concurrent — independent batches in worktrees
ralph run -d            # dry run — preview prompts without executing
```

### After a run

```bash
ralph status            # progress summary
ralph stats             # token usage and cost breakdown
ralph stories           # list all stories with completion status
ralph learnings         # see what Ralph learned
ralph reconcile         # find and recover orphaned story branches
```

## How It Works

Each iteration:

1. **Select** the next uncompleted story from `.ralph/stories.txt`
2. **Load** the spec and inject relevant learnings into the prompt template
3. **Invoke Claude** with the full prompt and configured flags
4. **Parse signals** — `<ralph>DONE X.X</ralph>`, `<ralph>FAIL X.X: reason</ralph>`, or `<ralph>LEARN: text</ralph>`
5. **Validate** — run configured test/lint/typecheck commands
6. **Update state** — mark done or increment retry count
7. **Commit** — auto-commit with a structured message

On failure: retry up to `max_retries` times, then optionally decompose into sub-stories. On timeout: run a postmortem prompt to diagnose what went wrong.

## Configuration

`.ralph/config.json` controls all behavior:

```json
{
  "project": { "name": "my-project" },
  "loop": {
    "timeout_seconds": 1800,
    "max_retries": 3
  },
  "validation": {
    "commands": [
      { "name": "typecheck", "cmd": "npm run check", "required": true },
      { "name": "tests", "cmd": "npm run test", "required": true }
    ],
    "blocked_commands": ["rm -rf", "DROP TABLE"]
  },
  "commit": {
    "format": "feat(story-{{id}}): {{title}}",
    "auto_commit": true
  },
  "parallel": { "enabled": false, "max_concurrent": 8 },
  "learnings": { "enabled": true, "max_inject_count": 5 },
  "caffeine": false
}
```

See [`RALPH-REFERENCE.md`](RALPH-REFERENCE.md) for the complete configuration schema and system reference.

## CLI Reference

```bash
ralph init                  # initialize in current project
ralph run [options]         # run the implementation loop
ralph run -s 3.4            # run a specific story
ralph run -n 5 -v           # run 5 iterations, verbose
ralph run -r 4.1            # resume from story 4.1
ralph run --parallel        # parallel execution
ralph status                # progress summary
ralph stats                 # token usage and cost analysis
ralph stats --last 3        # last 3 runs
ralph stories               # list stories with status
ralph learnings [topic]     # show extracted learnings
ralph verify                # PRD-to-spec provenance check
ralph reconcile [--apply]   # find/merge orphaned branches
ralph decompose <id>        # manually decompose a story
ralph hitl generate         # generate HITL review page
ralph hitl feedback <file>  # generate remediation PRD
ralph reset                 # reset all state
```

## Story Queue Format

`.ralph/stories.txt`:

```
# [batch:1] — independent stories (run in parallel)
1.1 | Initialize Project Structure
1.2 | Setup Database Schema

# [batch:2] — depends on batch 1
2.1 | Create Budget View
2.2 | Create Transaction View

# Prefix with x to skip:
x 3.5 | Deferred Feature
```

## Safety

Ralphetamine runs Claude Code with `--dangerously-skip-permissions`. Treat this as full local code execution.

- Run in a dedicated repo with clean git status
- Configure `validation.blocked_commands` to prevent destructive operations
- Set `commit.stage_paths` to scope commits to known files
- Review `claude.flags` in your config before running

## Project Structure

```
Ralphetamine/
├── bin/ralph              # CLI entry point
├── lib/                   # 22 modular bash libraries
│   ├── runner.sh          # Sequential execution loop
│   ├── parallel.sh        # Git worktree parallelization
│   ├── signals.sh         # Claude output signal parsing
│   ├── state.sh           # Atomic JSON state persistence
│   ├── decompose.sh       # Story decomposition
│   ├── learnings.sh       # Learning extraction and injection
│   ├── metrics.sh         # Token tracking and cost analysis
│   ├── provenance.sh      # PRD-to-spec traceability
│   ├── hitl.sh            # Human-in-the-loop review
│   └── ...                # config, display, hooks, specs, stories, etc.
├── templates/             # Prompt templates
├── tests/                 # 270+ BATS tests + integration tests
├── commands/              # Claude Code slash commands
├── skills/                # Skill definitions
└── install.sh             # Symlink installer
```

## Documentation

- [`RALPH-REFERENCE.md`](RALPH-REFERENCE.md) — complete system reference
- [`docs/architecture-flows.md`](docs/architecture-flows.md) — execution flow diagrams
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution guidelines

## Contributing

Issues are welcome for bugs, feature requests, and discussion. Pull requests are by invitation. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT. See [`LICENSE`](LICENSE).
