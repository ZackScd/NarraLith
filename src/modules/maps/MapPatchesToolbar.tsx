import { ArrowDownUp, EyeOff, Layers, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { PatchListSortMode } from "@/stores/useMapLayersWindowStore";
import { cn } from "@/lib/utils";

interface MapPatchesToolbarProps {
  busy?: boolean;
  sortMode: PatchListSortMode;
  showInactiveAtT: boolean;
  combinedActive: boolean;
  showCombineButton: boolean;
  onCreate: () => void;
  onToggleInactive: () => void;
  onCycleSort: () => void;
  onToggleCombine: () => void;
}

export function MapPatchesToolbar({
  busy = false,
  sortMode,
  showInactiveAtT,
  combinedActive,
  showCombineButton,
  onCreate,
  onToggleInactive,
  onCycleSort,
  onToggleCombine,
}: MapPatchesToolbarProps) {
  const { t } = useTranslation("maps");

  const sortTitle =
    sortMode === "baseFirst"
      ? t("layersWindow.patches.sortBase")
      : sortMode === "chrono"
        ? t("layersWindow.patches.sortChrono")
        : t("layersWindow.patches.sortManual");

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-2 py-1.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
        disabled={busy}
        title={t("secondary.add")}
        aria-label={t("secondary.add")}
        onClick={onCreate}
      >
        <Plus className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={showInactiveAtT ? "secondary" : "ghost"}
        className={cn(
          "size-7",
          showInactiveAtT
            ? "border border-violet-500/40 text-violet-700 dark:text-violet-300"
            : "text-violet-600 hover:bg-violet-500/10 hover:text-violet-600 dark:text-violet-400",
        )}
        disabled={busy}
        title={t("layersWindow.patches.showInactive")}
        aria-label={t("layersWindow.patches.showInactive")}
        aria-pressed={showInactiveAtT}
        onClick={onToggleInactive}
      >
        <EyeOff className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={sortMode !== "manual" ? "secondary" : "ghost"}
        className={cn(
          "size-7",
          sortMode !== "manual"
            ? "border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            : "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400",
        )}
        disabled={busy}
        title={sortTitle}
        aria-label={sortTitle}
        onClick={onCycleSort}
      >
        <ArrowDownUp className="size-4" />
      </Button>
      {showCombineButton ? (
        <Button
          type="button"
          size="icon"
          variant={combinedActive ? "secondary" : "ghost"}
          className={cn(
            "ml-auto size-7",
            combinedActive
              ? "border border-sky-500/40 text-sky-700 dark:text-sky-300"
              : "text-sky-600 hover:bg-sky-500/10 hover:text-sky-600 dark:text-sky-400",
          )}
          disabled={busy}
          title={t("layersWindow.patches.combine")}
          aria-label={t("layersWindow.patches.combine")}
          aria-pressed={combinedActive}
          onClick={onToggleCombine}
        >
          <Layers className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
