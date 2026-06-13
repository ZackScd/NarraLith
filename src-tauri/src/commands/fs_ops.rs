//! Comandos IPC del explorador de archivos (Fase 1.3).

use std::collections::HashMap;

use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::error::AppError;
use crate::fs::crud;
use crate::fs::explorer_order::{self, ExplorerOrderMap};
use crate::fs::folder_meta::{self, FolderMeta};
use crate::fs::reconcile;
use crate::fs::taxonomy::TaxonomyMap;
use crate::fs::tree::{list_tree, FileTreeNode, TreeFilterMode};
use crate::state::ProjectState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaxonomyColors {
    pub colors: HashMap<String, String>,
}

#[tauri::command]
pub fn list_dir_tree(
    state: State<'_, ProjectState>,
    filter_mode: String,
) -> Result<Vec<FileTreeNode>, AppError> {
    state.with_db(|_db, root| {
        let mode = TreeFilterMode::parse(&filter_mode);
        list_tree(root, mode)
    })
}

#[tauri::command]
pub fn get_taxonomy_colors(state: State<'_, ProjectState>) -> Result<TaxonomyColors, AppError> {
    state.with_db(|_db, root| {
        let map = TaxonomyMap::load_for_project(root)?;
        Ok(TaxonomyColors {
            colors: map.into_inner(),
        })
    })
}

#[tauri::command]
pub fn create_folder(
    state: State<'_, ProjectState>,
    parent_path: String,
    name: String,
) -> Result<String, AppError> {
    state.with_db(|db, root| crud::create_folder(db, root, parent_path, name))
}

#[tauri::command]
pub fn create_file(
    state: State<'_, ProjectState>,
    parent_path: String,
    name: String,
) -> Result<String, AppError> {
    state.with_db(|db, root| crud::create_file(db, root, parent_path, name))
}

#[tauri::command]
pub fn rename_path(
    app: AppHandle,
    state: State<'_, ProjectState>,
    path: String,
    new_name: String,
) -> Result<String, AppError> {
    let outcome = state.with_db(|db, root| crud::rename_path(db, root, path, new_name))?;

    let mut notify_paths = vec![outcome.new_path.clone()];
    for path in outcome.refactored_paths {
        if !notify_paths.iter().any(|p| p == &path) {
            notify_paths.push(path);
        }
    }

    reconcile::emit_fs_changed(
        &app,
        "rename",
        notify_paths,
        Some(outcome.from_path.clone()),
    )?;

    Ok(outcome.new_path)
}

#[tauri::command]
pub fn move_path(
    app: AppHandle,
    state: State<'_, ProjectState>,
    source_path: String,
    dest_parent_path: String,
) -> Result<String, AppError> {
    let from_path = source_path.clone();
    let new_path = state.with_db(|db, root| {
        crud::move_path(db, root, source_path, dest_parent_path)
    })?;
    reconcile::emit_fs_changed(&app, "rename", vec![new_path.clone()], Some(from_path))?;
    Ok(new_path)
}

#[tauri::command]
pub fn get_folder_meta(
    state: State<'_, ProjectState>,
    relative_dir: String,
) -> Result<FolderMeta, AppError> {
    state.with_db(|_db, root| folder_meta::get_folder_meta(root, &relative_dir))
}

#[tauri::command]
pub fn set_folder_description(
    app: AppHandle,
    state: State<'_, ProjectState>,
    relative_dir: String,
    description: String,
    image_path: Option<String>,
    title: Option<String>,
) -> Result<(), AppError> {
    let meta_path = state.with_db(|_db, root| {
        folder_meta::set_folder_description(root, &relative_dir, description, image_path, title)?;
        folder_meta::folder_meta_relative_path(&relative_dir)
    })?;

    reconcile::emit_fs_changed(&app, "modify", vec![meta_path], None)?;
    Ok(())
}

#[tauri::command]
pub fn count_entities_in_tree(
    state: State<'_, ProjectState>,
    relative_dir: String,
) -> Result<u32, AppError> {
    state.with_db(|db, _root| folder_meta::count_entities_in_tree(db.connection(), &relative_dir))
}

#[tauri::command]
pub fn delete_path(
    app: AppHandle,
    state: State<'_, ProjectState>,
    path: String,
    force: bool,
) -> Result<(), AppError> {
    state.with_db(|db, root| crud::delete_path(db, root, path.clone(), force))?;
    reconcile::emit_fs_changed(&app, "remove", vec![path], None)?;
    Ok(())
}

#[tauri::command]
pub fn read_explorer_order(state: State<'_, ProjectState>) -> Result<ExplorerOrderMap, AppError> {
    state.with_db(|db, root| {
        let mut order = explorer_order::read_order(root)?;
        if order.is_empty() {
            if let Some(template_id) = db.get_meta("template_id")?.as_deref() {
                if matches!(template_id, "standard" | "blank") {
                    if let Ok(template) = crate::fs::templates::load_template(template_id) {
                        order = explorer_order::build_from_template(&template);
                        explorer_order::write_order(root, &order)?;
                    }
                }
            }
        }
        Ok(order)
    })
}

#[tauri::command]
pub fn save_explorer_order(
    state: State<'_, ProjectState>,
    order: ExplorerOrderMap,
) -> Result<(), AppError> {
    state.with_db(|_db, root| explorer_order::write_order(root, &order))
}

/// Abre la carpeta raíz del proyecto activo en el explorador del SO (FIX-003).
#[tauri::command]
pub fn open_project_root_in_os(
    app: AppHandle,
    state: State<'_, ProjectState>,
) -> Result<(), AppError> {
    let root = state.project_root()?;
    if !root.is_dir() {
        return Err(AppError::new("error.fs.not_found"));
    }
    let path = root.to_string_lossy().to_string();
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|_| AppError::new("error.fs.not_found"))?;
    Ok(())
}
