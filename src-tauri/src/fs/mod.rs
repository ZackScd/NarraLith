//! Operaciones de sistema de archivos del proyecto (Fase 1).

pub mod maps_store;
pub mod adopt;
pub mod calendar_config;
pub mod crud;
pub mod entity_aliases;
pub mod explorer_order;
pub mod folder_meta;
pub mod indexer;
pub mod paths;
pub mod reconcile;
pub mod recents;
pub mod scaffold;
pub mod taxonomy;
pub mod templates;
pub mod tree;
pub mod watcher;

pub use scaffold::{create_project_at, sanitize_folder_name};
