import type { ExplorerViewMode, FileTreeNode } from "@/lib/types/fs";

export type ExplorerOrderMap = Record<string, string[]>;

export function orderKey(parentPath: string): string {
  return parentPath || "__root__";
}

/** Carpeta padre lógica cuando el explorador filtra por vista (Manuscrito / Worldbuilding). */
export function listParentForView(viewMode: ExplorerViewMode): string {
  if (viewMode === "manuscript") {
    return "Manuscrito";
  }
  if (viewMode === "worldbuilding") {
    return "Worldbuilding";
  }
  return "";
}

/** Aplica el orden guardado en el proyecto; sin entrada, respeta el orden del disco. */
export function applyCustomOrder(
  orderMap: ExplorerOrderMap,
  nodes: FileTreeNode[],
  parentPath = "",
): FileTreeNode[] {
  const custom = orderMap[orderKey(parentPath)];
  if (!custom?.length) {
    return nodes.map((node) =>
      node.children
        ? { ...node, children: applyCustomOrder(orderMap, node.children, node.path) }
        : node,
    );
  }

  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const ordered: FileTreeNode[] = [];
  for (const path of custom) {
    const node = byPath.get(path);
    if (node) {
      ordered.push(
        node.children
          ? {
              ...node,
              children: applyCustomOrder(orderMap, node.children, node.path),
            }
          : node,
      );
      byPath.delete(path);
    }
  }
  for (const node of byPath.values()) {
    ordered.push(
      node.children
        ? { ...node, children: applyCustomOrder(orderMap, node.children, node.path) }
        : node,
    );
  }
  return ordered;
}

export function reorderSiblingInMap(
  orderMap: ExplorerOrderMap,
  parentPath: string,
  sourcePath: string,
  targetPath: string,
  siblingPaths: string[],
  position: "before" | "after" = "before",
): ExplorerOrderMap {
  if (sourcePath === targetPath) {
    return orderMap;
  }
  const key = orderKey(parentPath);
  const project = { ...orderMap };
  const base = project[key]?.length
    ? project[key].filter((p) => siblingPaths.includes(p))
    : [...siblingPaths];
  for (const path of siblingPaths) {
    if (!base.includes(path)) {
      base.push(path);
    }
  }
  const without = base.filter((p) => p !== sourcePath);
  const targetIdx = without.indexOf(targetPath);
  if (targetIdx === -1) {
    without.push(sourcePath);
  } else if (position === "before") {
    without.splice(targetIdx, 0, sourcePath);
  } else {
    without.splice(targetIdx + 1, 0, sourcePath);
  }
  project[key] = without;
  return project;
}

/** Coloca sourcePath al final de la lista de hermanos. */
export function reorderSiblingToEndInMap(
  orderMap: ExplorerOrderMap,
  parentPath: string,
  sourcePath: string,
  siblingPaths: string[],
): ExplorerOrderMap {
  const key = orderKey(parentPath);
  const project = { ...orderMap };
  const base = project[key]?.length
    ? project[key].filter((p) => siblingPaths.includes(p))
    : [...siblingPaths];
  for (const path of siblingPaths) {
    if (!base.includes(path)) {
      base.push(path);
    }
  }
  const without = base.filter((p) => p !== sourcePath);
  without.push(sourcePath);
  project[key] = without;
  return project;
}

export function appendToParentOrderInMap(
  orderMap: ExplorerOrderMap,
  parentPath: string,
  newPath: string,
  siblingPaths: string[],
): ExplorerOrderMap {
  const key = orderKey(parentPath);
  const existing = orderMap[key];
  if (existing?.includes(newPath)) {
    return orderMap;
  }

  const base = existing?.length ? [...existing] : [...siblingPaths];
  for (const path of siblingPaths) {
    if (!base.includes(path)) {
      base.push(path);
    }
  }

  const withoutNew = base.filter((p) => p !== newPath);
  return { ...orderMap, [key]: [...withoutNew, newPath] };
}

export function renameInOrderMap(
  orderMap: ExplorerOrderMap,
  oldPath: string,
  newPath: string,
): ExplorerOrderMap {
  if (oldPath === newPath) {
    return orderMap;
  }
  let changed = false;
  const next: ExplorerOrderMap = {};
  for (const [key, paths] of Object.entries(orderMap)) {
    next[key] = paths.map((p) => {
      if (p === oldPath) {
        changed = true;
        return newPath;
      }
      return p;
    });
  }
  return changed ? next : orderMap;
}

export function movePathInOrderMap(
  orderMap: ExplorerOrderMap,
  oldPath: string,
  newPath: string,
): ExplorerOrderMap {
  if (oldPath === newPath) {
    return orderMap;
  }
  const oldParent = parentPathOf(oldPath);
  const newParent = parentPathOf(newPath);
  let project = { ...orderMap };

  const oldKey = orderKey(oldParent);
  if (project[oldKey]) {
    const filtered = project[oldKey].filter((p) => p !== oldPath);
    if (filtered.length === 0) {
      const { [oldKey]: removed, ...rest } = project;
      void removed;
      project = rest;
    } else {
      project = { ...project, [oldKey]: filtered };
    }
  }

  const remapped: ExplorerOrderMap = {};
  for (const [key, paths] of Object.entries(project)) {
    remapped[key] = paths.map((p) => (p === oldPath ? newPath : p));
  }
  project = remapped;

  const newKey = orderKey(newParent);
  if (project[newKey]?.length && !project[newKey].includes(newPath)) {
    project = { ...project, [newKey]: [...project[newKey], newPath] };
  }

  return project;
}

export function removePathFromOrderMap(
  orderMap: ExplorerOrderMap,
  path: string,
): ExplorerOrderMap {
  let changed = false;
  const next: ExplorerOrderMap = {};
  for (const [key, paths] of Object.entries(orderMap)) {
    const filtered = paths.filter((p) => p !== path);
    if (filtered.length !== paths.length) {
      changed = true;
    }
    if (filtered.length > 0) {
      next[key] = filtered;
    }
  }
  return changed ? next : orderMap;
}

export function parentPathOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}
