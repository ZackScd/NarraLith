import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import type { JSX } from "react";

import type { BarTag } from "@/lib/types/manuscript";
import { EventTagBar } from "@/modules/editor/components/EventTagBar";

export interface SerializedEventTagBarNode extends SerializedLexicalNode {
  type: "event-tag-bar";
  version: 1;
  segmentId: string;
  segmentIndex: number;
  eventName: string;
  description: string;
  entityPath: string;
  barTags: BarTag[];
}

/**
 * Barra de evento §1.3: `[Evento]: nombre | chips` + 🏷️+ entre esquinas superiores.
 * Sustituye `BlockMetadataNode` + etiqueta «BLOQUE N».
 */
export class EventTagBarNode extends DecoratorNode<JSX.Element> {
  __segmentId: string;
  __segmentIndex: number;
  __eventName: string;
  __description: string;
  __entityPath: string;
  __barTags: BarTag[];

  static getType(): string {
    return "event-tag-bar";
  }

  static clone(node: EventTagBarNode): EventTagBarNode {
    return new EventTagBarNode(
      node.__segmentId,
      node.__segmentIndex,
      node.__eventName,
      node.__description,
      node.__entityPath,
      node.__barTags,
      node.__key,
    );
  }

  constructor(
    segmentId: string,
    segmentIndex: number,
    eventName: string,
    description: string,
    entityPath: string,
    barTags: BarTag[],
    key?: NodeKey,
  ) {
    super(key);
    this.__segmentId = segmentId;
    this.__segmentIndex = segmentIndex;
    this.__eventName = eventName;
    this.__description = description;
    this.__entityPath = entityPath;
    this.__barTags = barTags;
  }

  getSegmentId(): string {
    return this.__segmentId;
  }

  getSegmentIndex(): number {
    return this.__segmentIndex;
  }

  getEventName(): string {
    return this.__eventName;
  }

  getBarTags(): BarTag[] {
    return this.__barTags;
  }

  getDescription(): string {
    return this.__description;
  }

  getEntityPath(): string {
    return this.__entityPath;
  }

  setEventName(name: string): this {
    const writable = this.getWritable();
    writable.__eventName = name;
    return writable;
  }

  setDescription(description: string): this {
    const writable = this.getWritable();
    writable.__description = description;
    return writable;
  }

  setBarTags(tags: BarTag[]): this {
    const writable = this.getWritable();
    writable.__barTags = tags;
    return writable;
  }

  isInline(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.setAttribute("data-event-tag-bar", "true");
    el.contentEditable = "false";
    el.className = "narra-event-tag-bar";
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
    return (
      <EventTagBar
        segmentId={this.__segmentId}
        eventName={this.__eventName}
        barTags={this.__barTags}
      />
    );
  }

  exportJSON(): SerializedEventTagBarNode {
    return {
      ...super.exportJSON(),
      type: "event-tag-bar",
      version: 1,
      segmentId: this.__segmentId,
      segmentIndex: this.__segmentIndex,
      eventName: this.__eventName,
      description: this.__description,
      entityPath: this.__entityPath,
      barTags: this.__barTags,
    };
  }

  static importJSON(serialized: SerializedEventTagBarNode): EventTagBarNode {
    return $createEventTagBarNode(
      serialized.segmentId,
      serialized.segmentIndex,
      serialized.eventName,
      serialized.description,
      serialized.entityPath,
      serialized.barTags,
    );
  }
}

export function $createEventTagBarNode(
  segmentId: string,
  segmentIndex: number,
  eventName: string,
  description: string,
  entityPath: string,
  barTags: BarTag[] = [],
): EventTagBarNode {
  return new EventTagBarNode(
    segmentId,
    segmentIndex,
    eventName,
    description,
    entityPath,
    barTags,
  );
}

export function $isEventTagBarNode(
  node: LexicalNode | null | undefined,
): node is EventTagBarNode {
  return node instanceof EventTagBarNode;
}
