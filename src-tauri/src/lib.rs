mod checker;
mod commands;
mod db;
mod editor;
mod entity;
mod error;
mod fs;
mod graph;
mod git;
mod models;
mod parser;
mod refactor;
mod references;
mod state;
mod timeline;
mod wikilink;

#[cfg(debug_assertions)]
mod audit;

use state::ProjectState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ProjectState::new());

    #[cfg(debug_assertions)]
    let builder = builder.manage(audit::AuditState::new());

    builder
        .invoke_handler(tauri::generate_handler![
            commands::project::create_project,
            commands::project::open_project,
            commands::project::close_project,
            commands::project::get_active_project,
            commands::project::list_recent_projects,
            commands::project::remove_recent_project,
            commands::fs_ops::list_dir_tree,
            commands::fs_ops::get_taxonomy_colors,
            commands::fs_ops::create_folder,
            commands::fs_ops::create_file,
            commands::fs_ops::rename_path,
            commands::fs_ops::move_path,
            commands::fs_ops::delete_path,
            commands::fs_ops::read_explorer_order,
            commands::fs_ops::save_explorer_order,
            commands::fs_ops::get_folder_meta,
            commands::fs_ops::set_folder_description,
            commands::fs_ops::count_entities_in_tree,
            commands::fs_ops::open_project_root_in_os,
            commands::editor::read_document,
            commands::editor::parse_document,
            commands::editor::save_document,
            commands::editor::update_block_metadata,
            commands::editor::read_manuscript,
            commands::editor::parse_manuscript,
            commands::editor::save_manuscript,
            commands::editor::read_project_file_text,
            commands::editor::serialize_manuscript_preview,
            commands::editor::update_event_metadata,
            commands::editor::create_event_at_cursor,
            commands::editor::close_event_at_cursor,
            commands::editor::insert_inline_tag,
            commands::references::list_entities_for_search,
            commands::references::get_backlinks,
            commands::references::find_unlinked_mentions,
            commands::references::convert_unlinked_mention,
            commands::entity::list_entity_templates,
            commands::entity::get_entity_template,
            commands::entity::resolve_template_for_path,
            commands::entity::read_entity,
            commands::entity::save_entity,
            commands::entity::create_entity,
            commands::entity::ensure_event_entity,
            commands::entity::get_entity_timeline,
            commands::entity::get_location_inhabitants,
            commands::calendar::get_calendar_config,
            commands::calendar::get_calendar_baseline,
            commands::calendar::set_calendar_config,
            commands::calendar::reset_calendar_config,
            commands::timeline::get_timeline_events,
            commands::timeline::get_last_added_time,
            commands::consistency::get_consistency_issues,
            commands::consistency::dismiss_consistency_issue,
            commands::maps::list_project_maps,
            commands::maps::get_map_data_cmd,
            commands::maps::save_map_data_cmd,
            commands::maps::create_map_cmd,
            commands::maps::create_blank_map_cmd,
            commands::maps::import_map_image_cmd,
            commands::maps::import_overlay_image_cmd,
            commands::maps::read_project_image_cmd,
            commands::maps::get_map_state_at_cmd,
            commands::maps::get_map_sketch_cmd,
            commands::maps::save_map_sketch_cmd,
            commands::maps::get_map_drawing_cmd,
            commands::maps::save_map_drawing_cmd,
            commands::maps::save_map_canvas_png_cmd,
            commands::graph::get_graph_data_cmd,
            commands::graph::rebuild_graph_index_cmd,
            commands::graph::rebuild_graph_index_async_cmd,
            #[cfg(debug_assertions)]
            audit::commands::audit_bootstrap,
            #[cfg(debug_assertions)]
            audit::commands::audit_get_config,
            #[cfg(debug_assertions)]
            audit::commands::audit_set_enabled,
            #[cfg(debug_assertions)]
            audit::commands::audit_patch_settings,
            #[cfg(debug_assertions)]
            audit::commands::audit_clear_logs,
            #[cfg(debug_assertions)]
            audit::commands::audit_clear_all_logs,
            #[cfg(debug_assertions)]
            audit::commands::audit_append_entry,
            #[cfg(debug_assertions)]
            audit::commands::audit_get_log_path,
            #[cfg(debug_assertions)]
            audit::commands::audit_set_render_log_enabled,
            #[cfg(debug_assertions)]
            audit::commands::audit_set_render_verbose_enabled,
            #[cfg(debug_assertions)]
            audit::commands::audit_clear_render_logs,
            #[cfg(debug_assertions)]
            audit::commands::audit_append_render_entry,
            #[cfg(debug_assertions)]
            audit::commands::audit_set_action_log_enabled,
            #[cfg(debug_assertions)]
            audit::commands::audit_set_action_verbose_enabled,
            #[cfg(debug_assertions)]
            audit::commands::audit_append_action_entry,
            #[cfg(debug_assertions)]
            audit::commands::audit_clear_action_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
