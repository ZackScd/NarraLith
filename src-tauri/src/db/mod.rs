//! Caché SQLite por proyecto (`.narralith/index.db`). Acceso solo desde Rust.

pub mod backlinks;
pub mod blocks;
pub mod connection;
pub mod graph_edges;
pub mod entities;
pub mod migrations;
pub mod wiki_links;

pub use connection::{current_schema_version, ProjectDb};

/// Directorio oculto de metadatos NarraLith dentro de cada obra del usuario.
pub const NARRALITH_DIR: &str = ".narralith";

/// Archivo SQLite de caché por proyecto.
pub const PROJECT_DB_FILE: &str = "index.db";
