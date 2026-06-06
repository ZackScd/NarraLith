import MiniSearch from "minisearch";

import type { EntitySearchHit, EntitySearchRow } from "@/lib/types/entitySearch";

interface EntityIndexDocument {
  id: string;
  name: string;
  path: string;
  category: string;
  aliases: string[];
  aliasesText: string;
}

let index: MiniSearch<EntityIndexDocument> | null = null;
let lastEntities: EntitySearchRow[] = [];

/** Tolerancia fuzzy (~1–2 errores ortográficos en nombres cortos). */
const FUZZY = 0.2;

/**
 * Construye el índice en memoria desde filas SQLite.
 * Se invoca al abrir proyecto y tras cambios relevantes en el FS.
 */
export function buildEntityIndex(entities: EntitySearchRow[]): void {
  lastEntities = entities;
  const next = new MiniSearch<EntityIndexDocument>({
    fields: ["name", "path", "aliasesText"],
    storeFields: ["id", "name", "path", "category", "aliases"],
    searchOptions: {
      fuzzy: FUZZY,
      prefix: true,
      boost: { name: 3, aliasesText: 2, path: 1 },
    },
  });

  const documents = entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    path: entity.path,
    category: entity.category,
    aliases: entity.aliases,
    aliasesText: entity.aliases.join(" "),
  }));

  next.addAll(documents);
  index = next;
}

export function clearEntityIndex(): void {
  index = null;
  lastEntities = [];
}

export function isEntityIndexReady(): boolean {
  return index !== null;
}

/** Búsqueda fuzzy; query vacía devuelve las primeras entidades por nombre. */
export function searchEntities(query: string, limit = 15): EntitySearchHit[] {
  if (!index) {
    return [];
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return lastEntities
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      .slice(0, limit)
      .map((entity) => ({ ...entity, score: 0 }));
  }

  return index
    .search(trimmed, { fuzzy: FUZZY, prefix: true })
    .slice(0, limit)
    .map((result) => toHit(result.id, result.score));
}

function toHit(id: string, score: number): EntitySearchHit {
  const fields = index!.getStoredFields(id) as EntityIndexDocument | undefined;
  if (!fields) {
    return { id, name: id, path: "", category: "custom", aliases: [], score };
  }
  return {
    id: fields.id,
    name: fields.name,
    path: fields.path,
    category: fields.category,
    aliases: fields.aliases,
    score,
  };
}
