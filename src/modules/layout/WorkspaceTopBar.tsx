import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FilePlus,
  FolderOpen,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { invokeCommand } from "@/lib/ipc";
import { basename, displayName } from "@/lib/pathUtils";
import { resolveLastOpenedParentPath } from "@/lib/explorer/explorerParentPath";
import type { FileTreeNode } from "@/lib/types/fs";
import { cn } from "@/lib/utils";
import { requestCloseEditorTab, useEditorStore } from "@/stores/useEditorStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useMapStore } from "@/stores/useMapStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

const GLOBAL_NAV_WIDTH = 48;
const TAB_SCROLL_STEP_PX = 120;

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

const tabScrollButtonClass =
  "flex shrink-0 items-center justify-center self-stretch aspect-square rounded-md border border-border bg-muted py-1 hover:bg-muted/80 disabled:opacity-40";

function editorTabDragId(path: string) {
  return `editor-tab-drag-${path}`;
}

function editorTabDropId(path: string) {
  return `editor-tab-drop-${path}`;
}

interface EditorTabItemProps {
  path: string;
  index: number;
  name: string;
  rawName: string;
  isActive: boolean;
  isDirty: boolean;
  suppressClickRef: MutableRefObject<boolean>;
  onSwitch: (path: string) => void;
  onClose: (path: string) => void;
  tEditor: (key: string, options?: Record<string, string>) => string;
}

function EditorTabItem({
  path,
  index,
  name,
  rawName,
  isActive,
  isDirty,
  suppressClickRef,
  onSwitch,
  onClose,
  tEditor,
}: EditorTabItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: editorTabDragId(path),
    data: { index },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: editorTabDropId(path),
    data: { index },
  });

  const setRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setRef}
      style={style}
      title={path}
      className={cn(
        "group relative flex max-w-[200px] shrink-0 cursor-grab items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs active:cursor-grabbing",
        isActive
          ? "border-border bg-background text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        isDragging && "z-20 opacity-60",
        isOver && !isDragging && "ring-1 ring-primary/40 ring-inset",
      )}
      {...attributes}
      {...listeners}
      role="tab"
      aria-selected={isActive}
      onClick={() => {
        if (suppressClickRef.current) {
          return;
        }
        onSwitch(path);
      }}
    >
      <span className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-1.5">
        {isDirty && (
          <span
            className="size-2 shrink-0 rounded-full bg-primary"
            aria-label={tEditor("tabs.unsaved")}
          />
        )}
        <span className="truncate">{name}</span>
      </span>
      <button
        type="button"
        className={cn(
          "relative z-10 shrink-0 rounded p-0.5 hover:bg-muted hover:opacity-100",
          isActive ? "opacity-60" : "opacity-0 group-hover:opacity-60",
        )}
        aria-label={tEditor("tabs.close", { name: rawName })}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose(path);
        }}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export function WorkspaceTopBar() {
  const { t } = useTranslation("explorer");
  const { t: tEditor } = useTranslation("editor");
  const { t: tMaps } = useTranslation("maps");

  const explorerOpen = useLayoutStore((s) => s.explorerOpen);
  const explorerWidth = useLayoutStore((s) => s.explorerWidth);
  const toggleExplorer = useLayoutStore((s) => s.toggleExplorer);

  const mainView = useWorkspaceStore((s) => s.mainView);
  const activeProject = useProjectStore((s) => s.activeProject);
  const activeMapTitle = useMapStore((s) => s.activeMapTitle);

  const tree = useFileTreeStore((s) => s.tree);
  const viewMode = useFileTreeStore((s) => s.viewMode);
  const selectedPath = useFileTreeStore((s) => s.selectedPath);
  const startInlineCreate = useFileTreeStore((s) => s.startInlineCreate);
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const searchOpen = useFileTreeStore((s) => s.searchOpen);
  const searchQuery = useFileTreeStore((s) => s.searchQuery);
  const toggleSearch = useFileTreeStore((s) => s.toggleSearch);
  const toggleExpandAll = useFileTreeStore((s) => s.toggleExpandAll);
  const tabOrder = useEditorStore((s) => s.tabOrder);
  const tabs = useEditorStore((s) => s.tabs);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);
  const switchTab = useEditorStore((s) => s.switchTab);
  const reorderTabs = useEditorStore((s) => s.reorderTabs);

  const tabDragSuppressClickRef = useRef(false);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [tabStripOverflows, setTabStripOverflows] = useState(false);
  const [canScrollTabsBack, setCanScrollTabsBack] = useState(false);
  const [canScrollTabsForward, setCanScrollTabsForward] = useState(false);

  const updateTabStripOverflow = useCallback(() => {
    const el = tabScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setTabStripOverflows(hasOverflow);
    setCanScrollTabsBack(el.scrollLeft > 0);
    setCanScrollTabsForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = tabScrollRef.current;
    if (!el) return;

    updateTabStripOverflow();
    const ro = new ResizeObserver(updateTabStripOverflow);
    ro.observe(el);
    el.addEventListener("scroll", updateTabStripOverflow, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateTabStripOverflow);
    };
  }, [tabOrder.length, updateTabStripOverflow]);

  const scrollTabStrip = (direction: -1 | 1) => {
    tabScrollRef.current?.scrollBy({
      left: direction * TAB_SCROLL_STEP_PX,
      behavior: "smooth",
    });
  };

  const tabDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleTabDragEnd = (event: DragEndEvent) => {
    tabDragSuppressClickRef.current = true;
    window.setTimeout(() => {
      tabDragSuppressClickRef.current = false;
    }, 0);

    const from = event.active.data.current?.index;
    const to = event.over?.data.current?.index;
    if (typeof from !== "number" || typeof to !== "number" || from === to) {
      return;
    }
    reorderTabs(from, to);
  };

  const isEditorView = mainView === "editor";
  const isMapView = mainView === "map";
  const showExplorerColumn = isEditorView && explorerOpen;
  const isSearchVisible = searchOpen || searchQuery.length > 0;

  const handleOpenProjectRootInOs = useCallback(async () => {
    if (!activeProject?.rootPath) {
      return;
    }
    try {
      await invokeCommand("open_project_root_in_os");
    } catch {
      // Sin UI extra en v1 si el SO rechaza la ruta.
    }
  }, [activeProject?.rootPath]);

  const anyFolderExpanded = useMemo(() => {
    let found = false;
    const walk = (nodes: FileTreeNode[], depth: number) => {
      for (const node of nodes) {
        if (found) return;
        if (node.isDir) {
          const isExpanded = expandedPaths[node.path] ?? depth < 2;
          if (isExpanded && (node.children?.length ?? 0) > 0) {
            found = true;
            return;
          }
          if (node.children) walk(node.children, depth + 1);
        }
      }
    };
    walk(tree, 0);
    return found;
  }, [tree, expandedPaths]);

  const toggleAllLabel = anyFolderExpanded
    ? t("toolbar.collapseAll")
    : t("toolbar.expandAll");

  const createParentPath = resolveLastOpenedParentPath({
    tree,
    selectedPath,
    activeFilePath,
    activeTabKind,
    viewMode,
  });

  return (
    <div className="flex h-10 shrink-0 items-stretch border-b border-border bg-card/70">
      <div
        className="flex shrink-0 items-center justify-center border-r border-border"
        style={{ width: GLOBAL_NAV_WIDTH }}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          title={explorerOpen ? t("nav.collapseExplorer") : t("nav.expandExplorer")}
          aria-label={
            explorerOpen ? t("nav.collapseExplorer") : t("nav.expandExplorer")
          }
          aria-pressed={explorerOpen}
          onClick={toggleExplorer}
        >
          {explorerOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </Button>
      </div>

      {showExplorerColumn ? (
        <div
          className="flex shrink-0 items-center gap-0.5 border-r border-border px-2"
          style={{ width: explorerWidth }}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            title={t("toolbar.openFolderInOs")}
            aria-label={t("toolbar.openFolderInOs")}
            onClick={() => void handleOpenProjectRootInOs()}
          >
            <FolderOpen className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={isSearchVisible ? "secondary" : "ghost"}
            className="size-7"
            title={t("toolbar.search")}
            aria-label={t("toolbar.search")}
            aria-pressed={isSearchVisible}
            onClick={toggleSearch}
          >
            <Search className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            title={toggleAllLabel}
            aria-label={toggleAllLabel}
            onClick={() => toggleExpandAll()}
          >
            {anyFolderExpanded ? (
              <ChevronsDownUp className="size-4" />
            ) : (
              <ChevronsUpDown className="size-4" />
            )}
          </Button>
          <div className="ml-auto flex gap-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("toolbar.newFile")}
              aria-label={t("toolbar.newFile")}
              onClick={() => startInlineCreate("file", createParentPath)}
            >
              <FilePlus className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("toolbar.newFolder")}
              aria-label={t("toolbar.newFolder")}
              onClick={() => startInlineCreate("folder", createParentPath)}
            >
              <FolderPlus className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
        {isMapView ? (
          <h1 className="min-w-0 truncate px-1 text-sm">
            <span className="font-semibold text-foreground">{tMaps("title")}</span>
            {activeMapTitle ? (
              <>
                <span className="mx-2 font-normal text-muted-foreground">|</span>
                <span className="font-medium text-foreground">{activeMapTitle}</span>
              </>
            ) : null}
          </h1>
        ) : isEditorView && tabOrder.length > 0 ? (
          <div className="flex min-w-0 flex-1 items-stretch gap-1">
            {tabStripOverflows ? (
              <button
                type="button"
                className={tabScrollButtonClass}
                onClick={() => scrollTabStrip(-1)}
                disabled={!canScrollTabsBack}
                aria-label={tEditor("tabs.scrollBack")}
              >
                <ChevronLeft className="size-3" />
              </button>
            ) : null}
            <div
              ref={tabScrollRef}
              className={cn(
                "min-w-0 flex-1",
                tabStripOverflows
                  ? "overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  : "overflow-x-hidden overflow-y-hidden",
              )}
            >
              <DndContext
                sensors={tabDragSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToHorizontalAxis]}
                autoScroll={{ threshold: { x: 0.15, y: 0 } }}
                onDragEnd={handleTabDragEnd}
              >
                <div
                  className="flex w-max items-center gap-0.5"
                  role="tablist"
                  aria-label={tEditor("tabs.listLabel")}
                >
                  {tabOrder.map((path, index) => {
                    const tab = tabs[path];
                    if (!tab) return null;
                    const isActive = path === activeFilePath;
                    const rawName = basename(path);
                    const name = displayName(path);

                    return (
                      <EditorTabItem
                        key={path}
                        path={path}
                        index={index}
                        name={name}
                        rawName={rawName}
                        isActive={isActive}
                        isDirty={tab.isDirty}
                        suppressClickRef={tabDragSuppressClickRef}
                        onSwitch={(p) => void switchTab(p)}
                        onClose={requestCloseEditorTab}
                        tEditor={tEditor}
                      />
                    );
                  })}
                </div>
              </DndContext>
            </div>
            {tabStripOverflows ? (
              <button
                type="button"
                className={tabScrollButtonClass}
                onClick={() => scrollTabStrip(1)}
                disabled={!canScrollTabsForward}
                aria-label={tEditor("tabs.scrollForward")}
              >
                <ChevronRight className="size-3" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
