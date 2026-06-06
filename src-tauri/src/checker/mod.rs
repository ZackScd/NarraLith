//! Verificación de consistencia narrativa en segundo plano (Fase 6.3).

pub mod dismissed;
pub mod plothole;
pub mod scheduler;

pub use dismissed::{dismiss_issue, load_dismissed_ids};
pub use plothole::{scan_plothole_issues, ConsistencyIssue, ConsistencyPathRef};
pub use scheduler::ConsistencyScheduler;
