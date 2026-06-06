import { LayoutGrid, ListTree, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseEndDropId, parseRowDropId } from "@/lib/explorer/explorerDnD";
import {
  manuscriptPointerCollision,
  preferManuscriptFolderIntoIntent,
} from "@/lib/explorer/manuscriptDropCollision";
import {
  resolveManuscriptRowDropIntent,
  resolveRowDropIntent,
  type ExplorerDropIntent,
} from "@/lib/explorer/explorerDropIntent";
import { listParentForView, parentPathOf } from "@/lib/explorer/treeOrder";
import { displayName } from "@/lib/pathUtils";
import type { FileTreeNode } from "@/lib/types/fs";
import { cn } from "@/lib/utils";
import { CardView } from "@/modules/explorer/CardView";
import { FileTreeRootList } from "@/modules/explorer/FileTreeItem";
import { ExplorerContextMenu } from "@/modules/explorer/ExplorerContextMenu";
import { ExplorerDialogs } from "@/modules/explorer/ExplorerDialogs";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useProjectStore } from "@/stores/useProjectStore";

function filterTree(nodes: FileTreeNode[], search: string): FileTreeNode[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return nodes;
  }

  const filtered: FileTreeNode[] = [];
  for (const node of nodes) {
    const label = node.isDir ? node.name : displayName(node.name);
    const matchesNode = label.toLowerCase().includes(query);
    const filteredChildren = node.children ? filterTree(node.children, query) : [];

    if (matchesNode || filteredChildren.length > 0) {
      filtered.push({
        ...node,
        children: node.isDir
          ? matchesNode
            ? node.children
            : filteredChildren
          : node.children,
      });
    }
  }

  return filtered;
}

export function FileExplorer() {
  const { t } = useTranslation("explorer");
  const { t: tWb } = useTranslation("worldbuilding");
  const activeProject = useProjectStore((s) => s.activeProject);
  const tree = useFileTreeStore((s) => s.tree);
  const viewMode = useFileTreeStore((s) => s.viewMode);
  const explorerLayout = useFileTreeStore((s) => s.explorerLayout);
  const setExplorerLayout = useFileTreeStore((s) => s.setExplorerLayout);
  const isLoading = useFileTreeStore((s) => s.isLoading);
  const lastErrorKey = useFileTreeStore((s) => s.lastErrorKey);
  const revision = useFileTreeStore((s) => s.revision);
  const loadTree = useFileTreeStore((s) => s.loadTree);
  const movePath = useFileTreeStore((s) => s.movePath);
  const reorderExplorerSibling = useFileTreeStore((s) => s.reorderExplorerSibling);
  const reorderExplorerToEnd = useFileTreeStore((s) => s.reorderExplorerToEnd);
  const searchQuery = useFileTreeStore((s) => s.searchQuery);
  const searchOpen = useFileTreeStore((s) => s.searchOpen);
  const setSearchQuery = useFileTreeStore((s) => s.setSearchQuery);
  const closeSearch = useFileTreeStore((s) => s.closeSearch);
  const explorerDialog = useFileTreeStore((s) => s.explorerDialog);
  const openExplorerDialog = useFileTreeStore((s) => s.openExplorerDialog);
  const closeExplorerDialog = useFileTreeStore((s) => s.closeExplorerDialog);

  const showCardToggle = viewMode === "worldbuilding";
  const useCardLayout = showCardToggle && explorerLayout === "cards";
  const listParent = listParentForView(viewMode);

  const [menu, setMenu] = useState<{
    node: FileTreeNode | null;
    position: { x: number; y: number };
  } | null>(null);
  const [draggingNode, setDraggingNode] = useState<FileTreeNode | null>(null);
  const [dropIntent, setDropIntent] = useState<ExplorerDropIntent | null>(null);

  const pointerYRef = useRef(0);
  const dropIntentRef = useRef<ExplorerDropIntent | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const dragExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragExpandTargetRef = useRef<string | null>(null);
  const filteredTree = useMemo(
    () => filterTree(tree, searchQuery),
    [tree, searchQuery],
  );
  const isSearchActive = searchQuery.trim().length > 0;
  const isSearchVisible = searchOpen || isSearchActive;
  const visibleTree = filteredTree;

  const collisionDetection = useMemo(
    () =>
      manuscriptPointerCollision(
        viewMode === "manuscript",
        (path) => findNode(tree, path)?.isDir ?? false,
        pointerWithin,
      ),
    [viewMode, tree],
  );

  function isFolderPath(path: string): boolean {
    return findNode(tree, path)?.isDir ?? false;
  }

  function resolveDragIntent(event: DragOverEvent): ExplorerDropIntent | null {
    if (viewMode === "manuscript") {
      const collisions = event.collisions ?? (event.over ? [event.over] : []);
      const folderIntent = preferManuscriptFolderIntoIntent(collisions, isFolderPath);
      if (folderIntent) {
        return folderIntent;
      }
    }
    return event.over ? intentFromOver(event.over) : null;
  }

  function stopPointerTracking() {
    pointerCleanupRef.current?.();
    pointerCleanupRef.current = null;
  }

  function startPointerTracking() {
    stopPointerTracking();
    const onPointerMove = (ev: PointerEvent) => {
      pointerYRef.current = ev.clientY;
    };
    window.addEventListener("pointermove", onPointerMove);
    pointerCleanupRef.current = () =>
      window.removeEventListener("pointermove", onPointerMove);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    if (activeProject) {
      void loadTree();
    }
  }, [activeProject, viewMode, revision, loadTree]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    }
  }

  function findNode(nodes: FileTreeNode[], path: string): FileTreeNode | undefined {
    for (const n of nodes) {
      if (n.path === path) {
        return n;
      }
      if (n.children) {
        const found = findNode(n.children, path);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  function findNodeDepth(
    nodes: FileTreeNode[],
    path: string,
    depth = 0,
  ): number | null {
    for (const n of nodes) {
      if (n.path === path) {
        return depth;
      }
      if (n.children) {
        const found = findNodeDepth(n.children, path, depth + 1);
        if (found !== null) {
          return found;
        }
      }
    }
    return null;
  }

  function clearDragExpandTimer() {
    if (dragExpandTimerRef.current !== null) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }
    dragExpandTargetRef.current = null;
  }

  function isFolderExpandedInTree(folderPath: string): boolean {
    const depth = findNodeDepth(tree, folderPath);
    if (depth === null) {
      return true;
    }
    const expandedPaths = useFileTreeStore.getState().expandedPaths;
    return expandedPaths[folderPath] ?? depth < 2;
  }

  function scheduleDragExpand(folderPath: string) {
    if (dragExpandTargetRef.current === folderPath) {
      return;
    }
    clearDragExpandTimer();
    dragExpandTargetRef.current = folderPath;
    dragExpandTimerRef.current = setTimeout(() => {
      dragExpandTimerRef.current = null;
      dragExpandTargetRef.current = null;
      useFileTreeStore.getState().expandPath(folderPath);
    }, 2000);
  }

  function siblingPaths(parentPath: string): string[] {
    if (!parentPath) {
      return tree.map((n) => n.path);
    }
    const children = findNode(tree, parentPath)?.children;
    if (children) {
      return children.map((n) => n.path);
    }
    if (parentPath === listParent) {
      return tree.map((n) => n.path);
    }
    return [];
  }

  function nodeBasename(path: string): string {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? path : path.slice(idx + 1);
  }

  function movedPathForParent(sourcePath: string, parentPath: string): string {
    const name = nodeBasename(sourcePath);
    return parentPath ? `${parentPath}/${name}` : name;
  }

  function intentFromOver(
    over: NonNullable<DragOverEvent["over"]>,
  ): ExplorerDropIntent | null {
    const overId = String(over.id);
    const endDrop = parseEndDropId(overId);
    if (endDrop) {
      return endDrop;
    }

    const rowPath = parseRowDropId(overId);
    if (!rowPath || !over.rect) {
      return null;
    }

    const node = findNode(tree, rowPath);
    if (!node) {
      return null;
    }

    const resolve =
      viewMode === "manuscript" ? resolveManuscriptRowDropIntent : resolveRowDropIntent;

    return resolve({
      path: rowPath,
      isDir: node.isDir,
      pointerY: pointerYRef.current,
      rectTop: over.rect.top,
      rectHeight: over.rect.height,
    });
  }

  function handleDragOver(event: DragOverEvent) {
    const intent = resolveDragIntent(event);
    dropIntentRef.current = intent;
    setDropIntent(intent);

    if (viewMode !== "manuscript") {
      clearDragExpandTimer();
      return;
    }

    if (intent?.kind === "into") {
      const folderPath = intent.folderPath;
      const folder = findNode(tree, folderPath);
      if (folder?.isDir && !isFolderExpandedInTree(folderPath)) {
        scheduleDragExpand(folderPath);
        return;
      }
    }

    clearDragExpandTimer();
  }

  async function executeDropIntent(intent: ExplorerDropIntent, sourcePath: string) {
    const sourceParent = parentPathOf(sourcePath);

    if (intent.kind === "into") {
      const folderPath = intent.folderPath;
      if (
        sourcePath === folderPath ||
        sourcePath.startsWith(`${folderPath}/`) ||
        folderPath.startsWith(`${sourcePath}/`)
      ) {
        return;
      }
      if (sourceParent === folderPath) {
        const siblings = siblingPaths(folderPath);
        await reorderExplorerToEnd(folderPath, sourcePath, siblings);
        return;
      }
      const ok = await movePath(sourcePath, folderPath);
      if (!ok) {
        return;
      }
      const movedPath = movedPathForParent(sourcePath, folderPath);
      const siblings = siblingPaths(folderPath);
      const orderedSiblings = siblings.includes(movedPath)
        ? siblings
        : [...siblings, movedPath];
      await reorderExplorerToEnd(folderPath, movedPath, orderedSiblings);
      return;
    }

    if (intent.kind === "end") {
      if (sourceParent !== intent.parentPath) {
        const ok = await movePath(sourcePath, intent.parentPath);
        if (!ok) {
          return;
        }
        const movedPath = movedPathForParent(sourcePath, intent.parentPath);
        const siblings = siblingPaths(intent.parentPath);
        const orderedSiblings = siblings.includes(movedPath)
          ? siblings
          : [...siblings, movedPath];
        await reorderExplorerToEnd(intent.parentPath, movedPath, orderedSiblings);
        return;
      }
      const siblings = siblingPaths(intent.parentPath);
      await reorderExplorerToEnd(intent.parentPath, sourcePath, siblings);
      return;
    }

    if (intent.kind === "before" || intent.kind === "after") {
      const targetPath = intent.path;
      const targetParent = parentPathOf(targetPath);
      const position = intent.kind === "before" ? "before" : "after";

      if (sourceParent !== targetParent) {
        const ok = await movePath(sourcePath, targetParent);
        if (!ok) {
          return;
        }
        const movedPath = movedPathForParent(sourcePath, targetParent);
        const siblings = siblingPaths(targetParent);
        const orderedSiblings = siblings.includes(movedPath)
          ? siblings
          : [...siblings, movedPath];
        await reorderExplorerSibling(
          targetParent,
          movedPath,
          targetPath,
          orderedSiblings,
          position,
        );
        return;
      }
      const siblings = siblingPaths(targetParent);
      await reorderExplorerSibling(
        targetParent,
        sourcePath,
        targetPath,
        siblings,
        position,
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    stopPointerTracking();
    clearDragExpandTimer();
    setDraggingNode(null);
    setDropIntent(null);

    const sourcePath = String(event.active.id);
    const intent =
      dropIntentRef.current ?? (event.over ? intentFromOver(event.over) : null);

    dropIntentRef.current = null;

    if (!intent || !sourcePath) {
      return;
    }

    await executeDropIntent(intent, sourcePath);
  }

  function handleDragCancel() {
    stopPointerTracking();
    clearDragExpandTimer();
    setDraggingNode(null);
    setDropIntent(null);
    dropIntentRef.current = null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1 pt-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t(`view.${viewMode}`)}
        </p>
        {showCardToggle ? (
          <div className="flex shrink-0 gap-0.5 rounded-md border border-border p-0.5">
            <Button
              type="button"
              size="icon"
              variant={explorerLayout === "tree" ? "secondary" : "ghost"}
              className="size-6"
              aria-label={tWb("cardView.layoutTree")}
              title={tWb("cardView.layoutTree")}
              onClick={() => setExplorerLayout("tree")}
            >
              <ListTree className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={explorerLayout === "cards" ? "secondary" : "ghost"}
              className="size-6"
              aria-label={tWb("cardView.layoutCards")}
              title={tWb("cardView.layoutCards")}
              onClick={() => setExplorerLayout("cards")}
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {isSearchVisible ? (
        <div className="mb-2 flex shrink-0 items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("toolbar.searchPlaceholder")}
              aria-label={t("toolbar.search")}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            title={t("toolbar.closeSearch")}
            aria-label={t("toolbar.closeSearch")}
            onClick={closeSearch}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}

      {isLoading && <p className="text-xs text-muted-foreground">{t("loading")}</p>}

      {lastErrorKey && !isLoading && (
        <p className="mb-2 text-xs text-destructive" role="alert">
          {t(lastErrorKey, { defaultValue: lastErrorKey })}
        </p>
      )}

      {!isLoading && !lastErrorKey && visibleTree.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      )}

      {useCardLayout ? (
        <div
          className="scroll-panel min-h-0 flex-1"
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ node: null, position: { x: e.clientX, y: e.clientY } });
          }}
        >
          <CardView
            onContextMenu={(node, e) =>
              setMenu({ node, position: { x: e.clientX, y: e.clientY } })
            }
          />
        </div>
      ) : isSearchActive ? (
        <div
          className="scroll-panel min-h-0 flex-1"
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ node: null, position: { x: e.clientX, y: e.clientY } });
          }}
        >
          <FileTreeRootList
            nodes={visibleTree}
            parentPath={listParent}
            dropIntent={null}
            onContextMenu={(node, e) =>
              setMenu({ node, position: { x: e.clientX, y: e.clientY } })
            }
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={(e) => {
            clearDragExpandTimer();
            const path = String(e.active.id);
            setDraggingNode(findNode(tree, path) ?? null);
            startPointerTracking();
          }}
          onDragOver={handleDragOver}
          onDragEnd={(e) => void handleDragEnd(e)}
          onDragCancel={handleDragCancel}
        >
          <div
            className={cn(
              "scroll-panel min-h-0 flex-1",
              viewMode === "manuscript" && "flex flex-col px-0",
            )}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ node: null, position: { x: e.clientX, y: e.clientY } });
            }}
          >
            <FileTreeRootList
              nodes={visibleTree}
              parentPath={listParent}
              dropIntent={dropIntent}
              onContextMenu={(node, e) =>
                setMenu({ node, position: { x: e.clientX, y: e.clientY } })
              }
            />
          </div>
          <DragOverlay>
            {draggingNode ? (
              <div className="rounded-md border border-border bg-card px-2 py-1 text-sm shadow-md">
                {draggingNode.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ExplorerContextMenu
        node={menu?.node ?? null}
        position={menu?.position ?? null}
        onClose={() => setMenu(null)}
        onOpenDialog={openExplorerDialog}
      />

      <ExplorerDialogs dialog={explorerDialog} onClose={closeExplorerDialog} />
    </div>
  );
}
