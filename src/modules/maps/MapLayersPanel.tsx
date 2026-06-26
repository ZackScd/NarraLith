import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Folder,
  FolderPlus,
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
import {
  countLayerStrokes,
  MAP_DRAWING_DEFAULT_BACKGROUND,
} from "@/lib/maps/mapDrawingSession";
import { isImageLayer } from "@/lib/maps/mapImageLayers";
import {
  buildLayerPanelRows,
  panelRowDragId,
  type LayerGroupPatch,
} from "@/lib/maps/mapLayerGroups";
import type { MapDrawingLayerGroupV2, MapDrawingLayerV2, MapDrawingV2 } from "@/lib/types/maps";
import { cn } from "@/lib/utils";
import { MapLayerThumbnail } from "@/modules/maps/MapLayerThumbnail";
import { MapLayerVerticalOpacity } from "@/modules/maps/MapLayerVerticalOpacity";
import {
  MapLayerDragHandle,
  MapLayerDropRow,
  MapLayerListDnDProvider,
} from "@/modules/maps/mapLayerListDnD";

interface MapLayersPanelProps {
  mapId: string;
  drawing: MapDrawingV2;
  activeLayerId: string | null;
  embedded?: boolean;
  onSelectLayer: (layerId: string) => void;
  onCreateLayer: () => void;
  onCreateGroup: () => { groupId: string; name: string } | null;
  onDeleteLayer: (layerId: string) => void;
  onDeleteGroup: (groupId: string) => void;
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
  onPatchGroup: (groupId: string, patch: LayerGroupPatch) => void;
  onReorderPanelRow: (fromDragId: string, toDragId: string) => void;
  onPatchBackground: (backgroundColor: string | null) => void;
  onImportImageLayer?: () => void | Promise<void | boolean>;
}

export function MapLayersPanel({
  mapId,
  drawing,
  activeLayerId,
  onSelectLayer,
  onCreateLayer,
  onCreateGroup,
  onDeleteLayer,
  onDeleteGroup,
  onPatchLayer,
  onPatchGroup,
  onReorderPanelRow,
  onPatchBackground,
  onImportImageLayer,
  embedded = false,
}: MapLayersPanelProps) {
  const { t } = useTranslation("maps");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; strokeCount: number } | null>(
    null,
  );
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const panelRows = useMemo(() => buildLayerPanelRows(drawing), [drawing]);
  const backgroundVisible = drawing.backgroundColor != null;
  const backgroundColor = drawing.backgroundColor ?? MAP_DRAWING_DEFAULT_BACKGROUND;

  const beginLayerRename = useCallback((layerId: string, currentName: string) => {
    setEditingGroupId(null);
    setEditingLayerId(layerId);
    setEditingName(currentName);
  }, []);

  const beginGroupRename = useCallback((groupId: string, currentName: string) => {
    setEditingLayerId(null);
    setEditingGroupId(groupId);
    setEditingName(currentName);
  }, []);

  const handleCreateGroup = useCallback(() => {
    const created = onCreateGroup();
    if (!created) return;
    beginGroupRename(created.groupId, created.name);
  }, [beginGroupRename, onCreateGroup]);

  const commitLayerRename = useCallback(
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

  const commitGroupRename = useCallback(
    (groupId: string) => {
      const trimmed = editingName.trim();
      if (trimmed.length > 0) {
        onPatchGroup(groupId, { name: trimmed });
      }
      setEditingGroupId(null);
      setEditingName("");
    },
    [editingName, onPatchGroup],
  );

  const confirmDeleteLayer = useCallback(() => {
    if (!deleteTarget) return;
    onDeleteLayer(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, onDeleteLayer]);

  const requestDeleteLayer = useCallback(
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

  const renderLayerRow = (
    layer: MapDrawingLayerV2,
    dragId: string,
    nested = false,
  ) => {
    const isActive = layer.id === activeLayerId;

    return (
      <MapLayerDropRow key={dragId} dragId={dragId}>
        <li
          aria-selected={isActive}
          className={cn(
            "flex items-center gap-1 rounded-md border px-1 py-1 transition-colors",
            nested && "ml-3",
            isActive
              ? "border-primary/50 bg-muted/80 ring-1 ring-primary/30"
              : "border-transparent bg-background/60 hover:bg-muted/40",
          )}
        >
          <div className="flex shrink-0 flex-col gap-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              title={layer.visible ? t("studio.layers.hide") : t("studio.layers.show")}
              aria-pressed={layer.visible}
              onClick={(event) => {
                event.stopPropagation();
                onPatchLayer(layer.id, { visible: !layer.visible }, "layerVisible");
              }}
            >
              {layer.visible ? (
                <Eye className="size-3" />
              ) : (
                <EyeOff className="size-3 text-muted-foreground" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              title={layer.locked ? t("studio.layers.unlock") : t("studio.layers.lock")}
              aria-pressed={layer.locked}
              onClick={(event) => {
                event.stopPropagation();
                onPatchLayer(layer.id, { locked: !layer.locked }, "layerLock");
              }}
            >
              {layer.locked ? (
                <Lock className="size-3" />
              ) : (
                <LockOpen className="size-3 text-muted-foreground" />
              )}
            </Button>
          </div>

          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-current={isActive ? "true" : undefined}
            onClick={() => onSelectLayer(layer.id)}
            onDoubleClick={(event) => {
              event.preventDefault();
              beginLayerRename(layer.id, layer.name);
            }}
          >
            {isImageLayer(layer) ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded border border-border/50 bg-muted/40">
                <ImageIcon className="size-3.5 text-muted-foreground" />
              </span>
            ) : (
              <MapLayerThumbnail layer={layer} />
            )}
            {editingLayerId === layer.id ? (
              <input
                className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1.5 text-xs"
                value={editingName}
                autoFocus
                onChange={(event) => setEditingName(event.target.value)}
                onBlur={() => commitLayerRename(layer.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitLayerRename(layer.id);
                  if (event.key === "Escape") setEditingLayerId(null);
                }}
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-xs",
                  isActive && "font-medium text-primary",
                )}
              >
                {layer.name}
              </span>
            )}
          </button>

          <MapLayerVerticalOpacity
            value={layer.opacity}
            onChange={(opacity) => onPatchLayer(layer.id, { opacity }, "layerOpacity")}
          />

          <MapLayerDragHandle dragId={dragId} />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 text-destructive/80 hover:text-destructive"
            disabled={drawing.layers.length <= 1}
            title={t("studio.layers.delete")}
            aria-label={t("studio.layers.delete")}
            onClick={(event) => {
              event.stopPropagation();
              requestDeleteLayer(layer.id);
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </li>
      </MapLayerDropRow>
    );
  };

  const renderGroupRow = (group: MapDrawingLayerGroupV2, dragId: string, memberCount: number) => (
    <MapLayerDropRow key={dragId} dragId={dragId} dropKind="group">
      <li className="rounded-md border border-border/40 bg-muted/20 px-1 py-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            title={
              group.collapsed
                ? t("studio.layers.expandGroup")
                : t("studio.layers.collapseGroup")
            }
            onClick={() => onPatchGroup(group.id, { collapsed: !group.collapsed })}
          >
            {group.collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>

          <div className="flex shrink-0 flex-col gap-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              title={group.visible ? t("studio.layers.hideGroup") : t("studio.layers.showGroup")}
              aria-pressed={group.visible}
              onClick={() => onPatchGroup(group.id, { visible: !group.visible })}
            >
              {group.visible ? (
                <Eye className="size-3" />
              ) : (
                <EyeOff className="size-3 text-muted-foreground" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              title={group.locked ? t("studio.layers.unlockGroup") : t("studio.layers.lockGroup")}
              aria-pressed={group.locked}
              onClick={() => onPatchGroup(group.id, { locked: !group.locked })}
            >
              {group.locked ? (
                <Lock className="size-3" />
              ) : (
                <LockOpen className="size-3 text-muted-foreground" />
              )}
            </Button>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Folder className="size-4 shrink-0 text-amber-600/80" />
            {editingGroupId === group.id ? (
              <input
                className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1.5 text-xs"
                value={editingName}
                autoFocus
                onChange={(event) => setEditingName(event.target.value)}
                onBlur={() => commitGroupRename(group.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitGroupRename(group.id);
                  if (event.key === "Escape") setEditingGroupId(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-xs font-medium"
                onDoubleClick={() => beginGroupRename(group.id, group.name)}
              >
                {group.name}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  ({memberCount})
                </span>
              </button>
            )}
          </div>

          <MapLayerVerticalOpacity
            value={group.opacity}
            onChange={(opacity) => onPatchGroup(group.id, { opacity })}
          />

          <MapLayerDragHandle dragId={dragId} />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 text-destructive/80 hover:text-destructive"
            title={t("studio.layers.dissolveGroup")}
            aria-label={t("studio.layers.dissolveGroup")}
            onClick={() => onDeleteGroup(group.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </li>
    </MapLayerDropRow>
  );

  return (
    <aside
      className={cn(
        "flex flex-col bg-muted/10",
        embedded ? "min-h-0 flex-1" : "w-64 shrink-0 border-l border-border/60",
      )}
      aria-label={t("studio.layers.panelAria", { mapId })}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        {!embedded ? (
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("studio.layers.title")}
          </h2>
        ) : (
          <span className="sr-only">{t("studio.layers.title")}</span>
        )}
        <div className="flex items-center gap-1">
          {onImportImageLayer ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-7"
              title={t("layersWindow.addImageLayer")}
              aria-label={t("layersWindow.addImageLayer")}
              onClick={() => void onImportImageLayer()}
            >
              <ImageIcon className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-7"
            title={t("studio.layers.addGroup")}
            aria-label={t("studio.layers.addGroup")}
            onClick={handleCreateGroup}
          >
            <FolderPlus className="size-4" />
          </Button>
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
      </div>

      <MapLayerListDnDProvider onReorder={onReorderPanelRow}>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
          {panelRows.map((row) => {
            const dragId = panelRowDragId(row);
            if (row.kind === "group") {
              return (
                <li key={dragId} className="space-y-0.5">
                  {renderGroupRow(row.group, dragId, row.members.length)}
                  {!row.group.collapsed
                    ? row.members.map((member) =>
                        renderLayerRow(
                          member.layer,
                          panelRowDragId({
                            kind: "layer",
                            layer: member.layer,
                            stackIndex: member.stackIndex,
                          }),
                          true,
                        ),
                      )
                    : null}
                </li>
              );
            }
            return renderLayerRow(row.layer, dragId);
          })}
        </ul>
      </MapLayerListDnDProvider>

      <div className="shrink-0 border-t border-border/60 p-1.5">
        <div className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-1 py-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            title={
              backgroundVisible
                ? t("studio.layers.background.hide")
                : t("studio.layers.background.show")
            }
            aria-pressed={backgroundVisible}
            onClick={() =>
              onPatchBackground(
                backgroundVisible ? null : backgroundColor || MAP_DRAWING_DEFAULT_BACKGROUND,
              )
            }
          >
            {backgroundVisible ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3 text-muted-foreground" />
            )}
          </Button>
          <label
            className={cn(
              "relative size-6 shrink-0 overflow-hidden rounded-full border border-border/80",
              !backgroundVisible && "opacity-40",
            )}
          >
            <span
              className="absolute inset-0"
              style={{ backgroundColor }}
              aria-hidden
            />
            <input
              type="color"
              value={backgroundColor}
              disabled={!backgroundVisible}
              className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              aria-label={t("studio.layers.background.pickColor")}
              onChange={(event) => onPatchBackground(event.target.value)}
            />
          </label>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
            {t("studio.layers.background.name")}
          </span>
        </div>
      </div>

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
            <Button type="button" variant="destructive" onClick={confirmDeleteLayer}>
              {t("studio.layers.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
