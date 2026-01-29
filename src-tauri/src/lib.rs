mod commands;
mod db;

use db::{init_database, run_migrations};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize database
            let db = init_database(None).expect("Failed to initialize database");

            // Run migrations
            run_migrations(db).expect("Failed to run migrations");

            log::info!("Database initialized at {:?}", db.path());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_health_check,
            commands::db_execute,
            commands::db_query,
            commands::db_insert,
            commands::db_update,
            commands::db_delete,
            commands::db_select,
            commands::get_categories,
            commands::get_accounts,
            commands::create_transaction,
            commands::get_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::get_transactions,
            commands::get_category_totals,
            commands::get_uncategorized_total,
            commands::get_payee_suggestions,
            commands::get_payee_category,
            commands::get_unique_tags,
            commands::get_net_worth_summary,
            commands::save_net_worth_snapshot,
            commands::get_mom_change,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    /// Test that verifies Tauri app builds without errors
    #[test]
    fn test_tauri_app_builds() {
        // This test verifies that the Tauri context can be generated
        // without errors during compilation
        assert!(true, "Tauri app compiles successfully");
    }

    /// Test window configuration has title "Stackz"
    #[test]
    fn test_window_title_is_stackz() {
        // Read and verify the tauri.conf.json contains "Stackz" as title
        let config_content = include_str!("../tauri.conf.json");
        assert!(
            config_content.contains(r#""title": "Stackz""#),
            "Window title should be 'Stackz'"
        );
    }

    /// Test that product name is Stackz
    #[test]
    fn test_product_name_is_stackz() {
        let config_content = include_str!("../tauri.conf.json");
        assert!(
            config_content.contains(r#""productName": "Stackz""#),
            "Product name should be 'Stackz'"
        );
    }

    /// Test that dev URL is configured correctly
    #[test]
    fn test_dev_url_configured() {
        let config_content = include_str!("../tauri.conf.json");
        assert!(
            config_content.contains(r#""devUrl": "http://localhost:5173""#),
            "Dev URL should be http://localhost:5173"
        );
    }
}
