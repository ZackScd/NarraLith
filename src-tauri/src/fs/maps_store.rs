//! Persistencia mapas Era III (`.narralith/maps/` esquema v2).

use std::fs;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::db::NARRALITH_DIR;
use crate::error::AppError;

const MAPS_DIR: &str = "maps";
const INDEX_FILENAME: &str = "index.json";
const MAP_FILENAME: &str = "map.json";
const HOTSPOTS_FILENAME: &str = "hotspots.json";
const PRINCIPAL_DRAWING_REL: &str = "drawings/principal.json";
const MAX_IMAGE_BYTES: u64 = 50 * 1024 * 1024;
const MIN_DIMENSION: u32 = 512;
const MAX_DIMENSION: u32 = 8192;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapsIndexV2 {
    pub version: u32,
    #[serde(default = "default_open_preference")]
    pub open_preference: OpenPreference,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_viewed_map_id: Option<String>,
    pub maps: Vec<MapIndexEntryV2>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum OpenPreference {
    #[default]
    LastViewed,
    Pinned,
    LastModified,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapIndexEntryV2 {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_on_open: Option<bool>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapDocumentV1 {
    pub version: u32,
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub desde: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_image_rel: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapSummaryV2 {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub updated_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_on_open: Option<bool>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum InitialMapReason {
    Pinned,
    LastViewed,
    LastModified,
    FallbackFirst,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapSessionV2 {
    pub open_preference: OpenPreference,
    pub last_viewed_map_id: Option<String>,
    pub initial_map_id: Option<String>,
    pub initial_reason: InitialMapReason,
    pub maps: Vec<MapSummaryV2>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MapCreateMode {
    Blank,
    Import,
}

struct ResolvedInitial {
    map_id: Option<String>,
    reason: InitialMapReason,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapDrawingV2 {
    pub version: u32,
    pub width: u32,
    pub height: u32,
    pub layers: Vec<MapDrawingLayerV2>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapDrawingLayerV2 {
    pub id: String,
    pub name: String,
    pub visible: bool,
    pub opacity: f64,
    pub locked: bool,
    pub strokes: Vec<MapStrokeV2>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapStrokeV2 {
    pub id: String,
    pub tool: MapStrokeTool,
    pub brush: String,
    pub color: String,
    pub base_size: f64,
    pub base_opacity: f64,
    pub points: Vec<MapStrokePointV2>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MapStrokeTool {
    Brush,
    Eraser,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapStrokePointV2 {
    pub x: f64,
    pub y: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pressure: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapHotspotsFileV1 {
    pub version: u32,
    pub hotspots: Vec<serde_json::Value>,
}

fn default_open_preference() -> OpenPreference {
    OpenPreference::LastViewed
}

impl MapsIndexV2 {
    fn empty() -> Self {
        Self {
            version: 2,
            open_preference: OpenPreference::LastViewed,
            last_viewed_map_id: None,
            maps: Vec::new(),
        }
    }
}

impl MapHotspotsFileV1 {
    fn empty() -> Self {
        Self {
            version: 1,
            hotspots: Vec::new(),
        }
    }
}

pub fn maps_root(project_root: &Path) -> PathBuf {
    project_root.join(NARRALITH_DIR).join(MAPS_DIR)
}

pub fn ensure_maps_dir(project_root: &Path) -> Result<(), AppError> {
    let root = maps_root(project_root);
    fs::create_dir_all(&root).map_err(|e| AppError::database(e.to_string()))?;
    let index_path = root.join(INDEX_FILENAME);
    if !index_path.exists() {
        write_json(&index_path, &MapsIndexV2::empty())?;
    }
    Ok(())
}

pub fn list_maps(project_root: &Path) -> Result<Vec<MapSummaryV2>, AppError> {
    ensure_maps_dir(project_root)?;
    let index = load_index(project_root)?;
    let mut summaries = Vec::with_capacity(index.maps.len());
    for entry in &index.maps {
        let map_dir = maps_root(project_root).join(&entry.id);
        let map_path = map_dir.join(MAP_FILENAME);
        if !map_path.is_file() {
            continue;
        }
        let doc: MapDocumentV1 = match read_json(&map_path) {
            Ok(doc) => doc,
            Err(_) => continue,
        };
        if doc.version != 1 {
            continue;
        }
        summaries.push(MapSummaryV2 {
            id: entry.id.clone(),
            name: entry.name.clone(),
            width: doc.width,
            height: doc.height,
            updated_at: entry.updated_at.clone(),
            default_on_open: entry.default_on_open,
        });
    }
    Ok(summaries)
}

pub fn get_map_document(project_root: &Path, map_id: &str) -> Result<MapDocumentV1, AppError> {
    let path = map_dir(project_root, map_id)?.join(MAP_FILENAME);
    if !path.is_file() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let doc: MapDocumentV1 = read_json(&path)?;
    if doc.version != 1 || doc.id != map_id {
        return Err(AppError::new("error.maps.invalid_json"));
    }
    Ok(doc)
}

pub fn save_map_document(project_root: &Path, doc: &MapDocumentV1) -> Result<(), AppError> {
    validate_map_document(doc)?;
    let map_id = doc.id.clone();
    let map_dir = map_dir(project_root, &map_id)?;
    if !map_dir.is_dir() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let mut doc = doc.clone();
    if doc
        .desde
        .as_ref()
        .map(|s| s.trim().is_empty())
        .unwrap_or(false)
    {
        doc.desde = None;
    }
    doc.updated_at = timestamp_now();
    write_json(&map_dir.join(MAP_FILENAME), &doc)?;
    upsert_index_entry(project_root, &map_id, &doc.name, &doc.updated_at, None)?;
    Ok(())
}

pub fn get_map_drawing(project_root: &Path, map_id: &str) -> Result<MapDrawingV2, AppError> {
    let path = map_dir(project_root, map_id)?.join(PRINCIPAL_DRAWING_REL);
    if !path.is_file() {
        return Err(AppError::new("error.maps.drawing_not_found"));
    }
    let drawing: MapDrawingV2 = read_json(&path)?;
    validate_drawing(&drawing)?;
    Ok(drawing)
}

pub fn save_map_drawing(
    project_root: &Path,
    map_id: &str,
    drawing: &MapDrawingV2,
) -> Result<(), AppError> {
    if !map_dir(project_root, map_id)?.is_dir() {
        return Err(AppError::new("error.maps.not_found"));
    }
    validate_drawing(drawing)?;
    let path = map_dir(project_root, map_id)?.join(PRINCIPAL_DRAWING_REL);
    write_json_atomic(&path, drawing)?;
    let doc = get_map_document(project_root, map_id)?;
    let now = timestamp_now();
    upsert_index_entry(project_root, map_id, &doc.name, &now, None)?;
    Ok(())
}

pub fn create_blank_map(
    project_root: &Path,
    name: &str,
    width: u32,
    height: u32,
) -> Result<MapSummaryV2, AppError> {
    ensure_maps_dir(project_root)?;
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.maps.name_required"));
    }
    let (width, height) = validate_dimensions(width, height)?;

    let id = generate_map_id(trimmed);
    let now = timestamp_now();
    let map_dir = map_dir(project_root, &id)?;
    fs::create_dir_all(map_dir.join("drawings"))
        .map_err(|e| AppError::database(e.to_string()))?;
    fs::create_dir_all(map_dir.join("assets"))
        .map_err(|e| AppError::database(e.to_string()))?;

    let doc = MapDocumentV1 {
        version: 1,
        id: id.clone(),
        name: trimmed.to_string(),
        width,
        height,
        desde: None,
        base_image_rel: None,
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    write_json(&map_dir.join(MAP_FILENAME), &doc)?;
    write_json(&map_dir.join(HOTSPOTS_FILENAME), &MapHotspotsFileV1::empty())?;

    let drawing = default_principal_drawing(width, height);
    write_json_atomic(&map_dir.join(PRINCIPAL_DRAWING_REL), &drawing)?;

    upsert_index_entry(project_root, &id, trimmed, &now, None)?;
    record_map_viewed(project_root, &id)?;

    Ok(MapSummaryV2 {
        id,
        name: trimmed.to_string(),
        width,
        height,
        updated_at: now,
        default_on_open: None,
    })
}

pub fn create_map(
    project_root: &Path,
    name: &str,
    mode: MapCreateMode,
    width: Option<u32>,
    height: Option<u32>,
    source_path: Option<&str>,
) -> Result<MapSummaryV2, AppError> {
    match mode {
        MapCreateMode::Blank => {
            let width = width.ok_or_else(|| AppError::new("error.maps.invalid_dimensions"))?;
            let height = height.ok_or_else(|| AppError::new("error.maps.invalid_dimensions"))?;
            create_blank_map(project_root, name, width, height)
        }
        MapCreateMode::Import => {
            let source_path =
                source_path.ok_or_else(|| AppError::new("error.maps.image_not_found"))?;
            create_map_from_image(project_root, name, source_path)
        }
    }
}

pub fn create_map_from_image(
    project_root: &Path,
    name: &str,
    source_path: &str,
) -> Result<MapSummaryV2, AppError> {
    ensure_maps_dir(project_root)?;
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.maps.name_required"));
    }

    let source = resolve_external_image_path(source_path)?;
    let (raw_width, raw_height) = read_image_dimensions(&source)?;
    let (width, height) = normalize_image_dimensions(raw_width, raw_height)?;

    let id = generate_map_id(trimmed);
    let now = timestamp_now();
    let map_dir = map_dir(project_root, &id)?;
    fs::create_dir_all(map_dir.join("drawings"))
        .map_err(|e| AppError::database(e.to_string()))?;
    fs::create_dir_all(map_dir.join("assets"))
        .map_err(|e| AppError::database(e.to_string()))?;

    let base_image_rel = copy_import_to_map_assets(&source, &map_dir)?;

    let doc = MapDocumentV1 {
        version: 1,
        id: id.clone(),
        name: trimmed.to_string(),
        width,
        height,
        desde: None,
        base_image_rel: Some(base_image_rel.clone()),
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    write_json(&map_dir.join(MAP_FILENAME), &doc)?;
    write_json(&map_dir.join(HOTSPOTS_FILENAME), &MapHotspotsFileV1::empty())?;

    let drawing = default_principal_drawing(width, height);
    write_json_atomic(&map_dir.join(PRINCIPAL_DRAWING_REL), &drawing)?;

    upsert_index_entry(project_root, &id, trimmed, &now, None)?;
    record_map_viewed(project_root, &id)?;

    Ok(MapSummaryV2 {
        id,
        name: trimmed.to_string(),
        width,
        height,
        updated_at: now,
        default_on_open: None,
    })
}

pub fn expand_map_canvas(
    project_root: &Path,
    map_id: &str,
    add_right: u32,
    add_bottom: u32,
) -> Result<MapDocumentV1, AppError> {
    let mut doc = get_map_document(project_root, map_id)?;
    let new_width = doc
        .width
        .checked_add(add_right)
        .ok_or_else(|| AppError::new("error.maps.invalid_dimensions"))?;
    let new_height = doc
        .height
        .checked_add(add_bottom)
        .ok_or_else(|| AppError::new("error.maps.invalid_dimensions"))?;
    validate_dimensions(new_width, new_height)?;

    let mut drawing = get_map_drawing(project_root, map_id)?;
    sync_map_dimensions(&mut doc, &mut drawing, new_width, new_height);
    let now = timestamp_now();
    doc.updated_at = now.clone();

    save_map_drawing(project_root, map_id, &drawing)?;
    save_map_document(project_root, &doc)?;
    Ok(doc)
}

pub fn crop_map_canvas(
    project_root: &Path,
    map_id: &str,
    new_width: u32,
    new_height: u32,
) -> Result<MapDocumentV1, AppError> {
    validate_dimensions(new_width, new_height)?;
    let mut doc = get_map_document(project_root, map_id)?;
    if new_width > doc.width || new_height > doc.height {
        return Err(AppError::new("error.maps.invalid_dimensions"));
    }
    if new_width == doc.width && new_height == doc.height {
        return Err(AppError::new("error.maps.invalid_dimensions"));
    }

    let mut drawing = get_map_drawing(project_root, map_id)?;
    clip_drawing_strokes(&mut drawing, new_width, new_height);
    sync_map_dimensions(&mut doc, &mut drawing, new_width, new_height);
    let now = timestamp_now();
    doc.updated_at = now;

    save_map_drawing(project_root, map_id, &drawing)?;
    save_map_document(project_root, &doc)?;
    Ok(doc)
}

/// Lee una imagen relativa al proyecto y la devuelve como data URL.
pub fn read_project_image_data_url(
    project_root: &Path,
    relative_path: &str,
) -> Result<String, AppError> {
    let path = resolve_project_relative_path(project_root, relative_path)?;
    let meta = fs::metadata(&path).map_err(|_| AppError::new("error.maps.image_not_found"))?;
    if meta.len() > MAX_IMAGE_BYTES {
        return Err(AppError::new("error.maps.image_too_large"));
    }
    let bytes = fs::read(&path).map_err(|_| AppError::new("error.maps.image_not_found"))?;
    let mime = image_mime_from_path(&path);
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

pub fn get_maps_session(project_root: &Path) -> Result<MapSessionV2, AppError> {
    ensure_maps_dir(project_root)?;
    let index = load_index(project_root)?;
    let maps = list_maps(project_root)?;
    let resolved = resolve_initial_map(&index, project_root);
    Ok(MapSessionV2 {
        open_preference: index.open_preference,
        last_viewed_map_id: index.last_viewed_map_id.clone(),
        initial_map_id: resolved.map_id,
        initial_reason: resolved.reason,
        maps,
    })
}

pub fn set_open_preference(
    project_root: &Path,
    preference: OpenPreference,
) -> Result<(), AppError> {
    ensure_maps_dir(project_root)?;
    let mut index = load_index(project_root)?;
    index.open_preference = preference;
    save_index(project_root, &index)
}

pub fn set_default_on_open(
    project_root: &Path,
    map_id: &str,
    enabled: bool,
) -> Result<(), AppError> {
    ensure_maps_dir(project_root)?;
    if !map_dir(project_root, map_id)?.join(MAP_FILENAME).is_file() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let mut index = load_index(project_root)?;
    if !index.maps.iter().any(|e| e.id == map_id) {
        return Err(AppError::new("error.maps.not_found"));
    }
    if enabled {
        for entry in &mut index.maps {
            entry.default_on_open = if entry.id == map_id { Some(true) } else { None };
        }
    } else if let Some(entry) = index.maps.iter_mut().find(|e| e.id == map_id) {
        entry.default_on_open = None;
    }
    save_index(project_root, &index)
}

pub fn record_map_viewed(project_root: &Path, map_id: &str) -> Result<(), AppError> {
    ensure_maps_dir(project_root)?;
    if !map_dir(project_root, map_id)?.join(MAP_FILENAME).is_file() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let mut index = load_index(project_root)?;
    if !index.maps.iter().any(|e| e.id == map_id) {
        return Err(AppError::new("error.maps.not_found"));
    }
    index.last_viewed_map_id = Some(map_id.to_string());
    save_index(project_root, &index)
}

fn resolve_initial_map(index: &MapsIndexV2, project_root: &Path) -> ResolvedInitial {
    let valid = valid_map_ids(index, project_root);
    if valid.is_empty() {
        return ResolvedInitial {
            map_id: None,
            reason: InitialMapReason::None,
        };
    }

    let pinned = find_pinned(index, &valid);
    let last_viewed = find_last_viewed(index, &valid);
    let last_modified = find_last_modified(index, &valid);
    let first = find_first(index, &valid);

    match index.open_preference {
        OpenPreference::Pinned => {
            if let Some(id) = pinned {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::Pinned,
                };
            }
            if let Some(id) = last_viewed {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::LastViewed,
                };
            }
            if let Some(id) = last_modified {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::LastModified,
                };
            }
            if let Some(id) = first {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::FallbackFirst,
                };
            }
        }
        OpenPreference::LastViewed => {
            if let Some(id) = last_viewed {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::LastViewed,
                };
            }
            if let Some(id) = pinned {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::Pinned,
                };
            }
            if let Some(id) = last_modified {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::LastModified,
                };
            }
            if let Some(id) = first {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::FallbackFirst,
                };
            }
        }
        OpenPreference::LastModified => {
            if let Some(id) = last_modified {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::LastModified,
                };
            }
            if let Some(id) = last_viewed {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::LastViewed,
                };
            }
            if let Some(id) = pinned {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::Pinned,
                };
            }
            if let Some(id) = first {
                return ResolvedInitial {
                    map_id: Some(id),
                    reason: InitialMapReason::FallbackFirst,
                };
            }
        }
    }

    ResolvedInitial {
        map_id: None,
        reason: InitialMapReason::None,
    }
}

fn valid_map_ids(index: &MapsIndexV2, project_root: &Path) -> Vec<String> {
    index
        .maps
        .iter()
        .filter(|entry| {
            map_dir(project_root, &entry.id)
                .map(|dir| dir.join(MAP_FILENAME).is_file())
                .unwrap_or(false)
        })
        .map(|entry| entry.id.clone())
        .collect()
}

fn find_pinned(index: &MapsIndexV2, valid: &[String]) -> Option<String> {
    index
        .maps
        .iter()
        .find(|e| e.default_on_open == Some(true) && valid.contains(&e.id))
        .map(|e| e.id.clone())
}

fn find_last_viewed(index: &MapsIndexV2, valid: &[String]) -> Option<String> {
    index
        .last_viewed_map_id
        .as_ref()
        .filter(|id| valid.contains(id))
        .cloned()
}

fn find_last_modified(index: &MapsIndexV2, valid: &[String]) -> Option<String> {
    index
        .maps
        .iter()
        .filter(|e| valid.contains(&e.id))
        .max_by(|a, b| a.updated_at.cmp(&b.updated_at))
        .map(|e| e.id.clone())
}

fn find_first(index: &MapsIndexV2, valid: &[String]) -> Option<String> {
    index
        .maps
        .iter()
        .find(|e| valid.contains(&e.id))
        .map(|e| e.id.clone())
}

fn sync_map_dimensions(doc: &mut MapDocumentV1, drawing: &mut MapDrawingV2, width: u32, height: u32) {
    doc.width = width;
    doc.height = height;
    drawing.width = width;
    drawing.height = height;
}

fn clip_drawing_strokes(drawing: &mut MapDrawingV2, new_width: u32, new_height: u32) {
    let max_x = new_width as f64;
    let max_y = new_height as f64;
    for layer in &mut drawing.layers {
        layer.strokes.retain_mut(|stroke| {
            stroke.points.retain(|point| {
                point.x >= 0.0 && point.x < max_x && point.y >= 0.0 && point.y < max_y
            });
            stroke.points.len() >= 2
        });
    }
}

fn normalize_image_dimensions(width: u32, height: u32) -> Result<(u32, u32), AppError> {
    if width == 0 || height == 0 {
        return Err(AppError::new("error.maps.image_dimensions_invalid"));
    }
    let mut w = width;
    let mut h = height;
    if w > MAX_DIMENSION || h > MAX_DIMENSION {
        let scale = (MAX_DIMENSION as f64 / w as f64).min(MAX_DIMENSION as f64 / h as f64);
        w = (w as f64 * scale).floor() as u32;
        h = (h as f64 * scale).floor() as u32;
    }
    if w < MIN_DIMENSION || h < MIN_DIMENSION {
        return Err(AppError::new("error.maps.image_dimensions_invalid"));
    }
    Ok((w, h))
}

fn read_image_dimensions(path: &Path) -> Result<(u32, u32), AppError> {
    let reader = image::ImageReader::open(path).map_err(|_| AppError::new("error.maps.image_not_found"))?;
    let (width, height) = reader
        .into_dimensions()
        .map_err(|_| AppError::new("error.maps.invalid_image_type"))?;
    Ok((width, height))
}

fn resolve_external_image_path(source_path: &str) -> Result<PathBuf, AppError> {
    let trimmed = source_path.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.maps.image_not_found"));
    }
    let path = PathBuf::from(trimmed);
    let canonical = path
        .canonicalize()
        .map_err(|_| AppError::new("error.maps.image_not_found"))?;
    if !canonical.is_file() {
        return Err(AppError::new("error.maps.image_not_found"));
    }
    validate_image_file(&canonical)?;
    Ok(canonical)
}

fn validate_image_file(path: &Path) -> Result<(), AppError> {
    let meta = fs::metadata(path).map_err(|_| AppError::new("error.maps.image_not_found"))?;
    if meta.len() > MAX_IMAGE_BYTES {
        return Err(AppError::new("error.maps.image_too_large"));
    }
    match path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") | Some("jpg") | Some("jpeg") | Some("webp") => Ok(()),
        _ => Err(AppError::new("error.maps.invalid_image_type")),
    }
}

fn copy_import_to_map_assets(source: &Path, map_dir: &Path) -> Result<String, AppError> {
    validate_image_file(source)?;
    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_else(|| "png".to_string());
    let ext = if ext == "jpeg" { "jpg".to_string() } else { ext };
    let assets_dir = map_dir.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| AppError::database(e.to_string()))?;
    let dest = assets_dir.join(format!("base.{ext}"));
    fs::copy(source, &dest).map_err(|e| AppError::database(e.to_string()))?;
    Ok(format!("assets/base.{ext}"))
}

fn default_principal_drawing(width: u32, height: u32) -> MapDrawingV2 {
    MapDrawingV2 {
        version: 2,
        width,
        height,
        layers: vec![MapDrawingLayerV2 {
            id: "layer-1".to_string(),
            name: "Capa 1".to_string(),
            visible: true,
            opacity: 1.0,
            locked: false,
            strokes: Vec::new(),
        }],
    }
}

fn validate_dimensions(width: u32, height: u32) -> Result<(u32, u32), AppError> {
    if width < MIN_DIMENSION
        || width > MAX_DIMENSION
        || height < MIN_DIMENSION
        || height > MAX_DIMENSION
    {
        return Err(AppError::new("error.maps.invalid_dimensions"));
    }
    Ok((width, height))
}

fn validate_time_tag_format(raw: &str) -> Result<(), AppError> {
    let parts: Vec<&str> = raw.split('.').collect();
    if parts.len() != 3 {
        return Err(AppError::new("error.maps.invalid_desde"));
    }
    let day: i32 = parts[0]
        .parse()
        .map_err(|_| AppError::new("error.maps.invalid_desde"))?;
    let month: i32 = parts[1]
        .parse()
        .map_err(|_| AppError::new("error.maps.invalid_desde"))?;
    let year: i32 = parts[2]
        .parse()
        .map_err(|_| AppError::new("error.maps.invalid_desde"))?;
    if day < 1 || month < 1 {
        return Err(AppError::new("error.maps.invalid_desde"));
    }
    let _ = (day, month, year);
    Ok(())
}

fn validate_desde_field(desde: &Option<String>) -> Result<(), AppError> {
    match desde {
        None => Ok(()),
        Some(s) if s.trim().is_empty() => Ok(()),
        Some(s) => validate_time_tag_format(s.trim()),
    }
}

fn validate_map_document(doc: &MapDocumentV1) -> Result<(), AppError> {
    if doc.version != 1 {
        return Err(AppError::new("error.maps.schema_version_unsupported"));
    }
    if doc.name.trim().is_empty() {
        return Err(AppError::new("error.maps.name_required"));
    }
    if doc.width < MIN_DIMENSION
        || doc.width > MAX_DIMENSION
        || doc.height < MIN_DIMENSION
        || doc.height > MAX_DIMENSION
    {
        return Err(AppError::new("error.maps.invalid_dimensions"));
    }
    validate_desde_field(&doc.desde)?;
    Ok(())
}

fn validate_drawing(drawing: &MapDrawingV2) -> Result<(), AppError> {
    if drawing.version != 2 {
        return Err(AppError::new("error.maps.schema_version_unsupported"));
    }
    if drawing.width < MIN_DIMENSION
        || drawing.width > MAX_DIMENSION
        || drawing.height < MIN_DIMENSION
        || drawing.height > MAX_DIMENSION
    {
        return Err(AppError::new("error.maps.invalid_dimensions"));
    }
    if drawing.layers.is_empty() {
        return Err(AppError::new("error.maps.invalid_json"));
    }
    let mut seen_layer_ids = std::collections::HashSet::new();
    for layer in &drawing.layers {
        if layer.id.trim().is_empty() || !seen_layer_ids.insert(layer.id.clone()) {
            return Err(AppError::new("error.maps.invalid_json"));
        }
        if layer.name.trim().is_empty() {
            return Err(AppError::new("error.maps.invalid_json"));
        }
        if !(0.0..=1.0).contains(&layer.opacity) {
            return Err(AppError::new("error.maps.invalid_json"));
        }
    }
    for stroke in drawing.layers.iter().flat_map(|l| &l.strokes) {
        for point in &stroke.points {
            if let Some(p) = point.pressure {
                if !(0.0..=1.0).contains(&p) {
                    return Err(AppError::new("error.maps.invalid_json"));
                }
            }
        }
    }
    Ok(())
}

fn load_index(project_root: &Path) -> Result<MapsIndexV2, AppError> {
    let path = maps_root(project_root).join(INDEX_FILENAME);
    if !path.is_file() {
        return Ok(MapsIndexV2::empty());
    }
    let index: MapsIndexV2 = read_json(&path)?;
    if index.version != 2 {
        return Ok(MapsIndexV2::empty());
    }
    Ok(index)
}

fn save_index(project_root: &Path, index: &MapsIndexV2) -> Result<(), AppError> {
    write_json(&maps_root(project_root).join(INDEX_FILENAME), index)
}

fn upsert_index_entry(
    project_root: &Path,
    map_id: &str,
    name: &str,
    updated_at: &str,
    default_on_open: Option<bool>,
) -> Result<(), AppError> {
    let mut index = load_index(project_root)?;
    if let Some(entry) = index.maps.iter_mut().find(|e| e.id == map_id) {
        entry.name = name.to_string();
        entry.updated_at = updated_at.to_string();
        if default_on_open.is_some() {
            entry.default_on_open = default_on_open;
        }
    } else {
        index.maps.push(MapIndexEntryV2 {
            id: map_id.to_string(),
            name: name.to_string(),
            default_on_open,
            updated_at: updated_at.to_string(),
        });
    }
    save_index(project_root, &index)
}

fn map_dir(project_root: &Path, map_id: &str) -> Result<PathBuf, AppError> {
    if map_id.trim().is_empty() || map_id.contains("..") || map_id.contains('/') {
        return Err(AppError::new("error.maps.not_found"));
    }
    Ok(maps_root(project_root).join(map_id))
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, AppError> {
    let json = fs::read_to_string(path).map_err(|e| AppError::database(e.to_string()))?;
    serde_json::from_str(&json).map_err(|_| AppError::new("error.maps.invalid_json"))
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    let json =
        serde_json::to_string_pretty(value).map_err(|e| AppError::database(e.to_string()))?;
    fs::write(path, json.as_bytes()).map_err(|e| AppError::database(e.to_string()))
}

fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    let json =
        serde_json::to_string_pretty(value).map_err(|e| AppError::database(e.to_string()))?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    fs::rename(&tmp, path).map_err(|e| AppError::database(e.to_string()))
}

fn generate_map_id(name: &str) -> String {
    let seed = format!("map:{name}:{}", unix_ms_now());
    let hash = Sha256::digest(seed.as_bytes());
    format!("map_{:016x}", u64::from_be_bytes(hash[..8].try_into().unwrap()))
}

fn timestamp_now() -> String {
    unix_ms_now().to_string()
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn resolve_project_relative_path(
    project_root: &Path,
    relative_path: &str,
) -> Result<PathBuf, AppError> {
    let trimmed = relative_path.trim();
    if trimmed.is_empty() || trimmed.contains("..") {
        return Err(AppError::new("error.maps.image_not_found"));
    }
    let joined = project_root.join(trimmed.replace('/', std::path::MAIN_SEPARATOR_STR));
    let canonical = joined
        .canonicalize()
        .map_err(|_| AppError::new("error.maps.image_not_found"))?;
    let root_canonical = project_root
        .canonicalize()
        .unwrap_or_else(|_| project_root.to_path_buf());
    if !canonical.starts_with(&root_canonical) {
        return Err(AppError::new("error.maps.image_not_found"));
    }
    if !canonical.is_file() {
        return Err(AppError::new("error.maps.image_not_found"));
    }
    Ok(canonical)
}

fn image_mime_from_path(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root() -> tempfile::TempDir {
        let tmp = tempfile::TempDir::new().unwrap();
        fs::create_dir_all(tmp.path().join(NARRALITH_DIR)).unwrap();
        tmp
    }

    #[test]
    fn list_maps_empty() {
        let tmp = test_root();
        let list = list_maps(tmp.path()).unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn create_blank_map_creates_tree() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Mundo A", 2400, 1600).unwrap();
        assert_eq!(summary.name, "Mundo A");
        assert_eq!(summary.width, 2400);
        assert_eq!(summary.height, 1600);

        let map_dir = maps_root(root).join(&summary.id);
        assert!(map_dir.join(MAP_FILENAME).is_file());
        assert!(map_dir.join(PRINCIPAL_DRAWING_REL).is_file());
        assert!(map_dir.join(HOTSPOTS_FILENAME).is_file());
        assert!(map_dir.join("assets").is_dir());

        let list = list_maps(root).unwrap();
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn create_blank_map_default_layer() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Test", 1200, 800).unwrap();
        let drawing = get_map_drawing(root, &summary.id).unwrap();
        assert_eq!(drawing.version, 2);
        assert_eq!(drawing.layers.len(), 1);
        assert_eq!(drawing.layers[0].id, "layer-1");
        assert!(drawing.layers[0].strokes.is_empty());
    }

    #[test]
    fn map_document_round_trip() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Round", 1200, 800).unwrap();
        let mut doc = get_map_document(root, &summary.id).unwrap();
        doc.name = "Renamed".to_string();
        doc.updated_at = "999".to_string();
        save_map_document(root, &doc).unwrap();
        let loaded = get_map_document(root, &summary.id).unwrap();
        assert_eq!(loaded.name, "Renamed");
    }

    #[test]
    fn drawing_round_trip() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Draw", 1200, 800).unwrap();
        let mut drawing = get_map_drawing(root, &summary.id).unwrap();
        drawing.layers[0].strokes.push(MapStrokeV2 {
            id: "s1".to_string(),
            tool: MapStrokeTool::Brush,
            brush: "pencil".to_string(),
            color: "#000000".to_string(),
            base_size: 2.0,
            base_opacity: 0.8,
            points: vec![
                MapStrokePointV2 {
                    x: 1.0,
                    y: 2.0,
                    pressure: Some(0.5),
                },
                MapStrokePointV2 {
                    x: 3.0,
                    y: 4.0,
                    pressure: None,
                },
            ],
        });
        save_map_drawing(root, &summary.id, &drawing).unwrap();
        let loaded = get_map_drawing(root, &summary.id).unwrap();
        assert_eq!(loaded.layers[0].strokes.len(), 1);
        assert_eq!(loaded.layers[0].strokes[0].points[0].pressure, Some(0.5));
    }

    #[test]
    fn save_map_drawing_updates_index_updated_at() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Draw", 1200, 800).unwrap();
        let mut index = load_index(root).unwrap();
        let entry = index
            .maps
            .iter_mut()
            .find(|e| e.id == summary.id)
            .unwrap();
        entry.updated_at = "100".to_string();
        save_index(root, &index).unwrap();

        let mut drawing = get_map_drawing(root, &summary.id).unwrap();
        drawing.layers[0].strokes.push(MapStrokeV2 {
            id: "s1".to_string(),
            tool: MapStrokeTool::Brush,
            brush: "pen".to_string(),
            color: "#000000".to_string(),
            base_size: 2.0,
            base_opacity: 1.0,
            points: vec![MapStrokePointV2 {
                x: 1.0,
                y: 2.0,
                pressure: None,
            }],
        });
        save_map_drawing(root, &summary.id, &drawing).unwrap();

        let index = load_index(root).unwrap();
        let updated_at = index
            .maps
            .iter()
            .find(|e| e.id == summary.id)
            .unwrap()
            .updated_at
            .clone();
        assert_ne!(updated_at, "100");
        assert!(updated_at.parse::<i64>().unwrap() > 100);
    }

    #[test]
    fn invalid_dimensions_rejected() {
        let tmp = test_root();
        let err = create_blank_map(tmp.path(), "Bad", 100, 800).unwrap_err();
        assert_eq!(err.key, "error.maps.invalid_dimensions");
    }

    #[test]
    fn resolve_pinned() {
        let tmp = test_root();
        let root = tmp.path();
        let a = create_blank_map(root, "A", 1200, 800).unwrap();
        let _b = create_blank_map(root, "B", 1200, 800).unwrap();
        set_default_on_open(root, &a.id, true).unwrap();
        set_open_preference(root, OpenPreference::Pinned).unwrap();

        let index = load_index(root).unwrap();
        let resolved = resolve_initial_map(&index, root);
        assert_eq!(resolved.map_id, Some(a.id.clone()));
        assert_eq!(resolved.reason, InitialMapReason::Pinned);
    }

    #[test]
    fn resolve_pinned_fallback_to_last_viewed() {
        let tmp = test_root();
        let root = tmp.path();
        let a = create_blank_map(root, "A", 1200, 800).unwrap();
        let b = create_blank_map(root, "B", 1200, 800).unwrap();
        record_map_viewed(root, &b.id).unwrap();
        set_open_preference(root, OpenPreference::Pinned).unwrap();

        let index = load_index(root).unwrap();
        let resolved = resolve_initial_map(&index, root);
        assert_eq!(resolved.map_id, Some(b.id));
        assert_eq!(resolved.reason, InitialMapReason::LastViewed);
        let _ = a;
    }

    #[test]
    fn resolve_last_viewed() {
        let tmp = test_root();
        let root = tmp.path();
        let _a = create_blank_map(root, "A", 1200, 800).unwrap();
        let b = create_blank_map(root, "B", 1200, 800).unwrap();
        record_map_viewed(root, &b.id).unwrap();
        set_open_preference(root, OpenPreference::LastViewed).unwrap();

        let index = load_index(root).unwrap();
        let resolved = resolve_initial_map(&index, root);
        assert_eq!(resolved.map_id, Some(b.id));
        assert_eq!(resolved.reason, InitialMapReason::LastViewed);
    }

    #[test]
    fn resolve_last_viewed_stale_id() {
        let tmp = test_root();
        let root = tmp.path();
        let a = create_blank_map(root, "A", 1200, 800).unwrap();
        let mut index = load_index(root).unwrap();
        index.last_viewed_map_id = Some("map_deleted".to_string());
        save_index(root, &index).unwrap();

        let index = load_index(root).unwrap();
        let resolved = resolve_initial_map(&index, root);
        assert_eq!(resolved.map_id, Some(a.id));
        assert_eq!(resolved.reason, InitialMapReason::LastModified);
    }

    #[test]
    fn resolve_last_modified() {
        let tmp = test_root();
        let root = tmp.path();
        let a = create_blank_map(root, "A", 1200, 800).unwrap();
        let b = create_blank_map(root, "B", 1200, 800).unwrap();
        let mut index = load_index(root).unwrap();
        for entry in &mut index.maps {
            if entry.id == a.id {
                entry.updated_at = "100".to_string();
            } else if entry.id == b.id {
                entry.updated_at = "200".to_string();
            }
        }
        save_index(root, &index).unwrap();
        set_open_preference(root, OpenPreference::LastModified).unwrap();

        let index = load_index(root).unwrap();
        let resolved = resolve_initial_map(&index, root);
        assert_eq!(resolved.map_id, Some(b.id));
        assert_eq!(resolved.reason, InitialMapReason::LastModified);
    }

    #[test]
    fn set_default_on_open_exclusive() {
        let tmp = test_root();
        let root = tmp.path();
        let a = create_blank_map(root, "A", 1200, 800).unwrap();
        let b = create_blank_map(root, "B", 1200, 800).unwrap();
        set_default_on_open(root, &a.id, true).unwrap();
        set_default_on_open(root, &b.id, true).unwrap();

        let index = load_index(root).unwrap();
        let pinned: Vec<_> = index
            .maps
            .iter()
            .filter(|e| e.default_on_open == Some(true))
            .collect();
        assert_eq!(pinned.len(), 1);
        assert_eq!(pinned[0].id, b.id);
    }

    #[test]
    fn record_viewed_persists() {
        let tmp = test_root();
        let root = tmp.path();
        let a = create_blank_map(root, "A", 1200, 800).unwrap();
        let b = create_blank_map(root, "B", 1200, 800).unwrap();
        record_map_viewed(root, &b.id).unwrap();

        let index = load_index(root).unwrap();
        assert_eq!(index.last_viewed_map_id, Some(b.id));
        let _ = a;
    }

    fn write_test_png(path: &Path, width: u32, height: u32) {
        use image::{ImageBuffer, Rgba};
        let img = ImageBuffer::from_fn(width, height, |_, _| Rgba([0u8, 0, 0, 255]));
        img.save(path).unwrap();
    }

    #[test]
    fn create_custom_dimensions() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Custom", 1200, 800).unwrap();
        let doc = get_map_document(root, &summary.id).unwrap();
        let drawing = get_map_drawing(root, &summary.id).unwrap();
        assert_eq!(doc.width, 1200);
        assert_eq!(doc.height, 800);
        assert_eq!(drawing.width, 1200);
        assert_eq!(drawing.height, 800);
    }

    #[test]
    fn create_import_sets_base_image() {
        let tmp = test_root();
        let root = tmp.path();
        let png_path = tmp.path().join("import.png");
        write_test_png(&png_path, 800, 600);
        let summary = create_map_from_image(root, "Import", png_path.to_str().unwrap()).unwrap();
        let doc = get_map_document(root, &summary.id).unwrap();
        assert_eq!(doc.width, 800);
        assert_eq!(doc.height, 600);
        assert_eq!(doc.base_image_rel.as_deref(), Some("assets/base.png"));
        assert!(maps_root(root)
            .join(&summary.id)
            .join("assets/base.png")
            .is_file());
    }

    #[test]
    fn import_rejects_tiny_image() {
        let tmp = test_root();
        let root = tmp.path();
        let png_path = tmp.path().join("tiny.png");
        write_test_png(&png_path, 100, 100);
        let err = create_map_from_image(root, "Tiny", png_path.to_str().unwrap()).unwrap_err();
        assert_eq!(err.key, "error.maps.image_dimensions_invalid");
    }

    #[test]
    fn import_scales_oversized() {
        let tmp = test_root();
        let root = tmp.path();
        let png_path = tmp.path().join("huge.png");
        write_test_png(&png_path, 10000, 5000);
        let summary = create_map_from_image(root, "Huge", png_path.to_str().unwrap()).unwrap();
        assert!(summary.width <= MAX_DIMENSION);
        assert!(summary.height <= MAX_DIMENSION);
        assert!(summary.width >= MIN_DIMENSION);
        assert!(summary.height >= MIN_DIMENSION);
    }

    #[test]
    fn expand_adds_space() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Expand", 1200, 800).unwrap();
        let mut drawing = get_map_drawing(root, &summary.id).unwrap();
        drawing.layers[0].strokes.push(MapStrokeV2 {
            id: "s1".to_string(),
            tool: MapStrokeTool::Brush,
            brush: "pencil".to_string(),
            color: "#000000".to_string(),
            base_size: 2.0,
            base_opacity: 0.8,
            points: vec![
                MapStrokePointV2 {
                    x: 10.0,
                    y: 10.0,
                    pressure: None,
                },
                MapStrokePointV2 {
                    x: 20.0,
                    y: 20.0,
                    pressure: None,
                },
            ],
        });
        save_map_drawing(root, &summary.id, &drawing).unwrap();

        let doc = expand_map_canvas(root, &summary.id, 100, 50).unwrap();
        assert_eq!(doc.width, 1300);
        assert_eq!(doc.height, 850);
        let loaded = get_map_drawing(root, &summary.id).unwrap();
        assert_eq!(loaded.layers[0].strokes[0].points[0].x, 10.0);
        assert_eq!(loaded.layers[0].strokes[0].points[0].y, 10.0);
    }

    #[test]
    fn expand_rejects_over_max() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Max", 8000, 8000).unwrap();
        let err = expand_map_canvas(root, &summary.id, 200, 0).unwrap_err();
        assert_eq!(err.key, "error.maps.invalid_dimensions");
    }

    #[test]
    fn crop_clips_strokes() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Crop", 1200, 800).unwrap();
        let mut drawing = get_map_drawing(root, &summary.id).unwrap();
        drawing.layers[0].strokes.push(MapStrokeV2 {
            id: "inside".to_string(),
            tool: MapStrokeTool::Brush,
            brush: "pencil".to_string(),
            color: "#000000".to_string(),
            base_size: 2.0,
            base_opacity: 0.8,
            points: vec![
                MapStrokePointV2 {
                    x: 10.0,
                    y: 10.0,
                    pressure: None,
                },
                MapStrokePointV2 {
                    x: 20.0,
                    y: 20.0,
                    pressure: None,
                },
            ],
        });
        drawing.layers[0].strokes.push(MapStrokeV2 {
            id: "outside".to_string(),
            tool: MapStrokeTool::Brush,
            brush: "pencil".to_string(),
            color: "#000000".to_string(),
            base_size: 2.0,
            base_opacity: 0.8,
            points: vec![
                MapStrokePointV2 {
                    x: 1100.0,
                    y: 10.0,
                    pressure: None,
                },
                MapStrokePointV2 {
                    x: 1150.0,
                    y: 20.0,
                    pressure: None,
                },
            ],
        });
        save_map_drawing(root, &summary.id, &drawing).unwrap();

        crop_map_canvas(root, &summary.id, 1000, 700).unwrap();
        let loaded = get_map_drawing(root, &summary.id).unwrap();
        assert_eq!(loaded.width, 1000);
        assert_eq!(loaded.height, 700);
        assert_eq!(loaded.layers[0].strokes.len(), 1);
        assert_eq!(loaded.layers[0].strokes[0].id, "inside");
    }

    #[test]
    fn crop_updates_dimensions() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "CropDims", 1200, 800).unwrap();
        let doc = crop_map_canvas(root, &summary.id, 1000, 700).unwrap();
        let drawing = get_map_drawing(root, &summary.id).unwrap();
        assert_eq!(doc.width, 1000);
        assert_eq!(doc.height, 700);
        assert_eq!(drawing.width, 1000);
        assert_eq!(drawing.height, 700);
    }

    #[test]
    fn validate_drawing_rejects_duplicate_layer_ids() {
        let drawing = MapDrawingV2 {
            version: 2,
            width: 800,
            height: 600,
            layers: vec![
                MapDrawingLayerV2 {
                    id: "layer-a".to_string(),
                    name: "A".to_string(),
                    visible: true,
                    opacity: 1.0,
                    locked: false,
                    strokes: vec![],
                },
                MapDrawingLayerV2 {
                    id: "layer-a".to_string(),
                    name: "B".to_string(),
                    visible: true,
                    opacity: 1.0,
                    locked: false,
                    strokes: vec![],
                },
            ],
        };
        assert!(validate_drawing(&drawing).is_err());
    }

    #[test]
    fn validate_drawing_rejects_invalid_layer_opacity() {
        let drawing = MapDrawingV2 {
            version: 2,
            width: 800,
            height: 600,
            layers: vec![MapDrawingLayerV2 {
                id: "layer-1".to_string(),
                name: "Capa".to_string(),
                visible: true,
                opacity: 1.5,
                locked: false,
                strokes: vec![],
            }],
        };
        assert!(validate_drawing(&drawing).is_err());
    }

    #[test]
    fn save_map_document_persists_desde_and_updates_timestamp() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "Desde", 1200, 800).unwrap();
        let mut doc = get_map_document(root, &summary.id).unwrap();
        doc.desde = Some("15.3.2000".to_string());
        doc.updated_at = "stale".to_string();
        save_map_document(root, &doc).unwrap();
        let loaded = get_map_document(root, &summary.id).unwrap();
        assert_eq!(loaded.desde.as_deref(), Some("15.3.2000"));
        assert_ne!(loaded.updated_at, "stale");

        let index = load_index(root).unwrap();
        let entry = index.maps.iter().find(|e| e.id == summary.id).unwrap();
        assert_eq!(entry.updated_at, loaded.updated_at);
    }

    #[test]
    fn save_map_document_rejects_invalid_desde() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "BadDesde", 1200, 800).unwrap();
        let mut doc = get_map_document(root, &summary.id).unwrap();
        doc.desde = Some("not-a-date".to_string());
        let err = save_map_document(root, &doc).unwrap_err();
        assert_eq!(err.key, "error.maps.invalid_desde");
    }

    #[test]
    fn save_map_document_normalizes_empty_desde_to_none() {
        let tmp = test_root();
        let root = tmp.path();
        let summary = create_blank_map(root, "EmptyDesde", 1200, 800).unwrap();
        let mut doc = get_map_document(root, &summary.id).unwrap();
        doc.desde = Some("   ".to_string());
        save_map_document(root, &doc).unwrap();
        let loaded = get_map_document(root, &summary.id).unwrap();
        assert!(loaded.desde.is_none());
    }
}
