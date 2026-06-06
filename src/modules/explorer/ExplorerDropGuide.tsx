import type { ExplorerDropIntent } from "@/lib/explorer/explorerDropIntent";
import { cn } from "@/lib/utils";

const INDENT_PX = 12;

interface ExplorerInsertGuideProps {
  active: boolean;
  depth: number;
  /** Menos separación vertical (árbol manuscrito). */
  compact?: boolean;
}

/** Línea horizontal que marca inserción entre hermanos. */
export function ExplorerInsertGuide({
  active,
  depth,
  compact = false,
}: ExplorerInsertGuideProps) {
  return (
    <div
      className={cn(
        "relative shrink-0",
        compact ? (active ? "my-0 h-px" : "h-0") : active ? "my-0.5 h-1" : "h-0",
      )}
      style={{ marginLeft: `${depth * INDENT_PX + 4}px` }}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
          active ? "opacity-100 shadow-[0_0_5px] shadow-primary/60" : "opacity-0",
        )}
      />
    </div>
  );
}

export function isInsertBefore(
  intent: ExplorerDropIntent | null,
  path: string,
): boolean {
  return intent?.kind === "before" && intent.path === path;
}

export function isInsertAfter(
  intent: ExplorerDropIntent | null,
  path: string,
): boolean {
  return intent?.kind === "after" && intent.path === path;
}

export function isInsertAtListEnd(
  intent: ExplorerDropIntent | null,
  parentPath: string,
): boolean {
  return intent?.kind === "end" && intent.parentPath === parentPath;
}

export function isDropIntoFolder(
  intent: ExplorerDropIntent | null,
  folderPath: string,
): boolean {
  return intent?.kind === "into" && intent.folderPath === folderPath;
}

/** Resaltado de carpeta manuscrito: intent into o end bajo carpeta vacía. */
export function isManuscriptDropIntoFolder(
  intent: ExplorerDropIntent | null,
  folderPath: string,
): boolean {
  return (
    isDropIntoFolder(intent, folderPath) ||
    (intent?.kind === "end" && intent.parentPath === folderPath)
  );
}
