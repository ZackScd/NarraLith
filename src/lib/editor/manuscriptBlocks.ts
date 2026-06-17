/**
 * Helpers manuscrito §1.9 (segmentos, tiempos, índice legacy timeline).
 * M7 ✅ — sin adaptador `ParsedDocument` en flujo activo.
 * Afinado residual (dead code, tests): ver `_docs2/specs/manuscript-roadmap.md` § Afinado final.
 */
import type {
  BarTag,
  EventSegment,
  ManuscriptSegment,
  ParsedManuscript,
} from "@/lib/types/manuscript";

/** Lee etiqueta `time` del adaptador legacy (metadata.time o primer chip en barTags). */
export function segmentHasBarTime(barTags: BarTag[] | undefined): boolean {
  if (!barTags?.length) {
    return false;
  }
  return barTags.some((t) => t.type === "time" && t.value.trim().length > 0);
}

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

export function timeTagFromEventSegment(segment: EventSegment): string | null {
  if (!segment.barTags?.length) {
    return null;
  }
  return timeTagFromBlockMetadata({ barTags: segment.barTags });
}

/** Índice legacy de timeline: cabecera = 0; segmento N = N + 1. */
export function legacyBlockIndexFromSegmentIndex(segmentIndex: number | null): number {
  if (segmentIndex === null) {
    return 0;
  }
  return segmentIndex + 1;
}

export function eventSegmentAtLegacyBlockIndex(
  manuscript: ParsedManuscript | null,
  blockIndex: number,
): EventSegment | null {
  if (!manuscript || blockIndex < 1) {
    return null;
  }
  const segment = manuscript.segments[blockIndex - 1];
  return segment?.kind === "event" ? segment : null;
}

export function legacyBlockIndexIsValid(
  manuscript: ParsedManuscript | null,
  blockIndex: number,
): boolean {
  if (!manuscript) {
    return false;
  }
  if (blockIndex === 0) {
    return true;
  }
  return blockIndex - 1 < manuscript.segments.length;
}

export function metadataForLegacyBlockIndex(
  manuscript: ParsedManuscript | null,
  blockIndex: number,
): Record<string, unknown> | undefined {
  const event = eventSegmentAtLegacyBlockIndex(manuscript, blockIndex);
  if (!event) {
    return undefined;
  }
  const meta: Record<string, unknown> = {
    event: event.name,
    description: event.description,
    entity: event.entityPath,
  };
  if (event.barTags?.length) {
    meta.barTags = event.barTags;
    const barTime = timeTagFromEventSegment(event);
    if (barTime) {
      meta.time = barTime;
    }
  }
  return meta;
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

export function isEventSegment(segment: ManuscriptSegment): segment is EventSegment & { kind: "event" } {
  return segment.kind === "event";
}
