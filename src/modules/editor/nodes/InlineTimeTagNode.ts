import {
  $applyNodeReplacement,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  TextNode,
} from "lexical";

import { serializeInlineTag } from "@/lib/editor/inlineTagSyntax";

export type SerializedInlineTimeTagNode = SerializedTextNode & {
  tagType: string;
  value: string;
  type: "inline-time-tag";
  version: 1;
};

/**
 * Chip inline de tiempo en prosa (`{{time:…}}`). Sustituye el chip único `time` por bloque.
 * `getTextContent()` devuelve el valor visible para alinear offsets del cursor.
 */
export class InlineTimeTagNode extends TextNode {
  __tagType: string;
  __value: string;

  constructor(tagType: string, value: string, key?: NodeKey) {
    super(value, key);
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

  canInsertTextAfter(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return true;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = "narra-inline-time-tag";
    dom.setAttribute("data-inline-tag-type", this.__tagType);
    dom.setAttribute("data-inline-tag-value", this.__value);
    dom.title = this.__value;
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const typeChanged = prevNode.__tagType !== this.__tagType;
    const valueChanged = prevNode.__value !== this.__value;
    if (typeChanged || valueChanged) {
      dom.setAttribute("data-inline-tag-type", this.__tagType);
      dom.setAttribute("data-inline-tag-value", this.__value);
      dom.title = this.__value;
    }
    return super.updateDOM(prevNode, dom, config) || typeChanged || valueChanged;
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
  const node = new InlineTimeTagNode(tagType, value);
  return $applyNodeReplacement(node).setMode("token");
}

export function $isInlineTimeTagNode(
  node: LexicalNode | null | undefined,
): node is InlineTimeTagNode {
  return node instanceof InlineTimeTagNode;
}
