import { findTreeNode } from "@/lib/explorer/treeNav";
import { listParentForView } from "@/lib/explorer/treeOrder";
import type { ExplorerViewMode, FileTreeNode } from "@/lib/types/fs";

function parentDir(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

/** Carpeta destino al crear desde menú contextual (nodo bajo cursor, tarjetas o raíz de vista). */
export function resolveContextMenuParentPath(args: {
  node: FileTreeNode | null;
  cardPath: string;
  viewMode: ExplorerViewMode;
  useCardParent: boolean;
}): string {
  const { node, cardPath, viewMode, useCardParent } = args;
  if (node) {
    return node.isDir ? node.path : parentDir(node.path);
  }
  if (useCardParent && cardPath) {
    return cardPath;
  }
  return listParentForView(viewMode);
}

/** Carpeta destino al crear desde botones de la barra (última ruta abierta/seleccionada). */
export function resolveLastOpenedParentPath(args: {
  tree: FileTreeNode[];
  selectedPath: string | null;
  activeFilePath: string | null;
  activeTabKind: "manuscript" | "entity" | null;
  viewMode: ExplorerViewMode;
}): string {
  const { tree, selectedPath, activeFilePath, activeTabKind, viewMode } = args;

  if (selectedPath) {
    const selected = findTreeNode(tree, selectedPath);
    if (selected?.isDir) {
      return selectedPath;
    }
    if (selected) {
      return parentDir(selectedPath);
    }
  }

  if (activeFilePath && viewMode === "manuscript") {
    const isManuscriptTab =
      activeTabKind === "manuscript" ||
      (activeTabKind === null &&
        activeFilePath.replace(/\\/g, "/").toLowerCase().startsWith("manuscrito/"));
    if (isManuscriptTab) {
      return parentDir(activeFilePath);
    }
  }

  return listParentForView(viewMode);
}
