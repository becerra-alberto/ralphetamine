//! Database module for Stackz
//!
//! Provides SQLite database connectivity, connection management, and migrations.

pub mod connection;
pub mod migrations;

pub use connection::{Database, DbError};
pub use migrations::run_migrations;
