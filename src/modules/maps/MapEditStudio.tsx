import { Eraser, Hand, Paintbrush, Redo2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { trackAction } from "@/lib/action-audit/trackAction";
import { MAP_STUDIO_BRUSHES, MAP_STUDIO_SIZE_MAX, MAP_STUDIO_SIZE_MIN } from "@/lib/maps/mapBrushes";
import type { MapDrawingSaveStatus } from "@/lib/maps/mapDrawingSession";
import { MapColorPicker } from "@/modules/maps/MapColorPicker";
import {
  useMapStudioStore,
  type MapStudioTool,
} from "@/stores/useMapStudioStore";
import { cn } from "@/lib/utils";

interface MapEditStudioProps {
  mapId: string;
  canvasBusy: boolean;
  isDirty: boolean;
  saveStatus: MapDrawingSaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExpand: () => void;
  onCrop: () => void;
  embedded?: boolean;
}

const TOOLS: { id: MapStudioTool; icon: typeof Hand; labelKey: string }[] = [
  { id: "pan", icon: Hand, labelKey: "studio.tools.pan" },
  { id: "brush", icon: Paintbrush, labelKey: "studio.tools.brush" },
  { id: "eraser", icon: Eraser, labelKey: "studio.tools.eraser" },
];

const SELECT_CLASS =
  "h-8 min-w-[7rem] rounded-md border border-input bg-background px-2 text-xs";

function saveStatusLabelKey(
  status: MapDrawingSaveStatus,
  isDirty: boolean,
): string | null {
  if (status === "saving") return "studio.save.saving";
  if (status === "error") return "studio.save.error";
  if (isDirty) return "studio.save.unsaved";
  if (status === "saved") return "studio.save.saved";
  return null;
}

export function MapEditStudio({
  mapId,
  canvasBusy,
  isDirty,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExpand,
  onCrop,
  embedded = false,
}: MapEditStudioProps) {
  const { t } = useTranslation("maps");
  const tool = useMapStudioStore((s) => s.tool);
  const brushId = useMapStudioStore((s) => s.brushId);
  const color = useMapStudioStore((s) => s.color);
  const baseSize = useMapStudioStore((s) => s.baseSize);
  const baseOpacity = useMapStudioStore((s) => s.baseOpacity);
  const setTool = useMapStudioStore((s) => s.setTool);
  const setBrushId = useMapStudioStore((s) => s.setBrushId);
  const setColor = useMapStudioStore((s) => s.setColor);
  const setBaseSize = useMapStudioStore((s) => s.setBaseSize);
  const setBaseOpacity = useMapStudioStore((s) => s.setBaseOpacity);

  const disabled = canvasBusy;
  const showBrushControls = tool === "brush";
  const saveLabelKey = saveStatusLabelKey(saveStatus, isDirty);

  const handleToolChange = (next: MapStudioTool) => {
    if (next === tool) return;
    setTool(next);
    trackAction("map", "toolChange", { mapId, tool: next });
  };

  const handleBrushChange = (next: typeof brushId) => {
    if (next === brushId) return;
    setBrushId(next);
    trackAction("map", "brushChange", { mapId, brushId: next });
  };

  const handleColorChange = (next: string) => {
    if (next.toLowerCase() === color.toLowerCase()) return;
    setColor(next);
    trackAction("map", "colorChange", { mapId, color: next });
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3",
        !embedded && "shrink-0 border-t border-border/60 bg-muted/30 px-4 py-2",
      )}
    >
      <div className={cn("flex gap-2", embedded ? "flex-col" : "flex-wrap items-center gap-x-4 gap-y-2")}>
        <div className="flex items-center gap-1" role="group" aria-label={t("studio.tools.group")}>
          {TOOLS.map(({ id, icon: Icon, labelKey }) => (
            <Button
              key={id}
              type="button"
              variant={tool === id ? "default" : "outline"}
              size="icon"
              className="size-8"
              disabled={disabled}
              title={t(labelKey)}
              aria-label={t(labelKey)}
              aria-pressed={tool === id}
              onClick={() => handleToolChange(id)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>

        {showBrushControls ? (
          <>
            <select
              className={SELECT_CLASS}
              value={brushId}
              disabled={disabled}
              aria-label={t("studio.brushLabel")}
              onChange={(e) => handleBrushChange(e.target.value as typeof brushId)}
            >
              {MAP_STUDIO_BRUSHES.map((brush) => (
                <option key={brush.id} value={brush.id}>
                  {t(brush.labelKey)}
                </option>
              ))}
            </select>

            <MapColorPicker color={color} disabled={disabled} onChange={handleColorChange} />
          </>
        ) : null}

        <div className="flex min-w-[140px] flex-1 items-center gap-2 text-xs text-muted-foreground">
          <span className="w-10 shrink-0">{t("studio.sizeLabel")}</span>
          <input
            type="range"
            min={MAP_STUDIO_SIZE_MIN}
            max={MAP_STUDIO_SIZE_MAX}
            step={1}
            disabled={disabled}
            className="min-w-0 flex-1 accent-primary"
            value={baseSize}
            aria-label={t("studio.sizeLabel")}
            onChange={(e) => setBaseSize(Number(e.target.value))}
          />
          <span className="w-7 shrink-0 text-right tabular-nums">{baseSize}</span>
        </div>

        {showBrushControls ? (
          <div className="flex min-w-[140px] flex-1 items-center gap-2 text-xs text-muted-foreground">
            <span className="w-10 shrink-0">{t("studio.opacityLabel")}</span>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              disabled={disabled}
              className="min-w-0 flex-1 accent-primary"
              value={Math.round(baseOpacity * 100)}
              aria-label={t("studio.opacityLabel")}
              onChange={(e) => setBaseOpacity(Number(e.target.value) / 100)}
            />
            <span className="w-7 shrink-0 text-right tabular-nums">
              {Math.round(baseOpacity * 100)}%
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || !canUndo}
            title={t("studio.undo")}
            aria-label={t("studio.undo")}
            onClick={onUndo}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={disabled || !canRedo}
            title={t("studio.redo")}
            aria-label={t("studio.redo")}
            onClick={onRedo}
          >
            <Redo2 className="size-4" />
          </Button>
        </div>

        {saveLabelKey ? (
          <span
            className={cn(
              "text-xs",
              saveStatus === "error"
                ? "text-destructive"
                : isDirty
                  ? "text-amber-600 dark:text-amber-500"
                  : "text-muted-foreground",
            )}
            data-map-id={mapId}
          >
            {t(saveLabelKey)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onExpand}
        >
          {t("canvas.expandAction")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onCrop}
        >
          {t("canvas.cropAction")}
        </Button>
      </div>
    </div>
  );
}
