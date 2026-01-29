//! Category-related Tauri commands

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::db::{get_database, DbError};

/// Represents a category in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    #[serde(rename = "type")]
    pub category_type: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// Category with nested children for hierarchical display
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryWithChildren {
    #[serde(flatten)]
    pub category: Category,
    pub children: Vec<CategoryWithChildren>,
}

/// Get all categories in a nested hierarchical structure
#[tauri::command]
pub fn get_categories() -> Result<Vec<CategoryWithChildren>, String> {
    let db = get_database().map_err(|e| e.to_string())?;

    let categories: Vec<Category> = db
        .query_map(
            "SELECT id, name, parent_id, type, icon, color, sort_order, created_at, updated_at
             FROM categories
             ORDER BY sort_order",
            &[],
            |row| {
                Ok(Category {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    parent_id: row.get(2)?,
                    category_type: row.get(3)?,
                    icon: row.get(4)?,
                    color: row.get(5)?,
                    sort_order: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(build_category_tree(categories))
}

/// Build a tree structure from flat category list
fn build_category_tree(categories: Vec<Category>) -> Vec<CategoryWithChildren> {
    // Create a map for quick lookup
    let mut category_map: HashMap<String, CategoryWithChildren> = HashMap::new();

    // First pass: create all nodes
    for cat in categories {
        let id = cat.id.clone();
        category_map.insert(
            id,
            CategoryWithChildren {
                category: cat,
                children: Vec::new(),
            },
        );
    }

    // Second pass: build tree
    let mut roots: Vec<CategoryWithChildren> = Vec::new();
    let ids: Vec<String> = category_map.keys().cloned().collect();

    for id in ids {
        let cat = category_map.remove(&id).unwrap();
        match &cat.category.parent_id {
            Some(parent_id) => {
                if let Some(parent) = category_map.get_mut(parent_id) {
                    parent.children.push(cat);
                } else {
                    // Parent not found in map (might have been moved already)
                    roots.push(cat);
                }
            }
            None => {
                roots.push(cat);
            }
        }
    }

    // Sort children by sort_order
    fn sort_children(nodes: &mut Vec<CategoryWithChildren>) {
        nodes.sort_by_key(|n| n.category.sort_order);
        for node in nodes {
            sort_children(&mut node.children);
        }
    }

    sort_children(&mut roots);
    roots
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
    fn test_default_categories_seeded_count() {
        let db = setup_test_db();
        let count: i32 = db
            .query_row("SELECT COUNT(*) FROM categories", &[], |row| row.get(0))
            .unwrap();

        // Should have at least 25 categories (5 sections + 20+ subcategories)
        assert!(
            count >= 25,
            "Expected at least 25 categories, got {}",
            count
        );
    }

    #[test]
    fn test_five_parent_section_categories_exist() {
        let db = setup_test_db();
        let sections: Vec<String> = db
            .query_map(
                "SELECT name FROM categories WHERE parent_id IS NULL ORDER BY sort_order",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert!(sections.contains(&"Income".to_string()));
        assert!(sections.contains(&"Housing".to_string()));
        assert!(sections.contains(&"Essential".to_string()));
        assert!(sections.contains(&"Lifestyle".to_string()));
        assert!(sections.contains(&"Savings".to_string()));
    }

    #[test]
    fn test_all_subcategories_have_valid_parent_id() {
        let db = setup_test_db();

        // Get all subcategories (those with parent_id)
        let invalid_count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM categories c
                 WHERE c.parent_id IS NOT NULL
                 AND c.parent_id NOT IN (SELECT id FROM categories)",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(invalid_count, 0, "All subcategories should have valid parent_id references");
    }

    #[test]
    fn test_income_section_categories_have_income_type() {
        let db = setup_test_db();

        let non_income_count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM categories
                 WHERE (id = 'cat-income' OR parent_id = 'cat-income')
                 AND type != 'income'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(non_income_count, 0, "All income categories should have type='income'");
    }

    #[test]
    fn test_expense_section_categories_have_expense_type() {
        let db = setup_test_db();

        // Housing, Essential, Lifestyle, Savings should all be expense type
        let non_expense_count: i32 = db
            .query_row(
                "SELECT COUNT(*) FROM categories
                 WHERE (
                     id IN ('cat-housing', 'cat-essential', 'cat-lifestyle', 'cat-savings')
                     OR parent_id IN ('cat-housing', 'cat-essential', 'cat-lifestyle', 'cat-savings')
                 )
                 AND type != 'expense'",
                &[],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(non_expense_count, 0, "All expense categories should have type='expense'");
    }

    #[test]
    fn test_get_categories_returns_nested_structure() {
        let db = setup_test_db();

        let categories: Vec<Category> = db
            .query_map(
                "SELECT id, name, parent_id, type, icon, color, sort_order, created_at, updated_at
                 FROM categories ORDER BY sort_order",
                &[],
                |row| {
                    Ok(Category {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        parent_id: row.get(2)?,
                        category_type: row.get(3)?,
                        icon: row.get(4)?,
                        color: row.get(5)?,
                        sort_order: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                },
            )
            .unwrap();

        let tree = build_category_tree(categories);

        // Should have 5 root categories
        assert_eq!(tree.len(), 5, "Should have 5 root categories");

        // Each root should have children
        for root in &tree {
            assert!(
                !root.children.is_empty(),
                "Root category {} should have children",
                root.category.name
            );
        }
    }

    #[test]
    fn test_get_categories_query_performance() {
        let db = setup_test_db();

        let start = Instant::now();

        let _categories: Vec<Category> = db
            .query_map(
                "SELECT id, name, parent_id, type, icon, color, sort_order, created_at, updated_at
                 FROM categories ORDER BY sort_order",
                &[],
                |row| {
                    Ok(Category {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        parent_id: row.get(2)?,
                        category_type: row.get(3)?,
                        icon: row.get(4)?,
                        color: row.get(5)?,
                        sort_order: row.get(6)?,
                        created_at: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                },
            )
            .unwrap();

        let elapsed = start.elapsed();
        assert!(
            elapsed.as_millis() < 50,
            "get_categories query took {}ms, should be under 50ms",
            elapsed.as_millis()
        );
    }
}
