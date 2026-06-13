//! IPC de configuración del calendario ficticio (Fase 6.1.1).

use tauri::State;

use crate::error::AppError;
use crate::fs::calendar_config::{
    ensure_calendar_baseline, load_calendar_config, save_calendar_config, CalendarConfig,
};
use crate::state::ProjectState;

#[tauri::command]
pub fn get_calendar_config(state: State<'_, ProjectState>) -> Result<CalendarConfig, AppError> {
    state.with_db(|_db, root| load_calendar_config(root))
}

#[tauri::command]
pub fn get_calendar_baseline(state: State<'_, ProjectState>) -> Result<CalendarConfig, AppError> {
    state.with_db(|_db, root| ensure_calendar_baseline(root))
}

#[tauri::command]
pub fn set_calendar_config(
    state: State<'_, ProjectState>,
    config: CalendarConfig,
    reconcile_baseline: Option<bool>,
) -> Result<(), AppError> {
    let reconcile = reconcile_baseline.unwrap_or(true);
    state.with_db(|_db, root| save_calendar_config(root, &config, reconcile))
}

#[tauri::command]
pub fn reset_calendar_config(
    state: State<'_, ProjectState>,
    locale: Option<String>,
    mode: Option<String>,
) -> Result<CalendarConfig, AppError> {
    state.with_db(|db, root| {
        let loc = locale.unwrap_or_else(|| {
            db.get_meta("locale")
                .ok()
                .flatten()
                .unwrap_or_else(|| "es".to_string())
        });
        let config = match mode.as_deref() {
            Some("blank") => CalendarConfig::blank_template_for_locale(&loc),
            _ => CalendarConfig::default_template_for_locale(&loc),
        };
        // FIX-010g: no avanzar baseline en reset → marcas pueden quedar stale.
        save_calendar_config(root, &config, false)?;
        Ok(config)
    })
}
