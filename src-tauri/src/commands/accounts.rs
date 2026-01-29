//! Account-related Tauri commands
//!
//! Provides commands for querying and managing financial accounts.

use serde::{Deserialize, Serialize};

use crate::db::get_database;

/// Account type enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AccountType {
    Checking,
    Savings,
    Credit,
    Investment,
    Cash,
}

/// Currency enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Currency {
    EUR,
    USD,
    CAD,
}

/// Represents an account in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub institution: String,
    pub currency: String,
    pub is_active: bool,
    pub include_in_net_worth: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Get all accounts
#[tauri::command]
pub fn get_accounts() -> Result<Vec<Account>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let accounts: Vec<Account> = db
        .query_map(
            "SELECT id, name, type, institution, currency, is_active, include_in_net_worth, created_at, updated_at
             FROM accounts
             ORDER BY name",
            &[],
            |row| {
                Ok(Account {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    account_type: row.get(2)?,
                    institution: row.get(3)?,
                    currency: row.get(4)?,
                    is_active: row.get::<_, i32>(5)? == 1,
                    include_in_net_worth: row.get::<_, i32>(6)? == 1,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(accounts)
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
        db
    }

    #[test]
    fn test_get_accounts_returns_empty_array_on_fresh_database() {
        let db = setup_test_db();

        let accounts: Vec<Account> = db
            .query_map(
                "SELECT id, name, type, institution, currency, is_active, include_in_net_worth, created_at, updated_at
                 FROM accounts ORDER BY name",
                &[],
                |row| {
                    Ok(Account {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        account_type: row.get(2)?,
                        institution: row.get(3)?,
                        currency: row.get(4)?,
                        is_active: row.get::<_, i32>(5)? == 1,
                        include_in_net_worth: row.get::<_, i32>(6)? == 1,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                },
            )
            .unwrap();

        assert!(
            accounts.is_empty(),
            "Accounts table should be empty on fresh database"
        );
    }

    #[test]
    fn test_get_accounts_query_performance() {
        let db = setup_test_db();

        let start = Instant::now();

        let _accounts: Vec<Account> = db
            .query_map(
                "SELECT id, name, type, institution, currency, is_active, include_in_net_worth, created_at, updated_at
                 FROM accounts ORDER BY name",
                &[],
                |row| {
                    Ok(Account {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        account_type: row.get(2)?,
                        institution: row.get(3)?,
                        currency: row.get(4)?,
                        is_active: row.get::<_, i32>(5)? == 1,
                        include_in_net_worth: row.get::<_, i32>(6)? == 1,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                },
            )
            .unwrap();

        let elapsed = start.elapsed();
        assert!(
            elapsed.as_millis() < 50,
            "get_accounts query took {}ms, should be under 50ms",
            elapsed.as_millis()
        );
    }
}
