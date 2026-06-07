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
import { TimeTagChip } from "@/modules/editor/components/TimeTagChip";
import { useLayoutStore } from "@/stores/useLayoutStore";

export type SerializedInlineTimeTagNode = SerializedLexicalNode & {
  tagType: string;
  value: string;
  type: "inline-time-tag";
  version: 1;
};

function InlineTimeTagDecorator({ value }: { value: string }): JSX.Element {
  const visible = useLayoutStore((s) => s.inlineMetadataVisible);
  return <TimeTagChip value={value} visible={visible} />;
}

/**
 * Chip inline de tiempo en prosa (`{{time:…}}`). Sustituye el chip único `time` por bloque.
 * `getTextContent()` devuelve el valor visible para alinear offsets del cursor.
 */
export class InlineTimeTagNode extends DecoratorNode<JSX.Element> {
  __tagType: string;
  __value: string;

  constructor(tagType: string, value: string, key?: NodeKey) {
    super(key);
    this.__tagType = tagType;
    this.__value = value;
  }

  static getType(): string {
    return "inline-time-tag";
  }

  static clone(node: InlineTimeTagNode): InlineTimeTagNode {
    return new InlineTimeTagNode(node.__tagType, node.__value, node.__key);
  }

  getTagType(): string {
    return this.__tagType;
  }

  getValue(): string {
    return this.__value;
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
    return <InlineTimeTagDecorator value={this.__value} />;
  }

  static importJSON(serializedNode: SerializedInlineTimeTagNode): InlineTimeTagNode {
    return $createInlineTimeTagNode(serializedNode.tagType, serializedNode.value);
  }

  exportJSON(): SerializedInlineTimeTagNode {
    return {
      ...super.exportJSON(),
      tagType: this.__tagType,
      value: this.__value,
      type: "inline-time-tag",
      version: 1,
    };
  }
}

export function $createInlineTimeTagNode(
  tagType: string,
  value: string,
): InlineTimeTagNode {
  return $applyNodeReplacement(new InlineTimeTagNode(tagType, value));
}

export function $isInlineTimeTagNode(
  node: LexicalNode | null | undefined,
): node is InlineTimeTagNode {
  return node instanceof InlineTimeTagNode;
}
