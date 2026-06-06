import { parseInlineTagsInText } from "@/lib/editor/inlineTagSyntax";
import { timeTagFromBlockMetadata } from "@/lib/editor/manuscriptBlocks";
import type { TimelineEvent } from "@/lib/types/timeline";

/** Etiquetas `time` en orden de aparición dentro del bloque (barra → inline). */
export function collectTimeTagsFromBlock(block: {
  metadata?: Record<string, unknown>;
  body: string;
}): string[] {
  const tags: string[] = [];
  const fromMeta = timeTagFromBlockMetadata(block.metadata);
  if (fromMeta) {
    tags.push(fromMeta);
  }
  for (const tag of parseInlineTagsInText(block.body)) {
    if (tag.type !== "time" || !tag.value.trim()) {
      continue;
    }
    tags.push(tag.value.trim());
  }
  return tags;
}

/** Id estable por marca (soporta N marcas por bloque §1.5). */
export function timelineMarkerId(event: TimelineEvent): string {
  const seg = event.segmentId ?? "";
  const kind = event.tagKind ?? "";
  const offset = event.charOffset ?? "";
  return `file:${event.path}:${event.blockIndex}:${seg}:${kind}:${offset}`;
}
