-- v4: orden de persistencia para "última fecha añadida" global
ALTER TABLE time_markers ADD COLUMN persisted_at INTEGER NOT NULL DEFAULT 0;
UPDATE time_markers SET persisted_at = rowid WHERE persisted_at = 0;
CREATE INDEX IF NOT EXISTS idx_time_markers_persisted_at ON time_markers (persisted_at);
