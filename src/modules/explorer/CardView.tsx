import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { breadcrumbSegments, listChildrenAt } from "@/lib/explorer/treeNav";
import { trackAction } from "@/lib/action-audit/trackAction";
import { displayName } from "@/lib/pathUtils";
import { FolderCard } from "@/modules/explorer/FolderCard";
import type { FileTreeNode } from "@/lib/types/fs";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

interface CardViewProps {
  onContextMenu: (node: FileTreeNode, e: React.MouseEvent) => void;
}

export function CardView({ onContextMenu }: CardViewProps) {
  const { t } = useTranslation("worldbuilding");
  const tree = useFileTreeStore((s) => s.tree);
  const cardPath = useFileTreeStore((s) => s.cardPath);
  const setCardPath = useFileTreeStore((s) => s.setCardPath);
  const selectNode = useFileTreeStore((s) => s.selectNode);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);

  const { folders, files } = listChildrenAt(tree, cardPath);
  const crumbs = breadcrumbSegments(cardPath);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <button
          type="button"
          className={cn(
            "rounded px-1 hover:bg-muted hover:text-foreground",
            !cardPath && "font-medium text-foreground",
          )}
          onClick={() => {
            setCardPath("");
            selectNode(null);
          }}
        >
          {t("cardView.root")}
        </button>
        {crumbs.map((seg) => (
          <span key={seg.path} className="flex items-center gap-1">
            <ChevronRight className="size-3 opacity-50" />
            <button
              type="button"
              className={cn(
                "rounded px-1 hover:bg-muted hover:text-foreground",
                cardPath === seg.path && "font-medium text-foreground",
              )}
              onClick={() => {
                setCardPath(seg.path);
                selectNode(seg.path);
              }}
            >
              {seg.label}
            </button>
          </span>
        ))}
      </nav>

      {folders.length === 0 && files.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("cardView.empty")}</p>
      )}

      {folders.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {folders.map((node) => (
            <div
              key={node.path}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(node, e);
              }}
            >
              <FolderCard
                node={node}
                onOpen={(path) => {
                  setCardPath(path);
                  selectNode(path);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("cardView.files")}
          </p>
          <ul className="space-y-0.5">
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className="flex w-full items-center rounded-md px-2 py-1 text-left text-sm hover:bg-muted/80"
                  onClick={() => {
                    trackAction("entity", "open", {
                      path: file.path,
                      source: "cardView",
                    });
                    void requestOpenDocument(file.path);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(file, e);
                  }}
                >
                  <span className="truncate">{displayName(file.name)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
