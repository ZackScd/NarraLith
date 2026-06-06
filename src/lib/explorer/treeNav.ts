import type { FileTreeNode } from "@/lib/types/fs";

export function findTreeNode(
  nodes: FileTreeNode[],
  path: string,
): FileTreeNode | undefined {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    if (node.children) {
      const found = findTreeNode(node.children, path);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export function listChildrenAt(
  tree: FileTreeNode[],
  dirPath: string,
): { folders: FileTreeNode[]; files: FileTreeNode[] } {
  const node = dirPath ? findTreeNode(tree, dirPath) : undefined;
  const children = dirPath ? (node?.isDir ? (node.children ?? []) : []) : tree;

  const folders: FileTreeNode[] = [];
  const files: FileTreeNode[] = [];
  for (const child of children) {
    if (child.isDir) {
      folders.push(child);
    } else {
      files.push(child);
    }
  }
  return { folders, files };
}

export function breadcrumbSegments(dirPath: string): { path: string; label: string }[] {
  if (!dirPath) {
    return [];
  }
  const parts = dirPath.split("/").filter(Boolean);
  const segments: { path: string; label: string }[] = [];
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    segments.push({ path: acc, label: part });
  }
  return segments;
}

/** Rutas de hermanos bajo parentPath (orden actual del árbol en UI). */
export function listSiblingPaths(
  tree: FileTreeNode[],
  parentPath: string,
  listParent?: string,
): string[] {
  if (!parentPath) {
    return tree.map((n) => n.path);
  }
  const node = findTreeNode(tree, parentPath);
  if (node?.isDir && node.children) {
    return node.children.map((n) => n.path);
  }
  if (listParent && parentPath === listParent) {
    return tree.map((n) => n.path);
  }
  return [];
}
