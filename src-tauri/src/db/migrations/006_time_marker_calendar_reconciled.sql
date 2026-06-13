-- v6: marcas reconciliadas manualmente tras desajuste estructural (FIX-010d)

ALTER TABLE time_markers ADD COLUMN calendar_reconciled INTEGER NOT NULL DEFAULT 0
    CHECK (calendar_reconciled IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_time_markers_calendar_reconciled
    ON time_markers (calendar_reconciled);
