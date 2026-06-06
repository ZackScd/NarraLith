//! Fichas de entidad (Fase 4.1): plantillas YAML, documento simple, registro.

pub mod document;
pub mod inhabitants;
pub mod metadata_index;
pub mod path_rules;
pub mod resolver;
pub mod registry;
pub mod sync_event;
pub mod template;
pub mod timeline;

pub use document::{parse_entity_str, serialize_entity, EntityDocument};
pub use metadata_index::refresh_entity_row;
pub use path_rules::is_entity_relative_path;
pub use path_rules::ensure_entity_path;
pub use resolver::EntityResolver;
pub use registry::{list_template_summaries, load_template, resolve_template_id};
pub use inhabitants::{list_location_inhabitants, InhabitantRow};
pub use template::{EntityTemplate, TemplateSummary};
pub use timeline::{list_entity_timeline, TimelineEntry};
