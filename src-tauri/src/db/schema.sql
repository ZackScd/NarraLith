-- NarraLith — esquema base v1 (por proyecto: .narralith/index.db)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS project_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    color TEXT,
    aliases TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_entities_name ON entities (name);
CREATE INDEX IF NOT EXISTS idx_entities_category ON entities (category);

CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY NOT NULL,
    file_path TEXT NOT NULL,
    block_index INTEGER NOT NULL,
    content_hash TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    UNIQUE (file_path, block_index)
);

CREATE INDEX IF NOT EXISTS idx_blocks_file_path ON blocks (file_path);

CREATE TABLE IF NOT EXISTS wiki_links (
    id TEXT PRIMARY KEY NOT NULL,
    source_path TEXT NOT NULL,
    target_name TEXT NOT NULL,
    target_path TEXT,
    alias TEXT,
    block_index INTEGER
);

CREATE INDEX IF NOT EXISTS idx_wiki_links_target_name ON wiki_links (target_name);
CREATE INDEX IF NOT EXISTS idx_wiki_links_source_path ON wiki_links (source_path);
CREATE INDEX IF NOT EXISTS idx_wiki_links_target_path ON wiki_links (target_path);

CREATE TABLE IF NOT EXISTS backlinks (
    id TEXT PRIMARY KEY NOT NULL,
    entity_path TEXT NOT NULL,
    source_path TEXT NOT NULL,
    block_index INTEGER,
    snippet TEXT
);

CREATE INDEX IF NOT EXISTS idx_backlinks_entity_path ON backlinks (entity_path);
CREATE INDEX IF NOT EXISTS idx_backlinks_source_path ON backlinks (source_path);

CREATE TABLE IF NOT EXISTS time_markers (
    id TEXT PRIMARY KEY NOT NULL,
    block_id TEXT,
    entity_path TEXT,
    timestamp TEXT,
    label TEXT,
    raw_time TEXT,
    persisted_at INTEGER NOT NULL DEFAULT 0,
    -- D2 (v5): N marcas por segmento/evento (barTags time + inline {{time:…}})
    segment_id TEXT,
    tag_kind TEXT NOT NULL DEFAULT 'bar' CHECK (tag_kind IN ('bar', 'inline')),
    char_offset INTEGER,
    FOREIGN KEY (block_id) REFERENCES blocks (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_time_markers_timestamp ON time_markers (timestamp);
CREATE INDEX IF NOT EXISTS idx_time_markers_entity_path ON time_markers (entity_path);
CREATE INDEX IF NOT EXISTS idx_time_markers_persisted_at ON time_markers (persisted_at);
CREATE INDEX IF NOT EXISTS idx_time_markers_segment_id ON time_markers (segment_id);
CREATE INDEX IF NOT EXISTS idx_time_markers_segment_trajectory
    ON time_markers (segment_id, tag_kind, char_offset);

CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges (source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges (target_id);
