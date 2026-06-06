import type {
  BarTag,
  EventSegment,
  FreeTextSegment,
  ManuscriptFileHeader,
} from "@/lib/types/manuscript";

export type {
  BarTag,
  EventSegment,
  FreeTextSegment,
  ManuscriptFileHeader,
  ManuscriptSegment,
  ParsedManuscript,
} from "@/lib/types/manuscript";

/** Bloque lógico parseado desde un `.md` (IPC ↔ Rust `ParsedBlock`). */
export interface ParsedBlock {
  id: string;
  index: number;
  body: string;
  metadata: Record<string, unknown>;
  contentHash?: string;
  /** Clave i18n si el YAML del bloque falló (`error.parser.invalid_yaml`). */
  parseErrorKey?: string;
  timeTimestamp?: string;
}

/** Adaptador legacy de bloques (paneles §1.9); IPC manuscrito usa `ParsedManuscript`. */
export interface ParsedDocument {
  filePath: string;
  blocks: ParsedBlock[];
}

/** Payload segmento para `save_manuscript`. */
export type SaveManuscriptSegmentPayload =
  | ({ kind: "freeText" } & Pick<FreeTextSegment, "segmentIndex" | "body">)
  | ({ kind: "event" } & Pick<
      EventSegment,
      | "segmentIndex"
      | "name"
      | "description"
      | "entityPath"
      | "barTags"
      | "body"
      | "closed"
    >);

/** Payload para `save_manuscript` (§1.9). */
export interface SaveManuscriptPayload {
  fileHeader: ManuscriptFileHeader;
  segments: SaveManuscriptSegmentPayload[];
}

export type { BlockMetadata, EventBlockMetadata } from "@/lib/types/blockMetadata";

/** Metadatos de apertura de evento (`update_event_metadata`). */
export interface EventMetadataUpdate {
  segmentIndex: number;
  name: string;
  description: string;
  entityPath: string;
  barTags?: BarTag[];
}
