---
status: pending
depends_on: []
---
# Story 1.1: Initialize Project

## Description
Set up the project scaffolding with SvelteKit and Tauri.

## Acceptance Criteria
- Project builds successfully
- Dev server starts on port 5173
- Tauri window opens

### Files to Create/Modify
- `src/main.ts` — bootstrap app shell (create)
- `src-tauri/src/main.rs` — initialize Tauri host (modify)

## Test Definition
- Unit test: verify config loads
- E2E test: window opens and renders
