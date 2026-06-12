import {
  $createParagraphNode,
  $getRoot,
  $isParagraphNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import { LEXICAL_HYDRATE_TAG } from "@/lib/editor/editorSyncGuard";
import { stableSegmentId } from "@/lib/editor/manuscriptBlocks";
import {
  appendParagraphContent,
  serializeParagraphContent,
} from "@/lib/editor/paragraphContent";
import {
  $createEventFrameBottomNode,
  $isEventFrameBottomNode,
} from "@/modules/editor/nodes/EventFrameBottomNode";
import {
  $createEventTagBarNode,
  $isEventTagBarNode,
} from "@/modules/editor/nodes/EventTagBarNode";
import type { SaveManuscriptSegmentPayload } from "@/lib/types/editor";
import type {
  BarTag,
  EventSegment,
  ManuscriptSegment,
  ParsedManuscript,
} from "@/lib/types/manuscript";

export interface ActiveEventContext {
  segmentId: string | null;
  segmentIndex: number | null;
  inEvent: boolean;
  eventClosed: boolean;
  /** Hay prosa libre absorbible bajo el marcador de cierre (botón `[+]`). */
  canExpandMargin: boolean;
}

export interface EventSpanSnapshot {
  segmentId: string;
  segmentIndex: number;
  barKey: string;
  bodyParagraphKeys: string[];
  bottomKey: string | null;
}

const emptyEventContext: ActiveEventContext = {
  segmentId: null,
  segmentIndex: null,
  inEvent: false,
  eventClosed: false,
  canExpandMargin: false,
};

/** Huella del manuscrito para detectar cambios de cuerpo. */
export function bodyFingerprintFromManuscript(manuscript: ParsedManuscript): string {
  return JSON.stringify([
    manuscript.fileHeader.body,
    manuscript.segments.map((s) =>
      s.kind === "freeText"
        ? ["freeText", s.body]
        : ["event", s.name, s.body, s.closed, s.barTags ?? []],
    ),
  ]);
}

export function bodyFingerprintFromExtractedManuscript(
  headerBody: string,
  segments: SaveManuscriptSegmentPayload[],
): string {
  return JSON.stringify([
    headerBody,
    segments.map((s) =>
      s.kind === "freeText"
        ? ["freeText", s.body]
        : ["event", s.name, s.body, s.closed, s.barTags ?? []],
    ),
  ]);
}

/** Carga un `ParsedManuscript` en el árbol Lexical (§1.4, sin `+++` visibles). */
export function hydrateLexicalManuscript(
  editor: LexicalEditor,
  manuscript: ParsedManuscript,
): void {
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();

      appendMultilineBody(root, manuscript.fileHeader.body);

      for (const segment of manuscript.segments) {
        if (segment.kind === "freeText") {
          appendMultilineBody(root, segment.body);
          continue;
        }

        root.append(
          $createEventTagBarNode(
            segment.id,
            segment.segmentIndex,
            segment.name,
            segment.description,
            segment.entityPath,
            segment.barTags ?? [],
          ),
        );
        if (segment.body.length === 0) {
          root.append($createParagraphNode());
        } else {
          appendMultilineBody(root, segment.body);
        }
        if (segment.closed) {
          root.append($createEventFrameBottomNode(segment.id));
        }
      }

      if (
        manuscript.fileHeader.body.trim().length === 0 &&
        manuscript.segments.length === 0
      ) {
        root.append($createParagraphNode());
      }
    },
    { discrete: true, tag: LEXICAL_HYDRATE_TAG },
  );
}

/** Une líneas de párrafos top-level sin normalizar whitespace. */
export function joinManuscriptParagraphLines(lines: string[]): string {
  return lines.join("\n");
}

function appendMultilineBody(root: ReturnType<typeof $getRoot>, text: string): void {
  if (text.length === 0) {
    return;
  }
  const lines = text.split("\n");
  for (const line of lines) {
    const paragraph = $createParagraphNode();
    appendParagraphContent(paragraph, line);
    root.append(paragraph);
  }
}

export interface ExtractedManuscriptPayload {
  fileHeader: ParsedManuscript["fileHeader"];
  segments: SaveManuscriptSegmentPayload[];
}

/** Lee el editor y devuelve cabecera + segmentos para `save_manuscript`. */
export function extractManuscriptFromEditor(
  _filePath: string,
  title: string,
): ExtractedManuscriptPayload {
  const root = $getRoot();
  const headerLines: string[] = [];
  const segments: SaveManuscriptSegmentPayload[] = [];

  let phase: "header" | "free" | "event" = "header";
  let freeLines: string[] = [];
  let eventLines: string[] = [];
  let currentEvent: {
    segmentId: string;
    segmentIndex: number;
    name: string;
    description: string;
    entityPath: string;
    barTags: EventSegment["barTags"];
    closed: boolean;
  } | null = null;
  let nextSegmentIndex = 0;

  const flushFree = () => {
    if (freeLines.length === 0) {
      return;
    }
    segments.push({
      kind: "freeText",
      segmentIndex: nextSegmentIndex,
      body: joinManuscriptParagraphLines(freeLines),
    });
    nextSegmentIndex += 1;
    freeLines = [];
  };

  const flushEvent = () => {
    if (!currentEvent) {
      return;
    }
    segments.push({
      kind: "event",
      segmentIndex: currentEvent.segmentIndex,
      name: currentEvent.name,
      description: currentEvent.description,
      entityPath: currentEvent.entityPath,
      barTags: currentEvent.barTags ?? [],
      body: eventLines.join("\n"),
      closed: currentEvent.closed,
    });
    nextSegmentIndex = Math.max(nextSegmentIndex, currentEvent.segmentIndex + 1);
    currentEvent = null;
    eventLines = [];
  };

  for (const child of root.getChildren()) {
    if ($isEventTagBarNode(child)) {
      flushFree();
      flushEvent();
      currentEvent = {
        segmentId: child.getSegmentId(),
        segmentIndex: child.getSegmentIndex(),
        name: child.getEventName(),
        description: child.getDescription(),
        entityPath: child.getEntityPath(),
        barTags: child.getBarTags(),
        closed: false,
      };
      phase = "event";
      continue;
    }

    if ($isEventFrameBottomNode(child)) {
      if (currentEvent) {
        currentEvent.closed = true;
      }
      flushEvent();
      phase = "free";
      continue;
    }

    if ($isParagraphNode(child)) {
      const line = serializeParagraphContent(child);
      if (phase === "header") {
        headerLines.push(line);
      } else if (phase === "event") {
        eventLines.push(line);
      } else {
        freeLines.push(line);
      }
    }
  }

  if (phase === "header") {
    // solo cabecera
  } else if (phase === "event") {
    flushEvent();
  } else {
    flushFree();
  }

  return {
    fileHeader: {
      title,
      body: headerLines.join("\n"),
    },
    segments,
  };
}

/** Fusiona cuerpos extraídos en un manuscrito en memoria. */
export function applyExtractedManuscript(
  manuscript: ParsedManuscript,
  extracted: ExtractedManuscriptPayload,
): ParsedManuscript {
  const segments: ManuscriptSegment[] = extracted.segments.map((seg) => {
    if (seg.kind === "freeText") {
      return {
        kind: "freeText",
        id: stableSegmentId(manuscript.filePath, seg.segmentIndex),
        segmentIndex: seg.segmentIndex,
        body: seg.body,
      };
    }
    return {
      kind: "event",
      id: stableSegmentId(manuscript.filePath, seg.segmentIndex),
      segmentIndex: seg.segmentIndex,
      name: seg.name,
      description: seg.description,
      entityPath: seg.entityPath,
      barTags: seg.barTags,
      body: seg.body,
      closed: seg.closed,
    };
  });

  return {
    ...manuscript,
    fileHeader: extracted.fileHeader,
    segments,
  };
}

/** Escanea hijos top-level y devuelve un tramo por `EventTagBarNode`. */
export function scanEventSpans(root: ReturnType<typeof $getRoot>): EventSpanSnapshot[] {
  const spans: EventSpanSnapshot[] = [];
  let current: EventSpanSnapshot | null = null;

  for (const child of root.getChildren()) {
    if ($isEventTagBarNode(child)) {
      if (current) {
        spans.push(current);
      }
      current = {
        segmentId: child.getSegmentId(),
        segmentIndex: child.getSegmentIndex(),
        barKey: child.getKey(),
        bodyParagraphKeys: [],
        bottomKey: null,
      };
      continue;
    }

    if ($isEventFrameBottomNode(child)) {
      if (current && child.getSegmentId() === current.segmentId) {
        current.bottomKey = child.getKey();
      }
      if (current) {
        spans.push(current);
        current = null;
      }
      continue;
    }

    if ($isParagraphNode(child) && current) {
      current.bodyParagraphKeys.push(child.getKey());
    }
  }

  if (current) {
    spans.push(current);
  }

  return spans;
}

function countAbsorbableParagraphsAfterBottom(segmentId: string): number {
  const root = $getRoot();
  const children = root.getChildren();
  let bottomIndex = -1;
  let nextBarIndex = children.length;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if ($isEventFrameBottomNode(child) && child.getSegmentId() === segmentId) {
      bottomIndex = i;
    } else if (bottomIndex >= 0 && $isEventTagBarNode(child)) {
      nextBarIndex = i;
      break;
    }
  }

  if (bottomIndex < 0) {
    return 0;
  }

  let count = 0;
  for (let i = bottomIndex + 1; i < nextBarIndex; i++) {
    if ($isParagraphNode(children[i])) {
      count += 1;
    }
  }
  return count;
}

/** Contexto de evento según el nodo top-level bajo el cursor. */
export function getEventContextAtTopLevel(topLevelKey: string): ActiveEventContext {
  const spans = scanEventSpans($getRoot());

  for (const span of spans) {
    if (span.barKey === topLevelKey || span.bottomKey === topLevelKey) {
      return {
        segmentId: span.segmentId,
        segmentIndex: span.segmentIndex,
        inEvent: false,
        eventClosed: span.bottomKey !== null,
        canExpandMargin: false,
      };
    }

    if (span.bodyParagraphKeys.includes(topLevelKey)) {
      const closed = span.bottomKey !== null;
      return {
        segmentId: span.segmentId,
        segmentIndex: span.segmentIndex,
        inEvent: true,
        eventClosed: closed,
        canExpandMargin: closed && countAbsorbableParagraphsAfterBottom(span.segmentId) > 0,
      };
    }
  }

  return emptyEventContext;
}

/** Índice de bloque legacy (adaptador) para paneles no migrados. */
export function legacyBlockIndexFromContext(ctx: ActiveEventContext): number {
  if (ctx.inEvent && ctx.segmentIndex !== null) {
    return ctx.segmentIndex + 1;
  }
  return 0;
}

/** Inserta o reposiciona el cierre lógico tras el párrafo del cursor. */
export function $closeEventAtParagraph(paragraphKey: string): boolean {
  const ctx = getEventContextAtTopLevel(paragraphKey);
  if (!ctx.inEvent || !ctx.segmentId) {
    return false;
  }

  if (ctx.eventClosed) {
    if (ctx.canExpandMargin) {
      return false;
    }
    return $repositionEventCloseAtParagraph(paragraphKey, ctx.segmentId);
  }

  const root = $getRoot();
  let targetParagraph: LexicalNode | null = null;

  for (const child of root.getChildren()) {
    if (child.getKey() === paragraphKey && $isParagraphNode(child)) {
      targetParagraph = child;
      break;
    }
  }

  if (!targetParagraph) {
    return false;
  }

  const bottom = $createEventFrameBottomNode(ctx.segmentId);
  targetParagraph.insertAfter(bottom);

  const freeParagraph = $createParagraphNode();
  bottom.insertAfter(freeParagraph);
  freeParagraph.select();
  return true;
}

function $selectOrInsertFreeParagraphAfterBottom(bottomNode: LexicalNode): void {
  const next = bottomNode.getNextSibling();
  if ($isParagraphNode(next)) {
    next.select();
    return;
  }

  const freeParagraph = $createParagraphNode();
  bottomNode.insertAfter(freeParagraph);
  freeParagraph.select();
}

/** Mueve el marcador de cierre a otro párrafo del cuerpo (evento ya cerrado, sin prosa que absorber). */
function $repositionEventCloseAtParagraph(
  paragraphKey: string,
  segmentId: string,
): boolean {
  const root = $getRoot();
  const children = root.getChildren();
  let bottomNode: LexicalNode | null = null;
  let targetParagraph: LexicalNode | null = null;
  let targetIndex = -1;
  let bottomIndex = -1;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.getKey() === paragraphKey && $isParagraphNode(child)) {
      targetParagraph = child;
      targetIndex = i;
    }
    if ($isEventFrameBottomNode(child) && child.getSegmentId() === segmentId) {
      bottomNode = child;
      bottomIndex = i;
    }
  }

  if (!targetParagraph || !bottomNode || targetIndex < 0 || bottomIndex < 0) {
    return false;
  }

  if (targetIndex >= bottomIndex) {
    return false;
  }

  if (bottomIndex === targetIndex + 1) {
    $selectOrInsertFreeParagraphAfterBottom(bottomNode);
    return true;
  }

  bottomNode.remove();
  targetParagraph.insertAfter(bottomNode);
  $selectOrInsertFreeParagraphAfterBottom(bottomNode);
  return true;
}

/** Añade o reemplaza etiqueta de tiempo en la barra del evento activo. */
export function $appendBarTimeToSegment(
  segmentId: string,
  timeValue: string,
  hour: number | null = null,
): boolean {
  const root = $getRoot();
  for (const child of root.getChildren()) {
    if ($isEventTagBarNode(child) && child.getSegmentId() === segmentId) {
      const tags = [...child.getBarTags()];
      const idx = tags.findIndex((t) => t.type === "time");
      const next: BarTag = { type: "time", value: timeValue };
      if (hour != null) {
        next.hour = hour;
      }
      if (idx >= 0) {
        tags[idx] = next;
      } else {
        tags.push(next);
      }
      child.setBarTags(tags);
      return true;
    }
  }
  return false;
}

/** Actualiza nombre, descripción y opcionalmente `barTags` del evento bajo el cursor. */
export function $updateEventBarAtSegment(
  segmentId: string,
  name: string,
  description: string,
  barTags: BarTag[] | null,
): boolean {
  const root = $getRoot();
  for (const child of root.getChildren()) {
    if ($isEventTagBarNode(child) && child.getSegmentId() === segmentId) {
      child.setEventName(name);
      child.setDescription(description);
      if (barTags !== null) {
        child.setBarTags(barTags);
      }
      return true;
    }
  }
  return false;
}

/** Baja el margen inferior del evento cerrado absorbiendo prosa libre (D2). */
export function $expandEventAtParagraph(paragraphKey: string): boolean {
  const ctx = getEventContextAtTopLevel(paragraphKey);
  if (!ctx.inEvent || !ctx.eventClosed || !ctx.segmentId || !ctx.canExpandMargin) {
    return false;
  }

  const root = $getRoot();
  const children = root.getChildren();
  let bottomNode: LexicalNode | null = null;
  let bottomIndex = -1;
  let nextBarIndex = children.length;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if ($isEventFrameBottomNode(child) && child.getSegmentId() === ctx.segmentId) {
      bottomNode = child;
      bottomIndex = i;
    } else if (bottomIndex >= 0 && $isEventTagBarNode(child)) {
      nextBarIndex = i;
      break;
    }
  }

  if (!bottomNode || bottomIndex < 0) {
    return false;
  }

  let lastAbsorbed: LexicalNode | null = null;
  for (let i = bottomIndex + 1; i < nextBarIndex; i++) {
    if ($isParagraphNode(children[i])) {
      lastAbsorbed = children[i];
    }
  }

  if (!lastAbsorbed) {
    return false;
  }

  bottomNode.remove();
  lastAbsorbed.insertAfter(bottomNode);
  return true;
}

/** Quita barra, cuerpo y marcador del evento en el editor (ficha WB queda en disco — D1). */
export function $removeEventAtSegment(segmentId: string): boolean {
  const root = $getRoot();
  const children = root.getChildren();
  let startIndex = -1;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if ($isEventTagBarNode(child) && child.getSegmentId() === segmentId) {
      startIndex = i;
      break;
    }
  }

  if (startIndex < 0) {
    return false;
  }

  let endIndex = startIndex;
  for (let i = startIndex + 1; i < children.length; i++) {
    const child = children[i];
    if ($isEventTagBarNode(child)) {
      break;
    }
    endIndex = i;
    if ($isEventFrameBottomNode(child) && child.getSegmentId() === segmentId) {
      break;
    }
  }

  for (let i = endIndex; i >= startIndex; i--) {
    children[i].remove();
  }

  return true;
}

/** Quita solo el cierre lógico (`EventFrameBottomNode`); el evento pasa a abierto. */
export function $removeEventEndAtSegment(segmentId: string): boolean {
  const root = $getRoot();
  for (const child of root.getChildren()) {
    if ($isEventFrameBottomNode(child) && child.getSegmentId() === segmentId) {
      child.remove();
      return true;
    }
  }
  return false;
}
