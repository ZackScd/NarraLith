import { useTranslation } from "react-i18next";

import { useFolderCardData } from "@/hooks/useFolderCardData";
import type { FileTreeNode } from "@/lib/types/fs";
import { cn } from "@/lib/utils";

interface FolderCardProps {
  node: FileTreeNode;
  onOpen: (path: string) => void;
}

export function FolderCard({ node, onOpen }: FolderCardProps) {
  const { t } = useTranslation("worldbuilding");
  const { meta, entityCount, isLoading } = useFolderCardData(node.path);

  const title = meta.title?.trim() || node.name;
  const description = meta.description?.trim();
  const borderColor = node.color;

  return (
    <button
      type="button"
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-colors hover:bg-muted/40",
        borderColor && "border-l-4",
      )}
      style={borderColor ? { borderLeftColor: borderColor } : undefined}
      onClick={() => onOpen(node.path)}
    >
      {meta.imagePath ? (
        <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {meta.imagePath}
        </div>
      ) : (
        <div className="h-2 bg-muted/20" />
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {!isLoading && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t("cardView.entityCount", { count: entityCount })}
            </span>
          )}
        </div>
        {description ? (
          <p className="line-clamp-3 text-xs text-muted-foreground">{description}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            {t("cardView.noDescription")}
          </p>
        )}
      </div>
    </button>
  );
}
