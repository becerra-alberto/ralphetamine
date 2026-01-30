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
    MXN,
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
    pub bank_number: Option<String>,
    pub country: Option<String>,
}

/// Get all accounts
#[tauri::command]
pub fn get_accounts() -> Result<Vec<Account>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let accounts: Vec<Account> = db
        .query_map(
            "SELECT id, name, type, institution, currency, is_active, include_in_net_worth, created_at, updated_at, bank_number, country
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
                    bank_number: row.get(9)?,
                    country: row.get(10)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(accounts)
}

/// Account with its calculated balance
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountWithBalance {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub institution: String,
    pub currency: String,
    pub is_active: bool,
    pub include_in_net_worth: bool,
    pub balance_cents: i64,
    pub last_balance_update: Option<String>,
    pub bank_number: Option<String>,
    pub country: Option<String>,
}

/// Net worth summary data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetWorthSummary {
    pub total_assets_cents: i64,
    pub total_liabilities_cents: i64,
    pub net_worth_cents: i64,
    pub accounts: Vec<AccountWithBalance>,
}

/// Get net worth summary with account balances
/// Only includes active accounts with include_in_net_worth = true
#[tauri::command]
pub fn get_net_worth_summary() -> Result<NetWorthSummary, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let accounts: Vec<AccountWithBalance> = db
        .query_map(
            "SELECT a.id, a.name, a.type, a.institution, a.currency, a.is_active, a.include_in_net_worth,
                    COALESCE(SUM(t.amount_cents), 0) as balance_cents, a.last_balance_update, a.bank_number, a.country
             FROM accounts a
             LEFT JOIN transactions t ON t.account_id = a.id
             WHERE a.is_active = 1 AND a.include_in_net_worth = 1
             GROUP BY a.id
             ORDER BY a.name",
            &[],
            |row| {
                Ok(AccountWithBalance {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    account_type: row.get(2)?,
                    institution: row.get(3)?,
                    currency: row.get(4)?,
                    is_active: row.get::<_, i32>(5)? == 1,
                    include_in_net_worth: row.get::<_, i32>(6)? == 1,
                    balance_cents: row.get(7)?,
                    last_balance_update: row.get(8)?,
                    bank_number: row.get(9)?,
                    country: row.get(10)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut total_assets_cents: i64 = 0;
    let mut total_liabilities_cents: i64 = 0;

    for account in &accounts {
        match account.account_type.as_str() {
            "credit" => {
                if account.balance_cents < 0 {
                    total_liabilities_cents += account.balance_cents.abs();
                }
            }
            _ => {
                if account.balance_cents > 0 {
                    total_assets_cents += account.balance_cents;
                }
            }
        }
    }

    let net_worth_cents = total_assets_cents - total_liabilities_cents;

    Ok(NetWorthSummary {
        total_assets_cents,
        total_liabilities_cents,
        net_worth_cents,
        accounts,
    })
}

/// Net worth history snapshot for a specific month
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetWorthSnapshot {
    pub month: String,
    pub total_assets_cents: i64,
    pub total_liabilities_cents: i64,
    pub net_worth_cents: i64,
}

/// Month-over-month change data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MomChangeData {
    pub has_previous: bool,
    pub change_cents: i64,
    pub change_percent: f64,
    pub previous_month: Option<String>,
    pub previous_net_worth_cents: Option<i64>,
    pub current_net_worth_cents: i64,
}

/// Save a net worth snapshot for the given month
/// Uses INSERT OR REPLACE to upsert
#[tauri::command]
pub fn save_net_worth_snapshot(month: String, total_assets_cents: i64, total_liabilities_cents: i64, net_worth_cents: i64) -> Result<(), String> {
    let db = get_database().map_err(|e| e.to_string())?;

    db.execute(
        "INSERT OR REPLACE INTO net_worth_history (month, total_assets_cents, total_liabilities_cents, net_worth_cents)
         VALUES (?, ?, ?, ?)",
        &[
            &month as &dyn rusqlite::ToSql,
            &total_assets_cents as &dyn rusqlite::ToSql,
            &total_liabilities_cents as &dyn rusqlite::ToSql,
            &net_worth_cents as &dyn rusqlite::ToSql,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get month-over-month change by comparing current net worth to the previous month's snapshot
#[tauri::command]
pub fn get_mom_change(current_month: String, current_net_worth_cents: i64) -> Result<MomChangeData, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Find the previous month's snapshot (the latest one before current_month)
    let previous: Option<NetWorthSnapshot> = db
        .query_map(
            "SELECT month, total_assets_cents, total_liabilities_cents, net_worth_cents
             FROM net_worth_history
             WHERE month < ?
             ORDER BY month DESC
             LIMIT 1",
            &[&current_month as &dyn rusqlite::ToSql],
            |row| {
                Ok(NetWorthSnapshot {
                    month: row.get(0)?,
                    total_assets_cents: row.get(1)?,
                    total_liabilities_cents: row.get(2)?,
                    net_worth_cents: row.get(3)?,
                })
            },
        )
        .map_err(|e| e.to_string())?
        .into_iter()
        .next();

    match previous {
        Some(prev) => {
            let change_cents = current_net_worth_cents - prev.net_worth_cents;
            let change_percent = if prev.net_worth_cents == 0 {
                if current_net_worth_cents == 0 {
                    0.0
                } else {
                    // Previous was 0 but now it's not - show as 100% (or -100%)
                    if current_net_worth_cents > 0 { 100.0 } else { -100.0 }
                }
            } else {
                (change_cents as f64 / prev.net_worth_cents.abs() as f64) * 100.0
            };

            Ok(MomChangeData {
                has_previous: true,
                change_cents,
                change_percent,
                previous_month: Some(prev.month),
                previous_net_worth_cents: Some(prev.net_worth_cents),
                current_net_worth_cents,
            })
        }
        None => {
            Ok(MomChangeData {
                has_previous: false,
                change_cents: 0,
                change_percent: 0.0,
                previous_month: None,
                previous_net_worth_cents: None,
                current_net_worth_cents,
            })
        }
    }
}

/// Create a new account
#[tauri::command]
pub fn create_account(
    name: String,
    account_type: String,
    institution: String,
    currency: String,
    starting_balance_cents: i64,
    bank_number: Option<String>,
    country: Option<String>,
) -> Result<String, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let id = format!("acc-{}", uuid::Uuid::new_v4());

    db.execute(
        "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth, last_balance_update, bank_number, country)
         VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'), ?, ?)",
        &[
            &id as &dyn rusqlite::ToSql,
            &name as &dyn rusqlite::ToSql,
            &account_type as &dyn rusqlite::ToSql,
            &institution as &dyn rusqlite::ToSql,
            &currency as &dyn rusqlite::ToSql,
            &bank_number as &dyn rusqlite::ToSql,
            &country as &dyn rusqlite::ToSql,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Create initial balance transaction
    if starting_balance_cents != 0 {
        let tx_id = format!("tx-init-{}", uuid::Uuid::new_v4());
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, memo, tags)
             VALUES (?, date('now'), 'Starting Balance', ?, ?, 'Initial account balance', '[]')",
            &[
                &tx_id as &dyn rusqlite::ToSql,
                &starting_balance_cents as &dyn rusqlite::ToSql,
                &id as &dyn rusqlite::ToSql,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    // Record initial balance in history
    db.execute(
        "INSERT INTO account_balance_history (account_id, balance_cents)
         VALUES (?, ?)",
        &[
            &id as &dyn rusqlite::ToSql,
            &starting_balance_cents as &dyn rusqlite::ToSql,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

/// Update an account's balance by creating an adjustment transaction
#[tauri::command]
pub fn update_account_balance(
    account_id: String,
    new_balance_cents: i64,
) -> Result<(), String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Get current balance
    let current_balance: i64 = db
        .query_row(
            "SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE account_id = ?",
            &[&account_id as &dyn rusqlite::ToSql],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let adjustment = new_balance_cents - current_balance;

    if adjustment != 0 {
        let tx_id = format!("tx-adj-{}", uuid::Uuid::new_v4());
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, memo, tags)
             VALUES (?, date('now'), 'Balance Adjustment', ?, ?, 'Manual balance update', '[]')",
            &[
                &tx_id as &dyn rusqlite::ToSql,
                &adjustment as &dyn rusqlite::ToSql,
                &account_id as &dyn rusqlite::ToSql,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    // Update last_balance_update timestamp
    db.execute(
        "UPDATE accounts SET last_balance_update = datetime('now') WHERE id = ?",
        &[&account_id as &dyn rusqlite::ToSql],
    )
    .map_err(|e| e.to_string())?;

    // Record in balance history
    db.execute(
        "INSERT INTO account_balance_history (account_id, balance_cents)
         VALUES (?, ?)",
        &[
            &account_id as &dyn rusqlite::ToSql,
            &new_balance_cents as &dyn rusqlite::ToSql,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Input for updating an existing account
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountUpdate {
    pub name: Option<String>,
    pub account_type: Option<String>,
    pub institution: Option<String>,
    pub currency: Option<String>,
    pub is_active: Option<bool>,
    pub include_in_net_worth: Option<bool>,
    pub bank_number: Option<String>,
    pub country: Option<String>,
}

/// Update an existing account's details
#[tauri::command]
pub fn update_account(id: String, update: AccountUpdate) -> Result<Account, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Build dynamic SET clause
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref name) = update.name {
        sets.push("name = ?".to_string());
        params.push(Box::new(name.clone()));
    }
    if let Some(ref account_type) = update.account_type {
        sets.push("type = ?".to_string());
        params.push(Box::new(account_type.clone()));
    }
    if let Some(ref institution) = update.institution {
        sets.push("institution = ?".to_string());
        params.push(Box::new(institution.clone()));
    }
    if let Some(ref currency) = update.currency {
        sets.push("currency = ?".to_string());
        params.push(Box::new(currency.clone()));
    }
    if let Some(is_active) = update.is_active {
        sets.push("is_active = ?".to_string());
        params.push(Box::new(is_active as i32));
    }
    if let Some(include_in_net_worth) = update.include_in_net_worth {
        sets.push("include_in_net_worth = ?".to_string());
        params.push(Box::new(include_in_net_worth as i32));
    }
    if let Some(ref bank_number) = update.bank_number {
        sets.push("bank_number = ?".to_string());
        params.push(Box::new(bank_number.clone()));
    }
    if let Some(ref country) = update.country {
        sets.push("country = ?".to_string());
        params.push(Box::new(country.clone()));
    }

    if sets.is_empty() {
        return Err("No fields to update".to_string());
    }

    sets.push("updated_at = datetime('now')".to_string());
    params.push(Box::new(id.clone()));

    let sql = format!(
        "UPDATE accounts SET {} WHERE id = ?",
        sets.join(", ")
    );

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    db.execute(&sql, param_refs.as_slice())
        .map_err(|e| e.to_string())?;

    // Return the updated account
    let account: Account = db
        .query_row(
            "SELECT id, name, type, institution, currency, is_active, include_in_net_worth, created_at, updated_at, bank_number, country
             FROM accounts WHERE id = ?",
            &[&id as &dyn rusqlite::ToSql],
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
                    bank_number: row.get(9)?,
                    country: row.get(10)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(account)
}

/// Soft-delete an account by setting is_active = false.
/// Returns the number of linked transactions as a warning.
#[tauri::command]
pub fn delete_account(id: String) -> Result<i64, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    // Count linked transactions for the warning
    let tx_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM transactions WHERE account_id = ?",
            &[&id as &dyn rusqlite::ToSql],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Soft-delete: set is_active = false
    db.execute(
        "UPDATE accounts SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
        &[&id as &dyn rusqlite::ToSql],
    )
    .map_err(|e| e.to_string())?;

    Ok(tx_count)
}

/// Get balance history for an account
#[tauri::command]
pub fn get_balance_history(account_id: String) -> Result<Vec<(i64, String)>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let history: Vec<(i64, String)> = db
        .query_map(
            "SELECT balance_cents, recorded_at FROM account_balance_history
             WHERE account_id = ?
             ORDER BY recorded_at DESC
             LIMIT 50",
            &[&account_id as &dyn rusqlite::ToSql],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    Ok(history)
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
                "SELECT id, name, type, institution, currency, is_active, include_in_net_worth, created_at, updated_at, bank_number, country
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
                        bank_number: row.get(9)?,
                        country: row.get(10)?,
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
                "SELECT id, name, type, institution, currency, is_active, include_in_net_worth, created_at, updated_at, bank_number, country
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
                        bank_number: row.get(9)?,
                        country: row.get(10)?,
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

    // --- Net Worth Summary tests for Story 5.1 ---

    fn setup_net_worth_test_db() -> Database {
        let db = setup_test_db();

        // Create accounts
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES ('acc-checking', 'Main Checking', 'checking', 'ING', 'EUR', 1, 1)",
            &[],
        ).unwrap();
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES ('acc-savings', 'Savings', 'savings', 'ING', 'EUR', 1, 1)",
            &[],
        ).unwrap();
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES ('acc-credit', 'Credit Card', 'credit', 'Visa', 'EUR', 1, 1)",
            &[],
        ).unwrap();
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES ('acc-inactive', 'Old Account', 'checking', 'ABN', 'EUR', 0, 1)",
            &[],
        ).unwrap();
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES ('acc-excluded', 'Excluded', 'cash', 'Cash', 'EUR', 1, 0)",
            &[],
        ).unwrap();

        // Add transactions to checking: +500000 (salary), -150000 (expenses) = +350000
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('t1', '2025-01-15', 'Employer', 500000, 'acc-checking', '[]')",
            &[],
        ).unwrap();
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('t2', '2025-01-20', 'Rent', -150000, 'acc-checking', '[]')",
            &[],
        ).unwrap();

        // Add transactions to savings: +200000
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('t3', '2025-01-10', 'Transfer', 200000, 'acc-savings', '[]')",
            &[],
        ).unwrap();

        // Add transactions to credit: -75000 (liability)
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('t4', '2025-01-12', 'Store', -75000, 'acc-credit', '[]')",
            &[],
        ).unwrap();

        // Add transactions to inactive account (should be excluded)
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('t5', '2025-01-05', 'Old Salary', 100000, 'acc-inactive', '[]')",
            &[],
        ).unwrap();

        // Add transactions to excluded account (should be excluded)
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('t6', '2025-01-06', 'Cash', 50000, 'acc-excluded', '[]')",
            &[],
        ).unwrap();

        db
    }

    #[test]
    fn test_net_worth_summary_returns_correct_totals() {
        let db = setup_net_worth_test_db();

        let accounts: Vec<AccountWithBalance> = db
            .query_map(
                "SELECT a.id, a.name, a.type, a.institution, a.currency, a.is_active, a.include_in_net_worth,
                        COALESCE(SUM(t.amount_cents), 0) as balance_cents
                 FROM accounts a
                 LEFT JOIN transactions t ON t.account_id = a.id
                 WHERE a.is_active = 1 AND a.include_in_net_worth = 1
                 GROUP BY a.id
                 ORDER BY a.name",
                &[],
                |row| {
                    Ok(AccountWithBalance {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        account_type: row.get(2)?,
                        institution: row.get(3)?,
                        currency: row.get(4)?,
                        is_active: row.get::<_, i32>(5)? == 1,
                        include_in_net_worth: row.get::<_, i32>(6)? == 1,
                        balance_cents: row.get(7)?,
                        last_balance_update: None,
                        bank_number: None,
                        country: None,
                    })
                },
            )
            .unwrap();

        // Should only include 3 active + included accounts
        assert_eq!(accounts.len(), 3, "Should include 3 active net-worth accounts");

        // Calculate totals
        let mut total_assets: i64 = 0;
        let mut total_liabilities: i64 = 0;

        for account in &accounts {
            match account.account_type.as_str() {
                "credit" => {
                    if account.balance_cents < 0 {
                        total_liabilities += account.balance_cents.abs();
                    }
                }
                _ => {
                    if account.balance_cents > 0 {
                        total_assets += account.balance_cents;
                    }
                }
            }
        }

        // Checking: 500000 - 150000 = 350000
        // Savings: 200000
        // Total assets = 550000
        assert_eq!(total_assets, 550000, "Total assets should be 550000 cents");

        // Credit: -75000 -> liability = 75000
        assert_eq!(total_liabilities, 75000, "Total liabilities should be 75000 cents");

        // Net worth = 550000 - 75000 = 475000
        let net_worth = total_assets - total_liabilities;
        assert_eq!(net_worth, 475000, "Net worth should be 475000 cents");
    }

    #[test]
    fn test_net_worth_cents_arithmetic() {
        // Verify cents arithmetic: 10000 + 5000 = 15000 (not 150.00)
        let a: i64 = 10000;
        let b: i64 = 5000;
        assert_eq!(a + b, 15000, "Cents arithmetic should produce 15000, not 150.00");

        // Verify subtraction
        assert_eq!(a - b, 5000, "10000 - 5000 should be 5000 cents");
    }

    #[test]
    fn test_net_worth_account_type_aggregation() {
        let db = setup_net_worth_test_db();

        // Get balances by account type
        let type_totals: Vec<(String, i64)> = db
            .query_map(
                "SELECT a.type, COALESCE(SUM(t.amount_cents), 0)
                 FROM accounts a
                 LEFT JOIN transactions t ON t.account_id = a.id
                 WHERE a.is_active = 1 AND a.include_in_net_worth = 1
                 GROUP BY a.type
                 ORDER BY a.type",
                &[],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        let checking_total = type_totals.iter().find(|(t, _)| t == "checking").map(|(_, v)| *v);
        let savings_total = type_totals.iter().find(|(t, _)| t == "savings").map(|(_, v)| *v);
        let credit_total = type_totals.iter().find(|(t, _)| t == "credit").map(|(_, v)| *v);

        assert_eq!(checking_total, Some(350000), "Checking balance: 500000 - 150000 = 350000");
        assert_eq!(savings_total, Some(200000), "Savings balance: 200000");
        assert_eq!(credit_total, Some(-75000), "Credit balance: -75000");
    }

    #[test]
    fn test_net_worth_excludes_inactive_and_non_included_accounts() {
        let db = setup_net_worth_test_db();

        let accounts: Vec<AccountWithBalance> = db
            .query_map(
                "SELECT a.id, a.name, a.type, a.institution, a.currency, a.is_active, a.include_in_net_worth,
                        COALESCE(SUM(t.amount_cents), 0) as balance_cents
                 FROM accounts a
                 LEFT JOIN transactions t ON t.account_id = a.id
                 WHERE a.is_active = 1 AND a.include_in_net_worth = 1
                 GROUP BY a.id",
                &[],
                |row| {
                    Ok(AccountWithBalance {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        account_type: row.get(2)?,
                        institution: row.get(3)?,
                        currency: row.get(4)?,
                        is_active: row.get::<_, i32>(5)? == 1,
                        include_in_net_worth: row.get::<_, i32>(6)? == 1,
                        balance_cents: row.get(7)?,
                        last_balance_update: None,
                        bank_number: None,
                        country: None,
                    })
                },
            )
            .unwrap();

        let account_ids: Vec<&str> = accounts.iter().map(|a| a.id.as_str()).collect();

        // Should NOT include inactive or excluded accounts
        assert!(!account_ids.contains(&"acc-inactive"), "Inactive account should be excluded");
        assert!(!account_ids.contains(&"acc-excluded"), "Non-included account should be excluded");

        // Should include active + included accounts
        assert!(account_ids.contains(&"acc-checking"), "Checking should be included");
        assert!(account_ids.contains(&"acc-savings"), "Savings should be included");
        assert!(account_ids.contains(&"acc-credit"), "Credit should be included");
    }

    // --- Net Worth History / MoM tests for Story 5.2 ---

    #[test]
    fn test_save_net_worth_snapshot_stores_correctly() {
        let db = setup_test_db();

        db.execute(
            "INSERT INTO net_worth_history (month, total_assets_cents, total_liabilities_cents, net_worth_cents)
             VALUES (?, ?, ?, ?)",
            &[
                &"2025-12" as &dyn rusqlite::ToSql,
                &550000_i64 as &dyn rusqlite::ToSql,
                &75000_i64 as &dyn rusqlite::ToSql,
                &475000_i64 as &dyn rusqlite::ToSql,
            ],
        ).unwrap();

        let snapshot: (String, i64, i64, i64) = db
            .query_row(
                "SELECT month, total_assets_cents, total_liabilities_cents, net_worth_cents FROM net_worth_history WHERE month = ?",
                &[&"2025-12"],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .unwrap();

        assert_eq!(snapshot.0, "2025-12");
        assert_eq!(snapshot.1, 550000);
        assert_eq!(snapshot.2, 75000);
        assert_eq!(snapshot.3, 475000);
    }

    #[test]
    fn test_get_previous_month_snapshot_returns_correct_record() {
        let db = setup_test_db();

        // Insert snapshots for Dec and Nov
        db.execute(
            "INSERT INTO net_worth_history (month, total_assets_cents, total_liabilities_cents, net_worth_cents)
             VALUES ('2025-11', 500000, 70000, 430000)",
            &[],
        ).unwrap();
        db.execute(
            "INSERT INTO net_worth_history (month, total_assets_cents, total_liabilities_cents, net_worth_cents)
             VALUES ('2025-12', 550000, 75000, 475000)",
            &[],
        ).unwrap();

        // Query previous month relative to Jan 2026
        let previous: Vec<NetWorthSnapshot> = db
            .query_map(
                "SELECT month, total_assets_cents, total_liabilities_cents, net_worth_cents
                 FROM net_worth_history WHERE month < ? ORDER BY month DESC LIMIT 1",
                &[&"2026-01" as &dyn rusqlite::ToSql],
                |row| {
                    Ok(NetWorthSnapshot {
                        month: row.get(0)?,
                        total_assets_cents: row.get(1)?,
                        total_liabilities_cents: row.get(2)?,
                        net_worth_cents: row.get(3)?,
                    })
                },
            )
            .unwrap();

        assert_eq!(previous.len(), 1);
        assert_eq!(previous[0].month, "2025-12", "Should return December as previous month");
        assert_eq!(previous[0].net_worth_cents, 475000);
    }

    #[test]
    fn test_snapshot_query_with_no_previous_returns_empty() {
        let db = setup_test_db();

        // No snapshots at all
        let previous: Vec<NetWorthSnapshot> = db
            .query_map(
                "SELECT month, total_assets_cents, total_liabilities_cents, net_worth_cents
                 FROM net_worth_history WHERE month < ? ORDER BY month DESC LIMIT 1",
                &[&"2026-01" as &dyn rusqlite::ToSql],
                |row| {
                    Ok(NetWorthSnapshot {
                        month: row.get(0)?,
                        total_assets_cents: row.get(1)?,
                        total_liabilities_cents: row.get(2)?,
                        net_worth_cents: row.get(3)?,
                    })
                },
            )
            .unwrap();

        assert!(previous.is_empty(), "No previous snapshot should exist");
    }

    #[test]
    fn test_mom_calculation_large_positive_change() {
        // Edge case: 1000% increase (100 -> 1100 = 1000 change)
        let previous_cents: i64 = 10000; // €100
        let current_cents: i64 = 110000; // €1,100
        let change = current_cents - previous_cents; // 100000
        let percent = (change as f64 / previous_cents.abs() as f64) * 100.0;

        assert_eq!(change, 100000, "Change should be 100000 cents");
        assert!((percent - 1000.0).abs() < 0.01, "Percent should be 1000%");
    }

    #[test]
    fn test_mom_calculation_large_negative_change() {
        // Edge case: -90% decrease (100000 -> 10000)
        let previous_cents: i64 = 100000; // €1,000
        let current_cents: i64 = 10000;   // €100
        let change = current_cents - previous_cents; // -90000
        let percent = (change as f64 / previous_cents.abs() as f64) * 100.0;

        assert_eq!(change, -90000, "Change should be -90000 cents");
        assert!((percent - (-90.0)).abs() < 0.01, "Percent should be -90%");
    }

    #[test]
    fn test_snapshot_upsert_replaces_existing() {
        let db = setup_test_db();

        // Insert initial snapshot
        db.execute(
            "INSERT INTO net_worth_history (month, total_assets_cents, total_liabilities_cents, net_worth_cents)
             VALUES ('2025-12', 500000, 70000, 430000)",
            &[],
        ).unwrap();

        // Upsert same month with new values
        db.execute(
            "INSERT OR REPLACE INTO net_worth_history (month, total_assets_cents, total_liabilities_cents, net_worth_cents)
             VALUES ('2025-12', 600000, 80000, 520000)",
            &[],
        ).unwrap();

        let net_worth: i64 = db
            .query_row(
                "SELECT net_worth_cents FROM net_worth_history WHERE month = '2025-12'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(net_worth, 520000, "Upsert should replace with new value");

        // Should still only have one row
        let count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM net_worth_history WHERE month = '2025-12'",
                &[],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "Should have exactly one row after upsert");
    }

    // --- Liability grouping tests for Story 5.4 ---

    #[test]
    fn test_liability_accounts_query_groups_by_type() {
        let db = setup_net_worth_test_db();

        // Query only credit accounts (liabilities)
        let liabilities: Vec<AccountWithBalance> = db
            .query_map(
                "SELECT a.id, a.name, a.type, a.institution, a.currency, a.is_active, a.include_in_net_worth,
                        COALESCE(SUM(t.amount_cents), 0) as balance_cents
                 FROM accounts a
                 LEFT JOIN transactions t ON t.account_id = a.id
                 WHERE a.is_active = 1 AND a.include_in_net_worth = 1 AND a.type = 'credit'
                 GROUP BY a.id
                 ORDER BY a.name",
                &[],
                |row| {
                    Ok(AccountWithBalance {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        account_type: row.get(2)?,
                        institution: row.get(3)?,
                        currency: row.get(4)?,
                        is_active: row.get::<_, i32>(5)? == 1,
                        include_in_net_worth: row.get::<_, i32>(6)? == 1,
                        balance_cents: row.get(7)?,
                        last_balance_update: None,
                        bank_number: None,
                        country: None,
                    })
                },
            )
            .unwrap();

        assert_eq!(liabilities.len(), 1, "Should have 1 credit account");
        assert_eq!(liabilities[0].account_type, "credit");
        assert_eq!(liabilities[0].balance_cents, -75000, "Credit card balance should be -75000");
    }

    #[test]
    fn test_liability_aggregation_absolute_sum() {
        // Verify absolute sum: |−8000| + |−5000| + |−2000| = 15000
        let balances: Vec<i64> = vec![-8000, -5000, -2000];
        let absolute_total: i64 = balances.iter().map(|b| b.abs()).sum();
        assert_eq!(absolute_total, 15000, "Absolute liability total should be 15000 cents");
    }

    #[test]
    fn test_credit_accounts_with_zero_balance_excluded_from_liabilities() {
        let db = setup_test_db();

        // Create credit account with zero balance (no transactions)
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES ('acc-zero-credit', 'Unused Card', 'credit', 'Bank', 'EUR', 1, 1)",
            &[],
        ).unwrap();

        let liabilities: Vec<AccountWithBalance> = db
            .query_map(
                "SELECT a.id, a.name, a.type, a.institution, a.currency, a.is_active, a.include_in_net_worth,
                        COALESCE(SUM(t.amount_cents), 0) as balance_cents
                 FROM accounts a
                 LEFT JOIN transactions t ON t.account_id = a.id
                 WHERE a.is_active = 1 AND a.include_in_net_worth = 1 AND a.type = 'credit'
                 GROUP BY a.id
                 HAVING balance_cents < 0
                 ORDER BY a.name",
                &[],
                |row| {
                    Ok(AccountWithBalance {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        account_type: row.get(2)?,
                        institution: row.get(3)?,
                        currency: row.get(4)?,
                        is_active: row.get::<_, i32>(5)? == 1,
                        include_in_net_worth: row.get::<_, i32>(6)? == 1,
                        balance_cents: row.get(7)?,
                        last_balance_update: None,
                        bank_number: None,
                        country: None,
                    })
                },
            )
            .unwrap();

        // Zero-balance credit card should be excluded
        assert!(
            liabilities.is_empty(),
            "Credit accounts with zero balance should be excluded from liabilities"
        );
    }

    #[test]
    fn test_multi_currency_liabilities_return_with_currency() {
        let db = setup_test_db();

        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES ('acc-usd-credit', 'US Credit Card', 'credit', 'Chase', 'USD', 1, 1)",
            &[],
        ).unwrap();
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('t-usd', '2025-01-15', 'Purchase', -50000, 'acc-usd-credit', '[]')",
            &[],
        ).unwrap();

        let account: AccountWithBalance = db
            .query_row(
                "SELECT a.id, a.name, a.type, a.institution, a.currency, a.is_active, a.include_in_net_worth,
                        COALESCE(SUM(t.amount_cents), 0) as balance_cents
                 FROM accounts a
                 LEFT JOIN transactions t ON t.account_id = a.id
                 WHERE a.id = 'acc-usd-credit'
                 GROUP BY a.id",
                &[],
                |row| {
                    Ok(AccountWithBalance {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        account_type: row.get(2)?,
                        institution: row.get(3)?,
                        currency: row.get(4)?,
                        is_active: row.get::<_, i32>(5)? == 1,
                        include_in_net_worth: row.get::<_, i32>(6)? == 1,
                        balance_cents: row.get(7)?,
                        last_balance_update: None,
                        bank_number: None,
                        country: None,
                    })
                },
            )
            .unwrap();

        assert_eq!(account.currency, "USD", "Currency should be USD");
        assert_eq!(account.balance_cents, -50000, "Balance should be -50000");
    }

    // --- Balance entry tests for Story 5.5 ---

    #[test]
    fn test_create_account_inserts_new_account_with_balance() {
        let db = setup_test_db();

        // Create account
        let id = "acc-test-55";
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth, last_balance_update)
             VALUES (?, 'Test Savings', 'savings', 'TestBank', 'EUR', 1, 1, datetime('now'))",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Create starting balance transaction
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, memo, tags)
             VALUES ('tx-init-55', date('now'), 'Starting Balance', 250000, ?, 'Initial account balance', '[]')",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Record in history
        db.execute(
            "INSERT INTO account_balance_history (account_id, balance_cents)
             VALUES (?, 250000)",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Verify account exists
        let name: String = db
            .query_row("SELECT name FROM accounts WHERE id = ?", &[&id], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Test Savings");

        // Verify balance
        let balance: i64 = db
            .query_row(
                "SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE account_id = ?",
                &[&id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(balance, 250000, "Account should have 250000 cents starting balance");

        // Verify history entry
        let history_count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM account_balance_history WHERE account_id = ?",
                &[&id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(history_count, 1, "Should have one history entry");
    }

    #[test]
    fn test_update_account_balance_creates_adjustment_and_history() {
        let db = setup_test_db();

        // Setup account with initial balance
        let id = "acc-update-55";
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES (?, 'Update Test', 'checking', 'Bank', 'EUR', 1, 1)",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, tags)
             VALUES ('tx-init-update', '2025-01-01', 'Starting Balance', 100000, ?, '[]')",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Simulate update_account_balance: set new balance to 150000
        let current_balance: i64 = db
            .query_row(
                "SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE account_id = ?",
                &[&id as &dyn rusqlite::ToSql],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(current_balance, 100000);

        let new_balance: i64 = 150000;
        let adjustment = new_balance - current_balance;
        assert_eq!(adjustment, 50000, "Adjustment should be 50000");

        // Create adjustment transaction
        db.execute(
            "INSERT INTO transactions (id, date, payee, amount_cents, account_id, memo, tags)
             VALUES ('tx-adj-55', date('now'), 'Balance Adjustment', ?, ?, 'Manual balance update', '[]')",
            &[&adjustment as &dyn rusqlite::ToSql, &id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Update last_balance_update
        db.execute(
            "UPDATE accounts SET last_balance_update = datetime('now') WHERE id = ?",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Record in history
        db.execute(
            "INSERT INTO account_balance_history (account_id, balance_cents)
             VALUES (?, ?)",
            &[&id as &dyn rusqlite::ToSql, &new_balance as &dyn rusqlite::ToSql],
        ).unwrap();

        // Verify new balance
        let updated_balance: i64 = db
            .query_row(
                "SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE account_id = ?",
                &[&id as &dyn rusqlite::ToSql],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(updated_balance, 150000, "Balance should be updated to 150000");

        // Verify last_balance_update is set
        let last_update: Option<String> = db
            .query_row(
                "SELECT last_balance_update FROM accounts WHERE id = ?",
                &[&id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(last_update.is_some(), "last_balance_update should be set");

        // Verify history entry
        let history: Vec<i64> = db
            .query_map(
                "SELECT balance_cents FROM account_balance_history WHERE account_id = ? ORDER BY recorded_at DESC",
                &[&id as &dyn rusqlite::ToSql],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0], 150000);
    }

    #[test]
    fn test_get_balance_history_returns_chronological_snapshots() {
        let db = setup_test_db();

        let id = "acc-history-55";
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES (?, 'History Test', 'savings', 'Bank', 'EUR', 1, 1)",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Insert multiple history entries
        db.execute(
            "INSERT INTO account_balance_history (account_id, balance_cents, recorded_at)
             VALUES (?, 100000, '2025-01-01 10:00:00')",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();
        db.execute(
            "INSERT INTO account_balance_history (account_id, balance_cents, recorded_at)
             VALUES (?, 150000, '2025-01-15 10:00:00')",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();
        db.execute(
            "INSERT INTO account_balance_history (account_id, balance_cents, recorded_at)
             VALUES (?, 200000, '2025-02-01 10:00:00')",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Query history (most recent first)
        let history: Vec<(i64, String)> = db
            .query_map(
                "SELECT balance_cents, recorded_at FROM account_balance_history
                 WHERE account_id = ?
                 ORDER BY recorded_at DESC
                 LIMIT 50",
                &[&id as &dyn rusqlite::ToSql],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(history.len(), 3, "Should have 3 history entries");
        assert_eq!(history[0].0, 200000, "Most recent should be 200000");
        assert_eq!(history[1].0, 150000, "Second should be 150000");
        assert_eq!(history[2].0, 100000, "Oldest should be 100000");
    }

    #[test]
    fn test_last_updated_timestamp_set_on_balance_change() {
        let db = setup_test_db();

        let id = "acc-timestamp-55";
        db.execute(
            "INSERT INTO accounts (id, name, type, institution, currency, is_active, include_in_net_worth)
             VALUES (?, 'Timestamp Test', 'checking', 'Bank', 'EUR', 1, 1)",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Initially null
        let initial_update: Option<String> = db
            .query_row(
                "SELECT last_balance_update FROM accounts WHERE id = ?",
                &[&id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(initial_update.is_none(), "last_balance_update should initially be NULL");

        // Update timestamp
        db.execute(
            "UPDATE accounts SET last_balance_update = datetime('now') WHERE id = ?",
            &[&id as &dyn rusqlite::ToSql],
        ).unwrap();

        // Now should be set
        let updated: Option<String> = db
            .query_row(
                "SELECT last_balance_update FROM accounts WHERE id = ?",
                &[&id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(updated.is_some(), "last_balance_update should be set after update");

        // Verify it's a valid datetime
        let dt_str = updated.unwrap();
        assert!(dt_str.len() >= 10, "Datetime string should be at least 10 chars");
    }
}
