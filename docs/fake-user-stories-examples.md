# Fake User Stories Examples (Ralphetamine)

Use these as sample inputs to understand how `stories.txt` and spec files fit together.

## 1) Example `.ralph/stories.txt`

```text
# Ralph Story Queue
# Format: ID | Title

# [batch:1] — can run in parallel
1.1 | Create account with email and password
1.2 | Sign in and sign out

# [batch:2] — depends on batch 1
2.1 | View monthly budget summary
2.2 | Add an expense transaction

# [batch:3]
3.1 | Export transactions as CSV

# Prefix with x to skip
x 4.1 | Stretch goal: AI spending insights
```

## 2) Matching Fake Spec Files

### `specs/epic-1/story-1.1-create-account.md`

```markdown
---
id: "1.1"
epic: 1
title: "Create account with email and password"
status: pending
---

## User Story
As a new user, I want to create an account with email/password so I can save my own budget data.

## Acceptance Criteria
- Given I am on the sign-up page, when I submit a valid email and password, then my account is created.
- Given I submit an email that already exists, then I see a clear duplicate-account message.
- Password must be at least 12 characters.

## Definition of Done
- API endpoint for registration exists.
- UI form validates required fields.
- Unit tests cover happy path and duplicate email.
```

### `specs/epic-1/story-1.2-sign-in-sign-out.md`

```markdown
---
id: "1.2"
epic: 1
title: "Sign in and sign out"
status: pending
---

## User Story
As a returning user, I want to sign in and sign out so my data stays private.

## Acceptance Criteria
- Given valid credentials, sign-in succeeds and redirects to dashboard.
- Given invalid credentials, error is shown without exposing sensitive details.
- Sign-out clears session and redirects to sign-in page.

## Definition of Done
- Session/token handling implemented.
- Unauthorized users cannot access dashboard routes.
- Integration test covers login -> dashboard -> logout flow.
```

### `specs/epic-2/story-2.1-view-monthly-budget-summary.md`

```markdown
---
id: "2.1"
epic: 2
title: "View monthly budget summary"
status: pending
---

## User Story
As a budget owner, I want to see totals for income, expenses, and remaining budget this month.

## Acceptance Criteria
- Dashboard shows income total, expense total, and remaining amount.
- Values update correctly when transactions change.
- Empty-state message appears when no transactions exist.

## Definition of Done
- Summary cards render from API data.
- Currency formatting is consistent.
- Tests verify totals calculation and empty state.
```

### `specs/epic-2/story-2.2-add-expense-transaction.md`

```markdown
---
id: "2.2"
epic: 2
title: "Add an expense transaction"
status: pending
---

## User Story
As a user, I want to record expenses so my monthly summary is accurate.

## Acceptance Criteria
- I can create an expense with date, amount, category, and note.
- Amount must be greater than 0.
- New expense appears in transaction list and summary updates.

## Definition of Done
- Create-transaction endpoint supports expense type.
- UI form includes validation and error handling.
- Tests cover successful create and validation errors.
```

## 3) Optional Fake Validation Commands

If prompted during `ralph init`, these are safe starter examples:

```text
name: lint
cmd: npm run lint
required: true

name: tests
cmd: npm test
required: true

name: typecheck
cmd: npm run typecheck
required: false
```
