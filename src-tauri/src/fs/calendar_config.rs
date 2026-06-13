//! Configuración del calendario ficticio por proyecto (`.narralith/calendar.json`).

use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::db::{ProjectDb, NARRALITH_DIR};
use crate::error::AppError;

const DEFAULT_CALENDAR_JSON_ES: &str = include_str!("../../resources/defaults/calendar.es.json");
const DEFAULT_CALENDAR_JSON_EN: &str = include_str!("../../resources/defaults/calendar.en.json");
const BLANK_CALENDAR_JSON_ES: &str = include_str!("../../resources/defaults/calendar.blank.es.json");
const BLANK_CALENDAR_JSON_EN: &str = include_str!("../../resources/defaults/calendar.blank.en.json");

/// JSON de plantilla según idioma de interfaz (`es`, `en`, etc.).
pub fn default_calendar_json(locale: &str) -> &'static str {
    let loc = locale.trim().to_ascii_lowercase();
    if loc.starts_with("en") {
        DEFAULT_CALENDAR_JSON_EN
    } else {
        DEFAULT_CALENDAR_JSON_ES
    }
}

pub fn blank_calendar_json(locale: &str) -> &'static str {
    let loc = locale.trim().to_ascii_lowercase();
    if loc.starts_with("en") {
        BLANK_CALENDAR_JSON_EN
    } else {
        BLANK_CALENDAR_JSON_ES
    }
}
const CALENDAR_FILENAME: &str = "calendar.json";
const CALENDAR_BASELINE_FILENAME: &str = "calendar-baseline.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarConfig {
    pub version: u32,
    pub epoch: CalendarEpoch,
    pub days_per_week: u32,
    #[serde(default)]
    pub week_days: Vec<CalendarWeekDay>,
    #[serde(default = "default_hours_per_day")]
    pub hours_per_day: u32,
    pub months: Vec<CalendarMonth>,
    #[serde(default)]
    pub leap_rules: LeapRules,
    #[serde(default)]
    pub eras: Vec<CalendarEra>,
    #[serde(default)]
    pub annual_events: Vec<CalendarAnnualEvent>,
    #[serde(default)]
    pub hours_enabled: bool,
    #[serde(default)]
    pub special_year_cycles: Vec<SpecialYearCycle>,
    #[serde(default = "default_special_years_enabled")]
    pub special_years_enabled: bool,
    #[serde(default)]
    pub seasons: Vec<CalendarSeason>,
    #[serde(default)]
    pub season_day_phases: Vec<CalendarSeasonDayPhases>,
    #[serde(default = "default_day_phases_mode")]
    pub day_phases_mode: String,
    #[serde(default)]
    pub global_day_phases: Vec<CalendarDayPhase>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SpecialYearCycle {
    pub id: String,
    pub name: String,
    pub interval_years: u32,
    pub starts_at_year: i32,
    #[serde(default)]
    pub sync_from_base: bool,
    pub months: Vec<CalendarMonth>,
    #[serde(default)]
    pub linked_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEpoch {
    pub year: i32,
    pub month: u32,
    pub day: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarWeekDay {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarMonth {
    pub name: String,
    pub days: u32,
    #[serde(default)]
    pub day_hours: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeapRules {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_leap_every")]
    pub every_years: u32,
    #[serde(default = "default_one")]
    pub extra_days: u32,
    #[serde(default)]
    pub month_index: u32,
    #[serde(default)]
    pub linked_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEra {
    pub name: String,
    pub starts_at_year: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarAnnualEvent {
    pub id: String,
    pub name: String,
    pub month: u32,
    pub day: u32,
    #[serde(default = "default_event_kind")]
    pub kind: String,
    #[serde(default = "default_one", deserialize_with = "deserialize_u32_from_null")]
    pub repeat_every_years: u32,
    #[serde(default)]
    pub starts_at_year: i32,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub linked_path: String,
    #[serde(default)]
    pub hour: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarSeason {
    pub id: String,
    pub name: String,
    pub from: CalendarMonthDay,
    pub to: CalendarMonthDay,
    #[serde(default)]
    pub linked_path: String,
    #[serde(default)]
    pub highlight_color: String,
    #[serde(default = "default_highlight_opacity")]
    pub highlight_opacity: f32,
}

fn default_highlight_opacity() -> f32 {
    0.18
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarDayPhase {
    pub id: String,
    pub name: String,
    pub hour: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarSeasonDayPhases {
    pub season_id: String,
    pub name: String,
    pub phases: Vec<CalendarDayPhase>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarMonthDay {
    pub month: u32,
    pub day: u32,
}

impl Default for LeapRules {
    fn default() -> Self {
        Self {
            enabled: false,
            every_years: default_leap_every(),
            extra_days: default_one(),
            month_index: 0,
            linked_path: String::new(),
        }
    }
}

fn default_leap_every() -> u32 {
    4
}

fn default_one() -> u32 {
    1
}

fn deserialize_u32_from_null<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = Option::<u32>::deserialize(deserializer)?;
    Ok(value.unwrap_or(1))
}

fn default_hours_per_day() -> u32 {
    24
}

fn default_special_years_enabled() -> bool {
    true
}

fn default_day_phases_mode() -> String {
    "perSeason".to_string()
}

fn default_event_kind() -> String {
    "annual".to_string()
}

impl CalendarConfig {
    pub fn default_template() -> Self {
        Self::default_template_for_locale("es")
    }

    pub fn default_template_for_locale(locale: &str) -> Self {
        serde_json::from_str(default_calendar_json(locale))
            .unwrap_or_else(|_| panic!("default calendar JSON must parse for locale {locale}"))
    }

    pub fn blank_template_for_locale(locale: &str) -> Self {
        serde_json::from_str(blank_calendar_json(locale))
            .unwrap_or_else(|_| panic!("blank calendar JSON must parse for locale {locale}"))
    }

    pub fn validate(&self) -> Result<(), AppError> {
        if self.months.is_empty() {
            return Err(AppError::new("error.calendar.months_required"));
        }
        if self.days_per_week == 0 {
            return Err(AppError::new("error.calendar.invalid_days_per_week"));
        }
        if self.hours_per_day == 0 {
            return Err(AppError::new("error.calendar.invalid_hours_per_day"));
        }
        if self.epoch.month == 0 || self.epoch.day == 0 {
            return Err(AppError::new("error.calendar.invalid_epoch"));
        }
        if self.epoch.month as usize > self.months.len() {
            return Err(AppError::new("error.calendar.invalid_epoch"));
        }
        for month in &self.months {
            if month.name.trim().is_empty() {
                return Err(AppError::new("error.calendar.month_name_required"));
            }
            if month.days == 0 {
                return Err(AppError::new("error.calendar.month_days_required"));
            }
        }
        if self.leap_rules.enabled {
            if self.leap_rules.every_years == 0 {
                return Err(AppError::new("error.calendar.invalid_leap_rules"));
            }
            if self.leap_rules.month_index as usize >= self.months.len() {
                return Err(AppError::new("error.calendar.invalid_leap_rules"));
            }
        }
        for event in &self.annual_events {
            if event.name.trim().is_empty() || event.id.trim().is_empty() {
                return Err(AppError::new("error.calendar.invalid_annual_event"));
            }
            if event.month == 0 {
                return Err(AppError::new("error.calendar.invalid_annual_event"));
            }
            if event.month as usize > self.months.len() {
                return Err(AppError::new("error.calendar.invalid_annual_event"));
            }
            let max_day = self.months[event.month as usize - 1].days;
            if event.day == 0 || event.day > max_day {
                return Err(AppError::new("error.calendar.invalid_annual_event"));
            }
        }
        for season in &self.seasons {
            if season.id.trim().is_empty() || season.name.trim().is_empty() {
                return Err(AppError::new("error.calendar.invalid_season"));
            }
            validate_month_day(&season.from, &self.months)
                .map_err(|_| AppError::new("error.calendar.invalid_season"))?;
            validate_month_day(&season.to, &self.months)
                .map_err(|_| AppError::new("error.calendar.invalid_season"))?;
        }
        Ok(())
    }
}

fn validate_month_day(date: &CalendarMonthDay, months: &[CalendarMonth]) -> Result<(), AppError> {
    if date.month == 0 || date.month as usize > months.len() {
        return Err(AppError::new("error.calendar.invalid_date"));
    }
    let max_day = months[date.month as usize - 1].days;
    if date.day == 0 || date.day > max_day {
        return Err(AppError::new("error.calendar.invalid_date"));
    }
    Ok(())
}

pub fn calendar_path(project_root: &Path) -> std::path::PathBuf {
    project_root.join(NARRALITH_DIR).join(CALENDAR_FILENAME)
}

pub fn calendar_baseline_path(project_root: &Path) -> std::path::PathBuf {
    project_root
        .join(NARRALITH_DIR)
        .join(CALENDAR_BASELINE_FILENAME)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarBaselineFile {
    pub revision_id: String,
    pub saved_at: String,
    pub config: CalendarConfig,
}

fn new_revision_id() -> String {
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{millis:x}")
}

fn iso8601_now() -> String {
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}

pub fn save_calendar_baseline(
    project_root: &Path,
    config: &CalendarConfig,
) -> Result<(), AppError> {
    config.validate()?;
    let path = calendar_baseline_path(project_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    let file = CalendarBaselineFile {
        revision_id: new_revision_id(),
        saved_at: iso8601_now(),
        config: config.clone(),
    };
    let json = serde_json::to_string_pretty(&file)
        .map_err(|e| AppError::database(e.to_string()))?;
    fs::write(&path, json.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

pub fn load_calendar_baseline_file(
    project_root: &Path,
) -> Result<CalendarBaselineFile, AppError> {
    let path = calendar_baseline_path(project_root);
    if !path.exists() {
        return Err(AppError::new("error.calendar.baseline_missing"));
    }
    let json = fs::read_to_string(&path).map_err(|e| AppError::database(e.to_string()))?;
    let file: CalendarBaselineFile =
        serde_json::from_str(&json).map_err(|_| AppError::new("error.calendar.invalid_json"))?;
    file.config.validate()?;
    Ok(file)
}

/// Baseline reconciliado con marcas de tiempo. Si falta, copia el calendario activo.
pub fn ensure_calendar_baseline(project_root: &Path) -> Result<CalendarConfig, AppError> {
    let path = calendar_baseline_path(project_root);
    if path.exists() {
        return load_calendar_baseline_file(project_root).map(|f| f.config);
    }
    let active = load_calendar_config(project_root)?;
    save_calendar_baseline(project_root, &active)?;
    Ok(active)
}

pub fn load_calendar_config(project_root: &Path) -> Result<CalendarConfig, AppError> {
    let path = calendar_path(project_root);
    let json = if path.exists() {
        fs::read_to_string(&path).map_err(|e| AppError::database(e.to_string()))?
    } else {
        default_calendar_json("es").to_string()
    };

    let config: CalendarConfig =
        serde_json::from_str(&json).map_err(|_| AppError::new("error.calendar.invalid_json"))?;

    config.validate()?;
    Ok(config)
}

pub fn save_calendar_config(
    project_root: &Path,
    config: &CalendarConfig,
    reconcile_baseline: bool,
) -> Result<(), AppError> {
    config.validate()?;
    let path = calendar_path(project_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| AppError::database(e.to_string()))?;
    fs::write(&path, json.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    if reconcile_baseline {
        save_calendar_baseline(project_root, config)?;
    }
    Ok(())
}

/// Crea `calendar.json` con valores por defecto si no existe.
pub fn ensure_calendar_config(project_root: &Path) -> Result<(), AppError> {
    let path = calendar_path(project_root);
    if path.exists() {
        let _ = load_calendar_config(project_root)?;
        return Ok(());
    }
    let locale = ProjectDb::open(project_root)
        .ok()
        .and_then(|db| db.get_meta("locale").ok().flatten())
        .unwrap_or_else(|| "es".to_string());
    save_calendar_config(
        project_root,
        &CalendarConfig::default_template_for_locale(&locale),
        true,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn calendar_round_trip_json() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();

        let default = CalendarConfig::default_template();
        save_calendar_config(root, &default, true).unwrap();
        let loaded = load_calendar_config(root).unwrap();
        assert_eq!(loaded, default);
        let baseline = ensure_calendar_baseline(root).unwrap();
        assert_eq!(baseline, default);
    }

    #[test]
    fn calendar_baseline_created_on_first_ensure() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();

        let default = CalendarConfig::default_template();
        save_calendar_config(root, &default, false).unwrap();
        assert!(!calendar_baseline_path(root).exists());

        let baseline = ensure_calendar_baseline(root).unwrap();
        assert_eq!(baseline, default);
        assert!(calendar_baseline_path(root).exists());
    }

    #[test]
    fn calendar_save_without_reconcile_leaves_baseline() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();

        let default = CalendarConfig::default_template();
        save_calendar_config(root, &default, true).unwrap();

        let mut changed = default.clone();
        changed.months[0].days = 28;
        save_calendar_config(root, &changed, false).unwrap();

        let active = load_calendar_config(root).unwrap();
        assert_eq!(active.months[0].days, 28);
        let baseline = ensure_calendar_baseline(root).unwrap();
        assert_eq!(baseline.months[0].days, default.months[0].days);
    }

    #[test]
    fn calendar_rejects_empty_months() {
        let mut config = CalendarConfig::default_template();
        config.months.clear();
        assert!(config.validate().is_err());
    }
}
