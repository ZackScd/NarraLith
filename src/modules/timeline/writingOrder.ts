import { applyCustomOrder, type ExplorerOrderMap } from "@/lib/explorer/treeOrder";
import type { FileTreeNode } from "@/lib/types/fs";
import type { PlacedTimelineItem } from "@/modules/timeline/timelineModel";

const MANUSCRIPT_ROOT = "Manuscrito";

export interface WritingOrderKey {
  pathIndex: number;
  blockIndex: number;
  segmentIndex: number;
  tagRank: number;
  charOffset: number;
  path: string;
  id: string;
}

export interface WritingOrderNeighbors {
  prevId: string | null;
  nextId: string | null;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function tagKindRank(tagKind: string | null | undefined): number {
  if (tagKind === "bar") return 0;
  if (tagKind === "inline") return 1;
  return 2;
}

export function parseSegmentIndex(segmentId: string | null): number {
  if (!segmentId) return -1;
  const match = segmentId.match(/::seg::(\d+)$/);
  return match ? Number.parseInt(match[1]!, 10) : -1;
}

function cloneFileTreeNode(node: FileTreeNode): FileTreeNode {
  return {
    ...node,
    children: node.children?.map(cloneFileTreeNode),
  };
}

function cloneFileTree(tree: FileTreeNode[]): FileTreeNode[] {
  return tree.map(cloneFileTreeNode);
}

function findNodeInTree(
  nodes: FileTreeNode[],
  path: string,
): FileTreeNode | undefined {
  const normalized = normalizePath(path);
  for (const node of nodes) {
    if (normalizePath(node.path) === normalized) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeInTree(node.children, normalized);
      if (found) return found;
    }
  }
  return undefined;
}

function findChildNode(
  nodes: FileTreeNode[],
  path: string,
): FileTreeNode | undefined {
  const normalized = normalizePath(path);
  return nodes.find((node) => normalizePath(node.path) === normalized);
}

/**
 * Hijos lógicos de Manuscrito/ para recorrer el árbol.
 * El backend en vista `manuscript` devuelve carpetas con path `Manuscrito/...`
 * sin un nodo contenedor `Manuscrito`.
 */
function manuscriptTopLevelNodes(tree: FileTreeNode[]): FileTreeNode[] {
  const manuscriptRoot = tree.find(
    (node) => normalizePath(node.path) === MANUSCRIPT_ROOT,
  );
  if (manuscriptRoot?.children?.length) {
    return manuscriptRoot.children;
  }
  return tree.filter((node) =>
    normalizePath(node.path).startsWith(`${MANUSCRIPT_ROOT}/`),
  );
}

/** Contenedor mutable donde insertar carpetas/archivos bajo Manuscrito/. */
function manuscriptChildrenContainer(tree: FileTreeNode[]): FileTreeNode[] {
  let manuscriptRoot = tree.find(
    (node) => normalizePath(node.path) === MANUSCRIPT_ROOT,
  );
  if (manuscriptRoot) {
    if (!manuscriptRoot.children) {
      manuscriptRoot.children = [];
    }
    return manuscriptRoot.children;
  }

  const hasFilteredRoots = tree.some((node) =>
    normalizePath(node.path).startsWith(`${MANUSCRIPT_ROOT}/`),
  );
  if (hasFilteredRoots) {
    return tree;
  }

  manuscriptRoot = {
    name: MANUSCRIPT_ROOT,
    path: MANUSCRIPT_ROOT,
    isDir: true,
    children: [],
  };
  tree.push(manuscriptRoot);
  return manuscriptRoot.children ?? [];
}

/** Inserta un .md bajo Manuscrito/ creando carpetas virtuales si faltan. */
function injectManuscriptFilePath(tree: FileTreeNode[], filePath: string): void {
  const normalized = normalizePath(filePath);
  if (
    !normalized.startsWith(`${MANUSCRIPT_ROOT}/`) ||
    !normalized.endsWith(".md") ||
    findNodeInTree(tree, normalized)
  ) {
    return;
  }

  const relative = normalized.slice(MANUSCRIPT_ROOT.length + 1);
  const segments = relative.split("/");
  const fileName = segments.pop();
  if (!fileName) return;

  let currentChildren = manuscriptChildrenContainer(tree);
  let currentPath = MANUSCRIPT_ROOT;
  for (const segment of segments) {
    currentPath = `${currentPath}/${segment}`;
    let child = findChildNode(currentChildren, currentPath);
    if (!child) {
      child = {
        name: segment,
        path: currentPath,
        isDir: true,
        children: [],
      };
      currentChildren.push(child);
    } else if (!child.children) {
      child.children = [];
    }
    currentChildren = child.children!;
  }

  if (!findChildNode(currentChildren, normalized)) {
    currentChildren.push({
      name: fileName,
      path: normalized,
      isDir: false,
    });
  }
}

function augmentTreeWithTimelinePaths(
  tree: FileTreeNode[],
  extraPaths: Iterable<string>,
): FileTreeNode[] {
  const augmented = cloneFileTree(tree);
  for (const path of extraPaths) {
    injectManuscriptFilePath(augmented, path);
  }
  return augmented;
}

/** DFS pre-order bajo Manuscrito/, respetando explorerOrder por carpeta. */
export function buildManuscriptPathWritingIndex(
  tree: FileTreeNode[],
  explorerOrder: ExplorerOrderMap,
  extraPaths: Iterable<string> = [],
): Map<string, number> {
  const augmented = augmentTreeWithTimelinePaths(tree, extraPaths);
  return buildManuscriptPathWritingIndexFromTreeOnly(augmented, explorerOrder);
}

/** @internal visible for tests */
export function buildManuscriptPathWritingIndexFromTreeOnly(
  tree: FileTreeNode[],
  explorerOrder: ExplorerOrderMap,
): Map<string, number> {
  const index = new Map<string, number>();
  let counter = 0;

  function walkFiles(nodes: FileTreeNode[], parentPath: string): void {
    const ordered = applyCustomOrder(explorerOrder, nodes, parentPath);
    for (const node of ordered) {
      const path = normalizePath(node.path);
      if (node.isDir) {
        if (node.children?.length) {
          walkFiles(node.children, path);
        }
        continue;
      }
      if (path.startsWith(`${MANUSCRIPT_ROOT}/`) && path.endsWith(".md")) {
        index.set(path, counter);
        counter += 1;
      }
    }
  }

  const topLevel = manuscriptTopLevelNodes(tree);
  if (topLevel.length > 0) {
    walkFiles(topLevel, MANUSCRIPT_ROOT);
  }

  return index;
}

export function writingOrderKeyForItem(
  item: Pick<
    PlacedTimelineItem,
    "id" | "path" | "blockIndex" | "segmentId" | "tagKind" | "charOffset"
  >,
  pathIndex: Map<string, number>,
): WritingOrderKey {
  const path = normalizePath(item.path ?? "");
  return {
    pathIndex: pathIndex.get(path) ?? Number.MAX_SAFE_INTEGER,
    blockIndex: item.blockIndex ?? 0,
    segmentIndex: parseSegmentIndex(item.segmentId),
    tagRank: tagKindRank(item.tagKind),
    charOffset: item.charOffset ?? 0,
    path,
    id: item.id,
  };
}

/** Orden de archivos en el manuscrito (árbol → path). */
export function compareWritingOrderPaths(
  pathA: string,
  pathB: string,
  pathIndex: Map<string, number>,
): number {
  const normA = normalizePath(pathA);
  const normB = normalizePath(pathB);
  const indexA = pathIndex.get(normA) ?? Number.MAX_SAFE_INTEGER;
  const indexB = pathIndex.get(normB) ?? Number.MAX_SAFE_INTEGER;
  return indexA - indexB || normA.localeCompare(normB);
}

/** Orden de marcas dentro del mismo archivo. */
export function compareWritingOrderWithinFile(
  a: WritingOrderKey,
  b: WritingOrderKey,
): number {
  return (
    a.blockIndex - b.blockIndex ||
    a.segmentIndex - b.segmentIndex ||
    a.tagRank - b.tagRank ||
    a.charOffset - b.charOffset ||
    a.id.localeCompare(b.id)
  );
}

export function compareWritingOrder(
  a: WritingOrderKey,
  b: WritingOrderKey,
): number {
  return (
    a.pathIndex - b.pathIndex ||
    a.path.localeCompare(b.path) ||
    compareWritingOrderWithinFile(a, b)
  );
}

function assignChainNeighbors(
  chain: PlacedTimelineItem[],
  neighbors: Map<string, WritingOrderNeighbors>,
): void {
  for (let i = 0; i < chain.length; i += 1) {
    const current = chain[i]!;
    neighbors.set(current.id, {
      prevId: i > 0 ? chain[i - 1]!.id : null,
      nextId: i < chain.length - 1 ? chain[i + 1]!.id : null,
    });
  }
}

function buildFileOrderedChain(
  items: PlacedTimelineItem[],
  pathIndex: Map<string, number>,
): PlacedTimelineItem[] {
  const byPath = new Map<string, PlacedTimelineItem[]>();
  for (const item of items) {
    const path = normalizePath(item.path!);
    const bucket = byPath.get(path);
    if (bucket) bucket.push(item);
    else byPath.set(path, [item]);
  }

  const paths = [...byPath.keys()].sort((a, b) =>
    compareWritingOrderPaths(a, b, pathIndex),
  );

  const chain: PlacedTimelineItem[] = [];
  for (const path of paths) {
    const marks = byPath.get(path)!;
    marks.sort((a, b) =>
      compareWritingOrderWithinFile(
        writingOrderKeyForItem(a, pathIndex),
        writingOrderKeyForItem(b, pathIndex),
      ),
    );
    chain.push(...marks);
  }
  return chain;
}

export function buildWritingOrderNeighbors(
  placed: PlacedTimelineItem[],
  pathIndex: Map<string, number>,
): Map<string, WritingOrderNeighbors> {
  const neighbors = new Map<string, WritingOrderNeighbors>();
  const manuscriptItems: PlacedTimelineItem[] = [];
  const belowByPath = new Map<string, PlacedTimelineItem[]>();

  for (const item of placed) {
    if (item.kind !== "file" || !item.path) continue;
    if (item.lane === "manuscript") {
      manuscriptItems.push(item);
      continue;
    }
    const path = normalizePath(item.path);
    const bucket = belowByPath.get(path);
    if (bucket) bucket.push(item);
    else belowByPath.set(path, [item]);
  }

  assignChainNeighbors(buildFileOrderedChain(manuscriptItems, pathIndex), neighbors);

  for (const items of belowByPath.values()) {
    assignChainNeighbors(buildFileOrderedChain(items, pathIndex), neighbors);
  }

  return neighbors;
}

/** @deprecated Usar buildWritingOrderNeighbors */
export function buildWritingOrderNextLink(
  placed: PlacedTimelineItem[],
  pathIndex: Map<string, number>,
): Map<string, string | null> {
  const next = new Map<string, string | null>();
  for (const [id, value] of buildWritingOrderNeighbors(placed, pathIndex)) {
    next.set(id, value.nextId);
  }
  return next;
}
