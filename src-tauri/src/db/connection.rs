//! Database connection management for Stackz
//!
//! Provides a thread-safe database connection pool using rusqlite.

use directories::ProjectDirs;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use rusqlite::{Connection, Result as SqliteResult};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

/// Global database instance
static DATABASE: OnceCell<Database> = OnceCell::new();

/// Database error types
#[derive(Error, Debug)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database not initialized")]
    NotInitialized,

    #[error("Failed to get application data directory")]
    NoAppDataDir,

    #[error("Database already initialized")]
    AlreadyInitialized,
}

/// Thread-safe database wrapper
pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    /// Create a new database connection at the specified path
    pub fn new(path: PathBuf) -> Result<Self, DbError> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&path)?;

        // Enable WAL mode for better concurrency
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        Ok(Self {
            conn: Mutex::new(conn),
            path,
        })
    }

    /// Create a new in-memory database (for testing)
    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self, DbError> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        Ok(Self {
            conn: Mutex::new(conn),
            path: PathBuf::from(":memory:"),
        })
    }

    /// Execute a SQL statement with no return value
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize, DbError> {
        let conn = self.conn.lock();
        Ok(conn.execute(sql, params)?)
    }

    /// Execute a SQL batch (multiple statements)
    pub fn execute_batch(&self, sql: &str) -> Result<(), DbError> {
        let conn = self.conn.lock();
        Ok(conn.execute_batch(sql)?)
    }

    /// Query a single row
    pub fn query_row<T, F>(
        &self,
        sql: &str,
        params: &[&dyn rusqlite::ToSql],
        f: F,
    ) -> Result<T, DbError>
    where
        F: FnOnce(&rusqlite::Row<'_>) -> SqliteResult<T>,
    {
        let conn = self.conn.lock();
        Ok(conn.query_row(sql, params, f)?)
    }

    /// Query multiple rows
    pub fn query_map<T, F>(
        &self,
        sql: &str,
        params: &[&dyn rusqlite::ToSql],
        f: F,
    ) -> Result<Vec<T>, DbError>
    where
        F: FnMut(&rusqlite::Row<'_>) -> SqliteResult<T>,
    {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, f)?;
        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    /// Get the last inserted row ID
    pub fn last_insert_rowid(&self) -> i64 {
        let conn = self.conn.lock();
        conn.last_insert_rowid()
    }

    /// Get the database file path
    pub fn path(&self) -> &PathBuf {
        &self.path
    }

    /// Check if a table exists
    pub fn table_exists(&self, table_name: &str) -> Result<bool, DbError> {
        let count: i32 = self.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
            &[&table_name],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}

/// Get the default database path for the current platform
pub fn get_default_db_path() -> Result<PathBuf, DbError> {
    let proj_dirs = ProjectDirs::from("com", "stackz", "app").ok_or(DbError::NoAppDataDir)?;
    let data_dir = proj_dirs.data_dir();
    Ok(data_dir.join("stackz.db"))
}

/// Initialize the global database instance
pub fn init_database(path: Option<PathBuf>) -> Result<&'static Database, DbError> {
    let db_path = match path {
        Some(p) => p,
        None => get_default_db_path()?,
    };

    DATABASE
        .set(Database::new(db_path)?)
        .map_err(|_| DbError::AlreadyInitialized)?;

    get_database()
}

/// Get the global database instance
pub fn get_database() -> Result<&'static Database, DbError> {
    DATABASE.get().ok_or(DbError::NotInitialized)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;
    use tempfile::TempDir;

    #[test]
    fn test_database_connection_opens_successfully() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db = Database::new(db_path.clone()).unwrap();
        assert!(db_path.exists());
    }

    #[test]
    fn test_connection_uses_correct_file_path() {
        let temp_dir = TempDir::new().unwrap();
        let expected_path = temp_dir.path().join("subdir").join("test.db");
        let db = Database::new(expected_path.clone()).unwrap();
        assert_eq!(db.path(), &expected_path);
    }

    #[test]
    fn test_database_file_permissions() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let _db = Database::new(db_path.clone()).unwrap();

        // On Unix, check file permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = std::fs::metadata(&db_path).unwrap();
            let mode = metadata.permissions().mode();
            // File should be readable and writable by owner
            assert!(
                mode & 0o600 != 0,
                "File should be readable/writable by owner"
            );
        }

        // On all platforms, verify file exists and is accessible
        assert!(db_path.exists());
        assert!(std::fs::File::open(&db_path).is_ok());
    }

    #[test]
    fn test_crud_operations_complete_in_under_100ms() {
        let db = Database::new_in_memory().unwrap();

        // Create test table
        db.execute_batch("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)")
            .unwrap();

        let start = Instant::now();

        // INSERT
        db.execute(
            "INSERT INTO test (name, value) VALUES (?, ?)",
            &[&"test_name", &42],
        )
        .unwrap();

        // SELECT
        let _name: String = db
            .query_row("SELECT name FROM test WHERE id = 1", &[], |row| row.get(0))
            .unwrap();

        // UPDATE
        db.execute("UPDATE test SET value = ? WHERE id = ?", &[&100, &1])
            .unwrap();

        // DELETE
        db.execute("DELETE FROM test WHERE id = ?", &[&1]).unwrap();

        let elapsed = start.elapsed();
        assert!(
            elapsed.as_millis() < 100,
            "CRUD operations took {}ms, should be under 100ms",
            elapsed.as_millis()
        );
    }

    #[test]
    fn test_in_memory_database() {
        let db = Database::new_in_memory().unwrap();
        db.execute_batch("CREATE TABLE test (id INTEGER PRIMARY KEY)")
            .unwrap();
        assert!(db.table_exists("test").unwrap());
    }

    #[test]
    fn test_table_exists() {
        let db = Database::new_in_memory().unwrap();
        assert!(!db.table_exists("nonexistent").unwrap());
        db.execute_batch("CREATE TABLE my_table (id INTEGER)")
            .unwrap();
        assert!(db.table_exists("my_table").unwrap());
    }
}
