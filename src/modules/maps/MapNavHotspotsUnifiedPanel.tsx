import { Map as MapZoneIcon, Pencil, SquareDashedMousePointer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { hotspotShapeAabb } from "@/lib/maps/mapHotspotShape";
import type { MapHotspotV2, MapNavSummaryV1 } from "@/lib/types/maps";
import { useMapHotspotDrawStore } from "@/stores/useMapHotspotDrawStore";
import { cn } from "@/lib/utils";

import { MapHotspotToolPicker } from "./MapHotspotToolPicker";

interface MapNavHotspotsUnifiedPanelProps {
  mapId: string;
  navDrawings: MapNavSummaryV1[];
  hotspots: MapHotspotV2[];
  openEditNavIds: string[];
  editingHotspotId: string | null;
  drawMode: boolean;
  busy?: boolean;
  embedded?: boolean;
  onOpenEditWindow: (navId: string) => void;
  onStartEditZone: (hotspotId: string) => void;
  onDeleteNav: (navId: string) => Promise<void>;
  onToggleDrawMode: (active: boolean) => void;
  onDeleteHotspot: (hotspotId: string) => Promise<void>;
}

function shapeKindLabelKey(shapeKind: MapHotspotV2["shape"]["kind"]): string {
  if (shapeKind === "polygon") return "layersWindow.nav.shapePolygon";
  if (shapeKind === "circle") return "layersWindow.nav.shapeCircle";
  return "layersWindow.nav.shapeRect";
}

export function MapNavHotspotsUnifiedPanel({
  mapId,
  navDrawings,
  hotspots,
  openEditNavIds,
  editingHotspotId,
  drawMode,
  busy = false,
  embedded = false,
  onOpenEditWindow,
  onStartEditZone,
  onDeleteNav,
  onToggleDrawMode,
  onDeleteHotspot,
}: MapNavHotspotsUnifiedPanelProps) {
  const { t } = useTranslation("maps");
  const hotspotDrawTool = useMapHotspotDrawStore((s) => s.tool);
  const [deleteNavTarget, setDeleteNavTarget] = useState<MapNavSummaryV1 | null>(null);
  const [deleteHotspotTarget, setDeleteHotspotTarget] = useState<MapHotspotV2 | null>(null);

  const hotspotsByNavId = useMemo(() => {
    const map = new Map<string, MapHotspotV2[]>();
    for (const hotspot of hotspots) {
      const list = map.get(hotspot.targetNavId) ?? [];
      list.push(hotspot);
      map.set(hotspot.targetNavId, list);
    }
    return map;
  }, [hotspots]);

  const orphanHotspots = useMemo(
    () => hotspots.filter((item) => !navDrawings.some((nav) => nav.id === item.targetNavId)),
    [hotspots, navDrawings],
  );

  return (
    <section
      className={cn("flex min-h-0 flex-1 flex-col bg-background", embedded && "h-full")}
      aria-label={t("layersWindow.nav.panelAria", { mapId })}
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-border/60 px-2 py-1.5">
        <MapHotspotToolPicker disabled={busy || Boolean(editingHotspotId)} />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={drawMode && !editingHotspotId ? "default" : "ghost"}
            size="icon"
            className="size-7"
            disabled={busy || Boolean(editingHotspotId)}
            title={t("hotspot.drawZone")}
            aria-label={t("hotspot.drawZone")}
            aria-pressed={drawMode && !editingHotspotId}
            onClick={() => onToggleDrawMode(!drawMode)}
          >
            <SquareDashedMousePointer className="size-4" />
          </Button>
        </div>
      </div>

      <p className="shrink-0 border-b border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
        {editingHotspotId
          ? t("hotspot.zoneEdit.panelHint")
          : drawMode
            ? hotspotDrawTool === "lasso"
              ? t("hotspot.lasso.drawHint")
              : hotspotDrawTool === "circle"
                ? t("hotspot.circle.drawHint")
                : t("hotspot.drawHint")
            : t("layersWindow.nav.hint")}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {navDrawings.length === 0 && orphanHotspots.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{t("layersWindow.nav.empty")}</p>
        ) : null}

        {navDrawings.map((item) => {
          const isEditWindowOpen = openEditNavIds.includes(item.id);
          const linkedHotspots = hotspotsByNavId.get(item.id) ?? [];
          const primaryHotspot = linkedHotspots[0] ?? null;
          const isEditingZone = primaryHotspot?.id === editingHotspotId;
          return (
            <div
              key={item.id}
              className={cn(
                "mb-1 rounded-md border transition-colors",
                isEditWindowOpen || isEditingZone
                  ? "border-primary/40 bg-muted"
                  : "border-transparent hover:bg-muted/60",
              )}
            >
              <div className="flex w-full flex-col px-2 py-2 text-left text-xs">
                <span className="font-medium">{item.name}</span>
                {primaryHotspot ? (
                  <span className="text-muted-foreground">
                    {t("layersWindow.nav.zoneSummary", {
                      label: t(shapeKindLabelKey(primaryHotspot.shape.kind)),
                      width: Math.round(hotspotShapeAabb(primaryHotspot.shape).width),
                      height: Math.round(hotspotShapeAabb(primaryHotspot.shape).height),
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("layersWindow.nav.noZone")}</span>
                )}
                {isEditWindowOpen ? (
                  <span className="text-[10px] text-primary">{t("layersWindow.nav.windowOpen")}</span>
                ) : null}
              </div>
              <div className="flex justify-end gap-1 px-2 pb-2">
                <Button
                  type="button"
                  variant={isEditWindowOpen ? "secondary" : "ghost"}
                  size="icon"
                  className="size-7"
                  disabled={busy}
                  title={t("layersWindow.nav.editDrawing")}
                  aria-label={t("layersWindow.nav.editDrawing")}
                  onClick={() => onOpenEditWindow(item.id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                {primaryHotspot ? (
                  <Button
                    type="button"
                    variant={isEditingZone ? "secondary" : "ghost"}
                    size="icon"
                    className="size-7"
                    disabled={busy}
                    title={t("layersWindow.nav.editZone")}
                    aria-label={t("layersWindow.nav.editZone")}
                    onClick={() => onStartEditZone(primaryHotspot.id)}
                  >
                    <MapZoneIcon className="size-3.5" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  title={t("layersWindow.nav.deletePair")}
                  onClick={() => setDeleteNavTarget(item)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {orphanHotspots.map((hotspot) => (
          <div
            key={hotspot.id}
            className="mb-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-2 text-xs"
          >
            <span className="font-medium">{hotspot.label ?? hotspot.id}</span>
            <p className="text-muted-foreground">{t("layersWindow.nav.orphanHotspot")}</p>
            <div className="mt-1 flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                title={t("layersWindow.nav.editZone")}
                onClick={() => onStartEditZone(hotspot.id)}
              >
                <MapZoneIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                title={t("hotspot.delete")}
                onClick={() => setDeleteHotspotTarget(hotspot)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(deleteNavTarget)}
        onOpenChange={(open) => !open && setDeleteNavTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("nav.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("layersWindow.nav.deletePairMessage", { name: deleteNavTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteNavTarget(null)}>
              {t("nav.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!deleteNavTarget) return;
                await onDeleteNav(deleteNavTarget.id);
                setDeleteNavTarget(null);
              }}
            >
              {t("nav.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteHotspotTarget)}
        onOpenChange={(open) => !open && setDeleteHotspotTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("hotspot.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("hotspot.deleteMessage", {
                name: deleteHotspotTarget?.label ?? deleteHotspotTarget?.id ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteHotspotTarget(null)}>
              {t("hotspot.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!deleteHotspotTarget) return;
                await onDeleteHotspot(deleteHotspotTarget.id);
                setDeleteHotspotTarget(null);
              }}
            >
              {t("hotspot.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
