import { Plus, Trash2 } from "lucide-react";
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
import type { MapDrawingRef, MapNavSummaryV1 } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

import { CreateNavDialog } from "./CreateNavDialog";

interface MapNavDrawingsPanelProps {
  mapId: string;
  navDrawings: MapNavSummaryV1[];
  activeDrawingRef: MapDrawingRef;
  busy?: boolean;
  onSelectDrawing: (ref: MapDrawingRef) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (navId: string) => Promise<void>;
  embedded?: boolean;
}

export function MapNavDrawingsPanel({
  mapId,
  navDrawings,
  activeDrawingRef,
  busy = false,
  onSelectDrawing,
  onCreate,
  onDelete,
  embedded = false,
}: MapNavDrawingsPanelProps) {
  const { t } = useTranslation("maps");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MapNavSummaryV1 | null>(null);

  return (
    <section
      className={cn(
        "flex flex-col bg-background",
        embedded ? "min-h-0 flex-1" : "shrink-0 border-b border-border/60",
      )}
      aria-label={t("nav.panelAria", { mapId })}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        {!embedded ? (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nav.panelTitle")}
          </h2>
        ) : (
          <span className="sr-only">{t("nav.panelTitle")}</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={busy}
          title={t("nav.add")}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="overflow-y-auto p-2">
        {navDrawings.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{t("nav.empty")}</p>
        ) : null}
        {navDrawings.map((item) => {
          const isActive = activeDrawingRef.kind === "nav" && activeDrawingRef.id === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "mb-1 rounded-md border border-transparent",
                isActive ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <button
                type="button"
                className="flex w-full flex-col px-2 py-2 text-left text-xs"
                onClick={() => onSelectDrawing({ kind: "nav", id: item.id })}
              >
                <span className="font-medium">{item.name}</span>
                <span className="truncate text-muted-foreground">{item.id}</span>
              </button>
              <div className="flex justify-end gap-1 px-2 pb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  title={t("nav.delete")}
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateNavDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        busy={busy}
        onCreate={onCreate}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("nav.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("nav.deleteMessage", { name: deleteTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("nav.cancel")}
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
              {t("nav.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
