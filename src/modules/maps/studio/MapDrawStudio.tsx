import {
  Eraser,
  Hand,
  Map as MapIcon,
  Pencil,
  PenLine,
  Redo2,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { resolveMapImageUrl } from "@/hooks/useMapImageUrl";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { mapErrorKey } from "@/lib/maps/mapErrors";
import type { MapDrawingDocument, MapDrawStroke } from "@/lib/types/mapDrawing";
import { BRUSH_PRESETS, STUDIO_PALETTE } from "@/lib/types/mapDrawing";
import type { MapManifest } from "@/lib/types/maps";
import { cn } from "@/lib/utils";
import { useMapDrawing } from "@/modules/maps/studio/useMapDrawing";

interface MapDrawStudioProps {
  mapId: string;
  manifest: MapManifest;
  onSaved: () => void;
  onSwitchToMap: () => void;
  onError: (key: string) => void;
}

function parseDrawing(raw: unknown, width: number, height: number): MapDrawStroke[] {
  if (!raw || typeof raw !== "object") return [];
  const doc = raw as MapDrawingDocument;
  if (doc.version !== 1 || !Array.isArray(doc.strokes)) return [];
  if (doc.width !== width || doc.height !== height) return doc.strokes;
  return doc.strokes;
}

export function MapDrawStudio({
  mapId,
  manifest,
  onSaved,
  onSwitchToMap,
  onError,
}: MapDrawStudioProps) {
  const { t } = useTranslation("maps");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [initialStrokes, setInitialStrokes] = useState<MapDrawStroke[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setReady(false));
    void (async () => {
      try {
        const [url, drawingRaw] = await Promise.all([
          resolveMapImageUrl(manifest.imagePath),
          invokeCommand<unknown>("get_map_drawing_cmd", { mapId }),
        ]);
        if (cancelled) return;
        setBackgroundUrl(url);
        setInitialStrokes(parseDrawing(drawingRaw, manifest.width, manifest.height));
        setReady(true);
      } catch (err) {
        if (!cancelled) onError(mapErrorKey(parseAppError(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapId, manifest.imagePath, manifest.width, manifest.height, onError]);

  const {
    containerRef,
    bgCanvasRef,
    drawCanvasRef,
    tool,
    setTool,
    color,
    setColor,
    brushPreset,
    applyPreset,
    brushSize,
    setBrushSize,
    scale,
    offset,
    fitToView,
    zoomIn,
    zoomOut,
    undo,
    redo,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    exportMergedPng,
    toDocument,
  } = useMapDrawing({
    width: manifest.width,
    height: manifest.height,
    backgroundUrl,
    initialStrokes,
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const png = await exportMergedPng();
      const doc = toDocument();
      await invokeCommand("save_map_drawing_cmd", { mapId, drawing: doc });
      await invokeCommand("save_map_canvas_png_cmd", { mapId, pngBase64: png });
      onSaved();
    } catch (err) {
      onError(mapErrorKey(parseAppError(err)));
    } finally {
      setSaving(false);
    }
  }, [exportMergedPng, toDocument, mapId, onError, onSaved]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#2a2a2e] text-sm text-muted-foreground">
        {t("studio.loading")}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#2a2a2e]">
      {/* Barra flotante superior (estilo Sketchbook) */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title={t("studio.undo")}
            onClick={() => undo()}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title={t("studio.redo")}
            onClick={() => redo()}
          >
            <Redo2 className="size-4" />
          </Button>
          <span className="mx-1 h-6 w-px bg-border" />
          <Button
            type="button"
            size="icon"
            variant={tool === "brush" ? "secondary" : "ghost"}
            className="size-8"
            title={t("studio.brush")}
            onClick={() => setTool("brush")}
          >
            <PenLine className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={tool === "eraser" ? "secondary" : "ghost"}
            className="size-8"
            title={t("studio.eraser")}
            onClick={() => setTool("eraser")}
          >
            <Eraser className="size-4" />
          </Button>
          <span className="mx-1 h-6 w-px bg-border" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title={t("studio.zoomOut")}
            onClick={() => zoomOut()}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title={t("studio.zoomFit")}
            onClick={() => fitToView()}
          >
            <Hand className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title={t("studio.zoomIn")}
            onClick={() => zoomIn()}
          >
            <ZoomIn className="size-4" />
          </Button>
          <span className="mx-1 h-6 w-px bg-border" />
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            <Save className="size-3.5" />
            {saving ? t("saving") : t("studio.save")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={onSwitchToMap}
          >
            <MapIcon className="size-3.5" />
            {t("studio.viewMap")}
          </Button>
        </div>
      </div>

      {/* Lienzo central */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="absolute origin-top-left shadow-2xl"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          <canvas
            ref={bgCanvasRef}
            className="absolute left-0 top-0 block"
            width={manifest.width}
            height={manifest.height}
          />
          <canvas
            ref={drawCanvasRef}
            className="absolute left-0 top-0 block"
            width={manifest.width}
            height={manifest.height}
          />
        </div>
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/50 px-3 py-1 text-[10px] text-white/80">
          {t("studio.hint")}
        </p>
      </div>

      {/* Panel pinceles (derecha) */}
      <aside className="pointer-events-none absolute inset-y-0 right-3 z-20 flex items-center">
        <div className="pointer-events-auto flex max-h-[min(80vh,520px)] w-14 flex-col gap-2 rounded-lg border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur-sm">
          {(["pen", "pencil", "marker"] as const).map((preset) => {
            const Icon = preset === "pen" ? PenLine : Pencil;
            return (
              <button
                key={preset}
                type="button"
                title={t(`studio.presets.${preset}`)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-md border transition-colors",
                  brushPreset === preset && tool === "brush"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-transparent hover:bg-muted",
                )}
                onClick={() => applyPreset(preset)}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
          <div className="my-1 h-px bg-border" />
          <input
            type="range"
            min={1}
            max={48}
            value={brushSize}
            className="h-24 [writing-mode:vertical-lr] [direction:rtl]"
            title={t("studio.size")}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>
      </aside>

      {/* Selector de color (izquierda) */}
      <aside className="pointer-events-none absolute inset-y-0 left-3 z-20 flex items-center">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur-sm">
          {STUDIO_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              className={cn(
                "size-7 rounded-full border-2 transition-transform hover:scale-110",
                color === c ? "border-primary scale-110" : "border-border/50",
              )}
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                setTool("brush");
              }}
            />
          ))}
        </div>
      </aside>

      {/* Capas mínimas (esquina inferior derecha) */}
      <div className="pointer-events-none absolute bottom-3 right-20 z-20">
        <div className="pointer-events-auto w-44 rounded-lg border border-border/60 bg-card/95 p-2 text-xs shadow-lg backdrop-blur-sm">
          <p className="mb-1 font-medium text-foreground">{t("studio.layers")}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1">
              <span className="size-3 rounded border border-border bg-white" />
              <span>{t("studio.layerBackground")}</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-2 py-1">
              <span
                className="size-3 rounded border border-border"
                style={{ backgroundColor: color }}
              />
              <span>{t("studio.layerDraw")}</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            {manifest.width}×{manifest.height}px · {BRUSH_PRESETS[brushPreset].size}px
          </p>
        </div>
      </div>
    </div>
  );
}
