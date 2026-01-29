//! User preferences Tauri commands
//!
//! Manages user preferences including onboarding state and goals.

use crate::db::{get_database, DbError};
use serde::{Deserialize, Serialize};

/// Convert DbError to a string for Tauri error handling
fn db_err(err: DbError) -> String {
    err.to_string()
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnboardingStatus {
    pub is_completed: bool,
    pub goals: Vec<String>,
}

/// Check if onboarding has been completed
#[tauri::command]
pub fn check_onboarding_status() -> Result<OnboardingStatus, String> {
    let db = get_database().map_err(db_err)?;

    // Check if onboarding_completed flag exists
    let completed_rows: Vec<String> = db
        .query_map(
            "SELECT value FROM user_preferences WHERE key = 'onboarding_completed'",
            &[],
            |row| row.get(0),
        )
        .map_err(db_err)?;

    let is_completed = completed_rows.first().map(|v| v == "true").unwrap_or(false);

    // Get saved goals
    let goal_rows: Vec<String> = db
        .query_map(
            "SELECT value FROM user_preferences WHERE key = 'user_goals'",
            &[],
            |row| row.get(0),
        )
        .map_err(db_err)?;

    let goals: Vec<String> = goal_rows
        .first()
        .and_then(|v| serde_json::from_str(v).ok())
        .unwrap_or_default();

    Ok(OnboardingStatus {
        is_completed,
        goals,
    })
}

/// Save user goals selection
#[tauri::command]
pub fn save_user_goals(goals: Vec<String>) -> Result<(), String> {
    let db = get_database().map_err(db_err)?;

    let goals_json = serde_json::to_string(&goals).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('user_goals', ?)",
        &[&goals_json as &dyn rusqlite::types::ToSql],
    )
    .map_err(db_err)?;

    Ok(())
}

/// Mark onboarding as completed
#[tauri::command]
pub fn complete_onboarding() -> Result<(), String> {
    let db = get_database().map_err(db_err)?;

    db.execute(
        "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('onboarding_completed', 'true')",
        &[],
    )
    .map_err(db_err)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::db::migrations::run_migrations;

    fn setup_test_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        run_migrations(&db).unwrap();
        db
    }

    #[test]
    fn test_check_first_launch_returns_not_completed_when_no_preferences() {
        let db = setup_test_db();

        let completed_rows: Vec<String> = db
            .query_map(
                "SELECT value FROM user_preferences WHERE key = 'onboarding_completed'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(completed_rows.is_empty());
    }

    #[test]
    fn test_check_first_launch_returns_completed_after_flag_set() {
        let db = setup_test_db();

        db.execute(
            "INSERT INTO user_preferences (key, value) VALUES ('onboarding_completed', 'true')",
            &[],
        )
        .unwrap();

        let completed_rows: Vec<String> = db
            .query_map(
                "SELECT value FROM user_preferences WHERE key = 'onboarding_completed'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(completed_rows.first().unwrap(), "true");
    }

    #[test]
    fn test_save_user_goals_stores_in_database() {
        let db = setup_test_db();

        let goals = vec!["emergency_fund", "track_spending"];
        let goals_json = serde_json::to_string(&goals).unwrap();

        db.execute(
            "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('user_goals', ?)",
            &[&goals_json as &dyn rusqlite::types::ToSql],
        )
        .unwrap();

        let stored: Vec<String> = db
            .query_map(
                "SELECT value FROM user_preferences WHERE key = 'user_goals'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        let parsed: Vec<String> = serde_json::from_str(stored.first().unwrap()).unwrap();
        assert_eq!(parsed, vec!["emergency_fund", "track_spending"]);
    }
}
