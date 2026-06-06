-- Fase 4.1: metadatos JSON de ficha en entities
ALTER TABLE entities ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';
