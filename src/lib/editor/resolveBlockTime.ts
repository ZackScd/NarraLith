import { resolveTimeSortKey } from "@/lib/calendar";
import { collectTimeTagsFromBlock } from "@/lib/calendar/timeMarks";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { ParsedBlock } from "@/lib/types/editor";

/** Calcula el timestamp persistible para `time_markers` desde metadata `time`. */
export function resolveTimeTimestampForMetadata(
  metadata: Record<string, unknown>,
  calendar: CalendarConfig | null,
): string | undefined {
  if (!calendar) {
    return undefined;
  }
  const raw =
    typeof metadata.time === "string"
      ? metadata.time.trim()
      : typeof metadata.time === "number"
        ? String(metadata.time)
        : "";
  if (!raw) {
    return undefined;
  }
  return resolveTimeSortKey(raw, calendar) ?? undefined;
}

/**
 * Timestamp del bloque desde la última marca temporal confirmada
 * (`barTags` + inline en cuerpo), no solo `metadata.time`.
 */
export function resolveTimeTimestampForBlock(
  block: Pick<ParsedBlock, "metadata" | "body">,
  calendar: CalendarConfig | null,
): string | undefined {
  if (!calendar) {
    return undefined;
  }
  const tags = collectTimeTagsFromBlock(block);
  const last = tags[tags.length - 1];
  if (!last) {
    return resolveTimeTimestampForMetadata(block.metadata ?? {}, calendar);
  }
  return resolveTimeSortKey(last, calendar) ?? undefined;
}
