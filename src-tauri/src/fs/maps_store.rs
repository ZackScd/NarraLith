//! Persistencia de mapas interactivos (`.narralith/maps/`).

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use image::{ImageReader, Rgba, RgbaImage};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::db::NARRALITH_DIR;
use crate::error::AppError;

const MAPS_DIR: &str = "maps";
const INDEX_FILENAME: &str = "index.json";
const MANIFEST_FILENAME: &str = "manifest.json";
const LAYERS_FILENAME: &str = "layers.json";
const SKETCH_REL: &str = "sketches/default.excalidraw.json";
const DRAWING_FILENAME: &str = "drawing.json";
const MAP_IMAGES_DIR: &str = "Imagenes/Mapas_y_Geografia";
const MAX_IMAGE_BYTES: u64 = 50 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapsIndex {
    pub version: u32,
    pub maps: Vec<MapIndexEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapIndexEntry {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_map_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapManifest {
    pub id: String,
    pub name: String,
    pub image_path: String,
    pub width: u32,
    pub height: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_map_id: Option<String>,
    #[serde(default)]
    pub overlays: Vec<MapOverlay>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapOverlay {
    pub id: String,
    pub name: String,
    pub image_path: String,
    /// `[[y1,x1],[y2,x2]]` en coordenadas del mapa (CRS.Simple).
    pub bounds: [[f64; 2]; 2],
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub from_timestamp: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub to_timestamp: Option<String>,
    #[serde(default)]
    pub z_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapLayersFile {
    pub version: u32,
    pub layers: Vec<MapLayer>,
    pub features: Vec<MapFeature>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapLayer {
    pub id: String,
    pub name: String,
    #[serde(default = "default_true")]
    pub visible: bool,
    #[serde(default = "default_opacity")]
    pub opacity: f64,
    #[serde(default)]
    pub z_index: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_filter: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapFeatureStyle {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fill_opacity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapFeature {
    pub id: String,
    pub layer_id: String,
    pub kind: MapFeatureKind,
    /// Cada punto es `[y, x]` en coordenadas del mapa.
    pub latlng: Vec<[f64; 2]>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub entity_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub child_map_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<MapFeatureStyle>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MapFeatureKind {
    Pin,
    Polygon,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapSummary {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_map_id: Option<String>,
    pub image_path: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapData {
    pub manifest: MapManifest,
    pub layers: MapLayersFile,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MapStateAt {
    pub manifest: MapManifest,
    pub layers: MapLayersFile,
    pub active_overlays: Vec<MapOverlay>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preview_timestamp: Option<String>,
}

fn default_true() -> bool {
    true
}

fn default_opacity() -> f64 {
    1.0
}

impl MapsIndex {
    fn empty() -> Self {
        Self {
            version: 1,
            maps: Vec::new(),
        }
    }
}

impl MapLayersFile {
    fn empty() -> Self {
        Self {
            version: 1,
            layers: vec![MapLayer {
                id: "layer-default".to_string(),
                name: "General".to_string(),
                visible: true,
                opacity: 1.0,
                z_index: 0,
                category_filter: None,
            }],
            features: Vec::new(),
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
        let index = MapsIndex::empty();
        write_json(&index_path, &index)?;
    }
    Ok(())
}

pub fn list_maps(project_root: &Path) -> Result<Vec<MapSummary>, AppError> {
    ensure_maps_dir(project_root)?;
    let index = load_index(project_root)?;
    let mut out = Vec::new();
    for entry in &index.maps {
        if let Ok(data) = load_map_data(project_root, &entry.id) {
            out.push(MapSummary {
                id: data.manifest.id.clone(),
                name: data.manifest.name.clone(),
                parent_map_id: data.manifest.parent_map_id.clone(),
                image_path: data.manifest.image_path.clone(),
                width: data.manifest.width,
                height: data.manifest.height,
            });
        }
    }
    Ok(out)
}

pub fn get_map_data(project_root: &Path, map_id: &str) -> Result<MapData, AppError> {
    ensure_maps_dir(project_root)?;
    load_map_data(project_root, map_id)
}

pub fn save_map_data(project_root: &Path, data: &MapData) -> Result<(), AppError> {
    ensure_maps_dir(project_root)?;
    validate_map_data(project_root, data)?;
    validate_no_child_cycles(project_root, &data.manifest.id, &data.layers.features)?;

    let map_dir = maps_root(project_root).join(&data.manifest.id);
    fs::create_dir_all(&map_dir).map_err(|e| AppError::database(e.to_string()))?;

    write_json(&map_dir.join(MANIFEST_FILENAME), &data.manifest)?;
    write_json(&map_dir.join(LAYERS_FILENAME), &data.layers)?;

    let mut index = load_index(project_root)?;
    if let Some(entry) = index.maps.iter_mut().find(|m| m.id == data.manifest.id) {
        entry.name = data.manifest.name.clone();
        entry.parent_map_id = data.manifest.parent_map_id.clone();
    } else {
        index.maps.push(MapIndexEntry {
            id: data.manifest.id.clone(),
            name: data.manifest.name.clone(),
            parent_map_id: data.manifest.parent_map_id.clone(),
        });
    }
    write_json(&maps_root(project_root).join(INDEX_FILENAME), &index)?;
    Ok(())
}

/// Crea un mapa con un lienzo PNG generado en el proyecto (sin importar archivo externo).
pub fn create_blank_map(
    project_root: &Path,
    name: &str,
    width: u32,
    height: u32,
) -> Result<MapSummary, AppError> {
    ensure_maps_dir(project_root)?;
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.maps.name_required"));
    }

    let width = width.clamp(512, 8192);
    let height = height.clamp(512, 8192);

    let dest_dir = project_root.join(MAP_IMAGES_DIR);
    fs::create_dir_all(&dest_dir).map_err(|e| AppError::database(e.to_string()))?;

    let safe_stem: String = trimmed
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let file_name = format!("blank_{safe_stem}_{}.png", unix_ms_now());
    let dest = dest_dir.join(&file_name);
    write_blank_map_png(&dest, width, height)?;

    let rel = format!("{MAP_IMAGES_DIR}/{file_name}");
    let id = generate_map_id(trimmed);

    let manifest = MapManifest {
        id: id.clone(),
        name: trimmed.to_string(),
        image_path: rel.clone(),
        width,
        height,
        parent_map_id: None,
        overlays: Vec::new(),
    };

    let data = MapData {
        manifest: manifest.clone(),
        layers: MapLayersFile::empty(),
    };
    save_map_data(project_root, &data)?;

    Ok(MapSummary {
        id,
        name: trimmed.to_string(),
        parent_map_id: None,
        image_path: rel,
        width,
        height,
    })
}

pub fn create_map(
    project_root: &Path,
    name: &str,
    source_image_path: &str,
) -> Result<MapSummary, AppError> {
    ensure_maps_dir(project_root)?;
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.maps.name_required"));
    }

    let (rel_path, width, height) = import_image_to_project(project_root, source_image_path)?;
    let id = generate_map_id(trimmed);

    let manifest = MapManifest {
        id: id.clone(),
        name: trimmed.to_string(),
        image_path: rel_path.clone(),
        width,
        height,
        parent_map_id: None,
        overlays: Vec::new(),
    };

    let data = MapData {
        manifest: manifest.clone(),
        layers: MapLayersFile::empty(),
    };
    save_map_data(project_root, &data)?;

    Ok(MapSummary {
        id,
        name: trimmed.to_string(),
        parent_map_id: None,
        image_path: rel_path,
        width,
        height,
    })
}

pub fn import_map_image(
    project_root: &Path,
    map_id: &str,
    source_image_path: &str,
) -> Result<MapSummary, AppError> {
    let mut data = load_map_data(project_root, map_id)?;
    let (rel_path, width, height) = import_image_to_project(project_root, source_image_path)?;
    data.manifest.image_path = rel_path.clone();
    data.manifest.width = width;
    data.manifest.height = height;
    save_map_data(project_root, &data)?;
    Ok(MapSummary {
        id: data.manifest.id,
        name: data.manifest.name,
        parent_map_id: data.manifest.parent_map_id,
        image_path: rel_path,
        width,
        height,
    })
}

pub fn import_overlay_image(
    project_root: &Path,
    source_image_path: &str,
) -> Result<(String, u32, u32), AppError> {
    import_image_to_project(project_root, source_image_path)
        .map(|(path, w, h)| (path, w, h))
}

/// Lee una imagen relativa al proyecto y la devuelve como data URL (para Leaflet).
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

fn import_image_to_project(
    project_root: &Path,
    source_image_path: &str,
) -> Result<(String, u32, u32), AppError> {
    let source = PathBuf::from(source_image_path);
    if !source.is_file() {
        return Err(AppError::new("error.maps.image_not_found"));
    }

    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();
    if !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp") {
        return Err(AppError::new("error.maps.invalid_image_type"));
    }

    let meta = fs::metadata(&source).map_err(|e| AppError::database(e.to_string()))?;
    if meta.len() > MAX_IMAGE_BYTES {
        return Err(AppError::new("error.maps.image_too_large"));
    }

    let (width, height) = read_image_dimensions(&source)?;

    let dest_dir = project_root.join(MAP_IMAGES_DIR);
    fs::create_dir_all(&dest_dir).map_err(|e| AppError::database(e.to_string()))?;

    let stem = source
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("map");
    let safe_stem: String = stem
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let file_name = format!("{safe_stem}_{}.{}", unix_ms_now(), ext);
    let dest = dest_dir.join(&file_name);
    fs::copy(&source, &dest).map_err(|e| AppError::database(e.to_string()))?;

    let rel = format!("{MAP_IMAGES_DIR}/{file_name}");
    Ok((rel, width, height))
}

/// Lienzo vacío blanco con rejilla sutil (estilo Sketchbook).
fn write_blank_map_png(path: &Path, width: u32, height: u32) -> Result<(), AppError> {
    let bg = Rgba([255, 255, 255, 255]);
    let grid = Rgba([230, 230, 230, 255]);
    let mut img = RgbaImage::from_pixel(width, height, bg);
    const STEP: u32 = 80;
    for x in (0..width).step_by(STEP as usize) {
        for y in 0..height {
            img.put_pixel(x, y, grid);
        }
    }
    for y in (0..height).step_by(STEP as usize) {
        for x in 0..width {
            img.put_pixel(x, y, grid);
        }
    }
    img.save(path)
        .map_err(|e| AppError::database(format!("blank map png: {e}")))
}

fn read_image_dimensions(path: &Path) -> Result<(u32, u32), AppError> {
    let reader = ImageReader::open(path).map_err(|_| AppError::new("error.maps.invalid_image"))?;
    let img = reader
        .decode()
        .map_err(|_| AppError::new("error.maps.invalid_image"))?;
    Ok((img.width(), img.height()))
}

fn load_index(project_root: &Path) -> Result<MapsIndex, AppError> {
    let path = maps_root(project_root).join(INDEX_FILENAME);
    if !path.exists() {
        return Ok(MapsIndex::empty());
    }
    let json = fs::read_to_string(&path).map_err(|e| AppError::database(e.to_string()))?;
    serde_json::from_str(&json).map_err(|_| AppError::new("error.maps.invalid_index"))
}

fn load_map_data(project_root: &Path, map_id: &str) -> Result<MapData, AppError> {
    if map_id.trim().is_empty() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let map_dir = maps_root(project_root).join(map_id);
    let manifest_path = map_dir.join(MANIFEST_FILENAME);
    if !manifest_path.exists() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let manifest: MapManifest = read_json(&manifest_path)?;
    let layers_path = map_dir.join(LAYERS_FILENAME);
    let layers = if layers_path.exists() {
        read_json(&layers_path)?
    } else {
        MapLayersFile::empty()
    };
    Ok(MapData { manifest, layers })
}

fn validate_map_data(project_root: &Path, data: &MapData) -> Result<(), AppError> {
    if data.manifest.id.trim().is_empty() || data.manifest.name.trim().is_empty() {
        return Err(AppError::new("error.maps.name_required"));
    }
    if data.manifest.width == 0 || data.manifest.height == 0 {
        return Err(AppError::new("error.maps.invalid_dimensions"));
    }

    let index = load_index(project_root)?;
    for child_id in data
        .layers
        .features
        .iter()
        .filter_map(|f| f.child_map_id.as_deref())
    {
        if child_id == data.manifest.id {
            return Err(AppError::new("error.maps.child_cycle"));
        }
        if !index.maps.iter().any(|m| m.id == child_id) {
            return Err(AppError::new("error.maps.child_not_found"));
        }
    }

    if let Some(parent_id) = data.manifest.parent_map_id.as_deref() {
        if parent_id == data.manifest.id {
            return Err(AppError::new("error.maps.child_cycle"));
        }
        if !index.maps.iter().any(|m| m.id == parent_id) {
            return Err(AppError::new("error.maps.parent_not_found"));
        }
    }

    for overlay in &data.manifest.overlays {
        validate_overlay(overlay)?;
    }

    let layer_ids: HashSet<&str> = data.layers.layers.iter().map(|l| l.id.as_str()).collect();
    for feature in &data.layers.features {
        if !layer_ids.contains(feature.layer_id.as_str()) {
            return Err(AppError::new("error.maps.layer_not_found"));
        }
        match feature.kind {
            MapFeatureKind::Pin if feature.latlng.len() != 1 => {
                return Err(AppError::new("error.maps.invalid_feature"));
            }
            MapFeatureKind::Polygon if feature.latlng.len() < 3 => {
                return Err(AppError::new("error.maps.invalid_feature"));
            }
            _ => {}
        }
    }

    Ok(())
}

fn validate_overlay(overlay: &MapOverlay) -> Result<(), AppError> {
    if overlay.id.trim().is_empty() || overlay.name.trim().is_empty() {
        return Err(AppError::new("error.maps.overlay_invalid"));
    }
  if overlay.bounds[0][0] > overlay.bounds[1][0] || overlay.bounds[0][1] > overlay.bounds[1][1] {
        return Err(AppError::new("error.maps.overlay_invalid"));
    }
    if let Some(from) = overlay.from_timestamp.as_deref() {
        parse_timestamp(from)?;
    }
    if let Some(to) = overlay.to_timestamp.as_deref() {
        parse_timestamp(to)?;
    }
    Ok(())
}

fn validate_no_child_cycles(
    project_root: &Path,
    map_id: &str,
    features: &[MapFeature],
) -> Result<(), AppError> {
    for feature in features {
        if let Some(child) = feature.child_map_id.as_deref() {
            if child == map_id {
                return Err(AppError::new("error.maps.child_cycle"));
            }
            let mut seen = HashSet::new();
            if path_leads_to_map(project_root, child, map_id, &mut seen)? {
                return Err(AppError::new("error.maps.child_cycle"));
            }
        }
    }
    Ok(())
}

fn path_leads_to_map(
    project_root: &Path,
    current: &str,
    target: &str,
    seen: &mut HashSet<String>,
) -> Result<bool, AppError> {
    if current == target {
        return Ok(true);
    }
    if !seen.insert(current.to_string()) {
        return Ok(false);
    }
    let data = load_map_data(project_root, current)?;
    for feature in &data.layers.features {
        if let Some(child) = feature.child_map_id.as_deref() {
            if path_leads_to_map(project_root, child, target, seen)? {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

pub fn get_map_state_at(
    project_root: &Path,
    map_id: &str,
    timestamp: Option<&str>,
) -> Result<MapStateAt, AppError> {
    let data = load_map_data(project_root, map_id)?;
    let ts = timestamp.map(parse_timestamp).transpose()?;

    let active_overlays: Vec<MapOverlay> = data
        .manifest
        .overlays
        .iter()
        .filter(|o| overlay_active_at(o, ts.as_ref()))
        .cloned()
        .collect();

    Ok(MapStateAt {
        manifest: data.manifest,
        layers: data.layers,
        active_overlays,
        preview_timestamp: timestamp.map(String::from),
    })
}

pub fn get_map_sketch(
    project_root: &Path,
    map_id: &str,
) -> Result<Option<serde_json::Value>, AppError> {
    ensure_maps_dir(project_root)?;
    if map_id.trim().is_empty() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let path = sketch_path(project_root, map_id);
    if !path.exists() {
        return Ok(None);
    }
    read_json(&path).map(Some)
}

pub fn save_map_sketch(
    project_root: &Path,
    map_id: &str,
    sketch: serde_json::Value,
) -> Result<(), AppError> {
    ensure_maps_dir(project_root)?;
    if map_id.trim().is_empty() {
        return Err(AppError::new("error.maps.not_found"));
    }
    if !load_index(project_root)?
        .maps
        .iter()
        .any(|m| m.id == map_id)
    {
        return Err(AppError::new("error.maps.not_found"));
    }
    let path = sketch_path(project_root, map_id);
    write_json(&path, &sketch)?;
    Ok(())
}

pub fn get_map_drawing(
    project_root: &Path,
    map_id: &str,
) -> Result<Option<serde_json::Value>, AppError> {
    ensure_maps_dir(project_root)?;
    if map_id.trim().is_empty() {
        return Err(AppError::new("error.maps.not_found"));
    }
    let path = drawing_path(project_root, map_id);
    if !path.exists() {
        return Ok(None);
    }
    read_json(&path).map(Some)
}

pub fn save_map_drawing(
    project_root: &Path,
    map_id: &str,
    drawing: serde_json::Value,
) -> Result<(), AppError> {
    ensure_maps_dir(project_root)?;
    if map_id.trim().is_empty() {
        return Err(AppError::new("error.maps.not_found"));
    }
    if !load_index(project_root)?
        .maps
        .iter()
        .any(|m| m.id == map_id)
    {
        return Err(AppError::new("error.maps.not_found"));
    }
    let path = drawing_path(project_root, map_id);
    write_json(&path, &drawing)?;
    Ok(())
}

/// Reemplaza la imagen del mapa con un PNG exportado desde el estudio de dibujo.
pub fn save_map_canvas_png(
    project_root: &Path,
    map_id: &str,
    png_base64: &str,
) -> Result<MapSummary, AppError> {
    let mut data = load_map_data(project_root, map_id)?;
    let trimmed = png_base64.trim();
    let payload = trimmed
        .strip_prefix("data:image/png;base64,")
        .unwrap_or(trimmed);
    let bytes = STANDARD
        .decode(payload)
        .map_err(|_| AppError::new("error.maps.invalid_image"))?;
    if bytes.is_empty() || bytes.len() as u64 > MAX_IMAGE_BYTES {
        return Err(AppError::new("error.maps.image_too_large"));
    }
    let img = image::load_from_memory(&bytes)
        .map_err(|_| AppError::new("error.maps.invalid_image"))?;
    let width = img.width();
    let height = img.height();
    if width == 0 || height == 0 {
        return Err(AppError::new("error.maps.invalid_dimensions"));
    }

    let dest_dir = project_root.join(MAP_IMAGES_DIR);
    fs::create_dir_all(&dest_dir).map_err(|e| AppError::database(e.to_string()))?;
    let file_name = format!("canvas_{map_id}_{}.png", unix_ms_now());
    let dest = dest_dir.join(&file_name);
    fs::write(&dest, &bytes).map_err(|e| AppError::database(e.to_string()))?;

    let rel = format!("{MAP_IMAGES_DIR}/{file_name}");
    data.manifest.image_path = rel.clone();
    data.manifest.width = width;
    data.manifest.height = height;
    save_map_data(project_root, &data)?;

    Ok(MapSummary {
        id: data.manifest.id,
        name: data.manifest.name,
        parent_map_id: data.manifest.parent_map_id,
        image_path: rel,
        width,
        height,
    })
}

fn sketch_path(project_root: &Path, map_id: &str) -> PathBuf {
    maps_root(project_root).join(map_id).join(SKETCH_REL)
}

fn drawing_path(project_root: &Path, map_id: &str) -> PathBuf {
    maps_root(project_root).join(map_id).join(DRAWING_FILENAME)
}

fn overlay_active_at(overlay: &MapOverlay, timestamp: Option<&u128>) -> bool {
    match timestamp {
        None => overlay.from_timestamp.is_none(),
        Some(ts) => {
            let from_ok = overlay
                .from_timestamp
                .as_deref()
                .map(parse_timestamp)
                .transpose()
                .ok()
                .flatten()
                .map(|from| ts >= &from)
                .unwrap_or(true);
            let to_ok = overlay
                .to_timestamp
                .as_deref()
                .map(parse_timestamp)
                .transpose()
                .ok()
                .flatten()
                .map(|to| ts < &to)
                .unwrap_or(true);
            from_ok && to_ok
        }
    }
}

fn parse_timestamp(raw: &str) -> Result<u128, AppError> {
    if raw.trim().is_empty() || !raw.chars().all(|c| c.is_ascii_digit()) {
        return Err(AppError::new("error.maps.invalid_timestamp"));
    }
    raw.parse::<u128>()
        .map_err(|_| AppError::new("error.maps.invalid_timestamp"))
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, AppError> {
    let json = fs::read_to_string(path).map_err(|e| AppError::database(e.to_string()))?;
    serde_json::from_str(&json).map_err(|_| AppError::new("error.maps.invalid_json"))
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    let json = serde_json::to_string_pretty(value).map_err(|e| AppError::database(e.to_string()))?;
    fs::write(path, json.as_bytes()).map_err(|e| AppError::database(e.to_string()))
}

fn generate_map_id(name: &str) -> String {
    let seed = format!("map:{name}:{}", unix_ms_now());
    let hash = Sha256::digest(seed.as_bytes());
    format!("map_{:016x}", u64::from_be_bytes(hash[..8].try_into().unwrap()))
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_data(id: &str) -> MapData {
        MapData {
            manifest: MapManifest {
                id: id.to_string(),
                name: "Test".to_string(),
                image_path: "Imagenes/Mapas_y_Geografia/test.png".to_string(),
                width: 1000,
                height: 800,
                parent_map_id: None,
                overlays: vec![MapOverlay {
                    id: "ov1".to_string(),
                    name: "Ruinas".to_string(),
                    image_path: "Imagenes/Mapas_y_Geografia/ruins.png".to_string(),
                    bounds: [[0.0, 0.0], [200.0, 200.0]],
                    from_timestamp: Some("100".to_string()),
                    to_timestamp: Some("500".to_string()),
                    z_index: 1,
                }],
            },
            layers: MapLayersFile::empty(),
        }
    }

    #[test]
    fn create_blank_map_writes_png() {
        let tmp = tempfile::TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();
        let summary = create_blank_map(root, "Mundo", 1200, 800).unwrap();
        assert_eq!(summary.name, "Mundo");
        assert_eq!(summary.width, 1200);
        assert_eq!(summary.height, 800);
        let img_path = root.join(&summary.image_path.replace('/', std::path::MAIN_SEPARATOR_STR));
        assert!(img_path.is_file());
        let list = list_maps(root).unwrap();
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn list_maps_empty_project() {
        let tmp = tempfile::TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();
        let list = list_maps(root).unwrap();
        assert!(list.is_empty());
    }

    #[test]
    fn map_round_trip() {
        let tmp = tempfile::TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();
        let data = sample_data("map_test");
        save_map_data(root, &data).unwrap();
        let loaded = get_map_data(root, "map_test").unwrap();
        assert_eq!(loaded, data);
        let list = list_maps(root).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, "map_test");
    }

    #[test]
    fn sketch_round_trip() {
        let tmp = tempfile::TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();
        let data = sample_data("map_sk");
        save_map_data(root, &data).unwrap();

        let sketch = serde_json::json!({
            "type": "excalidraw",
            "version": 2,
            "elements": [],
            "appState": { "viewBackgroundColor": "#ffffff" }
        });
        save_map_sketch(root, "map_sk", sketch.clone()).unwrap();
        let loaded = get_map_sketch(root, "map_sk").unwrap().expect("sketch");
        assert_eq!(loaded, sketch);
    }

    #[test]
    fn overlay_active_only_in_range() {
        let overlay = MapOverlay {
            id: "o".into(),
            name: "n".into(),
            image_path: "p".into(),
            bounds: [[0.0, 0.0], [1.0, 1.0]],
            from_timestamp: Some("100".into()),
            to_timestamp: Some("200".into()),
            z_index: 0,
        };
        assert!(!overlay_active_at(&overlay, Some(&99)));
        assert!(overlay_active_at(&overlay, Some(&100)));
        assert!(overlay_active_at(&overlay, Some(&150)));
        assert!(!overlay_active_at(&overlay, Some(&200)));
    }

    #[test]
    fn child_cycle_rejected() {
        let tmp = tempfile::TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join(NARRALITH_DIR)).unwrap();

        let mut a = sample_data("map_a");
        let mut b = sample_data("map_b");
        b.manifest.id = "map_b".into();
        b.manifest.name = "B".into();
        save_map_data(root, &a).unwrap();
        save_map_data(root, &b).unwrap();

        a.layers.features.push(MapFeature {
            id: "f1".into(),
            layer_id: "layer-default".into(),
            kind: MapFeatureKind::Polygon,
            latlng: vec![[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]],
            entity_path: None,
            label: None,
            child_map_id: Some("map_b".into()),
            style: None,
        });
        save_map_data(root, &a).unwrap();

        b.layers.features.push(MapFeature {
            id: "f2".into(),
            layer_id: "layer-default".into(),
            kind: MapFeatureKind::Pin,
            latlng: vec![[5.0, 5.0]],
            entity_path: None,
            label: None,
            child_map_id: Some("map_a".into()),
            style: None,
        });
        let err = save_map_data(root, &b).unwrap_err();
        assert_eq!(err.key, "error.maps.child_cycle");
    }

    #[test]
    fn read_project_image_rejects_path_traversal() {
        let dir = tempfile::tempdir().unwrap();
        let err = read_project_image_data_url(dir.path(), "../secret.png").unwrap_err();
        assert_eq!(err.key, "error.maps.image_not_found");
    }
}
