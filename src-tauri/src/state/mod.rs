//! Estado global de sesión (proyecto activo). Una conexión SQLite por ventana.

mod project;

pub use project::{project_meta_from_db, ProjectState};
