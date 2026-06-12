import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import type { JSX } from "react";

export interface SerializedEventFrameBottomNode extends SerializedLexicalNode {
  type: "event-frame-bottom";
  version: 1;
  segmentId: string;
}

/** Marcador lógico de cierre de evento (`+++end-event`). Esquinas en overlay. */
export class EventFrameBottomNode extends DecoratorNode<JSX.Element | null> {
  __segmentId: string;

  static getType(): string {
    return "event-frame-bottom";
  }

  static clone(node: EventFrameBottomNode): EventFrameBottomNode {
    return new EventFrameBottomNode(node.__segmentId, node.__key);
  }

  constructor(segmentId: string, key?: NodeKey) {
    super(key);
    this.__segmentId = segmentId;
  }

  getSegmentId(): string {
    return this.__segmentId;
  }

  isInline(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.setAttribute("data-event-frame-bottom", "true");
    el.setAttribute("data-event-segment-id", this.__segmentId);
    el.contentEditable = "false";
    el.className = "narra-event-frame-marker";
    return el;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    return { element: document.createElement("span") };
  }

  decorate(): null {
    return null;
  }

  exportJSON(): SerializedEventFrameBottomNode {
    return {
      ...super.exportJSON(),
      type: "event-frame-bottom",
      version: 1,
      segmentId: this.__segmentId,
    };
  }

  static importJSON(serialized: SerializedEventFrameBottomNode): EventFrameBottomNode {
    return $createEventFrameBottomNode(serialized.segmentId);
  }
}

export function $createEventFrameBottomNode(segmentId: string): EventFrameBottomNode {
  return new EventFrameBottomNode(segmentId);
}

export function $isEventFrameBottomNode(
  node: LexicalNode | null | undefined,
): node is EventFrameBottomNode {
  return node != null && node.getType() === EventFrameBottomNode.getType();
}
