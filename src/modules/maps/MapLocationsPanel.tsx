import { MapPin, Move, Trash2, X } from "lucide-react";
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
import type { MapLocationPinV1, ProjectLocationOccurrenceV1 } from "@/lib/types/mapLocations";
import { cn } from "@/lib/utils";

interface MapLocationsPanelProps {
  mapId: string;
  previewT: string | null;
  occurrencesAtT: ProjectLocationOccurrenceV1[];
  unpinnedAtT: ProjectLocationOccurrenceV1[];
  pins: MapLocationPinV1[];
  placementTarget: ProjectLocationOccurrenceV1 | null;
  movePinId: string | null;
  busy?: boolean;
  onStartPlacement: (occurrence: ProjectLocationOccurrenceV1) => void;
  onCancelPlacement: () => void;
  onStartMove: (pinId: string) => void;
  onCancelMove: () => void;
  onDeletePin: (pinId: string) => Promise<void>;
  embedded?: boolean;
}

export function MapLocationsPanel({
  mapId,
  previewT,
  occurrencesAtT,
  unpinnedAtT,
  pins,
  placementTarget,
  movePinId,
  busy = false,
  onStartPlacement,
  onCancelPlacement,
  onStartMove,
  onCancelMove,
  onDeletePin,
  embedded = false,
}: MapLocationsPanelProps) {
  const { t } = useTranslation("maps");
  const [deleteTarget, setDeleteTarget] = useState<MapLocationPinV1 | null>(null);
  const pinModeActive = Boolean(placementTarget || movePinId);

  return (
    <section
      className={cn("flex flex-col bg-background", embedded && "min-h-0 flex-1")}
      aria-label={t("location.panelAria", { mapId })}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        {!embedded ? (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("location.panelTitle")}
          </h2>
        ) : (
          <span className="sr-only">{t("location.panelTitle")}</span>
        )}
        {pinModeActive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={busy}
            title={t("location.cancelPlacement")}
            onClick={() => {
              onCancelPlacement();
              onCancelMove();
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <p className="border-b border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
        {t("location.hint")}
      </p>
      <p className="border-b border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
        {t("location.extractionHint")}
      </p>

      {pinModeActive ? (
        <p className="border-b border-border/40 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
          {placementTarget
            ? t("location.placeHint", { label: placementTarget.label })
            : t("location.moveHint")}
        </p>
      ) : null}

      <div className="overflow-y-auto p-2">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("location.atT", { time: previewT ?? t("location.noTime") })}
        </p>
        {occurrencesAtT.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">{t("location.emptyAtT")}</p>
        ) : null}

        {occurrencesAtT.map((item) => {
          const pin = pins.find((entry) => entry.locationKey === item.locationKey);
          return (
            <div
              key={item.id}
              className="mb-1 rounded-md border border-transparent hover:bg-muted/60"
            >
              <div className="flex flex-col px-2 py-2 text-xs">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">{item.effectiveTimeRaw}</span>
                {pin ? (
                  <span className="text-muted-foreground">
                    {Math.round(pin.x)}, {Math.round(pin.y)}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">
                    {t("location.unpinned")}
                  </span>
                )}
              </div>
              <div className="flex justify-end gap-1 px-2 pb-2">
                {pin ? (
                  <>
                    <Button
                      type="button"
                      variant={movePinId === pin.id ? "default" : "ghost"}
                      size="icon"
                      className="size-7"
                      disabled={busy || Boolean(placementTarget)}
                      title={t("location.movePin")}
                      onClick={() => {
                        if (movePinId === pin.id) {
                          onCancelMove();
                        } else {
                          onStartMove(pin.id);
                        }
                      }}
                    >
                      <Move className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      disabled={busy || pinModeActive}
                      title={t("location.deletePin")}
                      onClick={() => setDeleteTarget(pin)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant={placementTarget?.locationKey === item.locationKey ? "default" : "ghost"}
                    size="icon"
                    className="size-7"
                    disabled={busy || Boolean(movePinId)}
                    title={t("location.placePin")}
                    onClick={() => {
                      if (placementTarget?.locationKey === item.locationKey) {
                        onCancelPlacement();
                      } else {
                        onStartPlacement(item);
                      }
                    }}
                  >
                    <MapPin className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {unpinnedAtT.length > 0 ? (
          <>
            <p className="mt-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              {t("location.unpinnedSection", { count: unpinnedAtT.length })}
            </p>
            {unpinnedAtT.map((item) => (
              <div
                key={`unpinned-${item.locationKey}`}
                className="mb-1 rounded-md border border-amber-500/30 bg-amber-500/5"
              >
                <div className="flex items-center justify-between gap-2 px-2 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.effectiveTimeRaw}</span>
                  </div>
                  <Button
                    type="button"
                    variant={placementTarget?.locationKey === item.locationKey ? "default" : "outline"}
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-[11px]"
                    disabled={busy || Boolean(movePinId)}
                    onClick={() => {
                      if (placementTarget?.locationKey === item.locationKey) {
                        onCancelPlacement();
                      } else {
                        onStartPlacement(item);
                      }
                    }}
                  >
                    <MapPin className="size-3" />
                    {t("location.placePin")}
                  </Button>
                </div>
              </div>
            ))}
          </>
        ) : null}

        {pins.length > 0 ? (
          <>
            <p className="mt-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("location.pinsTitle")}
            </p>
            {pins.map((pin) => (
              <div key={pin.id} className="mb-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{pin.label ?? pin.locationKey}</span>
                <span className="ml-2">
                  {Math.round(pin.x)}, {Math.round(pin.y)}
                </span>
              </div>
            ))}
          </>
        ) : null}
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("location.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("location.deleteMessage", {
                name: deleteTarget?.label ?? deleteTarget?.locationKey ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("location.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!deleteTarget) return;
                await onDeletePin(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {t("location.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
