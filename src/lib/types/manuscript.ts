/** Formato en disco detectado al leer un manuscrito (IPC ↔ Rust `ManuscriptFormat`). */
export type ManuscriptFormat = "eventSegments" | "legacyBlocks";

/** Cabecera obligatoria del manuscrito (bloque 0). */
export interface ManuscriptFileHeader {
  title: string;
  body: string;
}

/** Etiqueta de origen en YAML (`barTags`, §1.5). */
export interface BarTag {
  type: string;
  value: string;
  /** Hora opcional (0–23) asociada a marcas `time` en barra. */
  hour?: number | null;
  /** Revisada manualmente tras cambio estructural del calendario (FIX-010d). */
  calendarReconciled?: boolean;
}

/** Etiqueta inline en cuerpo (`{{time:…}}`) con offset UTF-8. */
export interface InlineTag {
  type: string;
  value: string;
  charOffset: number;
}

/** Segmento de evento entre `+++event` y `+++end-event`. */
export interface EventSegment {
  id: string;
  segmentIndex: number;
  name: string;
  description: string;
  entityPath: string;
  barTags?: BarTag[];
  body: string;
  inlineTags?: InlineTag[];
  closed: boolean;
}

/** Prosa libre fuera de eventos. */
export interface FreeTextSegment {
  id: string;
  segmentIndex: number;
  body: string;
}

export type ManuscriptSegment =
  | ({ kind: "freeText" } & FreeTextSegment)
  | ({ kind: "event" } & EventSegment);

/** Manuscrito parseado según §1.9 (contrato IPC objetivo del refactor). */
export interface ParsedManuscript {
  filePath: string;
  format: ManuscriptFormat;
  fileHeader: ManuscriptFileHeader;
  segments: ManuscriptSegment[];
}
