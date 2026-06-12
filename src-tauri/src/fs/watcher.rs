//! Vigilancia del directorio del proyecto (`notify` + debounce).

use std::path::{Path, PathBuf};
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, DebouncedEvent, Debouncer};
use tauri::{AppHandle, Manager};

use crate::error::AppError;
use crate::fs::reconcile::{self, FsChange};
use crate::state::ProjectState;

type MiniDebouncer = Debouncer<notify::RecommendedWatcher>;

/// Mantiene vivo el watcher; al hacer `drop` deja de observar el FS.
pub struct ProjectWatcher {
    debouncer: MiniDebouncer,
}

impl ProjectWatcher {
    pub fn start(app: AppHandle, project_root: PathBuf) -> Result<Self, AppError> {
        let root_for_filter = project_root.clone();
        let app_for_callback = app.clone();

        let mut debouncer = new_debouncer(
            Duration::from_millis(250),
            move |result: DebounceEventResult| {
                let Ok(events) = result else {
                    return;
                };

                for event in &events {
                    if !event.path.starts_with(&root_for_filter)
                        || reconcile::should_ignore(&event.path)
                    {
                        continue;
                    }
                    if let Ok(rel) = event.path.strip_prefix(&root_for_filter) {
                        let rel_str = rel.to_string_lossy().replace('\\', "/");
                        crate::audit::bridge::log_watcher_raw(
                            &app_for_callback,
                            &rel_str,
                            event.path.exists(),
                        );
                    }
                }

                let changes = normalize_debounced(events, &root_for_filter);
                if changes.is_empty() {
                    return;
                }

                let app = app_for_callback.clone();
                let app_on_main = app.clone();
                let _ = app.run_on_main_thread(move || {
                    let state = app_on_main.state::<ProjectState>();
                    let _ = state.with_db(|db, root| {
                        reconcile::apply_changes(&app_on_main, db, root, changes)
                    });
                });
            },
        )
        .map_err(|e| AppError::database(e.to_string()))?;

        debouncer
            .watcher()
            .watch(&project_root, RecursiveMode::Recursive)
            .map_err(|e| AppError::database(e.to_string()))?;

        Ok(Self { debouncer })
    }
}

/// Convierte eventos debounced a cambios lógicos (existencia en disco).
fn normalize_debounced(events: Vec<DebouncedEvent>, project_root: &Path) -> Vec<FsChange> {
    let mut out = Vec::new();

    for event in events {
        if !event.path.starts_with(project_root) || reconcile::should_ignore(&event.path) {
            continue;
        }

        if event.path.exists() {
            out.push(FsChange::Modify(event.path));
        } else {
            out.push(FsChange::Remove(event.path));
        }
    }

    out
}
