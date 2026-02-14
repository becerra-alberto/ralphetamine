# Changelog

All notable changes to this project will be documented in this file.
This format is based on Keep a Changelog, and this project adheres to
Semantic Versioning.

## [Unreleased]

No unreleased changes.

## [2.4.0] — 2026-02-13

Pipeline hardening, parallel execution stability, provenance tracking, and CI maturity. This release stabilizes the parallel runner with deterministic merge order, crash recovery, and dashboard fixes, while adding PRD-to-spec provenance tracking, token metrics, story decomposition, and a full CI pipeline.

### Highlights

- **PRD-to-spec provenance tracking** — traceability with sha256 hashes and `ralph verify` command (Provenance)
- **Token metrics** — per-run cost analysis and cumulative dashboard via `ralph stats` (Metrics)
- **Story decomposition** — auto-breaks failed stories into 2-4 sub-stories after max retries (Decomposition)
- **Parallel hardening** — deterministic merge order, retry logic, orphan cleanup on Ctrl+C (Parallel)
- **CI pipeline** — GitHub Actions workflow, issue/PR templates, and project governance docs (CI)

*Date ascending, then area alphabetically*

| # | Date | Type | Area | Change | Commit |
|---|------|------|------|--------|--------|
| 1 | 2026-02-09 | Added | CI | GitHub Actions CI workflow, issue/PR templates, and project governance docs | c04988d |
| 2 | 2026-02-09 | Fixed | CLI | Empty `stories.txt` falsely reported "All stories complete!" instead of erroring | 09b7df3 |
| 3 | 2026-02-09 | Fixed | Dashboard | Duplicate log lines eliminated — colored log functions wrote to stdout twice | 6a0fd0b |
| 4 | 2026-02-09 | Added | HITL | HITL review module with HTML report generation and feedback PRD workflow | c04988d |
| 5 | 2026-02-09 | Fixed | Parallel | Crash from undeclared `_PARALLEL_ALL_SUCCESSFUL` array; `state_mark_done` moved to post-merge | 0631550 |
| 6 | 2026-02-09 | Added | Provenance | PRD-to-specs provenance tracking with sha256 hashes — new `ralph verify` command | 6ad001b, 7c65fd4 |
| 7 | 2026-02-09 | Fixed | Runner | Unresolved `{{` template variables in spec pattern gave confusing "not found" error | e29cb07 |
| 8 | 2026-02-09 | Changed | Skills | Skills renamed to namespaced `ralph-v2/` pipeline with enumerated step names | 6bbfe46 |
| 9 | 2026-02-09 | Fixed | Testing | BATS CI failures fixed — `set -Eeuo` in tests, git identity, tier5 ref, submodule tracking | 27ed088, 7d0fb58, dc70767, 93aafc5 |
| 10 | 2026-02-09 | Added | Testing | Strengthen weak tests, add 5 missing integration tests, reclassify tier5 | aa30b24 |
| 11 | 2026-02-10 | Added | CLI | Auto-commit specs to git after `/ralph` generation for worktree visibility | 1e46399 |
| 12 | 2026-02-10 | Fixed | Dashboard | Dashboard initialized in `parallel_run()` — timer, progress, and learnings were non-functional | cc68309 |
| 13 | 2026-02-10 | Changed | Docs | CLAUDE.md expanded with Runtime Modes, Architectural Invariants, and Common Anti-Patterns | cc68309 |
| 14 | 2026-02-10 | Added | Metrics | Token tracking, cost analysis, per-run statistics — new `ralph stats` command | e8143bf |
| 15 | 2026-02-10 | Fixed | Parallel | Harden with retry logic, worker cleanup on Ctrl+C, tentative validation, deterministic merge order | a67fd0b |
| 16 | 2026-02-10 | Added | Testing | P0 integration tests for multi-batch parallel and retry logic (41 assertions) | 9ff051d |
| 17 | 2026-02-11 | Added | Decomposition | Automatic story decomposition after max retries — `ralph decompose` command, hierarchical IDs | 4d6cc60, c6ff52f |
| 18 | 2026-02-11 | Fixed | Dashboard | Replace ANSI scroll-region dashboard with append-only display for parallel mode | 8940aa8 |
| 19 | 2026-02-11 | Fixed | Dashboard | Stabilize parallel terminal output — timer/log race condition, SIGWINCH handler, tmux opt-in | d6068da |
| 20 | 2026-02-11 | Fixed | State | Concurrent edit audit — decomposed_stories in empty state, duplicate test names, stale refs | 53ac348 |
| 21 | 2026-02-12 | Fixed | Config | `config_get` boolean bug — jq's `//` treats `false` as falsy; BATS trap guard added | 8b68aa8 |
| 22 | 2026-02-12 | Added | Commands | Reconcile entrypoint commands for Claude Code and Codex | 562d54a |
| 23 | 2026-02-12 | Changed | Docs | Pipeline docs aligned with runtime-safe execution; runtime output tree and examples added | 5d68f58 |
| 24 | 2026-02-12 | Added | Runner | Harden runner parsing, hooks, and staging safety — JSON output default, strict pre_worktree hooks | 96f5c9d |
| 25 | 2026-02-12 | Added | Skills | Pipeline skills — interactive and full-auto orchestration with sub-agent delegation | 46d1a19 |
| 26 | 2026-02-12 | Added | Skills | Reconcile skills with report/execute modes and per-skill reconcile checklists | 4e88ba4 |

## [2.3.0] - 2026-02-07

### Added

- Parallel engine hardening with process lockfile, commit-fallback detection, and
  `ralph reconcile` for orphaned branches.
- End-of-run summary with timing, git stats, and story details.
- HITL review hooks in the run summary output.

### Documentation

- Changelog entry for end-of-run summary feature.

## [2.2.0] - 2026-02-06

### Added

- Tier-4 workflow tests for sequential and parallel engine fixes.
- Testing policy and runtime artifact ignores.
- ASCII swimlane diagram and parallel-mode post-mortem.

### Fixed

- Parallel output capture, worktree robustness, stale lock cleanup, and
  merge-conflict recovery.
- Runner progress display uses queue-filtered story counts.
- Prompt no longer hardcodes Cargo/Tauri restrictions.
- Signal parsing, security hardening, and performance improvements.

## [2.1.0] - 2026-02-01

### Added

- Architecture flow diagrams for all execution paths.
- Production-faithful integration tests for the runner.

### Fixed

- Dashboard panel pinned to bottom for stable scroll layout.
- Parallel worktree path resolution uses absolute paths.
- Parallel retry cleanup fully removes stale worktrees.
- Bash 4+ standardization, shebang portability, and robustness fixes.

## [2.0.0] - 2026-01-31

### Added

- Ralph v2 modular autonomous implementation loop and CLI.
- Real-time TUI dashboard for run progress.
- `/ralph` skill updates for v2 spec generation, including parallel spec writing
  for PRDs with 5+ stories.
- BATS test suite tiers 1-5, including E2E pipeline tests.
- Installation and usage documentation updates.

### Fixed

- macOS compatibility and Bash 3.2 safety fixes.
- tmux re-exec now forwards subcommands and args.
- Installer handles existing regular files when creating symlinks.

### Changed

- Removed legacy Stackz project files from the repo.
