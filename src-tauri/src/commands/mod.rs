//! Tauri IPC commands for Stackz
//!
//! This module contains all Tauri commands exposed to the frontend.

pub mod accounts;
pub mod budgets;
pub mod categories;
pub mod db;
pub mod preferences;
pub mod transactions;

pub use accounts::*;
pub use budgets::*;
pub use categories::*;
pub use db::*;
pub use preferences::*;
pub use transactions::*;
