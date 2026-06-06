-- v5: multi-marca temporal por segmento/evento (D2, plan.md §1.8 / §13.3)
--
-- Permite N filas por evento: barTags con type:time (origen) + cada {{time:…}} inline.
-- Filas legacy (metadata.time en bloques +++) conservan block_id; segment_id queda NULL
-- hasta reindexar en Fase 2.2.

ALTER TABLE time_markers ADD COLUMN segment_id TEXT;
ALTER TABLE time_markers ADD COLUMN tag_kind TEXT NOT NULL DEFAULT 'bar'
    CHECK (tag_kind IN ('bar', 'inline'));
ALTER TABLE time_markers ADD COLUMN char_offset INTEGER;

CREATE INDEX IF NOT EXISTS idx_time_markers_segment_id ON time_markers (segment_id);
CREATE INDEX IF NOT EXISTS idx_time_markers_segment_trajectory
    ON time_markers (segment_id, tag_kind, char_offset);
