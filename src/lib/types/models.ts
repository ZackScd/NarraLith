/** Categoría taxonómica de una entidad de worldbuilding. */
export type EntityCategory =
  | "character"
  | "location"
  | "faction"
  | "lore"
  | "power_system"
  | "nature"
  | "object"
  | "society"
  | "manuscript"
  | "custom";

/** Metadatos del proyecto activo (tabla `project_meta` / archivo de config). */
export interface ProjectMeta {
  id: string;
  name: string;
  rootPath: string;
  templateId: string;
  createdAt: number;
  updatedAt: number;
  locale: string;
}

/** Entidad indexada en el diccionario interno (personaje, ubicación, etc.). */
export interface Entity {
  id: string;
  name: string;
  path: string;
  category: EntityCategory;
  color?: string;
  aliases: string[];
  createdAt: number;
  updatedAt: number;
}

/** Bloque lógico de un archivo `.md` (separador `+++` + frontmatter YAML). */
export interface Block {
  id: string;
  filePath: string;
  blockIndex: number;
  contentHash?: string;
  /** Metadatos YAML del bloque serializados como objeto. */
  metadata: Record<string, unknown>;
}

/** Enlace wiki `[[entidad]]` o `[[Real|Alias]]`. */
export interface WikiLink {
  id: string;
  sourcePath: string;
  targetName: string;
  targetPath?: string;
  alias?: string;
  blockIndex?: number;
}

/** Origen de la marca temporal en un segmento (D2). */
export type TimeMarkerTagKind = "bar" | "inline";

/** Marca de tiempo asociada a un bloque, segmento o entidad. */
export interface TimeMarker {
  id: string;
  blockId?: string;
  entityPath?: string;
  /** Timestamp absoluto (BigInt serializado como string en JSON). */
  timestamp?: string;
  label?: string;
  rawTime?: string;
  persistedAt?: number;
  /** `{filePath}::seg::{segmentIndex}` — null en filas legacy. */
  segmentId?: string;
  tagKind?: TimeMarkerTagKind;
  /** Offset UTF-8 en cuerpo; null para marcas de barra. */
  charOffset?: number;
}

/** Nodo del grafo de conocimiento. */
export interface GraphNode {
  id: string;
  entityId: string;
  label: string;
  category: EntityCategory;
  degree: number;
}

/** Arista bidireccional del grafo. */
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
}

/** Mención inversa (backlink) hacia una entidad. */
export interface Backlink {
  id: string;
  entityPath: string;
  sourcePath: string;
  blockIndex?: number;
  snippet?: string;
}
