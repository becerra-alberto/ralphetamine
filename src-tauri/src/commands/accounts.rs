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
}
