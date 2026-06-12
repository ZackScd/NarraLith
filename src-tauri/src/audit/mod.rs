//! OBS-001 — auditoría dev-only (`_debug/` en raíz del repo). No compila en release.

pub mod bridge;
pub mod commands;
mod paths;
mod state;
mod storage;
pub mod types;

pub use state::AuditState;
