use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuditLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

impl Default for AuditLevel {
    fn default() -> Self {
        Self::Info
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditDebugSettings {
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(default)]
    pub clear_logs_on_next_boot: bool,
    #[serde(default)]
    pub level: AuditLevel,
    #[serde(default)]
    pub log_ipc_args: bool,
    #[serde(default)]
    pub log_store_patches: bool,
    #[serde(default = "default_max_buffer_size")]
    pub max_buffer_size: u32,
}

fn default_enabled() -> bool {
    true
}

fn default_max_buffer_size() -> u32 {
    2_000
}

impl Default for AuditDebugSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            clear_logs_on_next_boot: false,
            level: AuditLevel::Info,
            log_ipc_args: false,
            log_store_patches: false,
            max_buffer_size: default_max_buffer_size(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub id: String,
    pub ts: i64,
    pub level: AuditLevel,
    pub domain: String,
    pub event: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<Value>,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditConfigResponse {
    pub settings: AuditDebugSettings,
    pub session_log_path: Option<String>,
    pub repo_debug_root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogPathResponse {
    pub session_log_path: Option<String>,
    pub logs_dir: String,
}
