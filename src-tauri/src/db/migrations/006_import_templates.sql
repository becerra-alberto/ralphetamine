-- Migration 006: Create import templates table
-- Stores saved column mapping templates for reusable CSV import configurations

CREATE TABLE import_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    mappings_json TEXT NOT NULL,
    use_inflow_outflow INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_import_templates_name ON import_templates(name);

-- Create trigger to update updated_at timestamp on import_templates
CREATE TRIGGER trg_import_templates_updated_at
AFTER UPDATE ON import_templates
FOR EACH ROW
BEGIN
    UPDATE import_templates SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;
