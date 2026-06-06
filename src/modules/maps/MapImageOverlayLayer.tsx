import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface MapImageOverlayLayerProps {
  url: string | null;
  bounds: L.LatLngBoundsExpression;
  opacity?: number;
  zIndex?: number;
  onError?: () => void;
}

/** ImageOverlay con manejo de errores de carga. */
export function MapImageOverlayLayer({
  url,
  bounds,
  opacity = 1,
  zIndex,
  onError,
}: MapImageOverlayLayerProps) {
  const map = useMap();
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const boundsKey = JSON.stringify(bounds);

  useEffect(() => {
    if (!url) return;

    const overlay = L.imageOverlay(url, bounds, {
      opacity,
      zIndex,
    });
    overlay.addTo(map);

    const img = overlay.getElement() as HTMLImageElement | undefined;
    const handleError = () => {
      onErrorRef.current?.();
    };
    img?.addEventListener("error", handleError);

    return () => {
      img?.removeEventListener("error", handleError);
      map.removeLayer(overlay);
    };
  }, [map, url, bounds, boundsKey, opacity, zIndex]);

  return null;
}
