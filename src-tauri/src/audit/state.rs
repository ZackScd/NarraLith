use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::audit::paths::{ensure_debug_dirs, normalize_for_ipc, repo_debug_root};
use crate::audit::storage::{
    append_entry, clear_log_files, load_settings, new_session_log_path, save_settings,
};
use crate::audit::types::{AuditConfigResponse, AuditDebugSettings, AuditEntry, AuditLogPathResponse};
use crate::error::AppError;

pub struct AuditState {
    inner: Mutex<AuditRuntime>,
}

struct AuditRuntime {
    bootstrapped: bool,
    settings: AuditDebugSettings,
    session_log_path: Option<PathBuf>,
}

impl AuditState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(AuditRuntime {
                bootstrapped: false,
                settings: AuditDebugSettings::default(),
                session_log_path: None,
            }),
        }
    }

    pub fn bootstrap(&self) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        ensure_debug_dirs(&root)?;

        let mut settings = load_settings(&root)?;
        if settings.clear_logs_on_next_boot {
            clear_log_files(&root)?;
            settings.clear_logs_on_next_boot = false;
            save_settings(&root, &settings)?;
        }

        let session_log_path = new_session_log_path(&root)?;

        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        guard.bootstrapped = true;
        guard.settings = settings.clone();
        guard.session_log_path = Some(session_log_path);

        Ok(config_response(&root, &settings, guard.session_log_path.as_deref()))
    }

    pub fn get_config(&self) -> Result<AuditConfigResponse, AppError> {
        let guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        let root = repo_debug_root();
        Ok(config_response(
            &root,
            &guard.settings,
            guard.session_log_path.as_deref(),
        ))
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        guard.settings.enabled = enabled;
        save_settings(&root, &guard.settings)?;
        Ok(config_response(
            &root,
            &guard.settings,
            guard.session_log_path.as_deref(),
        ))
    }

    pub fn patch_settings(
        &self,
        patch: AuditSettingsPatch,
    ) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        if let Some(enabled) = patch.enabled {
            guard.settings.enabled = enabled;
        }
        if let Some(clear_logs_on_next_boot) = patch.clear_logs_on_next_boot {
            guard.settings.clear_logs_on_next_boot = clear_logs_on_next_boot;
        }
        if let Some(level) = patch.level {
            guard.settings.level = level;
        }
        if let Some(log_ipc_args) = patch.log_ipc_args {
            guard.settings.log_ipc_args = log_ipc_args;
        }
        if let Some(log_store_patches) = patch.log_store_patches {
            guard.settings.log_store_patches = log_store_patches;
        }
        if let Some(max_buffer_size) = patch.max_buffer_size {
            guard.settings.max_buffer_size = max_buffer_size;
        }
        save_settings(&root, &guard.settings)?;
        Ok(config_response(
            &root,
            &guard.settings,
            guard.session_log_path.as_deref(),
        ))
    }

    pub fn clear_logs(&self) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        clear_log_files(&root)?;
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        guard.session_log_path = Some(new_session_log_path(&root)?);
        Ok(config_response(
            &root,
            &guard.settings,
            guard.session_log_path.as_deref(),
        ))
    }

    pub fn append_entry(&self, entry: AuditEntry) -> Result<(), AppError> {
        let guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        if !guard.settings.enabled {
            return Ok(());
        }
        let Some(log_path) = guard.session_log_path.clone() else {
            return Ok(());
        };
        drop(guard);
        append_entry(&log_path, &entry)
    }

    pub fn log_path(&self) -> Result<AuditLogPathResponse, AppError> {
        let guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        let root = repo_debug_root();
        Ok(AuditLogPathResponse {
            session_log_path: guard
                .session_log_path
                .as_deref()
                .map(normalize_for_ipc),
            logs_dir: normalize_for_ipc(&crate::audit::paths::logs_dir(&root)),
        })
    }

    /// Entrada desde Rust (instrumentación futura).
    pub fn log_backend(
        &self,
        level: crate::audit::types::AuditLevel,
        domain: &str,
        event: &str,
        payload: Option<serde_json::Value>,
    ) {
        let entry = AuditEntry {
            id: format!("be-{}-{}", unix_ms_now(), event),
            ts: unix_ms_now(),
            level,
            domain: domain.to_string(),
            event: event.to_string(),
            message: None,
            correlation_id: None,
            payload,
            source: "backend".to_string(),
            duration_ms: None,
        };
        let _ = self.append_entry(entry);
    }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditSettingsPatch {
    pub enabled: Option<bool>,
    pub clear_logs_on_next_boot: Option<bool>,
    pub level: Option<crate::audit::types::AuditLevel>,
    pub log_ipc_args: Option<bool>,
    pub log_store_patches: Option<bool>,
    pub max_buffer_size: Option<u32>,
}

fn config_response(
    root: &Path,
    settings: &AuditDebugSettings,
    session_log_path: Option<&Path>,
) -> AuditConfigResponse {
    AuditConfigResponse {
        settings: settings.clone(),
        session_log_path: session_log_path.map(normalize_for_ipc),
        repo_debug_root: normalize_for_ipc(root),
    }
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
