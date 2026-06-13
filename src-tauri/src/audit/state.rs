use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::audit::paths::{ensure_debug_dirs, normalize_for_ipc, repo_debug_root};
use crate::audit::storage::{
    append_entry, clear_log_files, clear_render_log_files, load_settings, new_session_log_paths,
    save_settings,
};
use crate::audit::types::{
    AuditConfigResponse, AuditDebugSettings, AuditEntry, AuditLogPathResponse, RenderLogChannel,
    RenderLogClearTarget,
};
use crate::error::AppError;

pub struct AuditState {
    inner: Mutex<AuditRuntime>,
}

struct AuditRuntime {
    bootstrapped: bool,
    settings: AuditDebugSettings,
    boot_id: String,
    session_log_path: Option<PathBuf>,
    render_standard_log_path: Option<PathBuf>,
    render_verbose_log_path: Option<PathBuf>,
}

impl AuditState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(AuditRuntime {
                bootstrapped: false,
                settings: AuditDebugSettings::default(),
                boot_id: String::new(),
                session_log_path: None,
                render_standard_log_path: None,
                render_verbose_log_path: None,
            }),
        }
    }

    pub fn bootstrap(&self) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        ensure_debug_dirs(&root)?;

        let mut settings = load_settings(&root)?;
        let mut settings_dirty = false;
        if settings.clear_logs_on_next_boot {
            clear_log_files(&root)?;
            settings.clear_logs_on_next_boot = false;
            settings_dirty = true;
        }
        if settings.render_clear_logs_on_next_boot {
            clear_render_log_files(&root, RenderLogClearTarget::Standard)?;
            settings.render_clear_logs_on_next_boot = false;
            settings_dirty = true;
        }
        if settings.render_verbose_clear_logs_on_next_boot {
            clear_render_log_files(&root, RenderLogClearTarget::Verbose)?;
            settings.render_verbose_clear_logs_on_next_boot = false;
            settings_dirty = true;
        }
        if settings_dirty {
            save_settings(&root, &settings)?;
        }

        let paths = new_session_log_paths(&root)?;

        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        guard.bootstrapped = true;
        guard.settings = settings.clone();
        guard.boot_id = paths.boot_id.clone();
        guard.session_log_path = Some(paths.system);
        guard.render_standard_log_path = Some(paths.render_standard);
        guard.render_verbose_log_path = Some(paths.render_verbose);

        Ok(config_response(&root, &guard))
    }

    pub fn get_config(&self) -> Result<AuditConfigResponse, AppError> {
        let guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        let root = repo_debug_root();
        Ok(config_response(&root, &guard))
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        guard.settings.enabled = enabled;
        save_settings(&root, &guard.settings)?;
        Ok(config_response(&root, &guard))
    }

    pub fn set_render_log_enabled(&self, enabled: bool) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        guard.settings.render_log_enabled = enabled;
        save_settings(&root, &guard.settings)?;
        Ok(config_response(&root, &guard))
    }

    pub fn set_render_verbose_enabled(&self, enabled: bool) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        guard.settings.render_verbose_enabled = enabled;
        save_settings(&root, &guard.settings)?;
        Ok(config_response(&root, &guard))
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
        if let Some(render_log_enabled) = patch.render_log_enabled {
            guard.settings.render_log_enabled = render_log_enabled;
        }
        if let Some(render_clear_logs_on_next_boot) = patch.render_clear_logs_on_next_boot {
            guard.settings.render_clear_logs_on_next_boot = render_clear_logs_on_next_boot;
        }
        if let Some(render_max_buffer_size) = patch.render_max_buffer_size {
            guard.settings.render_max_buffer_size = render_max_buffer_size;
        }
        if let Some(render_level) = patch.render_level {
            guard.settings.render_level = render_level;
        }
        if let Some(render_verbose_enabled) = patch.render_verbose_enabled {
            guard.settings.render_verbose_enabled = render_verbose_enabled;
        }
        if let Some(render_verbose_clear_logs_on_next_boot) = patch.render_verbose_clear_logs_on_next_boot
        {
            guard.settings.render_verbose_clear_logs_on_next_boot =
                render_verbose_clear_logs_on_next_boot;
        }
        if let Some(render_verbose_max_buffer_size) = patch.render_verbose_max_buffer_size {
            guard.settings.render_verbose_max_buffer_size = render_verbose_max_buffer_size;
        }
        if let Some(render_verbose_level) = patch.render_verbose_level {
            guard.settings.render_verbose_level = render_verbose_level;
        }
        save_settings(&root, &guard.settings)?;
        Ok(config_response(&root, &guard))
    }

    pub fn clear_logs(&self) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        clear_log_files(&root)?;
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        let paths = new_session_log_paths(&root)?;
        guard.boot_id = paths.boot_id;
        guard.session_log_path = Some(paths.system);
        guard.render_standard_log_path = Some(paths.render_standard);
        guard.render_verbose_log_path = Some(paths.render_verbose);
        Ok(config_response(&root, &guard))
    }

    pub fn clear_render_logs(
        &self,
        target: RenderLogClearTarget,
    ) -> Result<AuditConfigResponse, AppError> {
        let root = repo_debug_root();
        clear_render_log_files(&root, target)?;
        let mut guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        let paths = new_session_log_paths(&root)?;
        guard.boot_id = paths.boot_id;
        if matches!(target, RenderLogClearTarget::Standard | RenderLogClearTarget::All) {
            guard.render_standard_log_path = Some(paths.render_standard);
        }
        if matches!(target, RenderLogClearTarget::Verbose | RenderLogClearTarget::All) {
            guard.render_verbose_log_path = Some(paths.render_verbose);
        }
        Ok(config_response(&root, &guard))
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

    pub fn append_render_entry(
        &self,
        channel: RenderLogChannel,
        entry: AuditEntry,
    ) -> Result<(), AppError> {
        let guard = self.inner.lock().map_err(|_| AppError::database("audit lock"))?;
        let (enabled, log_path) = match channel {
            RenderLogChannel::Standard => (
                guard.settings.render_log_enabled,
                guard.render_standard_log_path.clone(),
            ),
            RenderLogChannel::Verbose => (
                guard.settings.render_verbose_enabled,
                guard.render_verbose_log_path.clone(),
            ),
        };
        if !enabled {
            return Ok(());
        }
        let Some(log_path) = log_path else {
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
            render_standard_log_path: guard
                .render_standard_log_path
                .as_deref()
                .map(normalize_for_ipc),
            render_verbose_log_path: guard
                .render_verbose_log_path
                .as_deref()
                .map(normalize_for_ipc),
            logs_dir: normalize_for_ipc(&crate::audit::paths::logs_dir(&root)),
            render_logs_dir: normalize_for_ipc(&crate::audit::paths::render_logs_dir(&root)),
        })
    }

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
    pub render_log_enabled: Option<bool>,
    pub render_clear_logs_on_next_boot: Option<bool>,
    pub render_max_buffer_size: Option<u32>,
    pub render_level: Option<crate::audit::types::AuditLevel>,
    pub render_verbose_enabled: Option<bool>,
    pub render_verbose_clear_logs_on_next_boot: Option<bool>,
    pub render_verbose_max_buffer_size: Option<u32>,
    pub render_verbose_level: Option<crate::audit::types::AuditLevel>,
}

fn config_response(root: &Path, guard: &AuditRuntime) -> AuditConfigResponse {
    AuditConfigResponse {
        settings: guard.settings.clone(),
        session_log_path: guard.session_log_path.as_deref().map(normalize_for_ipc),
        render_standard_log_path: guard
            .render_standard_log_path
            .as_deref()
            .map(normalize_for_ipc),
        render_verbose_log_path: guard
            .render_verbose_log_path
            .as_deref()
            .map(normalize_for_ipc),
        boot_id: guard.boot_id.clone(),
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
