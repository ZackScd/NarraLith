import { useCallback, useEffect, useRef, useState } from "react";

import type {
  MapBrushPreset,
  MapDrawStroke,
  MapDrawingDocument,
  MapStudioTool,
} from "@/lib/types/mapDrawing";
import { BRUSH_PRESETS } from "@/lib/types/mapDrawing";

function strokeId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function renderStroke(ctx: CanvasRenderingContext2D, stroke: MapDrawStroke) {
  if (stroke.points.length < 2) return;
  const preset = BRUSH_PRESETS[stroke.preset];
  ctx.save();
  ctx.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = preset.lineCap;
  ctx.lineJoin = "round";
  ctx.globalAlpha = stroke.tool === "eraser" ? 1 : stroke.opacity;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
  for (let i = 1; i < stroke.points.length; i += 1) {
    ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
  }
  ctx.stroke();
  ctx.restore();
}

export function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: MapDrawStroke[],
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const stroke of strokes) {
    renderStroke(ctx, stroke);
  }
}

interface UseMapDrawingOptions {
  width: number;
  height: number;
  backgroundUrl: string | null;
  initialStrokes: MapDrawStroke[];
}

export function useMapDrawing({
  width,
  height,
  backgroundUrl,
  initialStrokes,
}: UseMapDrawingOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const [strokes, setStrokes] = useState<MapDrawStroke[]>(initialStrokes);
  const [tool, setTool] = useState<MapStudioTool>("brush");
  const [color, setColor] = useState("#18181b");
  const [brushPreset, setBrushPreset] = useState<MapBrushPreset>("pen");
  const [brushSize, setBrushSize] = useState(BRUSH_PRESETS.pen.size);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoStack = useRef<MapDrawStroke[][]>([]);
  const redoStack = useRef<MapDrawStroke[][]>([]);
  const activeStroke = useRef<MapDrawStroke | null>(null);
  const panOrigin = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  const refreshHistory = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setStrokes(initialStrokes);
      undoStack.current = [];
      redoStack.current = [];
      refreshHistory();
    });
  }, [initialStrokes, width, height, refreshHistory]);

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container || width <= 0 || height <= 0) return;
    const pad = 48;
    const cw = container.clientWidth - pad;
    const ch = container.clientHeight - pad;
    const s = Math.min(cw / width, ch / height, 1);
    setScale(s);
    setOffset({
      x: (container.clientWidth - width * s) / 2,
      y: (container.clientHeight - height * s) / 2,
    });
  }, [width, height]);

  useEffect(() => {
    fitToView();
    const ro = new ResizeObserver(() => fitToView());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [fitToView]);

  useEffect(() => {
    const bg = bgCanvasRef.current;
    if (!bg) return;
    bg.width = width;
    bg.height = height;
    const ctx = bg.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (!backgroundUrl) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, width, height]);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderAllStrokes(ctx, strokes);
  }, [strokes, width, height]);

  const pushUndo = useCallback(
    (prev: MapDrawStroke[]) => {
      undoStack.current.push(prev.map((s) => ({ ...s, points: [...s.points] })));
      if (undoStack.current.length > 80) undoStack.current.shift();
      redoStack.current = [];
      refreshHistory();
    },
    [refreshHistory],
  );

  const canvasPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const x = (clientX - rect.left - offset.x) / scale;
      const y = (clientY - rect.top - offset.y) / scale;
      if (x < 0 || y < 0 || x > width || y > height) return null;
      return { x, y };
    },
    [offset.x, offset.y, scale, width, height],
  );

  const beginStroke = useCallback(
    (clientX: number, clientY: number) => {
      const pt = canvasPoint(clientX, clientY);
      if (!pt) return;
      pushUndo(strokes);
      const preset = BRUSH_PRESETS[brushPreset];
      const stroke: MapDrawStroke = {
        id: strokeId(),
        tool,
        color: tool === "eraser" ? "#000000" : color,
        size: tool === "eraser" ? Math.max(brushSize, 8) : brushSize,
        opacity: tool === "eraser" ? 1 : preset.opacity,
        preset: brushPreset,
        points: [pt],
      };
      activeStroke.current = stroke;
      setStrokes((prev) => [...prev, stroke]);
    },
    [brushPreset, brushSize, canvasPoint, color, pushUndo, strokes, tool],
  );

  const extendStroke = useCallback(
    (clientX: number, clientY: number) => {
      const stroke = activeStroke.current;
      if (!stroke) return;
      const pt = canvasPoint(clientX, clientY);
      if (!pt) return;
      stroke.points.push(pt);
      const canvas = drawCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && stroke.points.length >= 2) {
        const prev = stroke.points[stroke.points.length - 2]!;
        ctx.save();
        ctx.globalCompositeOperation =
          stroke.tool === "eraser" ? "destination-out" : "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = stroke.tool === "eraser" ? 1 : stroke.opacity;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        ctx.restore();
      }
    },
    [canvasPoint],
  );

  const endStroke = useCallback(() => {
    activeStroke.current = null;
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(strokes.map((s) => ({ ...s, points: [...s.points] })));
    setStrokes(prev);
    refreshHistory();
  }, [strokes, refreshHistory]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(strokes.map((s) => ({ ...s, points: [...s.points] })));
    setStrokes(next);
    refreshHistory();
  }, [strokes, refreshHistory]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        panOrigin.current = {
          x: e.clientX,
          y: e.clientY,
          ox: offset.x,
          oy: offset.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      if (e.button !== 0) return;
      beginStroke(e.clientX, e.clientY);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [beginStroke, offset.x, offset.y],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning && panOrigin.current) {
        const dx = e.clientX - panOrigin.current.x;
        const dy = e.clientY - panOrigin.current.y;
        setOffset({
          x: panOrigin.current.ox + dx,
          y: panOrigin.current.oy + dy,
        });
        return;
      }
      extendStroke(e.clientX, e.clientY);
    },
    [extendStroke, isPanning],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      setIsPanning(false);
      panOrigin.current = null;
      endStroke();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [endStroke],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * factor, 0.1), 4));
  }, []);

  const exportMergedPng = useCallback(async (): Promise<string> => {
    const merged = document.createElement("canvas");
    merged.width = width;
    merged.height = height;
    const ctx = merged.getContext("2d");
    if (!ctx) throw new Error("canvas");
    const bg = bgCanvasRef.current;
    const draw = drawCanvasRef.current;
    if (bg) ctx.drawImage(bg, 0, 0);
    if (draw) ctx.drawImage(draw, 0, 0);
    return merged.toDataURL("image/png");
  }, [width, height]);

  const toDocument = useCallback((): MapDrawingDocument => {
    return {
      version: 1,
      width,
      height,
      strokes: strokes.map((s) => ({ ...s, points: [...s.points] })),
    };
  }, [height, strokes, width]);

  const applyPreset = useCallback((preset: MapBrushPreset) => {
    setBrushPreset(preset);
    setBrushSize(BRUSH_PRESETS[preset].size);
    setTool("brush");
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.15, 4));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s * 0.85, 0.1));
  }, []);

  return {
    containerRef,
    bgCanvasRef,
    drawCanvasRef,
    strokes,
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
    canUndo,
    canRedo,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    exportMergedPng,
    toDocument,
  };
}
