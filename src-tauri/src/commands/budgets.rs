//! Budget-related Tauri commands
//!
//! Provides commands for querying and managing budget allocations.

use serde::{Deserialize, Serialize};

use crate::db::get_database;

/// Represents a budget entry in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Budget {
    pub category_id: String,
    pub month: String,
    pub amount_cents: i64,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Input for creating/updating a budget
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetInput {
    pub category_id: String,
    pub month: String,
    pub amount_cents: i64,
    pub note: Option<String>,
}

/// Set a budget for a category and month (insert or update)
#[tauri::command]
pub fn set_budget(input: BudgetInput) -> Result<Budget, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Use INSERT OR REPLACE to upsert
    db.execute(
        "INSERT OR REPLACE INTO budgets (category_id, month, amount_cents, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM budgets WHERE category_id = ? AND month = ?), datetime('now')), datetime('now'))",
        &[&input.category_id, &input.month, &input.amount_cents.to_string(), &input.note.clone().unwrap_or_default(), &input.category_id, &input.month],
    )
    .map_err(|e| e.to_string())?;

    // Fetch and return the budget
    get_budget(input.category_id, input.month)
}

/// Get a budget for a specific category and month
#[tauri::command]
pub fn get_budget(category_id: String, month: String) -> Result<Budget, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    db.query_row(
        "SELECT category_id, month, amount_cents, note, created_at, updated_at
         FROM budgets
         WHERE category_id = ? AND month = ?",
        &[&category_id, &month],
        |row| {
            Ok(Budget {
                category_id: row.get(0)?,
                month: row.get(1)?,
                amount_cents: row.get(2)?,
                note: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Get all budgets for a specific month
#[tauri::command]
pub fn get_budgets_for_month(month: String) -> Result<Vec<Budget>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    db.query_map(
        "SELECT category_id, month, amount_cents, note, created_at, updated_at
         FROM budgets
         WHERE month = ?
         ORDER BY category_id",
        &[&month],
        |row| {
            Ok(Budget {
                category_id: row.get(0)?,
                month: row.get(1)?,
                amount_cents: row.get(2)?,
                note: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Get budgets for a category within a date range
#[tauri::command]
pub fn get_budgets_for_category(
    category_id: String,
    start_month: String,
    end_month: String,
) -> Result<Vec<Budget>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    db.query_map(
        "SELECT category_id, month, amount_cents, note, created_at, updated_at
         FROM budgets
         WHERE category_id = ? AND month >= ? AND month <= ?
         ORDER BY month",
        &[&category_id, &start_month, &end_month],
        |row| {
            Ok(Budget {
                category_id: row.get(0)?,
                month: row.get(1)?,
                amount_cents: row.get(2)?,
                note: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Delete a budget
#[tauri::command]
pub fn delete_budget(category_id: String, month: String) -> Result<bool, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let rows_affected = db
        .execute(
            "DELETE FROM budgets WHERE category_id = ? AND month = ?",
            &[&category_id, &month],
        )
        .map_err(|e| e.to_string())?;

    Ok(rows_affected > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::db::migrations::run_migrations;

    fn setup_test_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();

        // Create a test account for transaction tests
        db.execute(
            "INSERT INTO accounts (id, name, type, institution) VALUES ('test-account', 'Test Account', 'checking', 'Test Bank')",
            &[],
        )
        .unwrap();

        db
    }

    #[test]
    fn test_budgets_table_has_all_required_columns() {
        let db = setup_test_db();

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
    fn test_budget_insert_and_get() {
        let db = setup_test_db();

        // Insert a budget
        db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents, note) VALUES ('cat-housing-rent', '2025-01', 150000, 'Test budget')",
            &[],
        )
        .unwrap();

        // Query the budget
        let budget: Budget = db
            .query_row(
                "SELECT category_id, month, amount_cents, note, created_at, updated_at FROM budgets WHERE category_id = ? AND month = ?",
                &[&"cat-housing-rent", &"2025-01"],
                |row| {
                    Ok(Budget {
                        category_id: row.get(0)?,
                        month: row.get(1)?,
                        amount_cents: row.get(2)?,
                        note: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .unwrap();

        assert_eq!(budget.category_id, "cat-housing-rent");
        assert_eq!(budget.month, "2025-01");
        assert_eq!(budget.amount_cents, 150000);
        assert_eq!(budget.note, Some("Test budget".to_string()));
    }

    #[test]
    fn test_budget_month_format_validation() {
        let db = setup_test_db();

        // Valid month format
        let valid_result = db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('cat-housing-rent', '2025-01', 100000)",
            &[],
        );
        assert!(valid_result.is_ok(), "Valid month format should work");

        // Invalid month format
        let invalid_result = db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('cat-housing-gas', 'January 2025', 50000)",
            &[],
        );
        assert!(invalid_result.is_err(), "Invalid month format should fail");
    }

    #[test]
    fn test_budgets_for_month_query() {
        let db = setup_test_db();

        // Insert multiple budgets for same month
        db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('cat-housing-rent', '2025-01', 150000)",
            &[],
        )
        .unwrap();
        db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('cat-essential-groceries', '2025-01', 60000)",
            &[],
        )
        .unwrap();

        let budgets: Vec<Budget> = db
            .query_map(
                "SELECT category_id, month, amount_cents, note, created_at, updated_at FROM budgets WHERE month = ?",
                &[&"2025-01"],
                |row| {
                    Ok(Budget {
                        category_id: row.get(0)?,
                        month: row.get(1)?,
                        amount_cents: row.get(2)?,
                        note: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .unwrap();

        assert_eq!(budgets.len(), 2);
    }

    #[test]
    fn test_budget_cascade_delete_on_category_delete() {
        let db = setup_test_db();

        // Insert a test category
        db.execute(
            "INSERT INTO categories (id, name, type) VALUES ('test-cat', 'Test Category', 'expense')",
            &[],
        )
        .unwrap();

        // Insert a budget for this category
        db.execute(
            "INSERT INTO budgets (category_id, month, amount_cents) VALUES ('test-cat', '2025-01', 100000)",
            &[],
        )
        .unwrap();

        // Delete the category
        db.execute("DELETE FROM categories WHERE id = 'test-cat'", &[])
            .unwrap();

        // Budget should be deleted due to CASCADE
        let count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM budgets WHERE category_id = 'test-cat'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 0, "Budget should be deleted when category is deleted");
    }

    #[test]
    fn test_budgets_index_exists() {
        let db = setup_test_db();

        let indexes: Vec<String> = db
            .query_map(
                "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_budgets_month'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(
            indexes.contains(&"idx_budgets_month".to_string()),
            "idx_budgets_month index should exist"
        );
    }
}
