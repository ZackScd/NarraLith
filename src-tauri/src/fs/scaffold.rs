//! Materializa en disco la plantilla elegida por el usuario (Fase 1.1.3).

use std::fs;
use std::path::{Path, PathBuf};

use crate::db::{ProjectDb, NARRALITH_DIR};
use crate::error::AppError;
use crate::fs::templates::{self, TemplateNode};
use crate::git::init_repository;

const DEFAULT_TAXONOMY_JSON: &str = include_str!("../../resources/defaults/taxonomy.json");
const DEFAULT_TEMPLATE_MAP_JSON: &str = include_str!("../../resources/defaults/template_map.json");
use crate::fs::calendar_config::default_calendar_json;

/// Crea la carpeta del proyecto y su árbol según la plantilla. No sobrescribe si ya existe.
pub fn create_project_at(
    parent_dir: impl AsRef<Path>,
    project_name: &str,
    template_id: &str,
    locale: &str,
) -> Result<PathBuf, AppError> {
    let parent_dir = parent_dir.as_ref();
    let folder_name = sanitize_folder_name(project_name)?;
    let project_root = parent_dir.join(&folder_name);

    if project_root.exists() {
        return Err(AppError::new("error.project.path_exists"));
    }

    let template = templates::load_template(template_id)?;

    fs::create_dir_all(&project_root).map_err(|e| AppError::database(e.to_string()))?;

    for node in &template.nodes {
        materialize_node(node, &project_root)?;
    }

    write_narralith_defaults(&project_root, locale)?;

    crate::fs::explorer_order::write_order_from_template(&project_root, &template)?;

    init_repository(&project_root)?;

    let db = ProjectDb::open(&project_root)?;
    let now = chrono_lite_unix_ms();
    db.set_meta("id", &crate::fs::indexer::stable_project_id(&project_root))?;
    db.set_meta("name", project_name)?;
    db.set_meta("template_id", template_id)?;
    db.set_meta("created_at", &now.to_string())?;
    db.set_meta("updated_at", &now.to_string())?;
    let locale_meta = normalize_project_locale(locale);
    db.set_meta("locale", &locale_meta)?;

    Ok(project_root)
}

fn materialize_node(node: &TemplateNode, parent: &Path) -> Result<(), AppError> {
    match node {
        TemplateNode::Dir { name, children } => {
            let dir_path = parent.join(name);
            fs::create_dir_all(&dir_path).map_err(|e| AppError::database(e.to_string()))?;
            for child in children {
                materialize_node(child, &dir_path)?;
            }
        }
        TemplateNode::File { name, content } => {
            let file_path = parent.join(name);
            if let Some(p) = file_path.parent() {
                fs::create_dir_all(p).map_err(|e| AppError::database(e.to_string()))?;
            }
            fs::write(&file_path, content.as_bytes())
                .map_err(|e| AppError::database(e.to_string()))?;
        }
    }
    Ok(())
}

fn normalize_project_locale(locale: &str) -> String {
    let loc = locale.trim().to_ascii_lowercase();
    if loc.starts_with("en") {
        "en".to_string()
    } else {
        "es".to_string()
    }
}

fn write_narralith_defaults(project_root: &Path, locale: &str) -> Result<(), AppError> {
    let narralith = project_root.join(NARRALITH_DIR);
    fs::create_dir_all(&narralith).map_err(|e| AppError::database(e.to_string()))?;
    let taxonomy_path = narralith.join("taxonomy.json");
    fs::write(&taxonomy_path, DEFAULT_TAXONOMY_JSON.as_bytes())
        .map_err(|e| AppError::database(e.to_string()))?;

    let template_map_path = narralith.join("template_map.json");
    fs::write(&template_map_path, DEFAULT_TEMPLATE_MAP_JSON.as_bytes())
        .map_err(|e| AppError::database(e.to_string()))?;

    let calendar_path = narralith.join("calendar.json");
    fs::write(&calendar_path, default_calendar_json(locale).as_bytes())
        .map_err(|e| AppError::database(e.to_string()))?;

    crate::fs::maps_store::ensure_maps_dir(project_root)?;

    Ok(())
}

/// Nombre seguro para carpeta de proyecto (sin caracteres prohibidos en Windows).
pub fn sanitize_folder_name(name: &str) -> Result<String, AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.project.invalid_name"));
    }

    const INVALID: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let mut out = String::with_capacity(trimmed.len());
    for c in trimmed.chars() {
        if INVALID.contains(&c) || c.is_control() {
            return Err(AppError::new("error.project.invalid_name"));
        }
        if c == '.' && out.is_empty() {
            return Err(AppError::new("error.project.invalid_name"));
        }
        out.push(c);
    }

    let forbidden: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
        "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8",
        "LPT9",
    ];
    let upper = out.to_ascii_uppercase();
    if forbidden.contains(&upper.as_str()) {
        return Err(AppError::new("error.project.invalid_name"));
    }

    Ok(out)
}

fn chrono_lite_unix_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn create_standard_project_on_disk() {
        let parent = TempDir::new().unwrap();
        let root =
            create_project_at(parent.path(), "Mi Obra", "standard", "es").expect("create");

        assert!(root.join("Manuscrito/Volumen 1/Capitulo 1/Escena_1.md").is_file());
        assert!(root.join(".narralith/index.db").is_file());
        assert!(root.join(".narralith/taxonomy.json").is_file());
        assert!(root.join(".narralith/explorer-order.json").is_file());
        assert!(root.join(".git").is_dir());

        let db = ProjectDb::open(&root).unwrap();
        assert_eq!(db.get_meta("name").unwrap().as_deref(), Some("Mi Obra"));
        assert_eq!(
            db.get_meta("template_id").unwrap().as_deref(),
            Some("standard")
        );
    }

    #[test]
    fn rejects_existing_directory() {
        let parent = TempDir::new().unwrap();
        let path = parent.path().join("Duplicado");
        fs::create_dir(&path).unwrap();
        let err = create_project_at(parent.path(), "Duplicado", "blank", "es").unwrap_err();
        assert_eq!(err.key, "error.project.path_exists");
    }

    #[test]
    fn sanitize_rejects_invalid_chars() {
        assert!(sanitize_folder_name("bad/name").is_err());
        assert!(sanitize_folder_name("  ").is_err());
        assert_eq!(sanitize_folder_name("  Valid  ").unwrap(), "Valid");
    }
}
