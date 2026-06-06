//! Contratos de datos serializables (Fase 0). Uso activo desde Fase 1.
#![allow(dead_code)]

mod block;
mod entity;
mod graph;
mod project;
mod time_marker;
mod wiki_link;

pub use block::Block;
pub use entity::{Entity, EntityCategory};
pub use graph::{GraphEdge, GraphNode};
pub use project::ProjectMeta;
pub use time_marker::{TimeMarker, TimeMarkerTagKind};
pub use wiki_link::WikiLink;
