import { $getRoot, $isParagraphNode, type LexicalEditor, type LexicalNode } from "lexical";

import { $isBlockSeparatorNode } from "@/modules/editor/nodes/BlockSeparatorNode";
import {
  $isEventFrameBottomNode,
} from "@/modules/editor/nodes/EventFrameBottomNode";
import { $isEventTagBarNode } from "@/modules/editor/nodes/EventTagBarNode";

export const EVENT_FRAME_BLEED_PX = 12;
const MIN_BODY_LINE_PX = 24;

export interface EventFrameRect {
  segmentId: string;
  closed: boolean;
  /** Coordenadas viewport (para `position: fixed`). */
  top: number;
  left: number;
  width: number;
  height: number;
}

function unionRects(rects: DOMRect[]): DOMRect | null {
  if (rects.length === 0) {
    return null;
  }
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const rect of rects) {
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  return new DOMRect(left, top, right - left, bottom - top);
}

function isEventChromeNode(node: LexicalNode): boolean {
  return (
    $isEventTagBarNode(node) ||
    $isEventFrameBottomNode(node) ||
    $isBlockSeparatorNode(node)
  );
}

function isEventBodyNode(node: LexicalNode): boolean {
  if (isEventChromeNode(node)) {
    return false;
  }
  return $isParagraphNode(node) || node.getType() === "heading" || node.getType() === "quote";
}

function domRectForNode(editor: LexicalEditor, node: LexicalNode): DOMRect | null {
  const el = editor.getElementByKey(node.getKey());
  if (!el?.isConnected) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return rect;
}

function fallbackBodyRect(
  barRect: DOMRect,
  bottomMarkerRect: DOMRect | null,
): DOMRect {
  let bottom = barRect.bottom + MIN_BODY_LINE_PX;
  if (bottomMarkerRect) {
    bottom = Math.max(bottom, bottomMarkerRect.top);
  }
  return new DOMRect(
    barRect.left,
    barRect.bottom,
    Math.max(barRect.width, 48),
    Math.max(MIN_BODY_LINE_PX, bottom - barRect.bottom),
  );
}

/** Mide marcos de evento vía árbol Lexical + `getElementByKey` (fiable en Lexical 0.44+). */
export function measureEventFrames(
  editor: LexicalEditor,
  bleedPx = EVENT_FRAME_BLEED_PX,
): EventFrameRect[] {
  const root = editor.getRootElement();
  if (!root) {
    return [];
  }

  return editor.getEditorState().read(() => {
    const frames: EventFrameRect[] = [];
    const children = $getRoot().getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!$isEventTagBarNode(child)) {
        continue;
      }

      const segmentId = child.getSegmentId();
      const bodyRects: DOMRect[] = [];
      let closed = false;
      let bottomMarkerRect: DOMRect | null = null;

      for (let j = i + 1; j < children.length; j++) {
        const sibling = children[j];
        if ($isEventTagBarNode(sibling)) {
          break;
        }
        if ($isEventFrameBottomNode(sibling)) {
          if (sibling.getSegmentId() === segmentId) {
            closed = true;
            bottomMarkerRect = domRectForNode(editor, sibling);
          }
          break;
        }
        if (isEventBodyNode(sibling)) {
          const rect = domRectForNode(editor, sibling);
          if (rect) {
            bodyRects.push(rect);
          }
        }
      }

      let bodyRect = unionRects(bodyRects);
      if (!bodyRect) {
        const barEl = editor.getElementByKey(child.getKey());
        if (!barEl) {
          continue;
        }
        bodyRect = fallbackBodyRect(barEl.getBoundingClientRect(), bottomMarkerRect);
      }

      const expanded = new DOMRect(
        bodyRect.left - bleedPx,
        bodyRect.top,
        bodyRect.width + bleedPx * 2,
        bodyRect.height,
      );

      frames.push({
        segmentId,
        closed,
        top: expanded.top,
        left: expanded.left,
        width: expanded.width,
        height: expanded.height,
      });
    }

    return frames;
  });
}
