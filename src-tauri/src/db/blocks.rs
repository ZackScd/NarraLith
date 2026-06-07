//! Persistencia de bloques parseados en SQLite (`blocks`, `time_markers`).

use rusqlite::params;

use crate::db::ProjectDb;
use crate::error::AppError;
use crate::parser::{
    scan_inline_tags, BarTag, ParsedBlock, ParsedDocument, ParsedManuscript,
};

/// Elimina bloques y marcas temporales asociados a un archivo eliminado o renombrado.
pub fn delete_blocks_for_file(db: &ProjectDb, file_path: &str) -> Result<(), AppError> {
    delete_blocks_under_path(db, file_path)
}

/// Elimina bloques de un `.md` o de todos los `.md` bajo un prefijo de carpeta.
pub fn delete_blocks_under_path(db: &ProjectDb, relative: &str) -> Result<(), AppError> {
    let conn = db.connection();
    let prefix_pattern = format!("{}/%", relative.trim_end_matches('/'));
    let segment_pattern = segment_id_folder_pattern(relative);

    conn.execute(
        "DELETE FROM time_markers WHERE block_id IN (
            SELECT id FROM blocks WHERE file_path = ?1 OR file_path LIKE ?2 ESCAPE '\\'
         ) OR segment_id LIKE ?3 ESCAPE '\\'",
        params![relative, prefix_pattern, segment_pattern],
    )
    .map_err(|e| AppError::database(e.to_string()))?;
    conn.execute(
        "DELETE FROM blocks WHERE file_path = ?1 OR file_path LIKE ?2 ESCAPE '\\'",
        params![relative, prefix_pattern],
    )
    .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

/// Tras renombrar/mover un `.md`, actualiza rutas en `blocks` y `time_markers`.
pub fn rename_file_path(db: &ProjectDb, from_rel: &str, to_rel: &str) -> Result<(), AppError> {
    rename_blocks_after_move(db, from_rel, to_rel)
}

/// Tras mover/renombrar en disco un archivo `.md` o un árbol de carpetas, sincroniza `blocks`.
pub fn rename_blocks_after_move(
    db: &ProjectDb,
    from_rel: &str,
    to_rel: &str,
) -> Result<(), AppError> {
    if from_rel == to_rel {
        return Ok(());
    }

    let conn = db.connection();
    let from_prefix = format!("{}/", from_rel.trim_end_matches('/'));
    let to_prefix = format!("{}/", to_rel.trim_end_matches('/'));
    let from_pattern = format!("{}%", from_prefix);

    let mut stmt = conn
        .prepare(
            "SELECT id, file_path, block_index FROM blocks
             WHERE file_path = ?1 OR file_path LIKE ?2 ESCAPE '\\'",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows: Vec<(String, String, i32)> = stmt
        .query_map(params![from_rel, from_pattern], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| AppError::database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    for (old_id, old_file_path, block_index) in rows {
        let new_file_path = if old_file_path == from_rel {
            to_rel.to_string()
        } else if let Some(suffix) = old_file_path.strip_prefix(&from_prefix) {
            format!("{to_prefix}{suffix}")
        } else {
            continue;
        };
        let new_id = ParsedDocument::stable_block_id(&new_file_path, block_index);
        rewrite_segment_ids_for_file(conn, &old_file_path, &new_file_path)?;

        if old_id == new_id {
            conn.execute(
                "UPDATE blocks SET file_path = ?1 WHERE id = ?2",
                params![new_file_path, old_id],
            )
            .map_err(|e| AppError::database(e.to_string()))?;
            conn.execute(
                "UPDATE time_markers SET entity_path = ?1 WHERE block_id = ?2",
                params![new_file_path, old_id],
            )
            .map_err(|e| AppError::database(e.to_string()))?;
            continue;
        }
        conn.execute(
            "UPDATE time_markers SET block_id = NULL WHERE block_id = ?1",
            params![old_id],
        )
        .map_err(|e| AppError::database(e.to_string()))?;
        conn.execute(
            "UPDATE blocks SET id = ?1, file_path = ?2 WHERE id = ?3",
            params![new_id, new_file_path, old_id],
        )
        .map_err(|e| AppError::database(e.to_string()))?;
        conn.execute(
            "UPDATE time_markers SET block_id = ?1, entity_path = ?2
             WHERE entity_path = ?3 AND block_id IS NULL",
            params![new_id, new_file_path, old_file_path],
        )
        .map_err(|e| AppError::database(e.to_string()))?;
    }

    Ok(())
}

/// Reemplaza los bloques de un archivo por el resultado del parser.
pub fn upsert_blocks_for_file(db: &ProjectDb, doc: &ParsedDocument) -> Result<(), AppError> {
    let conn = db.connection();
    let file_path = &doc.file_path;
    let segment_pattern = segment_id_file_pattern(file_path);

    conn.execute(
        "DELETE FROM time_markers WHERE block_id IN (
            SELECT id FROM blocks WHERE file_path = ?1
         ) OR segment_id LIKE ?2 ESCAPE '\\'",
        params![file_path, segment_pattern],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    conn.execute("DELETE FROM blocks WHERE file_path = ?1", params![file_path])
        .map_err(|e| AppError::database(e.to_string()))?;

    for block in &doc.blocks {
        insert_block(conn, file_path, block)?;
        upsert_time_markers_for_block(conn, file_path, block)?;
    }

    Ok(())
}

fn insert_block(
    conn: &rusqlite::Connection,
    file_path: &str,
    block: &ParsedBlock,
) -> Result<(), AppError> {
    let metadata_json = serde_json::to_string(&block.metadata)
        .map_err(|e| AppError::database(e.to_string()))?;

    conn.execute(
        "INSERT INTO blocks (id, file_path, block_index, content_hash, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            block.id,
            file_path,
            block.index,
            block.content_hash,
            metadata_json,
        ],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    Ok(())
}

fn upsert_time_markers_for_block(
    conn: &rusqlite::Connection,
    file_path: &str,
    block: &ParsedBlock,
) -> Result<(), AppError> {
    if is_event_block(block) {
        if has_indexable_event_marks(block) {
            return upsert_event_time_markers(conn, file_path, block);
        }
        if metadata_string(&block.metadata, "time").is_some() {
            return upsert_legacy_time_marker(conn, file_path, block);
        }
        return Ok(());
    }
    upsert_legacy_time_marker(conn, file_path, block)?;
    upsert_inline_time_markers_for_block(conn, file_path, block)
}

fn has_indexable_event_marks(block: &ParsedBlock) -> bool {
    let bar_has_time = bar_tags_from_metadata(&block.metadata)
        .iter()
        .any(|t| t.tag_type == "time" && !t.value.trim().is_empty());
    if bar_has_time {
        return true;
    }
    scan_inline_tags(&block.body)
        .iter()
        .any(|t| t.tag_type == "time" && !t.value.trim().is_empty())
}

fn upsert_event_time_markers(
    conn: &rusqlite::Connection,
    file_path: &str,
    block: &ParsedBlock,
) -> Result<(), AppError> {
    if block.index < 1 {
        return Ok(());
    }

    let segment_index = block.index - 1;
    let segment_id = ParsedManuscript::stable_segment_id(file_path, segment_index);
    let label = metadata_string(&block.metadata, "event");
    let entity_path = metadata_string(&block.metadata, "entity").unwrap_or_else(|| file_path.to_string());
    let timestamp = resolved_timestamp(block);

    let bar_tags = bar_tags_from_metadata(&block.metadata);
    let mut bar_index = 0i32;
    for tag in bar_tags {
        if tag.tag_type != "time" || tag.value.trim().is_empty() {
            continue;
        }
        let marker_id = format!("{segment_id}::bar::{bar_index}");
        insert_time_marker(
            conn,
            &marker_id,
            &block.id,
            &entity_path,
            label.clone(),
            &tag.value,
            timestamp.clone(),
            Some(&segment_id),
            "bar",
            None,
        )?;
        bar_index += 1;
    }

    for tag in scan_inline_tags(&block.body) {
        if tag.tag_type != "time" || tag.value.trim().is_empty() {
            continue;
        }
        let marker_id = format!("{segment_id}::inline::{}", tag.char_offset);
        insert_time_marker(
            conn,
            &marker_id,
            &block.id,
            &entity_path,
            label.clone(),
            &tag.value,
            timestamp.clone(),
            Some(&segment_id),
            "inline",
            Some(tag.char_offset),
        )?;
    }

    Ok(())
}

fn upsert_inline_time_markers_for_block(
    conn: &rusqlite::Connection,
    file_path: &str,
    block: &ParsedBlock,
) -> Result<(), AppError> {
    let label = metadata_string(&block.metadata, "event")
        .or_else(|| metadata_string(&block.metadata, "location"))
        .or_else(|| metadata_string(&block.metadata, "title"));
    let timestamp = resolved_timestamp(block);

    for tag in scan_inline_tags(&block.body) {
        if tag.tag_type != "time" || tag.value.trim().is_empty() {
            continue;
        }
        let marker_id = format!("{}::inline::{}", block.id, tag.char_offset);
        insert_time_marker(
            conn,
            &marker_id,
            &block.id,
            file_path,
            label.clone(),
            &tag.value,
            timestamp.clone(),
            None,
            "inline",
            Some(tag.char_offset),
        )?;
    }

    Ok(())
}

fn upsert_legacy_time_marker(
    conn: &rusqlite::Connection,
    file_path: &str,
    block: &ParsedBlock,
) -> Result<(), AppError> {
    let Some(raw_time) = metadata_string(&block.metadata, "time") else {
        return Ok(());
    };

    let marker_id = format!("{}::time", block.id);
    let label = metadata_string(&block.metadata, "event")
        .or_else(|| metadata_string(&block.metadata, "location"));

    insert_time_marker(
        conn,
        &marker_id,
        &block.id,
        file_path,
        label,
        &raw_time,
        resolved_timestamp(block),
        None,
        "bar",
        None,
    )
}

fn insert_time_marker(
    conn: &rusqlite::Connection,
    marker_id: &str,
    block_id: &str,
    entity_path: &str,
    label: Option<String>,
    raw_time: &str,
    timestamp: Option<String>,
    segment_id: Option<&str>,
    tag_kind: &str,
    char_offset: Option<u32>,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO time_markers (
            id, block_id, entity_path, timestamp, label, raw_time, persisted_at,
            segment_id, tag_kind, char_offset
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            marker_id,
            block_id,
            entity_path,
            timestamp,
            label,
            raw_time,
            unix_ms_now(),
            segment_id,
            tag_kind,
            char_offset.map(i64::from),
        ],
    )
    .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

fn rewrite_segment_ids_for_file(
    conn: &rusqlite::Connection,
    from_file: &str,
    to_file: &str,
) -> Result<(), AppError> {
    if from_file == to_file {
        return Ok(());
    }
    let pattern = segment_id_file_pattern(from_file);
    let mut stmt = conn
        .prepare("SELECT id, segment_id FROM time_markers WHERE segment_id LIKE ?1 ESCAPE '\\'")
        .map_err(|e| AppError::database(e.to_string()))?;
    let rows: Vec<(String, String)> = stmt
        .query_map(params![pattern], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| AppError::database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    for (marker_id, segment_id) in rows {
        let new_segment_id = segment_id.replacen(from_file, to_file, 1);
        if new_segment_id == segment_id {
            continue;
        }
        let new_marker_id = marker_id.replacen(from_file, to_file, 1);
        conn.execute(
            "UPDATE time_markers SET id = ?1, segment_id = ?2 WHERE id = ?3",
            params![new_marker_id, new_segment_id, marker_id],
        )
        .map_err(|e| AppError::database(e.to_string()))?;
    }
    Ok(())
}

fn segment_id_file_pattern(file_path: &str) -> String {
    format!("{file_path}::seg::%")
}

fn segment_id_folder_pattern(folder: &str) -> String {
    format!("{}/%::seg::%", folder.trim_end_matches('/'))
}

fn is_event_block(block: &ParsedBlock) -> bool {
    block
        .metadata
        .get("event")
        .and_then(|v| v.as_str())
        .is_some_and(|s| !s.is_empty())
}

fn bar_tags_from_metadata(metadata: &serde_json::Value) -> Vec<BarTag> {
    metadata
        .get("barTags")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default()
}

fn resolved_timestamp(block: &ParsedBlock) -> Option<String> {
    block
        .time_timestamp
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

fn metadata_string(metadata: &serde_json::Value, key: &str) -> Option<String> {
    metadata.get(key).and_then(|v| match v {
        serde_json::Value::String(s) if !s.is_empty() => Some(s.clone()),
        _ => None,
    })
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
    use crate::parser::{
        manuscript_to_document, parse_document_str, parse_legacy_document_str, parse_manuscript_str,
    };
    use tempfile::TempDir;

    fn upsert_manuscript_raw(db: &ProjectDb, path: &str, raw: &str) {
        let manuscript = parse_manuscript_str(path, raw).unwrap();
        let doc = manuscript_to_document(&manuscript);
        upsert_blocks_for_file(db, &doc).unwrap();
    }

    #[test]
    fn blocks_persist_and_replace_on_reparse() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();

        let doc1 = parse_document_str(
            "Manuscrito/Escena.md",
            "---\ntime: Day 1\n---\nFirst\n\n+++\nSecond block",
        )
        .unwrap();
        upsert_blocks_for_file(&db, &doc1).unwrap();

        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM blocks WHERE file_path = ?1",
                ["Manuscrito/Escena.md"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 2);

        let doc2 = parse_document_str("Manuscrito/Escena.md", "Only one block now").unwrap();
        upsert_blocks_for_file(&db, &doc2).unwrap();

        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM blocks WHERE file_path = ?1",
                ["Manuscrito/Escena.md"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        let markers: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM time_markers", [], |row| row.get(0))
            .unwrap();
        assert_eq!(markers, 0);
    }

    #[test]
    fn time_marker_created_when_time_present() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let doc = parse_legacy_document_str(
            "a.md",
            "---\ntime: \"Year 3\"\nevent: Battle\n---\nText",
        )
        .unwrap();
        upsert_blocks_for_file(&db, &doc).unwrap();

        let (raw, tag_kind): (String, String) = db
            .connection()
            .query_row(
                "SELECT raw_time, tag_kind FROM time_markers WHERE block_id = ?1",
                [doc.blocks[0].id.as_str()],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(raw, "Year 3");
        assert_eq!(tag_kind, "bar");
    }

    #[test]
    fn event_without_marks_creates_zero_time_markers() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let raw = "---\ntitle: T\n---\nintro\n\n\
                   +++event\n---\nevent: solo\nentity: Worldbuilding/Eventos/solo.md\n---\nprosa";
        upsert_manuscript_raw(&db, "Manuscrito/T.md", raw);

        let count: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM time_markers", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn event_bar_tag_and_inline_tags_create_ordered_markers() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let raw = "---\ntitle: Escena\n---\n\n\
                   +++event\n---\n\
                   event: guerra\n\
                   entity: Worldbuilding/Eventos/guerra.md\n\
                   barTags:\n  - type: time\n    value: \"10.1.0\"\n\
                   ---\n\
                   inicio {{time:10.1.0}} medio {{time:11.1.0}}\n+++end-event\n";
        upsert_manuscript_raw(&db, "Manuscrito/Escena.md", raw);

        let rows: Vec<(String, String, Option<i64>)> = db
            .connection()
            .prepare(
                "SELECT tag_kind, raw_time, char_offset FROM time_markers
                 WHERE segment_id = 'Manuscrito/Escena.md::seg::0'
                 ORDER BY
                   CASE tag_kind WHEN 'bar' THEN 0 ELSE 1 END,
                   char_offset ASC NULLS FIRST",
            )
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0], ("bar".to_string(), "10.1.0".to_string(), None));
        assert_eq!(rows[1].0, "inline");
        assert_eq!(rows[1].1, "10.1.0");
        assert!(rows[1].2.is_some());
        assert_eq!(rows[2].0, "inline");
        assert_eq!(rows[2].1, "11.1.0");
        assert!(rows[2].2.unwrap() > rows[1].2.unwrap());
    }

    #[test]
    fn non_event_inline_time_tag_creates_timeline_marker() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let raw = "---\ntitle: Sin evento\n---\n\
                   prosa libre {{time:17.1.0}} continúa\n";
        upsert_manuscript_raw(&db, "Manuscrito/SinEvento.md", raw);

        let rows: Vec<(String, String, Option<i64>)> = db
            .connection()
            .prepare(
                "SELECT tag_kind, raw_time, char_offset FROM time_markers
                 WHERE entity_path = 'Manuscrito/SinEvento.md'
                 ORDER BY char_offset ASC",
            )
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0], ("inline".to_string(), "17.1.0".to_string(), Some(12)));
    }

    #[test]
    fn rename_blocks_after_move_updates_file_and_markers() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let doc = parse_legacy_document_str(
            "Manuscrito/Escena.md",
            "---\ntime: \"1.1.0\"\n---\nBody",
        )
        .unwrap();
        upsert_blocks_for_file(&db, &doc).unwrap();

        rename_blocks_after_move(&db, "Manuscrito/Escena.md", "Manuscrito/Archivo/Escena.md")
            .unwrap();

        let count: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM blocks WHERE file_path = ?1",
                ["Manuscrito/Archivo/Escena.md"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        let marker_path: String = db
            .connection()
            .query_row(
                "SELECT entity_path FROM time_markers LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(marker_path, "Manuscrito/Archivo/Escena.md");
    }

    #[test]
    fn rename_updates_segment_id_for_event_markers() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let raw = "---\ntitle: T\n---\n\
                   +++event\n---\nevent: e\nentity: Worldbuilding/Eventos/e.md\n\
                   barTags:\n  - type: time\n    value: \"1.0.0\"\n---\ncuerpo\n+++end-event\n";
        upsert_manuscript_raw(&db, "Manuscrito/Escena.md", raw);

        rename_blocks_after_move(&db, "Manuscrito/Escena.md", "Manuscrito/Nueva/Escena.md")
            .unwrap();

        let segment_id: String = db
            .connection()
            .query_row(
                "SELECT segment_id FROM time_markers LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(segment_id, "Manuscrito/Nueva/Escena.md::seg::0");
    }

    #[test]
    fn delete_blocks_under_path_removes_nested_manuscript_files() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        for path in ["Manuscrito/Carpeta/A.md", "Manuscrito/Carpeta/B.md"] {
            let doc = parse_document_str(path, "Block").unwrap();
            upsert_blocks_for_file(&db, &doc).unwrap();
        }

        delete_blocks_under_path(&db, "Manuscrito/Carpeta").unwrap();

        let count: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM blocks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}
