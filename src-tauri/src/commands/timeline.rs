//! IPC de línea de tiempo global (Fase 6.2.1).

use serde::Deserialize;
use tauri::State;

use crate::error::AppError;
use crate::state::ProjectState;
use crate::timeline::{list_timeline_events, find_last_persisted_time_marker, LastAddedTimeMarker, TimelineEvent, TimelineFilters};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineFiltersPayload {
    pub entity_path: Option<String>,
    pub category: Option<String>,
    pub from_timestamp: Option<String>,
    pub to_timestamp: Option<String>,
    pub limit: Option<u32>,
}

#[tauri::command]
pub fn get_timeline_events(
    state: State<'_, ProjectState>,
    filters: Option<TimelineFiltersPayload>,
) -> Result<Vec<TimelineEvent>, AppError> {
    state.with_db(|db, _root| {
        let payload = filters.unwrap_or(TimelineFiltersPayload {
            entity_path: None,
            category: None,
            from_timestamp: None,
            to_timestamp: None,
            limit: None,
        });
        let filters = TimelineFilters {
            entity_path: payload.entity_path,
            category: payload.category,
            from_timestamp: payload.from_timestamp,
            to_timestamp: payload.to_timestamp,
            limit: payload.limit,
        };
        list_timeline_events(db.connection(), &filters)
    })
}

#[tauri::command]
pub fn get_last_added_time(
    state: State<'_, ProjectState>,
) -> Result<Option<LastAddedTimeMarker>, AppError> {
    state.with_db(|db, _root| find_last_persisted_time_marker(db.connection()))
}
