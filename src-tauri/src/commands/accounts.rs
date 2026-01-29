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
}
