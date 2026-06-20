import { Plus, SquareDashedMousePointer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MapHotspotBoundsV1, MapHotspotV1, MapNavSummaryV1 } from "@/lib/types/maps";

import { CreateNavDialog } from "./CreateNavDialog";

interface MapHotspotsPanelProps {
  mapId: string;
  hotspots: MapHotspotV1[];
  drawMode: boolean;
  busy?: boolean;
  onToggleDrawMode: (active: boolean) => void;
  onDeleteHotspot: (hotspotId: string) => Promise<void>;
}

export function MapHotspotsPanel({
  mapId,
  hotspots,
  drawMode,
  busy = false,
  onToggleDrawMode,
  onDeleteHotspot,
}: MapHotspotsPanelProps) {
  const { t } = useTranslation("maps");
  const [deleteTarget, setDeleteTarget] = useState<MapHotspotV1 | null>(null);

  return (
    <section
      className="flex shrink-0 flex-col bg-background"
      aria-label={t("hotspot.panelAria", { mapId })}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("hotspot.panelTitle")}
        </h2>
        <Button
          type="button"
          variant={drawMode ? "default" : "ghost"}
          size="icon"
          className="size-7"
          disabled={busy}
          title={t("hotspot.drawZone")}
          onClick={() => onToggleDrawMode(!drawMode)}
        >
          <SquareDashedMousePointer className="size-4" />
        </Button>
      </div>

      {drawMode ? (
        <p className="border-b border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
          {t("hotspot.drawHint")}
        </p>
      ) : null}

      <div className="overflow-y-auto p-2">
        {hotspots.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{t("hotspot.empty")}</p>
        ) : null}
        {hotspots.map((item) => (
          <div
            key={item.id}
            className="mb-1 rounded-md border border-transparent hover:bg-muted/60"
          >
            <div className="flex flex-col px-2 py-2 text-xs">
              <span className="font-medium">{item.label ?? item.id}</span>
              <span className="text-muted-foreground">{item.targetNavId}</span>
              <span className="text-muted-foreground">
                {Math.round(item.bounds.width)}×{Math.round(item.bounds.height)}
              </span>
            </div>
            <div className="flex justify-end gap-1 px-2 pb-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                title={t("hotspot.delete")}
                onClick={() => setDeleteTarget(item)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("hotspot.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("hotspot.deleteMessage", { name: deleteTarget?.label ?? deleteTarget?.id ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("hotspot.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!deleteTarget) return;
                await onDeleteHotspot(deleteTarget.id);
                setDeleteTarget(null);
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

export function HotspotTargetDialog({
  open,
  bounds,
  navDrawings,
  busy,
  onOpenChange,
  onConfirm,
  onCreateNav,
}: {
  open: boolean;
  bounds: MapHotspotBoundsV1 | null;
  navDrawings: MapNavSummaryV1[];
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (draft: {
    bounds: MapHotspotBoundsV1;
    targetNavId: string;
    label?: string;
  }) => Promise<void>;
  onCreateNav: (name: string) => Promise<MapNavSummaryV1 | null>;
}) {
  const { t } = useTranslation("maps");
  const [targetNavId, setTargetNavId] = useState(navDrawings[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [createNavOpen, setCreateNavOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTargetNavId(navDrawings[0]?.id ?? "");
    setLabel("");
  }, [open, navDrawings]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("hotspot.targetTitle")}</DialogTitle>
            <DialogDescription>
              {bounds
                ? t("hotspot.targetDescription", {
                    width: Math.round(bounds.width),
                    height: Math.round(bounds.height),
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="hotspot-target">{t("hotspot.targetLabel")}</Label>
              <select
                id="hotspot-target"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={targetNavId}
                disabled={busy || navDrawings.length === 0}
                onChange={(event) => setTargetNavId(event.target.value)}
              >
                {navDrawings.length === 0 ? (
                  <option value="">{t("hotspot.noNavDrawings")}</option>
                ) : (
                  navDrawings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hotspot-label">{t("hotspot.labelOptional")}</Label>
              <Input
                id="hotspot-label"
                value={label}
                disabled={busy}
                placeholder={t("hotspot.labelPlaceholder")}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setCreateNavOpen(true)}
            >
              <Plus className="size-4" />
              {t("hotspot.createNavInline")}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("hotspot.cancel")}
            </Button>
            <Button
              type="button"
              disabled={busy || !bounds || !targetNavId}
              onClick={async () => {
                if (!bounds || !targetNavId) return;
                await onConfirm({
                  bounds,
                  targetNavId,
                  label: label.trim() || undefined,
                });
                onOpenChange(false);
              }}
            >
              {t("hotspot.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateNavDialog
        open={createNavOpen}
        onOpenChange={setCreateNavOpen}
        busy={busy}
        onCreate={async (name) => {
          const created = await onCreateNav(name);
          if (created) {
            setTargetNavId(created.id);
          }
        }}
      />
    </>
  );
}
