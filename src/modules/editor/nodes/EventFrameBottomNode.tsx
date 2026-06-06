import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import type { JSX } from "react";

import { EventFrameBottom } from "@/modules/editor/components/EventFrameBottom";

export interface SerializedEventFrameBottomNode extends SerializedLexicalNode {
  type: "event-frame-bottom";
  version: 1;
  segmentId: string;
}

/** Cierre visual del marco de evento (`└ … ┘`). Sin hueco cuando etiquetas OFF (§1.3). */
export class EventFrameBottomNode extends DecoratorNode<JSX.Element> {
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
    el.contentEditable = "false";
    el.className = "narra-event-frame-bottom-host";
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

  decorate(): JSX.Element {
    return <EventFrameBottom segmentId={this.__segmentId} />;
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
  return node instanceof EventFrameBottomNode;
}
