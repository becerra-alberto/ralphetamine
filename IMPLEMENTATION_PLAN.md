# Stackz Implementation Plan

## Overview

This document provides the implementation roadmap for Stackz, a local-first personal finance application. Generated from the [Stackz PRD](./Stackz-PRD.md) using the BMAD Method.

**Tech Stack:**
- Frontend: SvelteKit 5 + TypeScript + Tailwind CSS
- Backend: Tauri 2.0 (Rust)
- Database: SQLite with libsql
- State: Svelte stores + Tauri events

**Total Scope:** 7 Epics, 45 Stories

---

## Epic Summary

| Epic | Title | Stories | Priority | Dependencies |
|------|-------|---------|----------|--------------|
| 1 | Foundation & App Shell | 6 | Critical | None |
| 2 | Budget View Core | 10 | Critical | Epic 1 |
| 3 | Budget Editing | 4 | High | Epic 2 |
| 4 | Transaction Management | 9 | Critical | Epic 1, 2 |
| 5 | Net Worth Tracking | 5 | Medium | Epic 1 |
| 6 | Dashboard & Command Palette | 7 | High | Epic 1 |
| 7 | CSV Import | 4 | Medium | Epic 4 |

---

## Epic 1: Foundation & App Shell

**Goal:** Establish the Tauri + SvelteKit foundation with SQLite database, routing, and app shell layout.

**User Outcome:** Application launches with basic navigation, data persistence works locally.

| Story | Title | Status | File |
|-------|-------|--------|------|
| 1.1 | Initialize Tauri + SvelteKit Project | pending | [specs/epic-1/story-1.1-initialize-project.md](specs/epic-1/story-1.1-initialize-project.md) |
| 1.2 | Setup SQLite Database with libsql | pending | [specs/epic-1/story-1.2-setup-sqlite.md](specs/epic-1/story-1.2-setup-sqlite.md) |
| 1.3 | Create Core Database Schema | pending | [specs/epic-1/story-1.3-core-schema.md](specs/epic-1/story-1.3-core-schema.md) |
| 1.4 | Implement App Shell with Sidebar | pending | [specs/epic-1/story-1.4-app-shell.md](specs/epic-1/story-1.4-app-shell.md) |
| 1.5 | Setup SvelteKit Routing | pending | [specs/epic-1/story-1.5-routing.md](specs/epic-1/story-1.5-routing.md) |
| 1.6 | Setup Test Infrastructure | pending | [specs/epic-1/story-1.6-test-infrastructure.md](specs/epic-1/story-1.6-test-infrastructure.md) |

---

## Epic 2: Budget View Core

**Goal:** Deliver the primary value proposition - visual budget table with collapsible sections, month columns, and color-coded spending indicators.

**User Outcome:** Users can view their monthly budgets in a spreadsheet-style interface with actual vs. planned amounts.

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9

| Story | Title | Status | File |
|-------|-------|--------|------|
| 2.1 | Create Budget and Transaction Tables | pending | [specs/epic-2/story-2.1-budget-transaction-tables.md](specs/epic-2/story-2.1-budget-transaction-tables.md) |
| 2.2 | Budget Grid with Month Columns | pending | [specs/epic-2/story-2.2-budget-grid.md](specs/epic-2/story-2.2-budget-grid.md) |
| 2.3 | Collapsible Category Sections | pending | [specs/epic-2/story-2.3-collapsible-sections.md](specs/epic-2/story-2.3-collapsible-sections.md) |
| 2.4 | Date Range Selector | pending | [specs/epic-2/story-2.4-date-range-selector.md](specs/epic-2/story-2.4-date-range-selector.md) |
| 2.5 | Budget Cells with Actual vs Planned | pending | [specs/epic-2/story-2.5-budget-cells.md](specs/epic-2/story-2.5-budget-cells.md) |
| 2.6 | Color-Coded Spending Indicators | pending | [specs/epic-2/story-2.6-color-coding.md](specs/epic-2/story-2.6-color-coding.md) |
| 2.7 | Hover Tooltips | pending | [specs/epic-2/story-2.7-hover-tooltips.md](specs/epic-2/story-2.7-hover-tooltips.md) |
| 2.8 | Trailing 12M Totals Column | pending | [specs/epic-2/story-2.8-trailing-totals.md](specs/epic-2/story-2.8-trailing-totals.md) |
| 2.9 | Uncategorized Transactions Row | pending | [specs/epic-2/story-2.9-uncategorized-row.md](specs/epic-2/story-2.9-uncategorized-row.md) |
| 2.10 | Cell Expansion for Transactions | pending | [specs/epic-2/story-2.10-cell-expansion.md](specs/epic-2/story-2.10-cell-expansion.md) |

---

## Epic 3: Budget Editing

**Goal:** Complete budget management with inline editing, tab navigation, context menus, and batch adjustment modal.

**User Outcome:** Users can edit individual budget cells and make batch adjustments to future months.

**FRs Covered:** FR10, FR11, FR12, FR13

| Story | Title | Status | File |
|-------|-------|--------|------|
| 3.1 | Inline Cell Editing | pending | [specs/epic-3/story-3.1-inline-editing.md](specs/epic-3/story-3.1-inline-editing.md) |
| 3.2 | Tab Navigation While Editing | pending | [specs/epic-3/story-3.2-tab-navigation.md](specs/epic-3/story-3.2-tab-navigation.md) |
| 3.3 | Right-Click Context Menu | pending | [specs/epic-3/story-3.3-context-menu.md](specs/epic-3/story-3.3-context-menu.md) |
| 3.4 | Batch Budget Adjustment Modal | pending | [specs/epic-3/story-3.4-batch-modal.md](specs/epic-3/story-3.4-batch-modal.md) |

---

## Epic 4: Transaction Management

**Goal:** Full transaction lifecycle - quick-add, list view with filters, payee autocomplete, category assignment, and tags.

**User Outcome:** Users can add, view, search, filter, and categorize transactions.

**FRs Covered:** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22

| Story | Title | Status | File |
|-------|-------|--------|------|
| 4.1 | Transaction List View | pending | [specs/epic-4/story-4.1-transaction-list.md](specs/epic-4/story-4.1-transaction-list.md) |
| 4.2 | Transaction Search | pending | [specs/epic-4/story-4.2-transaction-search.md](specs/epic-4/story-4.2-transaction-search.md) |
| 4.3 | Filter Panel | pending | [specs/epic-4/story-4.3-filter-panel.md](specs/epic-4/story-4.3-filter-panel.md) |
| 4.4 | Uncategorized Warning Banner | pending | [specs/epic-4/story-4.4-uncategorized-warning.md](specs/epic-4/story-4.4-uncategorized-warning.md) |
| 4.5 | Quick-Add Transaction Row | pending | [specs/epic-4/story-4.5-quick-add.md](specs/epic-4/story-4.5-quick-add.md) |
| 4.6 | Date Picker with Auto-Fill | pending | [specs/epic-4/story-4.6-date-picker.md](specs/epic-4/story-4.6-date-picker.md) |
| 4.7 | Payee Autocomplete | pending | [specs/epic-4/story-4.7-payee-autocomplete.md](specs/epic-4/story-4.7-payee-autocomplete.md) |
| 4.8 | Hierarchical Category Dropdown | pending | [specs/epic-4/story-4.8-category-dropdown.md](specs/epic-4/story-4.8-category-dropdown.md) |
| 4.9 | Tags Multi-Select | pending | [specs/epic-4/story-4.9-tags-multiselect.md](specs/epic-4/story-4.9-tags-multiselect.md) |

---

## Epic 5: Net Worth Tracking

**Goal:** Net worth dashboard with account summaries, progress bars, and month-over-month change tracking.

**User Outcome:** Users can view their complete financial picture with assets, liabilities, and net worth trends.

**FRs Covered:** FR23, FR24, FR25, FR26

| Story | Title | Status | File |
|-------|-------|--------|------|
| 5.1 | Net Worth Summary Section | pending | [specs/epic-5/story-5.1-networth-summary.md](specs/epic-5/story-5.1-networth-summary.md) |
| 5.2 | Month-over-Month Change Indicator | pending | [specs/epic-5/story-5.2-mom-change.md](specs/epic-5/story-5.2-mom-change.md) |
| 5.3 | Asset Categories Display | pending | [specs/epic-5/story-5.3-asset-categories.md](specs/epic-5/story-5.3-asset-categories.md) |
| 5.4 | Liability Categories Display | pending | [specs/epic-5/story-5.4-liability-categories.md](specs/epic-5/story-5.4-liability-categories.md) |
| 5.5 | Account Balance Entry | pending | [specs/epic-5/story-5.5-balance-entry.md](specs/epic-5/story-5.5-balance-entry.md) |

---

## Epic 6: Dashboard & Command Palette

**Goal:** Power-user navigation with Cmd+K command palette, global shortcuts, onboarding wizard, and current month summary.

**User Outcome:** Users have quick keyboard-driven navigation, onboarding for new users, and a home dashboard with summary cards.

**FRs Covered:** FR27, FR28, FR29, FR30, FR31, FR32

| Story | Title | Status | File |
|-------|-------|--------|------|
| 6.1 | Onboarding Wizard Step 1 | pending | [specs/epic-6/story-6.1-onboarding-step1.md](specs/epic-6/story-6.1-onboarding-step1.md) |
| 6.2 | Onboarding Wizard Steps 2-4 | pending | [specs/epic-6/story-6.2-onboarding-steps234.md](specs/epic-6/story-6.2-onboarding-steps234.md) |
| 6.3 | Skip Onboarding Option | pending | [specs/epic-6/story-6.3-skip-onboarding.md](specs/epic-6/story-6.3-skip-onboarding.md) |
| 6.4 | Returning User Dashboard | pending | [specs/epic-6/story-6.4-returning-dashboard.md](specs/epic-6/story-6.4-returning-dashboard.md) |
| 6.5 | Command Palette | pending | [specs/epic-6/story-6.5-command-palette.md](specs/epic-6/story-6.5-command-palette.md) |
| 6.6 | Recent Commands History | pending | [specs/epic-6/story-6.6-recent-commands.md](specs/epic-6/story-6.6-recent-commands.md) |
| 6.7 | Global Keyboard Shortcuts | pending | [specs/epic-6/story-6.7-global-shortcuts.md](specs/epic-6/story-6.7-global-shortcuts.md) |

---

## Epic 7: CSV Import

**Goal:** File import flow with column mapping, duplicate detection, and category assignment.

**User Outcome:** Users can import transaction history from CSV exports (bank statements).

| Story | Title | Status | File |
|-------|-------|--------|------|
| 7.1 | CSV Import - File Selection | pending | [specs/epic-7/story-7.1-csv-file-selection.md](specs/epic-7/story-7.1-csv-file-selection.md) |
| 7.2 | CSV Import - Column Mapping | pending | [specs/epic-7/story-7.2-column-mapping.md](specs/epic-7/story-7.2-column-mapping.md) |
| 7.3 | Import Preview and Duplicates | pending | [specs/epic-7/story-7.3-import-preview.md](specs/epic-7/story-7.3-import-preview.md) |
| 7.4 | Post-Import Category Assignment | pending | [specs/epic-7/story-7.4-post-import-categorization.md](specs/epic-7/story-7.4-post-import-categorization.md) |

---

## Implementation Order (Recommended)

For Ralph Loop execution, follow this sequence:

### Phase 1: Foundation (Stories 1.1 - 1.6)
Must complete before any other work. Establishes tech stack, data layer, and test infrastructure. Story 1.6 (Test Infrastructure) should run immediately after 1.1.

### Phase 2: Core Budget (Stories 2.1 - 2.10)
Primary value proposition. Can run in parallel with Epic 4 after 2.1.

### Phase 3: Transactions (Stories 4.1 - 4.9)
Complements budget view. Can start after Story 2.1 (database tables).

### Phase 4: Budget Editing (Stories 3.1 - 3.4)
Enhances budget view. Requires Epic 2 complete.

### Phase 5: Net Worth & Dashboard (Stories 5.1 - 5.5, 6.1 - 6.7)
Can run in parallel. Requires Epic 1 complete.

### Phase 6: Import & Polish (Stories 7.1 - 7.4)
Final features. Requires Epic 4 complete.

---

## Story Format (Ralph-Ready)

Each story file includes:
- **Frontmatter:** id, epic, title, status, priority, dependencies
- **User Story:** As a / I want / So that
- **Technical Context:** Stack references, data models
- **Acceptance Criteria:** Given/When/Then format
- **Test Definition:** Specific automated test tasks organized by type:
  - Unit Tests: `src/lib/__tests__/*.test.ts` for frontend, `*_test.rs` for Rust
  - Integration Tests: Tauri command tests
  - E2E Tests: `e2e/*.spec.ts` for user flows
- **Implementation Notes:** Guidance for developer
- **Files to Create/Modify:** Specific file paths

---

## Technical Constants

### Data Storage
- Amounts: **cents (integer)** - multiply by 100 for storage
- Months: **YYYY-MM format** (e.g., "2025-01")
- IDs: **UUID v4** for sync-readiness
- Dates: **ISO 8601** (e.g., "2025-01-28")

### Design Tokens
```css
--bg-primary: #FFFFFF (light) / #0F0F0F (dark)
--bg-secondary: #F8F9FA (light) / #1A1A1A (dark)
--text-primary: #1A1A1A (light) / #F9FAFB (dark)
--accent: #4F46E5
--success: #10B981
--danger: #EF4444
--warning: #F59E0B
```

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| ⌘K | Command palette |
| ⌘T | Transactions |
| ⌘U | Budget |
| ⌘W | Net Worth |
| ⌘N | New transaction |
| ⌘F | Search |

---

## Related Documents

- [Stackz PRD](./Stackz-PRD.md) - Full product requirements
- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [specs/](./specs/) - Individual story files

---

*Generated by BMAD PM Agent | 44 stories across 7 epics*
