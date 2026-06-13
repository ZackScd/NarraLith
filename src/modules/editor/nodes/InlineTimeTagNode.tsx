import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import type { JSX } from "react";

import { serializeInlineTag } from "@/lib/editor/inlineTagSyntax";
import { InlineTimeTagChipHost } from "@/modules/editor/components/InlineTimeTagChipHost";

export type SerializedInlineTimeTagNode = SerializedLexicalNode & {
  tagType: string;
  value: string;
  calendarReconciled?: boolean;
  type: "inline-time-tag";
  version: 1;
};

/**
 * Chip inline de tiempo en prosa (`{{time:…}}`). Sustituye el chip único `time` por bloque.
 * `getTextContent()` devuelve el valor visible para alinear offsets del cursor.
 */
export class InlineTimeTagNode extends DecoratorNode<JSX.Element> {
  __tagType: string;
  __value: string;
  __calendarReconciled: boolean;

  constructor(
    tagType: string,
    value: string,
    calendarReconciled = false,
    key?: NodeKey,
  ) {
    super(key);
    this.__tagType = tagType;
    this.__value = value;
    this.__calendarReconciled = calendarReconciled;
  }

  static getType(): string {
    return "inline-time-tag";
  }

  static clone(node: InlineTimeTagNode): InlineTimeTagNode {
    return new InlineTimeTagNode(
      node.__tagType,
      node.__value,
      node.__calendarReconciled,
      node.__key,
    );
  }

  getTagType(): string {
    return this.__tagType;
  }

  getValue(): string {
    return this.__value;
  }

  isCalendarReconciled(): boolean {
    return this.__calendarReconciled;
  }

  setValue(value: string): this {
    const writable = this.getWritable();
    writable.__value = value;
    return writable;
  }

  setCalendarReconciled(reconciled: boolean): this {
    const writable = this.getWritable();
    writable.__calendarReconciled = reconciled;
    return writable;
  }

  /** Texto en disco: `{{time:…}}`. */
  getMarkdownText(): string {
    return serializeInlineTag(this.__tagType, this.__value);
  }

  getTextContent(): string {
    return this.__value;
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  createDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "narra-inline-time-tag-host";
    el.contentEditable = "false";
    el.setAttribute("data-inline-tag-type", this.__tagType);
    el.setAttribute("data-inline-tag-value", this.__value);
    el.setAttribute("data-lexical-node-key", this.getKey());
    return el;
  }

  updateDOM(prevNode: InlineTimeTagNode): boolean {
    return (
      prevNode.__value !== this.__value ||
      prevNode.__calendarReconciled !== this.__calendarReconciled
    );
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    return { element: document.createElement("span") };
  }

  decorate(): JSX.Element {
    return <InlineTimeTagChipHost nodeKey={this.getKey()} />;
  }

  static importJSON(serializedNode: SerializedInlineTimeTagNode): InlineTimeTagNode {
    return $createInlineTimeTagNode(
      serializedNode.tagType,
      serializedNode.value,
      serializedNode.calendarReconciled ?? false,
    );
  }

  exportJSON(): SerializedInlineTimeTagNode {
    return {
      ...super.exportJSON(),
      tagType: this.__tagType,
      value: this.__value,
      calendarReconciled: this.__calendarReconciled || undefined,
      type: "inline-time-tag",
      version: 1,
    };
  }
}

export function $createInlineTimeTagNode(
  tagType: string,
  value: string,
  calendarReconciled = false,
): InlineTimeTagNode {
  return $applyNodeReplacement(
    new InlineTimeTagNode(tagType, value, calendarReconciled),
  );
}

export function $isInlineTimeTagNode(
  node: LexicalNode | null | undefined,
): node is InlineTimeTagNode {
  return node != null && node.getType() === InlineTimeTagNode.getType();
}
