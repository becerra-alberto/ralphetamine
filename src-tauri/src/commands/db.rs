//! Database-related Tauri commands
//!
//! Exposes database operations to the frontend via Tauri IPC.

use crate::db::{get_database, DbError};
use serde::{Deserialize, Serialize};

/// Response from db_health_check command
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub version: String,
}

/// Response from db_execute command (for INSERT operations)
#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteResponse {
    pub rows_affected: usize,
    pub last_insert_id: i64,
}

/// Response from db_query command
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResponse {
    pub rows: Vec<serde_json::Value>,
}

/// Convert DbError to a string for Tauri error handling
impl From<DbError> for String {
    fn from(err: DbError) -> Self {
        err.to_string()
    }
}

/// Check database health
///
/// Returns status and version information about the database connection.
#[tauri::command]
pub fn db_health_check() -> Result<HealthCheckResponse, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Try to execute a simple query to verify connection
    let version: String = db
        .query_row("SELECT sqlite_version()", &[], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(HealthCheckResponse {
        status: "ok".to_string(),
        version,
    })
}

/// Execute a SQL statement that doesn't return rows (INSERT, UPDATE, DELETE)
#[tauri::command]
pub fn db_execute(sql: String) -> Result<ExecuteResponse, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let rows_affected = db.execute(&sql, &[]).map_err(|e| e.to_string())?;
    let last_insert_id = db.last_insert_rowid();

    Ok(ExecuteResponse {
        rows_affected,
        last_insert_id,
    })
}

/// Query the database and return rows as JSON
#[tauri::command]
pub fn db_query(sql: String) -> Result<QueryResponse, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Use rusqlite's connection directly for more complex queries
    let conn = &db;

    // For simple queries, we'll return results as JSON arrays
    let rows: Vec<serde_json::Value> = {
        // Since we can't easily introspect column types, we'll use a simpler approach
        // This is a basic implementation - in production, you'd want more sophisticated handling
        conn.query_map(&sql, &[], |row| {
            // Try to get column count from the statement
            // For now, return an empty object - this will be enhanced in future stories
            Ok(serde_json::json!({}))
        })
        .map_err(|e| e.to_string())?
    };

    Ok(QueryResponse { rows })
}

/// Insert a row and return the new ID
#[tauri::command]
pub fn db_insert(table: String, columns: Vec<String>, values: Vec<String>) -> Result<i64, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let placeholders: Vec<&str> = values.iter().map(|_| "?").collect();
    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        table,
        columns.join(", "),
        placeholders.join(", ")
    );

    let params: Vec<&dyn rusqlite::ToSql> =
        values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    db.execute(&sql, params.as_slice())
        .map_err(|e| e.to_string())?;

    Ok(db.last_insert_rowid())
}

/// Update rows in a table
#[tauri::command]
pub fn db_update(
    table: String,
    set_columns: Vec<String>,
    set_values: Vec<String>,
    where_column: String,
    where_value: String,
) -> Result<usize, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let set_clause: Vec<String> = set_columns.iter().map(|c| format!("{} = ?", c)).collect();

    let sql = format!(
        "UPDATE {} SET {} WHERE {} = ?",
        table,
        set_clause.join(", "),
        where_column
    );

    let mut params: Vec<&dyn rusqlite::ToSql> = set_values
        .iter()
        .map(|v| v as &dyn rusqlite::ToSql)
        .collect();
    params.push(&where_value);

    db.execute(&sql, params.as_slice())
        .map_err(|e| e.to_string())
}

/// Delete rows from a table
#[tauri::command]
pub fn db_delete(
    table: String,
    where_column: String,
    where_value: String,
) -> Result<usize, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let sql = format!("DELETE FROM {} WHERE {} = ?", table, where_column);

    db.execute(&sql, &[&where_value]).map_err(|e| e.to_string())
}

/// Select rows from a table
#[tauri::command]
pub fn db_select(
    table: String,
    columns: Vec<String>,
    where_clause: Option<String>,
) -> Result<Vec<Vec<String>>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let cols = if columns.is_empty() {
        "*".to_string()
    } else {
        columns.join(", ")
    };

    let sql = match where_clause {
        Some(clause) => format!("SELECT {} FROM {} WHERE {}", cols, table, clause),
        None => format!("SELECT {} FROM {}", cols, table),
    };

    // For this simple implementation, we return strings
    // A more robust implementation would handle types properly
    db.query_map(&sql, &[], |row| {
        let mut values = Vec::new();
        let col_count = columns.len().max(1);
        for i in 0..col_count {
            let value: String = row.get::<_, String>(i).unwrap_or_default();
            values.push(value);
        }
        Ok(values)
    })
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{init_database, run_migrations, Database};
    use once_cell::sync::OnceCell;
    use parking_lot::Mutex;
    use std::sync::atomic::{AtomicBool, Ordering};
    use tempfile::TempDir;

    // Test isolation: each test gets its own temp database
    fn setup_test_db() -> (TempDir, &'static Database) {
        static INIT: AtomicBool = AtomicBool::new(false);
        static TEST_DB: OnceCell<(TempDir, Database)> = OnceCell::new();

        // For testing, we need a fresh database each time
        // Since global state is tricky, we'll test the underlying functions directly
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");

        // Create database directly for testing
        let db = Database::new(db_path).unwrap();

        // We can't easily return a static reference from a temp dir
        // So these tests will use the Database directly rather than through get_database()
        unimplemented!("Use direct Database tests instead")
    }

    // Direct database tests (not through global state)
    mod direct_tests {
        use super::*;

        fn create_test_db() -> (TempDir, Database) {
            let temp_dir = TempDir::new().unwrap();
            let db_path = temp_dir.path().join("test.db");
            let db = Database::new(db_path).unwrap();
            (temp_dir, db)
        }

        #[test]
        fn test_health_check_returns_ok_status() {
            let (_temp, db) = create_test_db();

            // Test the underlying query that db_health_check uses
            let version: String = db
                .query_row("SELECT sqlite_version()", &[], |row| row.get(0))
                .unwrap();

            assert!(!version.is_empty());
            // SQLite version format is like "3.x.x"
            assert!(version.starts_with("3."));
        }

        #[test]
        fn test_crud_insert_returns_new_row_id() {
            let (_temp, db) = create_test_db();

            db.execute_batch("CREATE TABLE test_items (id INTEGER PRIMARY KEY, name TEXT)")
                .unwrap();

            db.execute("INSERT INTO test_items (name) VALUES (?)", &[&"Item 1"])
                .unwrap();
            let id1 = db.last_insert_rowid();

            db.execute("INSERT INTO test_items (name) VALUES (?)", &[&"Item 2"])
                .unwrap();
            let id2 = db.last_insert_rowid();

            assert_eq!(id1, 1);
            assert_eq!(id2, 2);
        }

        #[test]
        fn test_crud_select_returns_correct_data() {
            let (_temp, db) = create_test_db();

            db.execute_batch(
                "CREATE TABLE test_items (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)",
            )
            .unwrap();

            db.execute(
                "INSERT INTO test_items (name, value) VALUES (?, ?)",
                &[&"Test", &42],
            )
            .unwrap();

            let (name, value): (String, i32) = db
                .query_row(
                    "SELECT name, value FROM test_items WHERE id = 1",
                    &[],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .unwrap();

            assert_eq!(name, "Test");
            assert_eq!(value, 42);
        }

        #[test]
        fn test_crud_update_modifies_correct_row() {
            let (_temp, db) = create_test_db();

            db.execute_batch("CREATE TABLE test_items (id INTEGER PRIMARY KEY, name TEXT)")
                .unwrap();

            db.execute("INSERT INTO test_items (name) VALUES (?)", &[&"Original"])
                .unwrap();
            db.execute("INSERT INTO test_items (name) VALUES (?)", &[&"Other"])
                .unwrap();

            let rows_affected = db
                .execute(
                    "UPDATE test_items SET name = ? WHERE id = ?",
                    &[&"Updated", &1],
                )
                .unwrap();

            assert_eq!(rows_affected, 1);

            let name: String = db
                .query_row("SELECT name FROM test_items WHERE id = 1", &[], |row| {
                    row.get(0)
                })
                .unwrap();

            assert_eq!(name, "Updated");

            // Verify other row unchanged
            let other_name: String = db
                .query_row("SELECT name FROM test_items WHERE id = 2", &[], |row| {
                    row.get(0)
                })
                .unwrap();

            assert_eq!(other_name, "Other");
        }

        #[test]
        fn test_crud_delete_removes_correct_row() {
            let (_temp, db) = create_test_db();

            db.execute_batch("CREATE TABLE test_items (id INTEGER PRIMARY KEY, name TEXT)")
                .unwrap();

            db.execute("INSERT INTO test_items (name) VALUES (?)", &[&"Item 1"])
                .unwrap();
            db.execute("INSERT INTO test_items (name) VALUES (?)", &[&"Item 2"])
                .unwrap();

            let rows_affected = db
                .execute("DELETE FROM test_items WHERE id = ?", &[&1])
                .unwrap();

            assert_eq!(rows_affected, 1);

            // Verify count
            let count: i32 = db
                .query_row("SELECT COUNT(*) FROM test_items", &[], |row| row.get(0))
                .unwrap();

            assert_eq!(count, 1);

            // Verify correct row remains
            let name: String = db
                .query_row("SELECT name FROM test_items WHERE id = 2", &[], |row| {
                    row.get(0)
                })
                .unwrap();

            assert_eq!(name, "Item 2");
        }
    }
}
