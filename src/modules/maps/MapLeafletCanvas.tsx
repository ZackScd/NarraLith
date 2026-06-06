import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, Marker, Polygon, useMap, useMapEvents } from "react-leaflet";

import { useMapImageUrl } from "@/hooks/useMapImageUrl";
import { MapImageOverlayLayer } from "@/modules/maps/MapImageOverlayLayer";
import type {
  MapDrawMode,
  MapFeature,
  MapLayersFile,
  MapManifest,
  MapOverlay,
} from "@/lib/types/maps";

import "leaflet/dist/leaflet.css";

interface MapLeafletCanvasProps {
  projectRoot: string;
  manifest: MapManifest;
  layers: MapLayersFile;
  activeOverlays: MapOverlay[];
  drawMode: MapDrawMode;
  selectedFeatureId: string | null;
  polygonDraft: [number, number][];
  onMapClick: (lat: number, lng: number) => void;
  onMapDoubleClick: () => void;
  onSelectFeature: (id: string | null) => void;
  onFeatureMove: (featureId: string, lat: number, lng: number) => void;
  onDrillDown: (childMapId: string) => void;
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

function MapInteractionLayer({
  drawMode,
  onMapClick,
  onMapDoubleClick,
}: {
  drawMode: MapDrawMode;
  onMapClick: (lat: number, lng: number) => void;
  onMapDoubleClick: () => void;
}) {
  useMapEvents({
    click(e) {
      if (drawMode === "select") return;
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    dblclick() {
      onMapDoubleClick();
    },
  });
  return null;
}

function featureVisible(feature: MapFeature, layers: MapLayersFile): boolean {
  const layer = layers.layers.find((l) => l.id === feature.layerId);
  return layer?.visible !== false;
}

function featureColor(feature: MapFeature): string {
  return feature.style?.color ?? "#3b82f6";
}

function DraggablePin({
  center,
  selected,
  color,
  opacity,
  enableDrag,
  onSelect,
  onDrillDown,
  onMove,
  childMapId,
}: {
  center: [number, number];
  selected: boolean;
  color: string;
  opacity: number;
  enableDrag: boolean;
  onSelect: () => void;
  onDrillDown: () => void;
  onMove: (lat: number, lng: number) => void;
  childMapId?: string | null;
}) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="width:${selected ? 16 : 12}px;height:${selected ? 16 : 12}px;border-radius:50%;background:${color};opacity:${opacity};border:2px solid ${selected ? "#fbbf24" : color}"></div>`,
        iconSize: [selected ? 16 : 12, selected ? 16 : 12],
        iconAnchor: [selected ? 8 : 6, selected ? 8 : 6],
      }),
    [selected, color, opacity],
  );

  return (
    <Marker
      position={center}
      icon={icon}
      draggable={enableDrag}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent);
          onSelect();
        },
        dblclick: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent);
          if (childMapId) onDrillDown();
        },
        dragend: (e) => {
          const marker = e.target as L.Marker;
          const pos = marker.getLatLng();
          onMove(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export function MapLeafletCanvas({
  projectRoot,
  manifest,
  layers,
  activeOverlays,
  drawMode,
  selectedFeatureId,
  polygonDraft,
  onMapClick,
  onMapDoubleClick,
  onSelectFeature,
  onFeatureMove,
  onDrillDown,
}: MapLeafletCanvasProps) {
  const { t } = useTranslation("maps");
  const {
    url: baseUrl,
    failed: loadFailed,
    loading: imageLoading,
  } = useMapImageUrl(projectRoot, manifest.imagePath);
  const imageSourceKey = `${manifest.imagePath}:${baseUrl ?? ""}`;
  const [overlayErrorKey, setOverlayErrorKey] = useState<string | null>(null);
  const overlayError = overlayErrorKey === imageSourceKey;
  const imageError = loadFailed || overlayError;

  const bounds = useMemo(
    (): L.LatLngBoundsExpression => [
      [0, 0],
      [manifest.height, manifest.width],
    ],
    [manifest.height, manifest.width],
  );

  const handleImageError = useCallback(() => {
    setOverlayErrorKey(imageSourceKey);
  }, [imageSourceKey]);

  const sortedOverlays = [...activeOverlays].sort((a, b) => a.zIndex - b.zIndex);

  const visibleFeatures = layers.features.filter((f) => featureVisible(f, layers));

  return (
    <div className="relative h-full w-full">
      {imageError ? (
        <p className="absolute inset-x-0 top-0 z-10 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {t("imageLoadFailed")}
        </p>
      ) : null}
      {imageLoading && !baseUrl ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/20">
          <p className="text-xs text-muted-foreground">{t("loadingImage")}</p>
        </div>
      ) : null}
      <MapContainer
        key={`${manifest.id}:${manifest.imagePath}:${manifest.width}x${manifest.height}`}
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        className="h-full w-full bg-muted/30 [&_.leaflet-control-zoom]:border-border/70 [&_.leaflet-control-zoom_a]:bg-card [&_.leaflet-control-zoom_a]:text-foreground"
        zoomControl
        attributionControl={false}
      >
        <FitBounds bounds={bounds} />
        <MapImageOverlayLayer
          url={baseUrl}
          bounds={bounds}
          onError={handleImageError}
        />
        {sortedOverlays.map((overlay) => (
          <MapOverlayImage
            key={overlay.id}
            projectRoot={projectRoot}
            overlay={overlay}
          />
        ))}
        {visibleFeatures.map((feature) => {
          const selected = feature.id === selectedFeatureId;
          const color = featureColor(feature);
          const layer = layers.layers.find((l) => l.id === feature.layerId);
          const opacity = layer?.opacity ?? 1;

          if (feature.kind === "pin" && feature.latlng[0]) {
            const [lat, lng] = feature.latlng[0];
            return (
              <DraggablePin
                key={feature.id}
                center={[lat, lng]}
                selected={selected}
                color={color}
                opacity={opacity}
                enableDrag={drawMode === "select"}
                childMapId={feature.childMapId}
                onSelect={() => onSelectFeature(feature.id)}
                onDrillDown={() =>
                  feature.childMapId && onDrillDown(feature.childMapId)
                }
                onMove={(plat, plng) => onFeatureMove(feature.id, plat, plng)}
              />
            );
          }

          if (feature.kind === "polygon" && feature.latlng.length >= 3) {
            return (
              <Polygon
                key={feature.id}
                positions={feature.latlng.map(
                  ([lat, lng]) => [lat, lng] as [number, number],
                )}
                pathOptions={{
                  color: selected ? "#fbbf24" : color,
                  fillColor: color,
                  fillOpacity: (feature.style?.fillOpacity ?? 0.25) * opacity,
                  weight: selected ? 3 : 2,
                }}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    onSelectFeature(feature.id);
                  },
                  dblclick: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    if (feature.childMapId) {
                      onDrillDown(feature.childMapId);
                    }
                  },
                }}
              />
            );
          }
          return null;
        })}
        {polygonDraft.length > 0 && (
          <Polygon
            positions={polygonDraft.map(([lat, lng]) => [lat, lng] as [number, number])}
            pathOptions={{
              color: "#fbbf24",
              dashArray: "6 4",
              fillOpacity: 0.1,
              weight: 2,
            }}
          />
        )}
        <MapInteractionLayer
          drawMode={drawMode}
          onMapClick={onMapClick}
          onMapDoubleClick={onMapDoubleClick}
        />
      </MapContainer>
    </div>
  );
}

function MapOverlayImage({
  projectRoot,
  overlay,
}: {
  projectRoot: string;
  overlay: MapOverlay;
}) {
  const urlState = useMapImageUrl(projectRoot, overlay.imagePath);
  return (
    <MapImageOverlayLayer
      url={urlState.url}
      bounds={overlay.bounds}
      opacity={0.85}
      zIndex={overlay.zIndex + 100}
    />
  );
}
