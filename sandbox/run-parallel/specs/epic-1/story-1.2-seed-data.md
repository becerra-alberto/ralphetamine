---
id: "1.2"
epic: 1
title: "Seed sample data"
status: pending
priority: high
estimation: small
depends_on: [1.1]
---

# Story 1.2 — Seed Sample Data

## User Story
As a developer, I want sample bookmarks seeded into the data store so that I can test query features.

## Technical Context
Create `src/seed.sh` that populates `data/bookmarks.json` with 5-8 sample bookmarks. Each bookmark has: id, url, title, description, tags (array), created_at.

## Acceptance Criteria

### AC1: Seed Script
- **Given** the data store is initialized
- **When** I run `bash src/seed.sh`
- **Then** `data/bookmarks.json` contains 5+ bookmarks

### AC2: Bookmark Schema
- **Given** bookmarks are seeded
- **When** I inspect any bookmark
- **Then** it has fields: id, url, title, description, tags, created_at

### AC3: Diverse Data
- **Given** bookmarks are seeded
- **When** I inspect the data
- **Then** bookmarks have varied tags and domains

## Files to Create/Modify
- `src/seed.sh` — Data seeding script (create)

## Test Definition

### Unit Tests
- Verify seeded data has 5+ entries
- Verify each entry has required fields
- Verify IDs are unique

## Out of Scope
- User-facing add command (later stories)
