import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EXPLORER_DND } from "@/lib/explorer/explorerDnD";
import { displayName, projectPathsEqual } from "@/lib/pathUtils";
import { isEntityPath } from "@/lib/worldbuilding/entityPath";
import type { ExplorerDropIntent } from "@/lib/explorer/explorerDropIntent";
import type { FileTreeNode } from "@/lib/types/fs";
import { cn } from "@/lib/utils";
import {
  ExplorerInsertGuide,
  isDropIntoFolder,
  isInsertAfter,
  isInsertBefore,
  isManuscriptDropIntoFolder,
} from "@/modules/explorer/ExplorerDropGuide";
import { ExplorerListEndDrop } from "@/modules/explorer/ExplorerListEndDrop";
import {
  manuscriptContentPaddingLeft,
  manuscriptRowBleedStyle,
  MS_INDENT_PX,
  MS_ROW_BG_ACTIVE,
  MS_ROW_BG_DRAG_INTO,
  MS_ROW_HOVER_CLASS,
  MS_ROW_CLASS,
  MS_ROW_PX,
  MS_ROW_SLOT_CLASS,
} from "@/modules/explorer/manuscriptTreeLayout";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

interface FileTreeItemProps {
  node: FileTreeNode;
  parentPath: string;
  depth?: number;
  dropIntent: ExplorerDropIntent | null;
  onContextMenu: (node: FileTreeNode, e: React.MouseEvent) => void;
}

export function FileTreeItem({
  node,
  parentPath,
  depth = 0,
  dropIntent,
  onContextMenu,
}: FileTreeItemProps) {
  const { t } = useTranslation("explorer");
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const selectedPath = useFileTreeStore((s) => s.selectedPath);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const selectNode = useFileTreeStore((s) => s.selectNode);
  const viewMode = useFileTreeStore((s) => s.viewMode);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);

  const isManuscript = viewMode === "manuscript";
  const isExpanded = expandedPaths[node.path] ?? depth < 2;
  const isSelected = selectedPath === node.path;
  const hasChildren = node.isDir && (node.children?.length ?? 0) > 0;
  const isManuscriptPath = (path: string) =>
    path.replace(/\\/g, "/").toLowerCase().startsWith("manuscrito/");

  const isActiveFile =
    isManuscript &&
    !node.isDir &&
    !isEntityPath(node.path) &&
    projectPathsEqual(activeFilePath, node.path) &&
    (activeTabKind === "manuscript" ||
      (activeTabKind === null && isManuscriptPath(node.path)));

  const showLineBefore = isInsertBefore(dropIntent, node.path);
  const showLineAfter = isInsertAfter(dropIntent, node.path);
  const showInto = isManuscript
    ? isManuscriptDropIntoFolder(dropIntent, node.path)
    : isDropIntoFolder(dropIntent, node.path);
  const chevronClass = cn(
    "shrink-0 text-muted-foreground",
    isManuscript ? "size-3" : "size-3.5",
  );

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.path,
    data: { isDir: node.isDir, parentPath },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: EXPLORER_DND.row(node.path),
    data: { path: node.path, isDir: node.isDir, parentPath },
  });

  const rowStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
  };

  const label = node.isDir ? node.name : displayName(node.name);

  function handleRowContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    selectNode(node.path);
    onContextMenu(node, e);
  }

  const rowButton = (
    <button
      ref={setDragRef}
      type="button"
      {...attributes}
      {...listeners}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 text-left text-sm",
        isManuscript
          ? cn(MS_ROW_CLASS, MS_ROW_PX, "bg-transparent text-muted-foreground")
          : cn("rounded-md px-2 py-1 hover:bg-muted/80", isSelected && "bg-muted"),
      )}
      aria-current={isManuscript && isActiveFile ? "true" : undefined}
      onClick={() => {
        selectNode(node.path);
        if (node.isDir) {
          toggleExpanded(node.path);
        } else if (node.path.toLowerCase().endsWith(".md")) {
          void requestOpenDocument(node.path);
        }
      }}
    >
      {node.isDir ? (
        isManuscript || hasChildren ? (
          isExpanded ? (
            <ChevronDown className={chevronClass} />
          ) : (
            <ChevronRight className={chevronClass} />
          )
        ) : (
          <span className={chevronClass} aria-hidden="true" />
        )
      ) : (
        <span className={chevronClass} aria-hidden="true" />
      )}
      <span
        className="truncate"
        style={
          !isManuscript && node.isDir && node.color && !showInto
            ? { color: node.color }
            : undefined
        }
      >
        {label}
      </span>
      {!isManuscript && showInto && (
        <span className="ml-auto shrink-0 text-[10px] font-medium text-primary">
          {t("dnd.intoBadge")}
        </span>
      )}
    </button>
  );

  if (isManuscript) {
    const bleed = manuscriptRowBleedStyle();

    return (
      <div>
        <ExplorerInsertGuide active={showLineBefore} depth={depth} compact />

        <div
          ref={setDropRef}
          className={cn("relative", MS_ROW_SLOT_CLASS)}
          style={bleed}
          onContextMenu={handleRowContextMenu}
        >
          <div
            className={cn(
              "group/row relative",
              isActiveFile && MS_ROW_BG_ACTIVE,
              !isActiveFile && showInto && MS_ROW_BG_DRAG_INTO,
              !isActiveFile && !showInto && MS_ROW_HOVER_CLASS,
            )}
            style={rowStyle}
          >
            <div
              className={cn("relative flex min-w-0 items-center", MS_ROW_CLASS)}
              style={{ paddingLeft: manuscriptContentPaddingLeft(depth) }}
            >
              {rowButton}
            </div>
          </div>
        </div>

        <ExplorerInsertGuide active={showLineAfter} depth={depth} compact />

        {node.isDir && isExpanded && hasChildren ? (
          <>
            <div className="relative">
              <div
                className="pointer-events-none absolute bottom-0 top-0 border-l border-border/30"
                style={{
                  left: manuscriptContentPaddingLeft(depth + 1) - MS_INDENT_PX / 2,
                }}
                aria-hidden
              />
              {node.children!.map((child) => (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  parentPath={node.path}
                  depth={depth + 1}
                  dropIntent={dropIntent}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
            <ExplorerListEndDrop
              id={EXPLORER_DND.end(node.path)}
              parentPath={node.path}
              depth={depth + 1}
              dropIntent={dropIntent}
              compact
            />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <ExplorerInsertGuide active={showLineBefore} depth={depth} />

      <div
        ref={setDropRef}
        className={cn(
          showInto && "rounded-md ring-2 ring-primary ring-inset bg-primary/10",
        )}
        onContextMenu={handleRowContextMenu}
      >
        <div className="flex min-w-0 items-stretch" style={rowStyle}>
          {rowButton}
        </div>
      </div>

      <ExplorerInsertGuide active={showLineAfter} depth={depth} />

      {node.isDir && isExpanded && hasChildren ? (
        <div className="ml-[9px]">
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              parentPath={node.path}
              depth={depth + 1}
              dropIntent={dropIntent}
              onContextMenu={onContextMenu}
            />
          ))}
          <ExplorerListEndDrop
            id={EXPLORER_DND.end(node.path)}
            parentPath={node.path}
            depth={depth + 1}
            dropIntent={dropIntent}
          />
        </div>
      ) : null}
    </div>
  );
}

const MANUSCRIPT_ROOT = "Manuscrito";

export function FileTreeRootList({
  nodes,
  parentPath,
  dropIntent,
  onContextMenu,
}: {
  nodes: FileTreeNode[];
  parentPath: string;
  dropIntent: ExplorerDropIntent | null;
  onContextMenu: (node: FileTreeNode, e: React.MouseEvent) => void;
}) {
  const isManuscriptRoot = parentPath === MANUSCRIPT_ROOT;
  const showEndDrop = isManuscriptRoot || nodes.length > 0;

  return (
    <div className={cn(isManuscriptRoot && "flex min-h-0 flex-1 flex-col")}>
      {nodes.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          parentPath={parentPath}
          depth={0}
          dropIntent={dropIntent}
          onContextMenu={onContextMenu}
        />
      ))}
      {showEndDrop ? (
        <ExplorerListEndDrop
          id={EXPLORER_DND.end(parentPath)}
          parentPath={parentPath}
          depth={0}
          dropIntent={dropIntent}
          variant={isManuscriptRoot ? "manuscriptRoot" : "default"}
          compact={isManuscriptRoot}
        />
      ) : null}
    </div>
  );
}
