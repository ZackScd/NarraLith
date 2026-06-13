import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { resolveContextMenuParentPath } from "@/lib/explorer/explorerParentPath";
import type { ExplorerDialogState } from "@/modules/explorer/ExplorerDialogs";
import type { FileTreeNode } from "@/lib/types/fs";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

interface ExplorerContextMenuProps {
  node: FileTreeNode | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onOpenDialog: (dialog: ExplorerDialogState) => void;
}

export function ExplorerContextMenu({
  node,
  position,
  onClose,
  onOpenDialog,
}: ExplorerContextMenuProps) {
  const { t } = useTranslation("explorer");
  const { t: tWb } = useTranslation("worldbuilding");
  const viewMode = useFileTreeStore((s) => s.viewMode);
  const explorerLayout = useFileTreeStore((s) => s.explorerLayout);
  const cardPath = useFileTreeStore((s) => s.cardPath);
  const startInlineCreate = useFileTreeStore((s) => s.startInlineCreate);
  const startInlineRename = useFileTreeStore((s) => s.startInlineRename);
  const ref = useRef<HTMLDivElement>(null);
  const showEntityCreate = viewMode === "worldbuilding";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (position) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [position, onClose]);

  if (!position) {
    return null;
  }

  const parentPath = resolveContextMenuParentPath({
    node,
    cardPath,
    viewMode,
    useCardParent: explorerLayout === "cards" && showEntityCreate,
  });
  const targetPath = node?.path ?? "";
  const targetName = node?.name ?? "";
  const isDir = node?.isDir ?? true;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[10rem] rounded-lg border border-border bg-popover py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      <MenuButton
        label={t("context.newFile")}
        onClick={() => {
          startInlineCreate("file", parentPath);
          onClose();
        }}
      />
      {showEntityCreate && (
        <MenuButton
          label={tWb("create.menuLabel")}
          onClick={() => {
            onOpenDialog({ type: "createEntity", parentPath });
            onClose();
          }}
        />
      )}
      <MenuButton
        label={t("context.newFolder")}
        onClick={() => {
          startInlineCreate("folder", parentPath);
          onClose();
        }}
      />
      {showEntityCreate && (node?.isDir || (!node && cardPath)) && (
        <MenuButton
          label={tWb("folderEdit.menuLabel")}
          onClick={() => {
            onOpenDialog({
              type: "folderDescription",
              dirPath: node?.isDir ? node.path : cardPath,
            });
            onClose();
          }}
        />
      )}
      {node && (
        <>
          <div className="my-1 border-t border-border" />
          <MenuButton
            label={t("context.rename")}
            onClick={() => {
              startInlineRename(targetPath, isDir, targetName);
              onClose();
            }}
          />
          <MenuButton
            label={t("context.delete")}
            className="text-destructive"
            onClick={() => {
              onOpenDialog({
                type: "delete",
                path: targetPath,
                name: targetName,
                isDir,
              });
              onClose();
            }}
          />
        </>
      )}
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${className ?? ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
