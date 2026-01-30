//! Database migrations for Stackz
//!
//! Provides a migration system that tracks and applies schema changes.

use super::connection::{Database, DbError};
use log::info;

/// Represents a database migration
pub struct Migration {
    /// Unique version identifier (e.g., "001", "002")
    pub version: &'static str,
    /// Description of what this migration does
    pub description: &'static str,
    /// SQL to apply the migration
    pub up: &'static str,
}

/// All migrations in order
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: "001",
        description: "Create core tables (categories, accounts)",
        up: r#"
-- Create categories table
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_type ON categories(type);

-- Create accounts table
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'cash')),
    institution TEXT NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('EUR', 'USD', 'CAD')) DEFAULT 'EUR',
    is_active INTEGER NOT NULL DEFAULT 1,
    include_in_net_worth INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- Seed default categories
-- Income section
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-income', 'Income', NULL, 'income', 1);
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-income-salary', 'Salary', 'cat-income', 'income', 1),
    ('cat-income-freelance', 'Freelance', 'cat-income', 'income', 2),
    ('cat-income-investments', 'Investments', 'cat-income', 'income', 3),
    ('cat-income-other', 'Other Income', 'cat-income', 'income', 4);

-- Housing section
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-housing', 'Housing', NULL, 'expense', 2);
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-housing-rent', 'Rent/Mortgage', 'cat-housing', 'expense', 1),
    ('cat-housing-vve', 'VVE Fees', 'cat-housing', 'expense', 2),
    ('cat-housing-gas', 'Gas & Electricity', 'cat-housing', 'expense', 3),
    ('cat-housing-water', 'Water', 'cat-housing', 'expense', 4),
    ('cat-housing-insurance', 'Home Insurance', 'cat-housing', 'expense', 5);

-- Essential section
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-essential', 'Essential', NULL, 'expense', 3);
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-essential-groceries', 'Groceries', 'cat-essential', 'expense', 1),
    ('cat-essential-health', 'Health/Medical', 'cat-essential', 'expense', 2),
    ('cat-essential-phone', 'Phone/Internet', 'cat-essential', 'expense', 3),
    ('cat-essential-transport', 'Transportation', 'cat-essential', 'expense', 4),
    ('cat-essential-insurance', 'Insurance', 'cat-essential', 'expense', 5);

-- Lifestyle section
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-lifestyle', 'Lifestyle', NULL, 'expense', 4);
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-lifestyle-entertainment', 'Entertainment', 'cat-lifestyle', 'expense', 1),
    ('cat-lifestyle-dining', 'Dining Out', 'cat-lifestyle', 'expense', 2),
    ('cat-lifestyle-subscriptions', 'Subscriptions', 'cat-lifestyle', 'expense', 3),
    ('cat-lifestyle-shopping', 'Shopping', 'cat-lifestyle', 'expense', 4),
    ('cat-lifestyle-travel', 'Travel', 'cat-lifestyle', 'expense', 5);

-- Savings section
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-savings', 'Savings', NULL, 'expense', 5);
INSERT INTO categories (id, name, parent_id, type, sort_order) VALUES
    ('cat-savings-emergency', 'Emergency Fund', 'cat-savings', 'expense', 1),
    ('cat-savings-investments', 'Investments', 'cat-savings', 'expense', 2),
    ('cat-savings-retirement', 'Retirement', 'cat-savings', 'expense', 3),
    ('cat-savings-goals', 'Goals', 'cat-savings', 'expense', 4);
"#,
    },
    Migration {
        version: "002",
        description: "Create budgets and transactions tables",
        up: r#"
-- Create budgets table
-- Stores monthly budget allocations per category
-- Composite primary key: (category_id, month) ensures one budget per category per month
CREATE TABLE budgets (
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
    amount_cents INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (category_id, month)
);
CREATE INDEX idx_budgets_month ON budgets(month);

-- Create transactions table
-- Stores individual financial transactions
-- amount_cents: positive = income, negative = expense
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
    payee TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    memo TEXT,
    amount_cents INTEGER NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    tags TEXT NOT NULL DEFAULT '[]',
    is_reconciled INTEGER NOT NULL DEFAULT 0,
    import_source TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_payee ON transactions(payee);

-- Create trigger to update updated_at timestamp on budgets
CREATE TRIGGER trg_budgets_updated_at
AFTER UPDATE ON budgets
FOR EACH ROW
BEGIN
    UPDATE budgets SET updated_at = datetime('now')
    WHERE category_id = NEW.category_id AND month = NEW.month;
END;

-- Create trigger to update updated_at timestamp on transactions
CREATE TRIGGER trg_transactions_updated_at
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    UPDATE transactions SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;
"#,
    },
    Migration {
        version: "003",
        description: "Create net worth history table",
        up: r#"
-- Create net_worth_history table
-- Stores monthly snapshots for month-over-month comparison
CREATE TABLE net_worth_history (
    month TEXT PRIMARY KEY CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
    total_assets_cents INTEGER NOT NULL DEFAULT 0,
    total_liabilities_cents INTEGER NOT NULL DEFAULT 0,
    net_worth_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_net_worth_history_month ON net_worth_history(month);

-- Create trigger to update updated_at timestamp on net_worth_history
CREATE TRIGGER trg_net_worth_history_updated_at
AFTER UPDATE ON net_worth_history
FOR EACH ROW
BEGIN
    UPDATE net_worth_history SET updated_at = datetime('now')
    WHERE month = NEW.month;
END;
"#,
    },
    Migration {
        version: "004",
        description: "Create account balance history table",
        up: r#"
-- Create account_balance_history table
-- Stores historical balance snapshots for accounts (especially non-transaction-based ones)
CREATE TABLE account_balance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    balance_cents INTEGER NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_account_balance_history_account ON account_balance_history(account_id);
CREATE INDEX idx_account_balance_history_date ON account_balance_history(recorded_at);

-- Add last_balance_update column to accounts table
ALTER TABLE accounts ADD COLUMN last_balance_update TEXT;
"#,
    },
    Migration {
        version: "005",
        description: "Create user preferences table",
        up: r#"
-- Create user_preferences table
-- Stores key-value user preferences including onboarding state
CREATE TABLE user_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create trigger to update updated_at timestamp on user_preferences
CREATE TRIGGER trg_user_preferences_updated_at
AFTER UPDATE ON user_preferences
FOR EACH ROW
BEGIN
    UPDATE user_preferences SET updated_at = datetime('now')
    WHERE key = NEW.key;
END;
"#,
    },
    Migration {
        version: "006",
        description: "Create import templates table",
        up: r#"
-- Create import_templates table
-- Stores saved column mapping templates for reusable CSV import configurations
CREATE TABLE import_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    mappings_json TEXT NOT NULL,
    use_inflow_outflow INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_import_templates_name ON import_templates(name);

-- Create trigger to update updated_at timestamp on import_templates
CREATE TRIGGER trg_import_templates_updated_at
AFTER UPDATE ON import_templates
FOR EACH ROW
BEGIN
    UPDATE import_templates SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;
"#,
    },
];

/// Run all pending migrations
pub fn run_migrations(db: &Database) -> Result<(), DbError> {
    // Ensure _migrations table exists
    create_migrations_table(db)?;

    // Get list of already applied migrations
    let applied = get_applied_migrations(db)?;

    // Apply pending migrations
    for migration in MIGRATIONS {
        if !applied.contains(&migration.version.to_string()) {
            info!(
                "Applying migration {}: {}",
                migration.version, migration.description
            );
            apply_migration(db, migration)?;
        } else {
            info!(
                "Skipping already applied migration {}: {}",
                migration.version, migration.description
            );
        }
    }

    Ok(())
}

/// Create the _migrations table if it doesn't exist
fn create_migrations_table(db: &Database) -> Result<(), DbError> {
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )?;
    Ok(())
}

/// Get list of already applied migration versions
fn get_applied_migrations(db: &Database) -> Result<Vec<String>, DbError> {
    // Check if table exists first
    if !db.table_exists("_migrations")? {
        return Ok(Vec::new());
    }

    db.query_map(
        "SELECT version FROM _migrations ORDER BY version",
        &[],
        |row| row.get(0),
    )
}

/// Apply a single migration
fn apply_migration(db: &Database, migration: &Migration) -> Result<(), DbError> {
    // Execute the migration SQL
    db.execute_batch(migration.up)?;

    // Record the migration
    db.execute(
        "INSERT INTO _migrations (version, description) VALUES (?, ?)",
        &[&migration.version, &migration.description],
    )?;

    Ok(())
}

/// Check if a specific migration has been applied
pub fn is_migration_applied(db: &Database, version: &str) -> Result<bool, DbError> {
    if !db.table_exists("_migrations")? {
        return Ok(false);
    }

    let count: i32 = db.query_row(
        "SELECT COUNT(*) FROM _migrations WHERE version = ?",
        &[&version],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

/// Get the current migration version (latest applied)
pub fn get_current_version(db: &Database) -> Result<Option<String>, DbError> {
    if !db.table_exists("_migrations")? {
        return Ok(None);
    }

    let result = db.query_map(
        "SELECT version FROM _migrations ORDER BY version DESC LIMIT 1",
        &[],
        |row| row.get(0),
    )?;

    Ok(result.into_iter().next())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migration_runner_creates_migrations_table() {
        let db = Database::new_in_memory().unwrap();

        // Initially, _migrations table should not exist
        assert!(!db.table_exists("_migrations").unwrap());

        // Run migrations (even if empty, should create table)
        run_migrations(&db).unwrap();

        // Now _migrations table should exist
        assert!(db.table_exists("_migrations").unwrap());
    }

    #[test]
    fn test_migration_runner_tracks_applied_migrations() {
        let db = Database::new_in_memory().unwrap();

        // Run migrations - this creates the table and applies all migrations
        run_migrations(&db).unwrap();

        // Verify migrations are tracked (run_migrations already applied "001")
        let applied = get_applied_migrations(&db).unwrap();
        assert!(applied.contains(&"001".to_string()));

        // Manually insert an additional migration record
        db.execute(
            "INSERT INTO _migrations (version, description) VALUES (?, ?)",
            &[&"999", &"Test migration"],
        )
        .unwrap();

        let applied = get_applied_migrations(&db).unwrap();
        assert!(applied.contains(&"999".to_string()));
    }

    #[test]
    fn test_migration_runner_skips_already_applied_migrations() {
        let db = Database::new_in_memory().unwrap();

        // Run migrations first time
        run_migrations(&db).unwrap();

        // Get count after first run
        let count_before: i32 = db
            .query_row("SELECT COUNT(*) FROM _migrations", &[], |row| row.get(0))
            .unwrap();

        // Run migrations again - should not re-apply
        run_migrations(&db).unwrap();

        // Count should be the same
        let count_after: i32 = db
            .query_row("SELECT COUNT(*) FROM _migrations", &[], |row| row.get(0))
            .unwrap();

        assert_eq!(count_before, count_after);
    }

    #[test]
    fn test_is_migration_applied() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        assert!(!is_migration_applied(&db, "999").unwrap());

        db.execute(
            "INSERT INTO _migrations (version, description) VALUES (?, ?)",
            &[&"999", &"Test"],
        )
        .unwrap();

        assert!(is_migration_applied(&db, "999").unwrap());
    }

    #[test]
    fn test_get_current_version() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // After running all migrations, current version should be "006"
        assert_eq!(get_current_version(&db).unwrap(), Some("006".to_string()));
    }

    #[test]
    fn test_get_applied_migrations_returns_empty_if_no_table() {
        let db = Database::new_in_memory().unwrap();
        let applied = get_applied_migrations(&db).unwrap();
        assert!(applied.is_empty());
    }

    #[test]
    fn test_categories_table_has_all_required_columns() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Query pragma to get column info
        let columns: Vec<String> = db
            .query_map(
                "SELECT name FROM pragma_table_info('categories')",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(columns.contains(&"id".to_string()));
        assert!(columns.contains(&"name".to_string()));
        assert!(columns.contains(&"parent_id".to_string()));
        assert!(columns.contains(&"type".to_string()));
        assert!(columns.contains(&"icon".to_string()));
        assert!(columns.contains(&"color".to_string()));
        assert!(columns.contains(&"sort_order".to_string()));
        assert!(columns.contains(&"created_at".to_string()));
        assert!(columns.contains(&"updated_at".to_string()));
    }

    #[test]
    fn test_categories_type_check_constraint_rejects_invalid() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        let result = db.execute(
            "INSERT INTO categories (id, name, type) VALUES ('test', 'Test', 'invalid_type')",
            &[],
        );

        assert!(result.is_err(), "Should reject invalid category type");
    }

    #[test]
    fn test_categories_parent_id_foreign_key_works() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Insert with valid parent should work
        db.execute(
            "INSERT INTO categories (id, name, parent_id, type) VALUES ('child-test', 'Child Test', 'cat-income', 'income')",
            &[],
        )
        .unwrap();

        // Insert with invalid parent should fail (foreign key constraint)
        let result = db.execute(
            "INSERT INTO categories (id, name, parent_id, type) VALUES ('orphan', 'Orphan', 'nonexistent', 'income')",
            &[],
        );

        assert!(result.is_err(), "Should reject invalid parent_id");
    }

    #[test]
    fn test_accounts_table_has_all_required_columns() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        let columns: Vec<String> = db
            .query_map(
                "SELECT name FROM pragma_table_info('accounts')",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(columns.contains(&"id".to_string()));
        assert!(columns.contains(&"name".to_string()));
        assert!(columns.contains(&"type".to_string()));
        assert!(columns.contains(&"institution".to_string()));
        assert!(columns.contains(&"currency".to_string()));
        assert!(columns.contains(&"is_active".to_string()));
        assert!(columns.contains(&"include_in_net_worth".to_string()));
        assert!(columns.contains(&"created_at".to_string()));
        assert!(columns.contains(&"updated_at".to_string()));
    }

    #[test]
    fn test_accounts_type_check_constraint_rejects_invalid() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        let result = db.execute(
            "INSERT INTO accounts (id, name, type, institution) VALUES ('test', 'Test', 'invalid', 'Bank')",
            &[],
        );

        assert!(result.is_err(), "Should reject invalid account type");
    }

    #[test]
    fn test_accounts_currency_check_constraint_rejects_invalid() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        let result = db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency) VALUES ('test', 'Test', 'checking', 'Bank', 'GBP')",
            &[],
        );

        assert!(result.is_err(), "Should reject invalid currency");
    }

    #[test]
    fn test_indexes_exist() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        let indexes: Vec<String> = db
            .query_map(
                "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(indexes.contains(&"idx_categories_parent".to_string()));
        assert!(indexes.contains(&"idx_categories_type".to_string()));
        assert!(indexes.contains(&"idx_accounts_type".to_string()));
        assert!(indexes.contains(&"idx_accounts_active".to_string()));
        // Indexes from migration 002
        assert!(indexes.contains(&"idx_budgets_month".to_string()));
        assert!(indexes.contains(&"idx_transactions_date".to_string()));
        assert!(indexes.contains(&"idx_transactions_category".to_string()));
        assert!(indexes.contains(&"idx_transactions_account".to_string()));
        assert!(indexes.contains(&"idx_transactions_payee".to_string()));
    }

    #[test]
    fn test_budgets_table_has_all_required_columns() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        let columns: Vec<String> = db
            .query_map(
                "SELECT name FROM pragma_table_info('budgets')",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(columns.contains(&"category_id".to_string()));
        assert!(columns.contains(&"month".to_string()));
        assert!(columns.contains(&"amount_cents".to_string()));
        assert!(columns.contains(&"note".to_string()));
        assert!(columns.contains(&"created_at".to_string()));
        assert!(columns.contains(&"updated_at".to_string()));
    }

    #[test]
    fn test_budgets_month_format_check_constraint() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Valid month format should work
        let result = db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('cat-income-salary', '2025-01', 500000)",
            &[],
        );
        assert!(result.is_ok());

        // Invalid month format should fail
        let result = db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('cat-income-salary', 'Jan 2025', 500000)",
            &[],
        );
        assert!(result.is_err(), "Should reject invalid month format");

        // Invalid month (20+) should fail - GLOB [0-1][0-9] allows 00-19
        let result = db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('cat-income-salary', '2025-20', 500000)",
            &[],
        );
        assert!(result.is_err(), "Should reject invalid month number");
    }

    #[test]
    fn test_budgets_foreign_key_to_categories() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Insert with invalid category should fail
        let result = db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('nonexistent', '2025-01', 500000)",
            &[],
        );
        assert!(result.is_err(), "Should reject invalid category_id");
    }

    #[test]
    fn test_transactions_table_has_all_required_columns() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        let columns: Vec<String> = db
            .query_map(
                "SELECT name FROM pragma_table_info('transactions')",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(columns.contains(&"id".to_string()));
        assert!(columns.contains(&"date".to_string()));
        assert!(columns.contains(&"payee".to_string()));
        assert!(columns.contains(&"category_id".to_string()));
        assert!(columns.contains(&"memo".to_string()));
        assert!(columns.contains(&"amount_cents".to_string()));
        assert!(columns.contains(&"account_id".to_string()));
        assert!(columns.contains(&"tags".to_string()));
        assert!(columns.contains(&"is_reconciled".to_string()));
        assert!(columns.contains(&"import_source".to_string()));
        assert!(columns.contains(&"created_at".to_string()));
        assert!(columns.contains(&"updated_at".to_string()));
    }

    #[test]
    fn test_transactions_date_format_check_constraint() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // First create an account to reference
        db.execute(
            "INSERT INTO accounts (id, name, type, institution) VALUES ('acct-test', 'Test Account', 'checking', 'Test Bank')",
            &[],
        )
        .unwrap();

        // Valid date format should work
        let result = db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id) VALUES ('tx-1', '2025-01-15', 'Test Payee', -5000, 'acct-test')",
            &[],
        );
        assert!(result.is_ok());

        // Invalid date format should fail
        let result = db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id) VALUES ('tx-2', 'Jan 15 2025', 'Test Payee', -5000, 'acct-test')",
            &[],
        );
        assert!(result.is_err(), "Should reject invalid date format");
    }

    #[test]
    fn test_transactions_category_id_set_null_on_delete() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Create a test category
        db.execute(
            "INSERT INTO categories (id, name, type) VALUES ('temp-cat', 'Temp Category', 'expense')",
            &[],
        )
        .unwrap();

        // Create an account
        db.execute(
            "INSERT INTO accounts (id, name, type, institution) VALUES ('acct-test', 'Test Account', 'checking', 'Test Bank')",
            &[],
        )
        .unwrap();

        // Create a transaction with that category
        db.execute(
            "INSERT INTO transactions (id, date, payee, category_id, amount_cents, account_id) VALUES ('tx-test', '2025-01-15', 'Test', 'temp-cat', -5000, 'acct-test')",
            &[],
        )
        .unwrap();

        // Delete the category
        db.execute("DELETE FROM categories WHERE id = 'temp-cat'", &[])
            .unwrap();

        // Transaction should still exist but with NULL category_id
        let category_id: Option<String> = db
            .query_row(
                "SELECT category_id FROM transactions WHERE id = 'tx-test'",
                &[],
                |row| row.get(0),
            )
            .unwrap();
        assert!(category_id.is_none(), "category_id should be NULL after category deletion");
    }

    #[test]
    fn test_transactions_account_cascade_delete() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Create an account
        db.execute(
            "INSERT INTO accounts (id, name, type, institution) VALUES ('acct-del', 'Delete Test', 'checking', 'Test Bank')",
            &[],
        )
        .unwrap();

        // Create a transaction
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id) VALUES ('tx-del', '2025-01-15', 'Test', -5000, 'acct-del')",
            &[],
        )
        .unwrap();

        // Delete the account
        db.execute("DELETE FROM accounts WHERE id = 'acct-del'", &[])
            .unwrap();

        // Transaction should also be deleted
        let count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM transactions WHERE id = 'tx-del'",
                &[],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0, "Transaction should be deleted when account is deleted");
    }

    #[test]
    fn test_transactions_tags_default_to_empty_array() {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        db.execute(
            "INSERT INTO accounts (id, name, type, institution) VALUES ('acct-tags', 'Test Account', 'checking', 'Test Bank')",
            &[],
        )
        .unwrap();

        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id) VALUES ('tx-tags', '2025-01-15', 'Test', -5000, 'acct-tags')",
            &[],
        )
        .unwrap();

        let tags: String = db
            .query_row(
                "SELECT tags FROM transactions WHERE id = 'tx-tags'",
                &[],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(tags, "[]", "Tags should default to empty JSON array");
    }
}
