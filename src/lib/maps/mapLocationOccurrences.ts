import { parseInlineTagsInText } from "@/lib/editor/inlineTagSyntax";
import { normalizeLocationKey } from "@/lib/maps/mapLocationKeys";
import type { BarTag, EventSegment, InlineTag } from "@/lib/types/manuscript";
import type { ProjectLocationOccurrenceV1, ProjectLocationTagKind } from "@/lib/types/mapLocations";

interface OrderedTag {
  kind: ProjectLocationTagKind;
  type: string;
  value: string;
  barIndex?: number;
  charOffset?: number;
}

function pushOccurrence(
  out: ProjectLocationOccurrenceV1[],
  filePath: string,
  segmentId: string,
  segmentIndex: number,
  label: string,
  effectiveTimeRaw: string,
  tag: OrderedTag,
): void {
  const trimmed = label.trim();
  if (!trimmed) return;
  const id =
    tag.kind === "bar"
      ? `${filePath}::seg::${segmentIndex}::bar::${tag.barIndex ?? 0}`
      : tag.kind === "inline"
        ? `${filePath}::seg::${segmentIndex}::inline::${tag.charOffset ?? 0}`
        : `${filePath}::seg::${segmentIndex}::metadata`;
  out.push({
    id,
    locationKey: normalizeLocationKey(trimmed),
    label: trimmed,
    effectiveTimeRaw,
    effectiveTimestamp: null,
    sourcePath: filePath,
    segmentId,
    tagKind: tag.kind,
    charOffset: tag.charOffset,
  });
}

function orderedTagsFromEvent(segment: EventSegment): OrderedTag[] {
  const tags: OrderedTag[] = [];
  for (const [barIndex, tag] of (segment.barTags ?? []).entries()) {
    tags.push({
      kind: "bar",
      type: tag.type,
      value: tag.value,
      barIndex,
    });
  }

  const inlineTags: InlineTag[] =
    segment.inlineTags && segment.inlineTags.length > 0
      ? segment.inlineTags
      : parseInlineTagsInText(segment.body).map((item) => ({
          type: item.type,
          value: item.value,
          charOffset: item.start,
        }));

  for (const tag of inlineTags) {
    tags.push({
      kind: "inline",
      type: tag.type,
      value: tag.value,
      charOffset: tag.charOffset,
    });
  }

  if (segment.inlineTags && segment.inlineTags.length > 0) {
    tags.sort((a, b) => {
      const aBar = a.kind === "bar" ? 0 : 1;
      const bBar = b.kind === "bar" ? 0 : 1;
      if (aBar !== bBar) return aBar - bBar;
      return (a.charOffset ?? 0) - (b.charOffset ?? 0);
    });
  }

  return tags;
}

/** Extrae ocurrencias §4bis.1 de un segmento evento. */
export function extractLocationOccurrencesFromEvent(
  segment: EventSegment,
  filePath: string,
): ProjectLocationOccurrenceV1[] {
  const out: ProjectLocationOccurrenceV1[] = [];
  let effectiveTimeRaw: string | null = null;
  const segmentId = segment.id;

  for (const tag of orderedTagsFromEvent(segment)) {
    if (tag.type === "time" && tag.value.trim()) {
      effectiveTimeRaw = tag.value.trim();
      continue;
    }
    if (tag.type === "location" && tag.value.trim() && effectiveTimeRaw) {
      pushOccurrence(out, filePath, segmentId, segment.segmentIndex, tag.value, effectiveTimeRaw, tag);
    }
  }

  return out;
}

/** Variante test-friendly con barTags + body inline. */
export function extractLocationOccurrencesFromSegmentInput(input: {
  filePath: string;
  segmentIndex: number;
  segmentId?: string;
  barTags?: BarTag[];
  body: string;
  inlineTags?: InlineTag[];
}): ProjectLocationOccurrenceV1[] {
  return extractLocationOccurrencesFromEvent(
    {
      id: input.segmentId ?? `${input.filePath}::seg::${input.segmentIndex}`,
      segmentIndex: input.segmentIndex,
      name: "test",
      description: "",
      entityPath: input.filePath,
      barTags: input.barTags ?? [],
      body: input.body,
      inlineTags: input.inlineTags,
      closed: true,
    },
    input.filePath,
  );
}
