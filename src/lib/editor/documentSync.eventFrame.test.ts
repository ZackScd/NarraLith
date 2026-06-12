import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
  ParagraphNode,
} from "lexical";
import { describe, expect, it } from "vitest";

import {
  $closeEventAtParagraph,
  $expandEventAtParagraph,
  $removeEventAtSegment,
  $removeEventEndAtSegment,
  extractManuscriptFromEditor,
  getEventContextAtTopLevel,
  scanEventSpans,
} from "@/lib/editor/documentSync";
import {
  $createEventFrameBottomNode,
  EventFrameBottomNode,
} from "@/modules/editor/nodes/EventFrameBottomNode";
import { $createEventTagBarNode, EventTagBarNode } from "@/modules/editor/nodes/EventTagBarNode";

const SEG_A = "seg-a";
const SEG_B = "seg-b";

function createTestEditor() {
  return createEditor({
    namespace: "documentSyncTest",
    nodes: [ParagraphNode, EventTagBarNode, EventFrameBottomNode],
    onError: (error) => {
      throw error;
    },
  });
}

describe("getEventContextAtTopLevel", () => {
  it("marks eventClosed when bottom exists and cursor is in last body paragraph", () => {
    const editor = createTestEditor();
    let bodyKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const p1 = $createParagraphNode();
      const p2 = $createParagraphNode();
      root.append(p1);
      root.append(p2);
      root.append($createEventFrameBottomNode(SEG_A));
      bodyKey = p2.getKey();
    });

    editor.read(() => {
      const spans = scanEventSpans($getRoot());
      expect(spans[0]?.bodyParagraphKeys).toContain(bodyKey);
      const ctx = getEventContextAtTopLevel(bodyKey);
      expect(ctx.inEvent).toBe(true);
      expect(ctx.eventClosed).toBe(true);
      expect(ctx.segmentId).toBe(SEG_A);
      expect(ctx.canExpandMargin).toBe(false);
    });
  });

  it("sets inEvent false on paragraph below the bottom marker", () => {
    const editor = createTestEditor();
    let freeKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      root.append($createParagraphNode());
      root.append($createEventFrameBottomNode(SEG_A));
      const free = $createParagraphNode();
      root.append(free);
      freeKey = free.getKey();
    });

    editor.read(() => {
      const ctx = getEventContextAtTopLevel(freeKey);
      expect(ctx.inEvent).toBe(false);
      expect(ctx.eventClosed).toBe(false);
    });
  });

  it("sets canExpandMargin when free prose exists below a closed event", () => {
    const editor = createTestEditor();
    let bodyKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const body = $createParagraphNode();
      root.append(body);
      root.append($createEventFrameBottomNode(SEG_A));
      root.append($createParagraphNode());
      bodyKey = body.getKey();
    });

    editor.read(() => {
      const ctx = getEventContextAtTopLevel(bodyKey);
      expect(ctx.canExpandMargin).toBe(true);
    });
  });
});

describe("$closeEventAtParagraph", () => {
  it("inserts bottom marker, free paragraph below, and selects it", () => {
    const editor = createTestEditor();
    let bodyKey = "";
    let freeKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const body = $createParagraphNode();
      root.append(body);
      bodyKey = body.getKey();
    });

    editor.update(() => {
      expect($closeEventAtParagraph(bodyKey)).toBe(true);
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(4);
      freeKey = children[3]?.getKey() ?? "";
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if ($isRangeSelection(selection)) {
        expect(selection.anchor.getNode().getTopLevelElement()?.getKey()).toBe(freeKey);
      }
    });
  });

  it("reposiciona el cierre cuando el evento ya está cerrado sin prosa absorbible", () => {
    const editor = createTestEditor();
    let p1Key = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const p1 = $createParagraphNode();
      const p2 = $createParagraphNode();
      const p3 = $createParagraphNode();
      root.append(p1);
      root.append(p2);
      root.append(p3);
      root.append($createEventFrameBottomNode(SEG_A));
      p1Key = p1.getKey();
    });

    editor.update(() => {
      expect($closeEventAtParagraph(p1Key)).toBe(true);
    });

    editor.read(() => {
      const spans = scanEventSpans($getRoot());
      expect(spans[0]?.bodyParagraphKeys).toHaveLength(1);
      const extracted = extractManuscriptFromEditor("", "T");
      expect(extracted.segments).toHaveLength(2);
      expect(extracted.segments[0]?.kind).toBe("event");
      expect(extracted.segments[1]?.kind).toBe("freeText");
    });
  });

  it("when already closed at cursor, moves focus below the frame", () => {
    const editor = createTestEditor();
    let bodyKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const body = $createParagraphNode();
      root.append(body);
      root.append($createEventFrameBottomNode(SEG_A));
      bodyKey = body.getKey();
    });

    editor.update(() => {
      expect($closeEventAtParagraph(bodyKey)).toBe(true);
    });
  });
});

describe("$expandEventAtParagraph", () => {
  it("absorbs free paragraphs until end of document", () => {
    const editor = createTestEditor();
    let bodyKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const body = $createParagraphNode();
      root.append(body);
      root.append($createEventFrameBottomNode(SEG_A));
      root.append($createParagraphNode());
      root.append($createParagraphNode());
      bodyKey = body.getKey();
    });

    editor.update(() => {
      expect($expandEventAtParagraph(bodyKey)).toBe(true);
    });

    editor.read(() => {
      const extracted = extractManuscriptFromEditor("", "T");
      expect(extracted.segments).toHaveLength(1);
      expect(extracted.segments[0]?.kind).toBe("event");
      if (extracted.segments[0]?.kind === "event") {
        expect(extracted.segments[0].closed).toBe(true);
      }
      const spans = scanEventSpans($getRoot());
      expect(spans[0]?.bodyParagraphKeys).toHaveLength(3);
    });
  });

  it("stops before the next event bar", () => {
    const editor = createTestEditor();
    let bodyKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const body = $createParagraphNode();
      root.append(body);
      root.append($createEventFrameBottomNode(SEG_A));
      root.append($createParagraphNode());
      root.append($createEventTagBarNode(SEG_B, 1, "B", "", "", []));
      root.append($createParagraphNode());
      bodyKey = body.getKey();
    });

    editor.update(() => {
      expect($expandEventAtParagraph(bodyKey)).toBe(true);
    });

    editor.read(() => {
      expect($getRoot().getChildren()).toHaveLength(6);
      const extracted = extractManuscriptFromEditor("", "T");
      expect(extracted.segments).toHaveLength(2);
      if (extracted.segments[0]?.kind === "event") {
        expect(extracted.segments[0].closed).toBe(true);
      }
    });
  });

  it("returns false when there is nothing to absorb", () => {
    const editor = createTestEditor();
    let bodyKey = "";

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      const body = $createParagraphNode();
      root.append(body);
      root.append($createEventFrameBottomNode(SEG_A));
      bodyKey = body.getKey();
    });

    editor.update(() => {
      expect($expandEventAtParagraph(bodyKey)).toBe(false);
    });
  });
});

describe("$removeEventAtSegment", () => {
  it("removes bar, body and bottom marker", () => {
    const editor = createTestEditor();

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      root.append($createParagraphNode());
      root.append($createEventFrameBottomNode(SEG_A));
      root.append($createParagraphNode());
    });

    editor.update(() => {
      expect($removeEventAtSegment(SEG_A)).toBe(true);
    });

    editor.read(() => {
      expect($getRoot().getChildren()).toHaveLength(1);
      const extracted = extractManuscriptFromEditor("", "T");
      expect(extracted.segments.some((s) => s.kind === "event")).toBe(false);
    });
  });
});

describe("$removeEventEndAtSegment", () => {
  it("opens the event in extract", () => {
    const editor = createTestEditor();

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createEventTagBarNode(SEG_A, 0, "A", "", "", []));
      root.append($createParagraphNode());
      root.append($createEventFrameBottomNode(SEG_A));
    });

    editor.update(() => {
      expect($removeEventEndAtSegment(SEG_A)).toBe(true);
    });

    editor.read(() => {
      const extracted = extractManuscriptFromEditor("", "T");
      if (extracted.segments[0]?.kind === "event") {
        expect(extracted.segments[0].closed).toBe(false);
      }
    });
  });
});
