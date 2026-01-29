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
    // Initial migration creates the migrations tracking table
    // Additional migrations will be added in future stories
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

        // Create migrations table
        run_migrations(&db).unwrap();

        // Manually insert a migration record
        db.execute(
            "INSERT INTO _migrations (version, description) VALUES (?, ?)",
            &[&"001", &"Test migration"],
        )
        .unwrap();

        // Verify it's tracked
        let applied = get_applied_migrations(&db).unwrap();
        assert!(applied.contains(&"001".to_string()));
    }

    #[test]
    fn test_migration_runner_skips_already_applied_migrations() {
        let db = Database::new_in_memory().unwrap();

        // Run migrations first time
        run_migrations(&db).unwrap();

        // Add a test migration record
        db.execute(
            "INSERT INTO _migrations (version, description) VALUES (?, ?)",
            &[&"001", &"Test migration"],
        )
        .unwrap();

        // Get count before
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

        // No migrations applied yet
        assert_eq!(get_current_version(&db).unwrap(), None);

        // Apply some migrations
        db.execute(
            "INSERT INTO _migrations (version, description) VALUES (?, ?)",
            &[&"001", &"First"],
        )
        .unwrap();
        db.execute(
            "INSERT INTO _migrations (version, description) VALUES (?, ?)",
            &[&"002", &"Second"],
        )
        .unwrap();

        assert_eq!(get_current_version(&db).unwrap(), Some("002".to_string()));
    }

    #[test]
    fn test_get_applied_migrations_returns_empty_if_no_table() {
        let db = Database::new_in_memory().unwrap();
        let applied = get_applied_migrations(&db).unwrap();
        assert!(applied.is_empty());
    }
}
