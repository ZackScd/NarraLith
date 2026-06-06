import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import type { JSX } from "react";

import { BlockMetadataChips } from "@/modules/editor/components/BlockMetadataChips";

export interface SerializedBlockMetadataNode extends SerializedLexicalNode {
  type: "block-metadata";
  version: 1;
}

/**
 * Nodo decorador no editable que renderiza los chips de metadatos del bloque
 * al que pertenece. El índice de bloque se calcula dinámicamente a partir
 * de la posición del nodo en el árbol (contando separadores previos), así
 * que es resistente a insertar/quitar bloques sin re-hidratar.
 */
export class BlockMetadataNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return "block-metadata";
  }

  static clone(node: BlockMetadataNode): BlockMetadataNode {
    return new BlockMetadataNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  isInline(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.setAttribute("data-block-metadata", "true");
    el.contentEditable = "false";
    el.className = "narra-block-metadata";
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
    return <BlockMetadataChips nodeKey={this.getKey()} />;
  }

  exportJSON(): SerializedBlockMetadataNode {
    return {
      ...super.exportJSON(),
      type: "block-metadata",
      version: 1,
    };
  }

  static importJSON(): BlockMetadataNode {
    return $createBlockMetadataNode();
  }
}

export function $createBlockMetadataNode(): BlockMetadataNode {
  return new BlockMetadataNode();
}

export function $isBlockMetadataNode(
  node: LexicalNode | null | undefined,
): node is BlockMetadataNode {
  return node instanceof BlockMetadataNode;
}
