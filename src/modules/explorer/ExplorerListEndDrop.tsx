import { useDroppable } from "@dnd-kit/core";

import type { ExplorerDropIntent } from "@/lib/explorer/explorerDropIntent";
import { cn } from "@/lib/utils";
import {
  ExplorerInsertGuide,
  isInsertAtListEnd,
} from "@/modules/explorer/ExplorerDropGuide";

interface ExplorerListEndDropProps {
  id: string;
  parentPath: string;
  depth: number;
  dropIntent: ExplorerDropIntent | null;
  variant?: "default" | "manuscriptRoot";
  compact?: boolean;
}

/** Zona al final de una lista (soltar después del último hermano). */
export function ExplorerListEndDrop({
  id,
  parentPath,
  depth,
  dropIntent,
  variant = "default",
  compact = false,
}: ExplorerListEndDropProps) {
  const { setNodeRef } = useDroppable({ id });
  const showLine = isInsertAtListEnd(dropIntent, parentPath);
  const isManuscriptRoot = variant === "manuscriptRoot";

  return (
    <div
      ref={setNodeRef}
      className={cn("shrink-0", isManuscriptRoot && "min-h-8 flex-1")}
      aria-hidden
    >
      <ExplorerInsertGuide active={showLine} depth={depth} compact={compact} />
      <div
        className={cn(
          isManuscriptRoot
            ? "min-h-1"
            : compact
              ? showLine
                ? "h-px"
                : "h-0"
              : showLine
                ? "h-1"
                : "h-3",
        )}
      />
    </div>
  );
}
