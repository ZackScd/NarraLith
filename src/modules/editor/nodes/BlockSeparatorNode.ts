import {
  ElementNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type LexicalNode,
  type SerializedElementNode,
} from "lexical";

export type SerializedBlockSeparatorNode = SerializedElementNode;

/** Separador visual entre bloques narrativos (no muestra `+++` al usuario). */
export class BlockSeparatorNode extends ElementNode {
  static getType(): string {
    return "block-separator";
  }

  static clone(node: BlockSeparatorNode): BlockSeparatorNode {
    return new BlockSeparatorNode(node.__key);
  }

  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "narra-block-separator my-6 border-t border-border/50";
    el.setAttribute("data-block-separator", "true");
    el.contentEditable = "false";
    return el;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    return { element: document.createElement("hr") };
  }

  isInline(): boolean {
    return false;
  }

  canBeEmpty(): boolean {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  collapseAtStart(): boolean {
    return true;
  }

  static importJSON(): BlockSeparatorNode {
    return $createBlockSeparatorNode();
  }

  exportJSON(): SerializedBlockSeparatorNode {
    return {
      ...super.exportJSON(),
      type: "block-separator",
      version: 1,
    };
  }
}

export function $createBlockSeparatorNode(): BlockSeparatorNode {
  return new BlockSeparatorNode();
}

export function $isBlockSeparatorNode(
  node: LexicalNode | null | undefined,
): node is BlockSeparatorNode {
  return node instanceof BlockSeparatorNode;
}
