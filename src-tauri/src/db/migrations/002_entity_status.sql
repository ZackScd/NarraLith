-- v2: estado de entidad para reconciliación (Fase 1.2)
ALTER TABLE entities ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
