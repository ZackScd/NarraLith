import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Plus,
  Trash2,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  countLayerStrokes,
  layerArrayIndex,
  layersForPanel,
} from "@/lib/maps/mapDrawingSession";
import type { MapDrawingV2 } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

interface MapLayersPanelProps {
  mapId: string;
  drawing: MapDrawingV2;
  activeLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onCreateLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onPatchLayer: (
    layerId: string,
    patch: Partial<{
      name: string;
      visible: boolean;
      opacity: number;
      locked: boolean;
    }>,
    obsAction?: "layerVisible" | "layerOpacity" | "layerLock" | "layerRename",
  ) => void;
  onReorderLayer: (layerId: string, direction: "front" | "back") => void;
}

export function MapLayersPanel({
  mapId,
  drawing,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onDeleteLayer,
  onPatchLayer,
  onReorderLayer,
}: MapLayersPanelProps) {
  const { t } = useTranslation("maps");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; strokeCount: number } | null>(
    null,
  );
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const panelLayers = useMemo(() => layersForPanel(drawing), [drawing]);

  const beginRename = useCallback((layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingName(currentName);
  }, []);

  const commitRename = useCallback(
    (layerId: string) => {
      const trimmed = editingName.trim();
      if (trimmed.length > 0) {
        onPatchLayer(layerId, { name: trimmed }, "layerRename");
      }
      setEditingLayerId(null);
      setEditingName("");
    },
    [editingName, onPatchLayer],
  );

  const requestDelete = useCallback(
    (layerId: string) => {
      const layer = drawing.layers.find((item) => item.id === layerId);
      if (!layer) return;
      const strokeCount = countLayerStrokes(layer);
      if (strokeCount === 0) {
        onDeleteLayer(layerId);
        return;
      }
      setDeleteTarget({ id: layerId, strokeCount });
    },
    [drawing.layers, onDeleteLayer],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    onDeleteLayer(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, onDeleteLayer]);

  return (
    <aside
      className="flex w-64 shrink-0 flex-col border-l border-border/60 bg-muted/10"
      aria-label={t("studio.layers.panelAria", { mapId })}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("studio.layers.title")}
        </h2>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7"
          title={t("studio.layers.add")}
          aria-label={t("studio.layers.add")}
          onClick={onCreateLayer}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {panelLayers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const stackIndex = layerArrayIndex(drawing, layer.id);
          const canMoveFront = stackIndex < drawing.layers.length - 1;
          const canMoveBack = stackIndex > 0;
          const strokeCount = countLayerStrokes(layer);

          return (
            <li
              key={layer.id}
              aria-selected={isActive}
              className={cn(
                "rounded-md border px-2 py-2 transition-colors",
                isActive
                  ? "border-primary/60 bg-muted shadow-sm ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "border-border/50 bg-background/80 hover:bg-muted/40",
              )}
            >
              <button
                type="button"
                className={cn(
                  "mb-2 w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive && "font-medium",
                )}
                aria-current={isActive ? "true" : undefined}
                onClick={() => onSelectLayer(layer.id)}
              >
                {editingLayerId === layer.id ? (
                  <input
                    className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                    value={editingName}
                    autoFocus
                    onChange={(event) => setEditingName(event.target.value)}
                    onBlur={() => commitRename(layer.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitRename(layer.id);
                      }
                      if (event.key === "Escape") {
                        setEditingLayerId(null);
                      }
                    }}
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : (
                  <>
                    <span
                      className="block truncate text-xs font-medium"
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        beginRename(layer.id, layer.name);
                      }}
                    >
                      {layer.name}
                    </span>
                    {isActive ? (
                      <span className="text-[10px] font-medium text-primary">
                        {t("studio.layers.active")}
                      </span>
                    ) : null}
                  </>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {t("studio.layers.strokeCount", { count: strokeCount })}
                </span>
              </button>

              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  title={
                    layer.visible ? t("studio.layers.hide") : t("studio.layers.show")
                  }
                  aria-pressed={layer.visible}
                  onClick={() =>
                    onPatchLayer(layer.id, { visible: !layer.visible }, "layerVisible")
                  }
                >
                  {layer.visible ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  title={layer.locked ? t("studio.layers.unlock") : t("studio.layers.lock")}
                  aria-pressed={layer.locked}
                  onClick={() =>
                    onPatchLayer(layer.id, { locked: !layer.locked }, "layerLock")
                  }
                >
                  {layer.locked ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <LockOpen className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={!canMoveFront}
                  title={t("studio.layers.moveUp")}
                  onClick={() => onReorderLayer(layer.id, "front")}
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={!canMoveBack}
                  title={t("studio.layers.moveDown")}
                  onClick={() => onReorderLayer(layer.id, "back")}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive"
                  disabled={drawing.layers.length <= 1}
                  title={t("studio.layers.delete")}
                  onClick={() => requestDelete(layer.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="mt-2 space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  {t("studio.layers.opacityLabel")}
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  className="h-1.5 w-full accent-primary"
                  onChange={(event) =>
                    onPatchLayer(
                      layer.id,
                      { opacity: Number(event.target.value) / 100 },
                      "layerOpacity",
                    )
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("studio.layers.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("studio.layers.deleteMessage", { count: deleteTarget?.strokeCount ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("studio.layers.deleteCancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              {t("studio.layers.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
