//! Línea de tiempo global del proyecto (Fase 6.2).

pub mod project;

pub use project::{
    find_last_persisted_time_marker, list_timeline_events, LastAddedTimeMarker, TimelineEvent,
    TimelineFilters,
};
