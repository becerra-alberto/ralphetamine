//! Transaction-related Tauri commands
//!
//! Provides commands for querying and managing financial transactions.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::get_database;

/// Represents a transaction in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub date: String,
    pub payee: String,
    pub category_id: Option<String>,
    pub memo: Option<String>,
    pub amount_cents: i64,
    pub account_id: String,
    pub tags: Vec<String>,
    pub is_reconciled: bool,
    pub import_source: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Input for creating a transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionInput {
    pub date: String,
    pub payee: String,
    pub category_id: Option<String>,
    pub memo: Option<String>,
    pub amount_cents: i64,
    pub account_id: String,
    pub tags: Option<Vec<String>>,
    pub is_reconciled: Option<bool>,
    pub import_source: Option<String>,
}

/// Input for updating a transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionUpdate {
    pub date: Option<String>,
    pub payee: Option<String>,
    pub category_id: Option<String>,
    pub memo: Option<String>,
    pub amount_cents: Option<i64>,
    pub account_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_reconciled: Option<bool>,
}

/// Filters for querying transactions
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TransactionFilters {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub category_id: Option<String>,
    pub account_id: Option<String>,
    pub payee: Option<String>,
    pub min_amount: Option<i64>,
    pub max_amount: Option<i64>,
    pub uncategorized_only: Option<bool>,
}

/// Category total result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryTotal {
    pub category_id: Option<String>,
    pub total_cents: i64,
}

/// Create a new transaction
#[tauri::command]
pub fn create_transaction(input: TransactionInput) -> Result<Transaction, String> {
    let db = get_database().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let tags_json = serde_json::to_string(&input.tags.unwrap_or_default()).unwrap_or("[]".to_string());
    let is_reconciled = if input.is_reconciled.unwrap_or(false) { 1 } else { 0 };

    db.execute(
        "INSERT INTO transactions (id, date, payee, category_id, memo, amount_cents, account_id, tags, is_reconciled, import_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        &[
            &id,
            &input.date,
            &input.payee,
            &input.category_id.clone().unwrap_or_default(),
            &input.memo.clone().unwrap_or_default(),
            &input.amount_cents.to_string(),
            &input.account_id,
            &tags_json,
            &is_reconciled.to_string(),
            &input.import_source.clone().unwrap_or_default(),
        ],
    )
    .map_err(|e| e.to_string())?;

    get_transaction(id)
}

/// Get a transaction by ID
#[tauri::command]
pub fn get_transaction(id: String) -> Result<Transaction, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    db.query_row(
        "SELECT id, date, payee, category_id, memo, amount_cents, account_id, tags, is_reconciled, import_source, created_at, updated_at
         FROM transactions
         WHERE id = ?",
        &[&id],
        |row| {
            let tags_json: String = row.get(7)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(Transaction {
                id: row.get(0)?,
                date: row.get(1)?,
                payee: row.get(2)?,
                category_id: row.get(3)?,
                memo: row.get(4)?,
                amount_cents: row.get(5)?,
                account_id: row.get(6)?,
                tags,
                is_reconciled: row.get::<_, i32>(8)? == 1,
                import_source: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Update a transaction
#[tauri::command]
pub fn update_transaction(id: String, update: TransactionUpdate) -> Result<Transaction, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Get current transaction
    let current = get_transaction(id.clone())?;

    let date = update.date.unwrap_or(current.date);
    let payee = update.payee.unwrap_or(current.payee);
    let category_id = update.category_id.or(current.category_id);
    let memo = update.memo.or(current.memo);
    let amount_cents = update.amount_cents.unwrap_or(current.amount_cents);
    let account_id = update.account_id.unwrap_or(current.account_id);
    let tags = update.tags.unwrap_or(current.tags);
    let is_reconciled = update.is_reconciled.unwrap_or(current.is_reconciled);

    let tags_json = serde_json::to_string(&tags).unwrap_or("[]".to_string());
    let is_reconciled_int = if is_reconciled { 1 } else { 0 };

    db.execute(
        "UPDATE transactions SET date = ?, payee = ?, category_id = ?, memo = ?, amount_cents = ?, account_id = ?, tags = ?, is_reconciled = ?, updated_at = datetime('now')
         WHERE id = ?",
        &[
            &date,
            &payee,
            &category_id.clone().unwrap_or_default(),
            &memo.clone().unwrap_or_default(),
            &amount_cents.to_string(),
            &account_id,
            &tags_json,
            &is_reconciled_int.to_string(),
            &id,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_transaction(id)
}

/// Delete a transaction
#[tauri::command]
pub fn delete_transaction(id: String) -> Result<bool, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let rows_affected = db
        .execute("DELETE FROM transactions WHERE id = ?", &[&id])
        .map_err(|e| e.to_string())?;

    Ok(rows_affected > 0)
}

/// Get transactions with optional filters
#[tauri::command]
pub fn get_transactions(filters: Option<TransactionFilters>) -> Result<Vec<Transaction>, String> {
    let db = get_database().map_err(|e| e.to_string())?;
    let filters = filters.unwrap_or_default();

    // For simplicity, build a static query based on common filter patterns
    // In a production app, you might use a query builder library

    if let Some(ref start_date) = filters.start_date {
        if let Some(ref end_date) = filters.end_date {
            // Filter by date range
            return db.query_map(
                "SELECT id, date, payee, category_id, memo, amount_cents, account_id, tags, is_reconciled, import_source, created_at, updated_at
                 FROM transactions WHERE date >= ? AND date <= ?
                 ORDER BY date DESC, created_at DESC",
                &[start_date, end_date],
                parse_transaction_row,
            ).map_err(|e| e.to_string());
        }
    }

    if let Some(ref account_id) = filters.account_id {
        return db.query_map(
            "SELECT id, date, payee, category_id, memo, amount_cents, account_id, tags, is_reconciled, import_source, created_at, updated_at
             FROM transactions WHERE account_id = ?
             ORDER BY date DESC, created_at DESC",
            &[account_id],
            parse_transaction_row,
        ).map_err(|e| e.to_string());
    }

    if filters.uncategorized_only.unwrap_or(false) {
        return db.query_map(
            "SELECT id, date, payee, category_id, memo, amount_cents, account_id, tags, is_reconciled, import_source, created_at, updated_at
             FROM transactions WHERE category_id IS NULL OR category_id = ''
             ORDER BY date DESC, created_at DESC",
            &[],
            parse_transaction_row,
        ).map_err(|e| e.to_string());
    }

    // Default: return all transactions
    db.query_map(
        "SELECT id, date, payee, category_id, memo, amount_cents, account_id, tags, is_reconciled, import_source, created_at, updated_at
         FROM transactions
         ORDER BY date DESC, created_at DESC",
        &[],
        parse_transaction_row,
    )
    .map_err(|e| e.to_string())
}

/// Helper function to parse a transaction row
fn parse_transaction_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Transaction> {
    let tags_json: String = row.get(7)?;
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

    Ok(Transaction {
        id: row.get(0)?,
        date: row.get(1)?,
        payee: row.get(2)?,
        category_id: row.get(3)?,
        memo: row.get(4)?,
        amount_cents: row.get(5)?,
        account_id: row.get(6)?,
        tags,
        is_reconciled: row.get::<_, i32>(8)? == 1,
        import_source: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

/// Get category totals for a specific month
#[tauri::command]
pub fn get_category_totals(month: String) -> Result<Vec<CategoryTotal>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    db.query_map(
        "SELECT category_id, SUM(amount_cents) as total_cents
         FROM transactions
         WHERE date LIKE ?
         GROUP BY category_id",
        &[&format!("{}%", month)],
        |row| {
            Ok(CategoryTotal {
                category_id: row.get(0)?,
                total_cents: row.get(1)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Get total for uncategorized transactions in a month
#[tauri::command]
pub fn get_uncategorized_total(month: String) -> Result<i64, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    db.query_row(
        "SELECT COALESCE(SUM(amount_cents), 0)
         FROM transactions
         WHERE date LIKE ? AND (category_id IS NULL OR category_id = '')",
        &[&format!("{}%", month)],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::db::migrations::run_migrations;
    use std::time::Instant;

    fn setup_test_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Create a test account
        db.execute(
            "INSERT INTO accounts (id, name, type, institution) VALUES ('test-account', 'Test Account', 'checking', 'Test Bank')",
            &[],
        )
        .unwrap();

        db
    }

    #[test]
    fn test_transactions_table_has_all_required_columns() {
        let db = setup_test_db();

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
    fn test_transaction_insert_and_get() {
        let db = setup_test_db();

        let id = Uuid::new_v4().to_string();

        // Insert a transaction
        db.execute(
            "INSERT INTO transactions (id, date, payee, category_id, amount_cents, account_id, tags)
             VALUES (?, '2025-01-15', 'Test Payee', 'cat-essential-groceries', -5000, 'test-account', '[]')",
            &[&id],
        )
        .unwrap();

        // Query the transaction
        let amount: i64 = db
            .query_row(
                "SELECT amount_cents FROM transactions WHERE id = ?",
                &[&id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(amount, -5000, "Amount should be stored correctly in cents");
    }

    #[test]
    fn test_transaction_date_format_validation() {
        let db = setup_test_db();

        // Valid date format
        let valid_result = db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('valid-txn', '2025-01-15', 'Payee', -1000, 'test-account', '[]')",
            &[],
        );
        assert!(valid_result.is_ok(), "Valid date format should work");

        // Invalid date format
        let invalid_result = db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('invalid-txn', 'January 15, 2025', 'Payee', -1000, 'test-account', '[]')",
            &[],
        );
        assert!(invalid_result.is_err(), "Invalid date format should fail");
    }

    #[test]
    fn test_transaction_category_set_null_on_delete() {
        let db = setup_test_db();

        // Insert a test category
        db.execute(
            "INSERT INTO categories (id, name, type) VALUES ('test-cat', 'Test Category', 'expense')",
            &[],
        )
        .unwrap();

        // Insert a transaction with this category
        db.execute(
            "INSERT INTO transactions (id, date, payee, category_id, amount_cents, account_id, tags)
             VALUES ('test-txn', '2025-01-15', 'Payee', 'test-cat', -1000, 'test-account', '[]')",
            &[],
        )
        .unwrap();

        // Delete the category
        db.execute("DELETE FROM categories WHERE id = 'test-cat'", &[])
            .unwrap();

        // Transaction's category_id should be NULL
        let category_id: Option<String> = db
            .query_row(
                "SELECT category_id FROM transactions WHERE id = 'test-txn'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(
            category_id.is_none() || category_id == Some("".to_string()),
            "Category ID should be NULL after category deletion"
        );
    }

    #[test]
    fn test_transaction_cascade_delete_on_account_delete() {
        let db = setup_test_db();

        // Insert a transaction
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('cascade-txn', '2025-01-15', 'Payee', -1000, 'test-account', '[]')",
            &[],
        )
        .unwrap();

        // Delete the account
        db.execute("DELETE FROM accounts WHERE id = 'test-account'", &[])
            .unwrap();

        // Transaction should be deleted
        let count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM transactions WHERE id = 'cascade-txn'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(
            count, 0,
            "Transaction should be deleted when account is deleted"
        );
    }

    #[test]
    fn test_transactions_indexes_exist() {
        let db = setup_test_db();

        let indexes: Vec<String> = db
            .query_map(
                "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_transactions_%'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(
            indexes.contains(&"idx_transactions_date".to_string()),
            "idx_transactions_date should exist"
        );
        assert!(
            indexes.contains(&"idx_transactions_category".to_string()),
            "idx_transactions_category should exist"
        );
        assert!(
            indexes.contains(&"idx_transactions_account".to_string()),
            "idx_transactions_account should exist"
        );
        assert!(
            indexes.contains(&"idx_transactions_payee".to_string()),
            "idx_transactions_payee should exist"
        );
    }

    #[test]
    fn test_category_totals_aggregation() {
        let db = setup_test_db();

        // Insert multiple transactions
        db.execute(
            "INSERT INTO transactions (id, date, payee, category_id, amount_cents, account_id, tags)
             VALUES ('txn1', '2025-01-15', 'Store 1', 'cat-essential-groceries', -5000, 'test-account', '[]')",
            &[],
        )
        .unwrap();
        db.execute(
            "INSERT INTO transactions (id, date, payee, category_id, amount_cents, account_id, tags)
             VALUES ('txn2', '2025-01-20', 'Store 2', 'cat-essential-groceries', -3000, 'test-account', '[]')",
            &[],
        )
        .unwrap();

        // Query category totals
        let totals: Vec<(Option<String>, i64)> = db
            .query_map(
                "SELECT category_id, SUM(amount_cents) FROM transactions WHERE date LIKE '2025-01%' GROUP BY category_id",
                &[],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        let grocery_total = totals
            .iter()
            .find(|(cat, _)| cat.as_deref() == Some("cat-essential-groceries"))
            .map(|(_, total)| *total);

        assert_eq!(
            grocery_total,
            Some(-8000),
            "Sum should be -8000 cents (-$80)"
        );
    }

    #[test]
    fn test_query_performance_with_many_transactions() {
        let db = setup_test_db();

        // Insert 1000 transactions
        for i in 0..1000 {
            let id = format!("perf-txn-{}", i);
            let date = format!("2025-01-{:02}", (i % 28) + 1);
            db.execute(
                "INSERT INTO transactions (id, date, payee, category_id, amount_cents, account_id, tags)
                 VALUES (?, ?, 'Test Payee', 'cat-essential-groceries', -100, 'test-account', '[]')",
                &[&id, &date],
            )
            .unwrap();
        }

        // Measure query time
        let start = Instant::now();

        let _transactions: Vec<String> = db
            .query_map(
                "SELECT id FROM transactions WHERE date >= '2025-01-01' AND date <= '2025-01-31' ORDER BY date",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        let elapsed = start.elapsed();

        assert!(
            elapsed.as_millis() < 100,
            "Query took {}ms, should be under 100ms",
            elapsed.as_millis()
        );
    }
}
