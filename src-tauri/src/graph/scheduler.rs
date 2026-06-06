//! Reindexación del grafo en background (Fase 8).

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::db::ProjectDb;
use crate::error::AppError;
use crate::graph::rebuild_graph_edges;

const DEBOUNCE_SECS: u64 = 3;

#[derive(Debug, Default)]
pub struct GraphScheduler {
    generation: Arc<AtomicU64>,
}

impl GraphScheduler {
    pub fn new() -> Self {
        Self {
            generation: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn cancel_pending(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
    }

    /// Encola rebuild tras reconciliación FS (no bloquea UI).
    pub fn request_rebuild(&self, app: AppHandle, project_root: PathBuf) {
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

            if rebuild_graph_edges(&db, &project_root).is_ok() {
                let _ = app.emit("graph-index-updated", ());
            }
        });
    }

    pub fn run_now(project_root: &PathBuf) -> Result<(), AppError> {
        let db = ProjectDb::open(project_root)?;
        rebuild_graph_edges(&db, project_root)
    }
}
