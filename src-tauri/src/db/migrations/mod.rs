//! Migraciones versionadas por proyecto (`.narralith/index.db`).

use rusqlite::Connection;

use crate::error::AppError;

/// Versión de esquema más reciente que aplica este binario.
pub const CURRENT_SCHEMA_VERSION: i32 = 5;

const META_SCHEMA_VERSION: &str = "schema_version";

/// Ejecuta migraciones pendientes en orden (1 → 2 → …).
pub fn run_pending_migrations(conn: &Connection) -> Result<(), AppError> {
    let mut version = read_schema_version(conn)?;

    if version < 1 {
        conn.execute_batch(include_str!("../schema.sql"))
            .map_err(|e| AppError::database(e.to_string()))?;
        version = 1;
        write_schema_version(conn, version)?;
    }

    if version < 2 {
        let has_status: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('entities') WHERE name = 'status'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        if has_status == 0 {
            conn.execute_batch(include_str!("002_entity_status.sql"))
                .map_err(|e| AppError::database(e.to_string()))?;
        }
        version = 2;
        write_schema_version(conn, version)?;
    }

    if version < 3 {
        let has_metadata: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('entities') WHERE name = 'metadata'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        if has_metadata == 0 {
            conn.execute_batch(include_str!("003_entity_metadata.sql"))
                .map_err(|e| AppError::database(e.to_string()))?;
        }
        version = 3;
        write_schema_version(conn, version)?;
    }

    if version < 4 {
        let has_persisted_at: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('time_markers') WHERE name = 'persisted_at'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        if has_persisted_at == 0 {
            conn.execute_batch(include_str!("004_time_marker_persisted_at.sql"))
                .map_err(|e| AppError::database(e.to_string()))?;
        }
        version = 4;
        write_schema_version(conn, version)?;
    }

    if version < 5 {
        let has_segment_id: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('time_markers') WHERE name = 'segment_id'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        if has_segment_id == 0 {
            conn.execute_batch(include_str!("005_time_marker_multi_mark.sql"))
                .map_err(|e| AppError::database(e.to_string()))?;
        }
        version = 5;
        write_schema_version(conn, version)?;
    }

    if version != CURRENT_SCHEMA_VERSION {
        return Err(AppError::with_details(
            "error.database.generic",
            format!(
                "unsupported schema version {} (expected {})",
                version, CURRENT_SCHEMA_VERSION
            ),
        ));
    }

    Ok(())
}

fn read_schema_version(conn: &Connection) -> Result<i32, AppError> {
    let table_exists: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'project_meta'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    if table_exists == 0 {
        return Ok(0);
    }

    let value: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT value FROM project_meta WHERE key = ?1",
        [META_SCHEMA_VERSION],
        |row| row.get(0),
    );

    match value {
        Ok(raw) => raw
            .parse::<i32>()
            .map_err(|e| AppError::database(e.to_string())),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(1),
        Err(e) => Err(AppError::database(e.to_string())),
    }
}

fn write_schema_version(conn: &Connection, version: i32) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO project_meta (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![META_SCHEMA_VERSION, version.to_string()],
    )
    .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn migrations_add_entity_status_and_metadata() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../schema.sql")).unwrap();
        write_schema_version(&conn, 1).unwrap();

        run_pending_migrations(&conn).unwrap();

        let has_status: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('entities') WHERE name = 'status'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(has_status, 1);

        let has_metadata: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('entities') WHERE name = 'metadata'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(has_metadata, 1);

        let version: String = conn
            .query_row(
                "SELECT value FROM project_meta WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(version, "5");
    }

    #[test]
    fn migration_005_adds_time_marker_segment_columns() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;
            CREATE TABLE project_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
            CREATE TABLE blocks (
                id TEXT PRIMARY KEY NOT NULL,
                file_path TEXT NOT NULL,
                block_index INTEGER NOT NULL,
                content_hash TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                UNIQUE (file_path, block_index)
            );
            CREATE TABLE time_markers (
                id TEXT PRIMARY KEY NOT NULL,
                block_id TEXT,
                entity_path TEXT,
                timestamp TEXT,
                label TEXT,
                raw_time TEXT,
                persisted_at INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (block_id) REFERENCES blocks (id) ON DELETE SET NULL
            );
            "#,
        )
        .unwrap();
        write_schema_version(&conn, 4).unwrap();

        run_pending_migrations(&conn).unwrap();

        for col in ["segment_id", "tag_kind", "char_offset"] {
            let count: i32 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM pragma_table_info('time_markers') WHERE name = '{col}'"
                    ),
                    [],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "missing column {col}");
        }

        let version: String = conn
            .query_row(
                "SELECT value FROM project_meta WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(version, "5");
    }

    #[test]
    fn migration_005_backfills_legacy_marker_defaults() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;
            CREATE TABLE project_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
            CREATE TABLE blocks (
                id TEXT PRIMARY KEY NOT NULL,
                file_path TEXT NOT NULL,
                block_index INTEGER NOT NULL,
                content_hash TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                UNIQUE (file_path, block_index)
            );
            CREATE TABLE time_markers (
                id TEXT PRIMARY KEY NOT NULL,
                block_id TEXT,
                entity_path TEXT,
                timestamp TEXT,
                label TEXT,
                raw_time TEXT,
                persisted_at INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (block_id) REFERENCES blocks (id) ON DELETE SET NULL
            );
            "#,
        )
        .unwrap();
        conn.execute(
            "INSERT INTO blocks (id, file_path, block_index, metadata)
             VALUES ('a.md::0', 'a.md', 0, '{}')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO time_markers (id, block_id, entity_path, raw_time, persisted_at)
             VALUES ('a.md::0::time', 'a.md::0', 'a.md', 'Year 1', 1)",
            [],
        )
        .unwrap();
        write_schema_version(&conn, 4).unwrap();

        run_pending_migrations(&conn).unwrap();

        let (segment_id, tag_kind, char_offset): (Option<String>, String, Option<i64>) = conn
            .query_row(
                "SELECT segment_id, tag_kind, char_offset FROM time_markers WHERE id = 'a.md::0::time'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        assert!(segment_id.is_none());
        assert_eq!(tag_kind, "bar");
        assert!(char_offset.is_none());
    }

    #[test]
    fn migration_005_rejects_invalid_tag_kind() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../schema.sql")).unwrap();
        conn.execute(
            "INSERT INTO time_markers (id, raw_time, tag_kind) VALUES ('x', '1', 'invalid')",
            [],
        )
        .unwrap_err();
    }
}
