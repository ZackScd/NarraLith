/** Fila IPC `list_entities_for_search` (espejo de Rust `EntitySearchRow`). */
export interface EntitySearchRow {
  id: string;
  name: string;
  path: string;
  category: string;
  aliases: string[];
}

/** Resultado de búsqueda fuzzy en MiniSearch. */
export interface EntitySearchHit {
  id: string;
  name: string;
  path: string;
  category: string;
  aliases: string[];
  score: number;
}
