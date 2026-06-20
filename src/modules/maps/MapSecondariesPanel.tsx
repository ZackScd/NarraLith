import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import { isSecondaryVisibleAtT } from "@/lib/maps/mapSecondaryVisibility";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapDrawingRef, MapSecondarySummaryV1 } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

import { CreateSecondaryDialog } from "./CreateSecondaryDialog";
import { MapSecondaryMetaDialog } from "./MapSecondaryMetaDialog";

interface MapSecondariesPanelProps {
  mapId: string;
  mapDesde: string | null;
  defaultTiempoInicio: string | null;
  calendar: CalendarConfig | null;
  secondaries: MapSecondarySummaryV1[];
  previewT: string | null;
  activeDrawingRef: MapDrawingRef;
  busy?: boolean;
  embedded?: boolean;
  onSelectDrawing: (ref: MapDrawingRef) => void;
  onCreate: (draft: {
    name: string;
    tiempoInicio: string;
    tiempoFin?: string | null;
  }) => Promise<void>;
  onUpdateMeta: (
    secondaryId: string,
    patch: { name: string; tiempoInicio: string; tiempoFin?: string | null },
  ) => Promise<void>;
  onDelete: (secondaryId: string) => Promise<void>;
}

export function MapSecondariesPanel({
  mapId,
  mapDesde,
  defaultTiempoInicio,
  calendar,
  secondaries,
  previewT,
  activeDrawingRef,
  busy = false,
  onSelectDrawing,
  onCreate,
  onUpdateMeta,
  onDelete,
  embedded = false,
}: MapSecondariesPanelProps) {
  const { t } = useTranslation("maps");
  const [createOpen, setCreateOpen] = useState(false);
  const [metaTarget, setMetaTarget] = useState<MapSecondarySummaryV1 | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MapSecondarySummaryV1 | null>(null);

  const isPrincipalActive = activeDrawingRef.kind === "principal";
  const previewActive = Boolean(previewT && calendar);

  const isVisibleAtPreviewT = (item: MapSecondarySummaryV1) => {
    if (!previewActive || !previewT) return false;
    return isSecondaryVisibleAtT(item, mapDesde, previewT, calendar!);
  };

  const principalVisibleAtT =
    previewActive && secondaries.every((item) => !isVisibleAtPreviewT(item));

  const formatRange = (item: MapSecondarySummaryV1) => {
    const start = formatMapDesdeDisplay(item.tiempoInicio, calendar);
    const end = item.tiempoFin ? formatMapDesdeDisplay(item.tiempoFin, calendar) : null;
    if (start && end) {
      return t("secondary.dateRange", { start, end });
    }
    return start ?? item.tiempoInicio;
  };

  return (
    <section
      className={cn(
        "flex flex-col bg-background",
        embedded ? "min-h-0 flex-1" : "shrink-0 border-b border-border/60",
      )}
      aria-label={t("secondary.panelAria", { mapId })}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        {!embedded ? (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("secondary.panelTitle")}
          </h2>
        ) : (
          <span className="sr-only">{t("secondary.panelTitle")}</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={busy}
          title={t("secondary.add")}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="overflow-y-auto p-2">
        <button
          type="button"
          className={cn(
            "mb-1 flex w-full flex-col rounded-md border px-2 py-2 text-left text-xs transition-colors",
            isPrincipalActive ? "border-primary/40 bg-muted" : "border-transparent hover:bg-muted/60",
            principalVisibleAtT && !isPrincipalActive && "border-emerald-500/40 opacity-100",
          )}
          onClick={() => onSelectDrawing({ kind: "principal" })}
        >
          <span className="flex items-center gap-2 font-medium">
            {t("principal.badge")}
            {principalVisibleAtT ? (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {t("secondary.visibleAtT")}
              </span>
            ) : null}
          </span>
          <span className="text-muted-foreground">{t("secondary.principalHint")}</span>
        </button>

        {secondaries.map((item) => {
          const isActive =
            activeDrawingRef.kind === "secondary" && activeDrawingRef.id === item.id;
          const visibleAtT = isVisibleAtPreviewT(item);
          return (
            <div
              key={item.id}
              className={cn(
                "mb-1 rounded-md border transition-colors",
                isActive ? "border-primary/40 bg-muted" : "border-transparent hover:bg-muted/60",
                previewActive && visibleAtT && "border-emerald-500/40",
                previewActive && !visibleAtT && "opacity-45",
              )}
            >
              <button
                type="button"
                className="flex w-full flex-col px-2 py-2 text-left text-xs"
                onClick={() => onSelectDrawing({ kind: "secondary", id: item.id })}
              >
                <span className="flex items-center gap-2 font-medium">
                  {item.name}
                  {previewActive && visibleAtT ? (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {t("secondary.visibleAtT")}
                    </span>
                  ) : previewActive ? (
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      {t("secondary.hiddenAtT")}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">{formatRange(item)}</span>
              </button>
              <div className="flex justify-end gap-1 px-2 pb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title={t("secondary.editMeta")}
                  onClick={() => setMetaTarget(item)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  title={t("secondary.delete")}
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateSecondaryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        calendar={calendar}
        defaultTiempoInicio={defaultTiempoInicio}
        mapDesde={mapDesde}
        busy={busy}
        onCreate={onCreate}
      />

      <MapSecondaryMetaDialog
        open={Boolean(metaTarget)}
        onOpenChange={(open) => {
          if (!open) setMetaTarget(null);
        }}
        secondary={metaTarget}
        calendar={calendar}
        busy={busy}
        onSave={async (patch) => {
          if (!metaTarget) return;
          await onUpdateMeta(metaTarget.id, patch);
          setMetaTarget(null);
        }}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("secondary.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("secondary.deleteMessage", { name: deleteTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("secondary.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!deleteTarget) return;
                await onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {t("secondary.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
