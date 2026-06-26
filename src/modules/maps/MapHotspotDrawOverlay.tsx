import { useTranslation } from "react-i18next";

import type { HotspotDrawDraft } from "@/hooks/useHotspotDrawGesture";
import { documentDistance } from "@/lib/maps/mapDrawCoords";
import {
  canCloseHotspotPolygon,
  isNearHotspotPoint,
  worldToScreen,
} from "@/lib/maps/mapHotspotPolygon";
import type { MapViewportState } from "@/lib/maps/useMapViewport";

interface MapHotspotDrawOverlayProps {
  draft: HotspotDrawDraft | null;
  viewport: MapViewportState;
}

export function MapHotspotDrawOverlay({ draft, viewport }: MapHotspotDrawOverlayProps) {
  const { t } = useTranslation("maps");

  if (!draft || draft.phase === "idle" || draft.vertices.length === 0) {
    return null;
  }

  const origin = draft.vertices[0]!;
  const originScreen = worldToScreen(origin, viewport);
  const cursorScreen = worldToScreen(draft.cursor, viewport);
  const tetherDistance = Math.round(documentDistance(origin, draft.cursor));
  const canClose =
    draft.phase === "drawing" &&
    canCloseHotspotPolygon(draft.vertices) &&
    isNearHotspotPoint(draft.cursor, origin);

  const vertexScreens = draft.vertices.map((point) => worldToScreen(point, viewport));
  const polylinePoints = vertexScreens.map((point) => `${point.x},${point.y}`).join(" ");
  const closedPreviewPoints =
    draft.phase === "drawing" && draft.vertices.length >= 2
      ? `${polylinePoints} ${cursorScreen.x},${cursorScreen.y} ${originScreen.x},${originScreen.y}`
      : "";

  const tetherMid = {
    x: (originScreen.x + cursorScreen.x) / 2,
    y: (originScreen.y + cursorScreen.y) / 2,
  };

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
      aria-hidden
    >
      {draft.phase === "originPlaced" ? (
        <>
          <line
            x1={originScreen.x}
            y1={originScreen.y}
            x2={cursorScreen.x}
            y2={cursorScreen.y}
            stroke="rgba(234, 179, 8, 0.95)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <circle cx={originScreen.x} cy={originScreen.y} r={5} fill="rgba(234, 179, 8, 0.95)" />
          <text
            x={tetherMid.x}
            y={tetherMid.y - 8}
            textAnchor="middle"
            className="fill-foreground text-[10px] font-medium"
          >
            {t("hotspot.lasso.distance", { px: tetherDistance })}
          </text>
          <text
            x={originScreen.x}
            y={originScreen.y - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {t("hotspot.lasso.origin")}
          </text>
        </>
      ) : null}

      {draft.phase === "drawing" ? (
        <>
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="rgba(59, 130, 246, 0.9)"
            strokeWidth={2}
          />
          {closedPreviewPoints ? (
            <polygon
              points={closedPreviewPoints}
              fill={canClose ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.12)"}
              stroke={canClose ? "rgba(34, 197, 94, 0.95)" : "rgba(59, 130, 246, 0.55)"}
              strokeWidth={canClose ? 2 : 1.5}
              strokeDasharray={canClose ? undefined : "6 4"}
            />
          ) : null}
          <line
            x1={vertexScreens[vertexScreens.length - 1]!.x}
            y1={vertexScreens[vertexScreens.length - 1]!.y}
            x2={cursorScreen.x}
            y2={cursorScreen.y}
            stroke="rgba(234, 179, 8, 0.95)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          {vertexScreens.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={index === 0 ? 6 : 4}
              fill={index === 0 && canClose ? "rgba(34, 197, 94, 0.95)" : "rgba(59, 130, 246, 0.9)"}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={1}
            />
          ))}
          {canClose ? (
            <text
              x={originScreen.x}
              y={originScreen.y - 12}
              textAnchor="middle"
              className="fill-emerald-600 text-[10px] font-medium dark:fill-emerald-400"
            >
              {t("hotspot.lasso.closeHint")}
            </text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
