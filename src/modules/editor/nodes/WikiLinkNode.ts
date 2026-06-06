import {
  $applyNodeReplacement,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  TextNode,
} from "lexical";

import { serializeWikiLink } from "@/lib/editor/wikiLinkSyntax";

export type SerializedWikiLinkNode = SerializedTextNode & {
  targetName: string;
  targetPath: string | null;
  type: "wiki-link";
  version: 1;
};

/**
 * Nodo inline atómico para `[[entidad]]` / `[[entidad|alias]]` (WYSIWYM).
 * `getTextContent()` devuelve solo el texto visible (no `[[…]]`) para que los
 * offsets del cursor coincidan con lo que ve el usuario.
 */
export class WikiLinkNode extends TextNode {
  __targetName: string;
  __targetPath: string | null;

  constructor(
    targetName: string,
    displayText: string,
    targetPath: string | null,
    key?: NodeKey,
  ) {
    super(displayText, key);
    this.__targetName = targetName;
    this.__targetPath = targetPath;
  }

  static getType(): string {
    return "wiki-link";
  }

  static clone(node: WikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(
      node.__targetName,
      node.__text,
      node.__targetPath,
      node.__key,
    );
  }

  getTargetName(): string {
    return this.__targetName;
  }

  getTargetPath(): string | null {
    return this.__targetPath;
  }

  /** Texto en disco: `[[target]]` o `[[target|alias]]`. */
  getMarkdownText(): string {
    return serializeWikiLink(this.__targetName, this.__text);
  }

  isResolved(): boolean {
    return this.__targetPath !== null && this.__targetPath.length > 0;
  }

  setTargetPath(path: string | null): this {
    const writable = this.getWritable();
    writable.__targetPath = path;
    return writable;
  }

  /** Solo texto visible; los offsets de Lexical deben alinearse con el DOM. */
  getTextContent(): string {
    return this.__text;
  }

  /** El cursor debe ir a un hermano de texto, no dentro del enlace. */
  canInsertTextAfter(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return true;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = this.isResolved()
      ? "narra-wikilink narra-wikilink-resolved"
      : "narra-wikilink narra-wikilink-unresolved";
    dom.setAttribute("data-wiki-target", this.__targetName);
    if (this.__targetPath) {
      dom.setAttribute("data-wiki-path", this.__targetPath);
    }
    const display = this.__text;
    dom.title =
      display !== this.__targetName
        ? `${display} → ${this.__targetName}`
        : this.__targetName;
    dom.setAttribute("data-resolved", this.isResolved() ? "true" : "false");
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const resolved = this.isResolved();
    const wasResolved = prevNode.isResolved();
    if (resolved !== wasResolved) {
      dom.className = resolved
        ? "narra-wikilink narra-wikilink-resolved"
        : "narra-wikilink narra-wikilink-unresolved";
    }
    return super.updateDOM(prevNode, dom, config);
  }

  static importJSON(serializedNode: SerializedWikiLinkNode): WikiLinkNode {
    return $createWikiLinkNode(
      serializedNode.targetName,
      serializedNode.text,
      serializedNode.targetPath,
    );
  }

  exportJSON(): SerializedWikiLinkNode {
    return {
      ...super.exportJSON(),
      targetName: this.__targetName,
      targetPath: this.__targetPath,
      type: "wiki-link",
      version: 1,
    };
  }
}

export function $createWikiLinkNode(
  targetName: string,
  displayText: string,
  targetPath: string | null,
): WikiLinkNode {
  const node = new WikiLinkNode(targetName, displayText, targetPath);
  return $applyNodeReplacement(node).setMode("token");
}

export function $isWikiLinkNode(
  node: LexicalNode | null | undefined,
): node is WikiLinkNode {
  return node instanceof WikiLinkNode;
}
