//! Programación del checker con debounce (Fase 6.3.2).

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::checker::scan_plothole_issues;
use crate::db::ProjectDb;
use crate::error::AppError;

const DEBOUNCE_SECS: u64 = 3;

#[derive(Debug, Default)]
pub struct ConsistencyScheduler {
    generation: Arc<AtomicU64>,
}

impl ConsistencyScheduler {
    pub fn new() -> Self {
        Self {
            generation: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Invalida hilos pendientes (al cerrar proyecto).
    pub fn cancel_pending(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
    }

    /// Encola un escaneo tras guardado / reconciliación FS.
    pub fn request_check(&self, app: AppHandle, project_root: PathBuf) {
        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        let cancel = Arc::clone(&self.generation);

        thread::spawn(move || {
            thread::sleep(Duration::from_secs(DEBOUNCE_SECS));
            if cancel.load(Ordering::SeqCst) != generation {
                return;
            }

            let Ok(db) = ProjectDb::open(&project_root) else {
                return;
            };

            let Ok(issues) = scan_plothole_issues(db.connection(), &project_root) else {
                return;
            };

            let _ = app.emit("consistency-updated", ConsistencyUpdatedPayload { issues });
        });
    }

    /// Escaneo inmediato (IPC / apertura de panel).
    pub fn run_now(project_root: &PathBuf) -> Result<Vec<crate::checker::ConsistencyIssue>, AppError> {
        let db = ProjectDb::open(project_root)?;
        scan_plothole_issues(db.connection(), project_root)
    }
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ConsistencyUpdatedPayload {
    issues: Vec<crate::checker::ConsistencyIssue>,
}
