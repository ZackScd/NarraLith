//! Conexión SQLite aislada por proyecto (`{root}/.narralith/index.db`).

use std::path::{Path, PathBuf};

use rusqlite::Connection;

use crate::error::AppError;

use super::migrations::{self, CURRENT_SCHEMA_VERSION};
use super::{NARRALITH_DIR, PROJECT_DB_FILE};

/// Handle de la caché indexada de un único proyecto. Al hacer `drop`, se cierra la conexión.
pub struct ProjectDb {
    conn: Connection,
    project_root: PathBuf,
}

impl ProjectDb {
    /// Abre (o crea) `.narralith/index.db` bajo `project_root` y aplica migraciones pendientes.
    pub fn open(project_root: impl AsRef<Path>) -> Result<Self, AppError> {
        let project_root = project_root.as_ref().to_path_buf();
        let narralith_dir = project_root.join(NARRALITH_DIR);
        std::fs::create_dir_all(&narralith_dir).map_err(|e| AppError::database(e.to_string()))?;

        let db_path = narralith_dir.join(PROJECT_DB_FILE);
        let conn = Connection::open(&db_path).map_err(|e| AppError::database(e.to_string()))?;

        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .map_err(|e| AppError::database(e.to_string()))?;

        migrations::run_pending_migrations(&conn)?;

        Ok(Self { conn, project_root })
    }

    pub fn project_root(&self) -> &Path {
        &self.project_root
    }

    pub fn db_path(&self) -> PathBuf {
        self.project_root.join(NARRALITH_DIR).join(PROJECT_DB_FILE)
    }

    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    pub fn schema_version(&self) -> Result<i32, AppError> {
        let raw: String = self
            .conn
            .query_row(
                "SELECT value FROM project_meta WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .map_err(|e: rusqlite::Error| AppError::database(e.to_string()))?;
        raw.parse::<i32>()
            .map_err(|e| AppError::database(e.to_string()))
    }

    /// Metadatos clave-valor del proyecto (tabla `project_meta`).
    pub fn set_meta(&self, key: &str, value: &str) -> Result<(), AppError> {
        self.conn
            .execute(
                "INSERT INTO project_meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                rusqlite::params![key, value],
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        Ok(())
    }

    pub fn get_meta(&self, key: &str) -> Result<Option<String>, AppError> {
        let result = self.conn.query_row(
            "SELECT value FROM project_meta WHERE key = ?1",
            [key],
            |row| row.get::<_, String>(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::database(e.to_string())),
        }
    }
}

/// Expuesto para tests y documentación.
pub fn current_schema_version() -> i32 {
    CURRENT_SCHEMA_VERSION
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn open_create_narralith_dir_and_db() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).expect("open");
        assert!(db.db_path().is_file());
        assert_eq!(db.schema_version().unwrap(), CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn meta_persists_after_close_and_reopen() {
        let tmp = TempDir::new().unwrap();
        {
            let db = ProjectDb::open(tmp.path()).unwrap();
            db.set_meta("name", "Mi Novela").unwrap();
        }
        {
            let db = ProjectDb::open(tmp.path()).unwrap();
            let name = db.get_meta("name").unwrap();
            assert_eq!(name.as_deref(), Some("Mi Novela"));
        }
    }

    #[test]
    fn two_projects_have_isolated_databases() {
        let a = TempDir::new().unwrap();
        let b = TempDir::new().unwrap();

        ProjectDb::open(a.path())
            .unwrap()
            .set_meta("name", "Proyecto A")
            .unwrap();
        ProjectDb::open(b.path())
            .unwrap()
            .set_meta("name", "Proyecto B")
            .unwrap();

        let db_a = ProjectDb::open(a.path()).unwrap();
        let db_b = ProjectDb::open(b.path()).unwrap();
        assert_eq!(db_a.get_meta("name").unwrap().as_deref(), Some("Proyecto A"));
        assert_eq!(db_b.get_meta("name").unwrap().as_deref(), Some("Proyecto B"));
    }
}
