import type { ParsedBlock, ParsedDocument } from "@/lib/types/editor";
import type {
  BarTag,
  EventSegment,
  ManuscriptSegment,
  ParsedManuscript,
} from "@/lib/types/manuscript";

/** Lee etiqueta `time` del adaptador legacy (metadata.time o primer chip en barTags). */
export function timeTagFromBlockMetadata(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (!metadata) {
    return null;
  }
  const direct = metadata.time;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  if (Array.isArray(metadata.barTags)) {
    for (const entry of metadata.barTags) {
      if (
        entry &&
        typeof entry === "object" &&
        (entry as BarTag).type === "time" &&
        typeof (entry as BarTag).value === "string" &&
        (entry as BarTag).value.trim()
      ) {
        return (entry as BarTag).value.trim();
      }
    }
  }
  return null;
}

/** Adaptador temporal: manuscrito §1.9 → bloques legacy (paneles hasta Fase 5). */
export function manuscriptToParsedDocument(
  manuscript: ParsedManuscript,
): ParsedDocument {
  const blocks: ParsedBlock[] = [];
  let index = 0;

  const headerMeta: Record<string, unknown> = {};
  if (manuscript.fileHeader.title.trim()) {
    headerMeta.title = manuscript.fileHeader.title;
  }
  blocks.push({
    id: stableBlockId(manuscript.filePath, index),
    index,
    body: manuscript.fileHeader.body,
    metadata: headerMeta,
  });
  index += 1;

  for (const segment of manuscript.segments) {
    blocks.push(segmentToBlock(manuscript.filePath, index, segment));
    index += 1;
  }

  return {
    filePath: manuscript.filePath,
    blocks,
  };
}

function segmentToBlock(
  filePath: string,
  index: number,
  segment: ManuscriptSegment,
): ParsedBlock {
  if (segment.kind === "freeText") {
    return {
      id: stableBlockId(filePath, index),
      index,
      body: segment.body,
      metadata: {},
    };
  }

  const meta: Record<string, unknown> = {
    event: segment.name,
    description: segment.description,
    entity: segment.entityPath,
  };
  if (segment.barTags?.length) {
    meta.barTags = segment.barTags;
    const barTime = timeTagFromBlockMetadata(meta);
    if (barTime) {
      meta.time = barTime;
    }
  }

  return {
    id: stableBlockId(filePath, index),
    index,
    body: segment.body,
    metadata: meta,
  };
}

function stableBlockId(filePath: string, blockIndex: number): string {
  return `${filePath}::${blockIndex}`;
}

/** Bloque 0 del adaptador legacy (= cabecera de archivo §1.4). */
export function isFileTitleBlock(block: ParsedBlock): boolean {
  return block.index === 0;
}

/** @deprecated Usar `isFileTitleBlock` / cabecera de manuscrito. */
export function inlineBlockDisplayIndex(block: ParsedBlock): number {
  return block.index;
}

export function stableSegmentId(filePath: string, segmentIndex: number): string {
  return `${filePath}::seg::${segmentIndex}`;
}

export function eventSegmentFromBar(
  filePath: string,
  segmentIndex: number,
  name: string,
  description: string,
  entityPath: string,
  barTags: EventSegment["barTags"],
  body: string,
  closed: boolean,
): EventSegment {
  return {
    id: stableSegmentId(filePath, segmentIndex),
    segmentIndex,
    name,
    description,
    entityPath,
    barTags,
    body,
    closed,
  };
}
