//! Proyecto abierto en memoria: raíz en disco + `ProjectDb` activo + watcher FS.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::AppHandle;

use crate::checker::ConsistencyScheduler;
use crate::db::ProjectDb;
use crate::error::AppError;
use crate::fs::watcher::ProjectWatcher;
use crate::graph::GraphScheduler;
use crate::models::ProjectMeta;

/// Sesión activa: un único proyecto por instancia de la app.
pub struct ProjectState {
    session: Mutex<Option<ActiveSession>>,
    watcher: Mutex<Option<ProjectWatcher>>,
    consistency: Mutex<ConsistencyScheduler>,
    graph: Mutex<GraphScheduler>,
}

struct ActiveSession {
    root: PathBuf,
    db: ProjectDb,
}

impl ProjectState {
    pub fn new() -> Self {
        Self {
            session: Mutex::new(None),
            watcher: Mutex::new(None),
            consistency: Mutex::new(ConsistencyScheduler::new()),
            graph: Mutex::new(GraphScheduler::new()),
        }
    }

    pub fn graph_scheduler(&self) -> Result<std::sync::MutexGuard<'_, GraphScheduler>, AppError> {
        self.graph
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))
    }

    pub fn project_root(&self) -> Result<PathBuf, AppError> {
        let guard = self
            .session
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))?;
        guard
            .as_ref()
            .map(|s| s.root.clone())
            .ok_or_else(|| AppError::new("error.project.not_open"))
    }

    pub fn request_consistency_check(&self, app: &AppHandle, root: &Path) {
        if let Ok(guard) = self.consistency.lock() {
            guard.request_check(app.clone(), root.to_path_buf());
        }
    }

    /// Instala la sesión y arranca el watcher (Fase 1.2).
    pub fn open_session(
        &self,
        app: &AppHandle,
        root: PathBuf,
        db: ProjectDb,
    ) -> Result<(), AppError> {
        self.stop_watcher()?;

        let mut guard = self
            .session
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))?;
        *guard = Some(ActiveSession {
            root: root.clone(),
            db,
        });
        drop(guard);

        let watcher = ProjectWatcher::start(app.clone(), root.clone())?;
        let mut watcher_guard = self
            .watcher
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))?;
        *watcher_guard = Some(watcher);

        self.request_consistency_check(app, &root);

        Ok(())
    }

    /// Cierra watcher, sesión y conexión SQLite.
    pub fn close(&self, _app: &AppHandle) -> Result<(), AppError> {
        self.stop_watcher()?;
        if let Ok(guard) = self.consistency.lock() {
            guard.cancel_pending();
        }
        if let Ok(guard) = self.graph.lock() {
            guard.cancel_pending();
        }

        let mut guard = self
            .session
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))?;
        if guard.is_none() {
            return Err(AppError::new("error.project.not_open"));
        }
        *guard = None;
        Ok(())
    }

    fn stop_watcher(&self) -> Result<(), AppError> {
        let mut watcher_guard = self
            .watcher
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))?;
        *watcher_guard = None;
        Ok(())
    }

    pub fn is_open(&self) -> Result<bool, AppError> {
        let guard = self
            .session
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))?;
        Ok(guard.is_some())
    }

    pub fn with_db<F, T>(&self, f: F) -> Result<T, AppError>
    where
        F: FnOnce(&ProjectDb, &PathBuf) -> Result<T, AppError>,
    {
        let guard = self
            .session
            .lock()
            .map_err(|_| AppError::new("error.database.generic"))?;
        let session = guard
            .as_ref()
            .ok_or_else(|| AppError::new("error.project.not_open"))?;
        f(&session.db, &session.root)
    }

    pub fn meta(&self) -> Result<ProjectMeta, AppError> {
        self.with_db(|db, root| project_meta_from_db(db, root))
    }
}

/// Construye `ProjectMeta` desde `project_meta` en SQLite.
pub fn project_meta_from_db(db: &ProjectDb, root: &Path) -> Result<ProjectMeta, AppError> {
    let name = db
        .get_meta("name")?
        .unwrap_or_else(|| {
            root.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Project")
                .to_string()
        });

    let id = db
        .get_meta("id")?
        .unwrap_or_else(|| crate::fs::indexer::stable_project_id(root));

    let template_id = db
        .get_meta("template_id")?
        .unwrap_or_else(|| "adopted".to_string());

    let created_at = parse_meta_i64(db.get_meta("created_at")?.as_deref());
    let updated_at = parse_meta_i64(db.get_meta("updated_at")?.as_deref());
    let locale = db.get_meta("locale")?.unwrap_or_else(|| "en".to_string());

    let root_path = normalize_root_path_for_ipc(
        &root
            .canonicalize()
            .unwrap_or_else(|_| root.to_path_buf()),
    );

    Ok(ProjectMeta {
        id,
        name,
        root_path,
        template_id,
        created_at,
        updated_at,
        locale,
    })
}

fn parse_meta_i64(raw: Option<&str>) -> i64 {
    raw.and_then(|s| s.parse().ok()).unwrap_or(0)
}

/// Quita el prefijo `\\?\` de rutas Windows extendidas (rompe asset protocol / join en el frontend).
fn normalize_root_path_for_ipc(path: &Path) -> String {
    let lossy = path.to_string_lossy();
    lossy
        .strip_prefix(r"\\?\")
        .unwrap_or(&lossy)
        .replace('/', std::path::MAIN_SEPARATOR_STR)
}
