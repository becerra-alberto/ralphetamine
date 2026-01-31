---
status: pending
depends_on: []
---
# Story 1.1: Initialize Notely Project Structure

## Description
Create the initial project structure for Notely, a CLI note manager.
Set up the directory layout, package.json, and entry point.

## Acceptance Criteria
- Project directory created with src/, tests/, docs/
- package.json with name "notely" and version "1.0.0"
- CLI entry point at bin/notely
- Basic --help and --version flags work

## Test Definition
- Unit test: verify CLI parses --help flag
- Unit test: verify --version returns correct version
