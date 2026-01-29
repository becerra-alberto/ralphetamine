# STACKZ

**Personal Finance Application**

## Product Requirements Document

Version 1.0 | January 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Target Users](#2-target-users)
3. [Core Features & Requirements](#3-core-features--requirements)
4. [Keyboard Navigation System](#4-keyboard-navigation-system)
5. [Data Model](#5-data-model)
6. [Design System](#6-design-system)
7. [Technical Requirements](#7-technical-requirements)
8. [Implementation Phases](#8-implementation-phases)
9. [Success Metrics](#9-success-metrics)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

Stackz is a local-first personal finance application designed for power users who demand spreadsheet-level control over their finances with a modern, keyboard-first interface. The application targets users transitioning from manual spreadsheet-based budgeting systems who want dedicated tooling without sacrificing flexibility or data ownership.

### 1.1 Vision Statement

> *"Your finances, one command away."*

Stackz combines the power of spreadsheet-style budget tracking with modern application features: keyboard navigation, natural language commands, and intelligent insights—all while keeping data local and private.

### 1.2 Key Differentiators

- Keyboard-first design with comprehensive shortcut system (Cmd+K command palette)
- Local-first architecture ensuring data privacy and offline functionality
- Spreadsheet-style budget view with monthly columns and trailing 12-month calculations
- Multi-currency support for international accounts (EUR, USD, CAD)
- AI-powered natural language commands for budget adjustments and queries

---

## 2. Target Users

### 2.1 Primary Persona

**The Power Budgeter**

- Currently uses spreadsheets (Excel/Google Sheets) for budget tracking
- Maintains multiple bank accounts across different institutions and currencies
- Prefers keyboard shortcuts over mouse navigation
- Values data ownership and privacy over cloud convenience
- Wants detailed visibility into spending patterns and trends

### 2.2 User Demographics

| Attribute | Description |
|-----------|-------------|
| Age Range | 28-45 years old |
| Technical Proficiency | High - comfortable with keyboard shortcuts, data manipulation |
| Financial Complexity | Multiple accounts, investments, international transactions |
| Platform | macOS primary (Windows/Linux future consideration) |
| Geographic Focus | Netherlands/EU (expanding to North America) |

---

## 3. Core Features & Requirements

### 3.1 Budget View (Primary)

The Budget View is the heart of Stackz, providing a spreadsheet-style interface for viewing and managing monthly budgets against actual spending.

#### 3.1.1 Layout Requirements

- Rows represent budget categories organized in collapsible sections (Income, Housing, Essential, Lifestyle, Savings)
- Columns represent months with year headers separating annual boundaries
- Date range selector to control visible period (default: rolling 12 months)
- Trailing 12M total column showing actual sum, budget sum, and difference
- Uncategorized row for transactions awaiting categorization

#### 3.1.2 Cell Display States

| State | Display | Behavior |
|-------|---------|----------|
| Default | Actual amount (top), Budget amount (bottom, muted) | Color-coded: green (under), red (over), neutral (equal) |
| Hover | Tooltip with breakdown: actual, budget, difference, usage % | Shows link to view underlying transactions |
| Expanded | Transaction list appears below row | Click cell to expand; only one cell expanded at a time |

#### 3.1.3 Budget Editing

- Double-click or Enter to edit single cell inline
- Tab to move to next month while editing
- Right-click context menu for batch operations:
  - Edit this month only
  - Set amount for all future months
  - Increase by percentage for future months
- Dedicated "Adjust Budgets" modal for complex batch changes

### 3.2 Transaction View

The Transaction View provides a list-based interface for viewing, adding, and categorizing transactions.

#### 3.2.1 Layout Requirements

- Search bar with full-text search across payee and memo fields
- Filter panel supporting: date range, accounts, categories, tags, amount range, type (income/expense)
- Warning banner for uncategorized transactions with bulk categorization action
- Quick-add row at top of list for new transactions
- Columns: Date, Payee, Category, Memo, Outflow, Inflow, Account, Tags

#### 3.2.2 Transaction Entry Fields

| Field | Type | Behavior |
|-------|------|----------|
| Date | Date picker | Auto-fills today, editable |
| Payee | Text with autocomplete | Suggests from transaction history |
| Category | Dropdown with search | Hierarchical category selection |
| Memo | Free text | Optional notes |
| Outflow/Inflow | Currency input | Only one active at a time |
| Account | Dropdown | Select from configured accounts |
| Tags | Multi-select chips | Personal, Business, Recurring, etc. |

### 3.3 Net Worth View

The Net Worth View provides a comprehensive overview of assets and liabilities with historical tracking.

#### 3.3.1 Summary Section

- Total Assets with visual progress bar
- Total Liabilities with visual progress bar
- Net Worth calculation with month-over-month change percentage

#### 3.3.2 Asset Categories

- Cash & Bank Accounts (checking, savings, multi-currency)
- Investments (brokerage portfolios with YTD performance)
- Retirement (pension funds with update frequency indicator)

#### 3.3.3 Liability Categories

- Loans (student, personal, auto with interest rate display)
- Mortgages
- Credit card balances

### 3.4 Home/Dashboard View

#### 3.4.1 First-Time User (Onboarding)

Four-step onboarding wizard:

- **Step 1:** Financial goals selection (emergency fund, debt payoff, savings, tracking, net worth)
- **Step 2:** Monthly income estimate
- **Step 3:** Account connection (or skip for manual entry)
- **Step 4:** Initial budget category setup
- Option to skip entire setup and configure later

#### 3.4.2 Returning User Dashboard

- Command palette prompt (Cmd+K) as primary call-to-action
- Quick navigation shortcuts displayed (Cmd+T, Cmd+U, Cmd+W)
- AI chat input for natural language commands
- Current month summary cards: Income, Expenses, Balance
- Link to full dashboard view

---

## 4. Keyboard Navigation System

### 4.1 Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+K` | Open command palette | Global |
| `Cmd+T` | Go to Transactions | Global |
| `Cmd+U` | Go to Budget | Global |
| `Cmd+W` | Go to Net Worth | Global |
| `Cmd+N` | New transaction | Global |
| `Cmd+F` | Focus search | Global |
| `Cmd+1-5` | Navigate to sidebar items | Global |
| `Cmd+S` | Save (explicit) | Global |

### 4.2 Navigation Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Edit selected cell / Confirm action | Lists, Tables |
| `Tab` | Move to next cell | Tables, Forms |
| `Shift+Tab` | Move to previous cell | Tables, Forms |
| `Escape` | Cancel edit / Close modal | Global |
| `Arrow keys` | Navigate between cells/items | Lists, Tables |
| `/` | Quick filter | Lists |

### 4.3 Command Palette

The command palette (Cmd+K) serves as the primary navigation and action hub:

- Fuzzy search for commands, categories, accounts, and transactions
- Keyboard shortcut hints displayed next to each command
- Recent commands history for quick re-execution
- Natural language input processing (Phase 2)

---

## 5. Data Model

### 5.1 Core Entities

#### 5.1.1 Transaction

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| date | Date | Transaction date |
| payee | string | Merchant/payee name |
| categoryId | string (FK) | Reference to category |
| memo | string (optional) | User notes |
| amountCents | integer | Amount in cents (positive = income, negative = expense) |
| accountId | string (FK) | Reference to account |
| tags | string[] | Array of tag identifiers |
| isReconciled | boolean | Bank reconciliation status |
| importSource | string (optional) | Import origin: bunq, ing_csv, manual |

#### 5.1.2 Category

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| name | string | Display name |
| parentId | string (optional) | Parent category for nesting |
| type | enum | income \| expense \| transfer |
| icon | string (optional) | Display icon identifier |
| color | string (optional) | Hex color code |
| sortOrder | integer | Display ordering |

#### 5.1.3 Budget

| Field | Type | Description |
|-------|------|-------------|
| categoryId | string (FK) | Reference to category |
| month | string | Month identifier (YYYY-MM format) |
| amountCents | integer | Budget amount in cents |
| note | string (optional) | Budget notes for this category/month |

#### 5.1.4 Account

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| name | string | Display name |
| type | enum | checking \| savings \| credit \| investment \| cash |
| institution | string | Bank/institution name |
| currency | enum | EUR \| USD \| CAD |
| isActive | boolean | Account visibility |
| includeInNetWorth | boolean | Include in net worth calculations |

---

## 6. Design System

### 6.1 Color Palette

#### 6.1.1 Light Mode

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `--bg-primary` | #FFFFFF | Main background |
| `--bg-secondary` | #F8F9FA | Secondary surfaces |
| `--text-primary` | #1A1A1A | Primary text |
| `--text-secondary` | #6B7280 | Secondary/muted text |
| `--accent` | #4F46E5 | Interactive elements, links |
| `--success` | #10B981 | Under budget, income, positive |
| `--danger` | #EF4444 | Over budget, expenses, negative |
| `--warning` | #F59E0B | Approaching budget limit |
| `--neutral` | #6B7280 | On budget, balanced |

#### 6.1.2 Dark Mode

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `--bg-primary` | #0F0F0F | Main background |
| `--bg-secondary` | #1A1A1A | Secondary surfaces |
| `--text-primary` | #F9FAFB | Primary text |
| `--text-secondary` | #9CA3AF | Secondary/muted text |

### 6.2 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Headings | Inter / SF Pro Display | Variable | Semibold (600) |
| Body | Inter / SF Pro Text | 14px (11pt) | Regular (400) |
| Numbers | Tabular figures | Variable | Monospace alignment |
| Currency | Same as numbers | Variable | Always show € symbol |

### 6.3 Spacing System

Base unit: 4px. Standard increments: 8px, 12px, 16px, 24px, 32px.

- Component padding: 12px - 16px
- Card spacing: 16px - 24px
- Section margins: 24px - 32px

---

## 7. Technical Requirements

### 7.1 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | SvelteKit 5 + TypeScript | Modern reactive framework with excellent performance |
| Styling | Tailwind CSS | Utility-first CSS for rapid development |
| Backend | Tauri 2.0 (Rust) | Native performance with small binary size |
| Database | SQLite with libsql | Local-first, sync-ready architecture |
| State | Svelte stores + Tauri events | Reactive state with IPC support |
| Charts | Chart.js or Recharts | Evaluate during prototyping |

### 7.2 Architecture Principles

- **Local-first:** All data stored locally in SQLite. No network required for core functionality.
- **Sync-ready:** Database schema designed for eventual iCloud/cloud sync.
- **Keyboard-first:** Every action accessible via keyboard shortcuts.
- **Performance:** Sub-100ms response for all UI interactions.
- **Privacy:** Financial data never leaves device unless explicitly synced.

### 7.3 Bank Integration Strategy

#### 7.3.1 Integration Tiers

| Tier | Method | Banks Supported | Data Access |
|------|--------|-----------------|-------------|
| Tier 1 | Direct API | Bunq | Full transaction history, real-time webhooks |
| Tier 2 | Open Banking (GoCardless) | ING, Wise, most EU banks | 90-day history, 90-day consent renewal |
| Tier 3 | CSV Import | Degiro, TD Canada | Manual export and import |
| Tier 4 | Manual Entry | All | User-entered transactions |

---

## 8. Implementation Phases

### 8.1 Phase 1: Core Budget View (MVP)

**Target:** Week 1-2

- Monthly budget table with collapsible sections
- Year headers in columns
- Date range selector
- Basic cell display (actual / budget)
- Hover tooltip with details
- 12M totals (actual + budget)
- Income section at top
- Uncategorized row

### 8.2 Phase 2: Transactions & Editing

**Target:** Week 3-4

- Transaction list view with filters
- Quick-add row
- Click-to-expand transactions in budget view
- Inline budget editing
- Batch budget adjustment modal
- CSV import (generic + Degiro)

### 8.3 Phase 3: Polish & AI

**Target:** Week 5-6

- Category notes per-category and per-category-month
- Account and tag filters
- Command palette with fuzzy search
- Natural language input processing
- AI coaching suggestions
- Net worth view implementation

### 8.4 Phase 4: Bank Integration

**Target:** Week 7-8

- Bunq direct API integration
- GoCardless connection for ING/Wise
- Investment tracking with live prices
- Pension tracking

---

## 9. Success Metrics

### 9.1 MVP Success Criteria

- Budget view renders correctly with 12+ months of data
- All keyboard shortcuts functional
- Transaction CRUD operations work offline
- CSV import successfully processes 1000+ transactions
- UI response time < 100ms for all interactions

### 9.2 User Experience Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Time to first budget entry | < 5 minutes | User testing |
| Keyboard-only task completion | 100% of core tasks | Feature audit |
| Monthly budget setup time | < 10 minutes | User testing |
| Transaction categorization accuracy | > 90% auto-suggest hit rate | Analytics |

---

## 10. Appendices

### 10.1 Sample Data Requirements

For prototyping, use realistic Dutch/EU data:

- **Currency:** EUR (€)
- **Banks:** ING, Bunq, Wise
- **Payees:** Albert Heijn, Jumbo, NS, Bol.com, Coolblue, Netflix, Spotify
- **Categories:** Housing (Rent, Utilities, VVE), Essential (Groceries, Health, Phone), Lifestyle (Entertainment, Dining, Subscriptions), Savings
- **Income range:** €4,500-6,000/month salary
- **Date format:** DD MMM YYYY (25 Dec 2024)

### 10.2 Default Category Structure

| Section | Categories |
|---------|------------|
| Income | Salary, Freelance, Investments, Other Income |
| Housing | Rent/Mortgage, VVE Fees, Gas & Electricity, Water, Home Insurance |
| Essential | Groceries, Health/Medical, Phone/Internet, Transportation, Insurance |
| Lifestyle | Entertainment, Dining Out, Subscriptions, Shopping, Travel |
| Savings | Emergency Fund, Investments, Retirement, Goals |

### 10.3 AI Command Examples (Phase 2)

Natural language commands for AI chat integration:

- "Set my groceries budget to €400 for 2025"
- "Show me where I overspent last month"
- "How much did I save this year?"
- "Categorize all Albert Heijn transactions as Groceries"
- "What's my average monthly spending on subscriptions?"

### 10.4 AI Coaching Prompts (Phase 2)

Proactive insights and suggestions:

- "You're spending 15% more on subscriptions than 6 months ago. Want to review?"
- "You've hit your savings goal for 3 months straight! 🎉"
- "Your emergency fund is at 2.3 months of expenses. Aim for 3-6 months."
- "You have 3 uncategorized transactions from this week."

---

*— End of Document —*
