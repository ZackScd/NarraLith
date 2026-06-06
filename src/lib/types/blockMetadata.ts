import type { BarTag } from "@/lib/types/manuscript";

/** Campos de metadatos MVP por bloque legacy (frontmatter YAML). */
export interface BlockMetadata {
  /** Legacy: usar `barTags` en eventos §1.4 (`update_event_metadata`). */
  time?: string;
  location?: string;
  event?: string;
  characters?: string[];
  tags?: string[];
}

/** Metadatos de apertura de evento §1.4 (YAML de `+++event`). */
export interface EventBlockMetadata {
  event: string;
  description?: string;
  entity: string;
  barTags?: BarTag[];
}
