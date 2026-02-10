# Changelog

All notable changes to this project will be documented in this file.
This format is based on Keep a Changelog, and this project adheres to
Semantic Versioning.

## [Unreleased]

- TBD

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
