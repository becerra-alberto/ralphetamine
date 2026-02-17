# Contributing

> Last updated: v2.5.0 (2026-02-17)

Thanks for your interest in Ralphetamine.

We accept GitHub issues for tracking and discussion. **PRs are by invitation only.**
If you want to contribute, start by opening an issue so we can align on scope and
direction before any code changes.

There is no support SLA or guaranteed response time for issues.

## Issue Guidelines

- Include your OS, shell, and Ralph version.
- Provide exact steps to reproduce and the expected vs actual outcome.
- For feature requests, explain the use case and why it fits Ralph's roadmap.

## PRs (Invitation Only)

If you have been invited to submit a PR:
- Keep changes small and focused.
- Run the test suite before submitting.
- Update documentation where behavior changes.
- Avoid unrelated formatting or refactors.

By submitting a PR, you agree to license your contributions under the MIT License.

## Development Setup

```bash
git submodule update --init --recursive
```

Run tests:

```bash
tests/libs/bats-core/bin/bats tests/tier1-unit/ tests/tier2-filesystem/ tests/tier3-component/ tests/tier4-workflow/
```

For security issues, follow `SECURITY.md`.
