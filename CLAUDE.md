# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stackz is a local-first personal finance application built with:
- **Frontend:** SvelteKit 5 + TypeScript + Tailwind CSS
- **Backend:** Tauri 2.0 (Rust)
- **Database:** SQLite with libsql
- **State:** Svelte stores + Tauri events

The app targets power users transitioning from spreadsheet-based budgeting, featuring a keyboard-first interface with Cmd+K command palette.

## Build Commands

```bash
# Development
npm run tauri dev          # Run Tauri app in dev mode
npm run dev                # SvelteKit dev server only

# Build
npm run tauri build        # Build production app

# Testing
npm run test               # Run unit tests (Vitest)
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:e2e           # Run E2E tests (Playwright)
npm run test:e2e:ui        # Run E2E tests with UI
cd src-tauri && cargo test # Run Rust backend tests

# Linting/Formatting
npm run lint               # ESLint
npm run format             # Prettier
npm run check              # Svelte type checking
```

## Architecture

### Core Views
1. **Budget View** - Spreadsheet-style monthly budget table with collapsible sections (Income, Housing, Essential, Lifestyle, Savings)
2. **Transaction View** - List-based transaction management with filters
3. **Net Worth View** - Assets/liabilities tracker with historical data
4. **Home/Dashboard** - Onboarding wizard or quick navigation hub

### Data Model (SQLite)
- **Transaction:** id, date, payee, categoryId, memo, amountCents (integer), accountId, tags[], isReconciled, importSource
- **Category:** id, name, parentId (for nesting), type (income|expense|transfer), icon, color, sortOrder
- **Budget:** categoryId, month (YYYY-MM), amountCents, note
- **Account:** id, name, type (checking|savings|credit|investment|cash), institution, currency (EUR|USD|CAD), isActive, includeInNetWorth

### Key Design Decisions
- Store amounts as **cents (integer)** to avoid floating point issues
- Month identifiers use **YYYY-MM format**
- All data local-first, sync-ready schema
- Every action must be keyboard-accessible
- Target < 100ms UI response time

## Keyboard Shortcuts (Must Implement)

| Shortcut | Action |
|----------|--------|
| Cmd+K | Command palette |
| Cmd+T | Go to Transactions |
| Cmd+U | Go to Budget |
| Cmd+W | Go to Net Worth |
| Cmd+N | New transaction |
| Cmd+F | Focus search |

## Design Tokens

Light mode accent: #4F46E5, success: #10B981, danger: #EF4444
Dark mode bg: #0F0F0F, secondary: #1A1A1A
Typography: Inter/SF Pro, tabular figures for numbers
