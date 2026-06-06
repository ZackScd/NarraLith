import type { MapData, MapFeature, MapLayer, MapOverlay } from "@/lib/types/maps";

export function newMapFeatureId(): string {
  return `feat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newMapLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newOverlayId(): string {
  return `overlay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function updateFeature(
  data: MapData,
  featureId: string,
  patch: Partial<MapFeature>,
): MapData {
  return {
    ...data,
    layers: {
      ...data.layers,
      features: data.layers.features.map((f) =>
        f.id === featureId ? { ...f, ...patch } : f,
      ),
    },
  };
}

export function removeFeature(data: MapData, featureId: string): MapData {
  return {
    ...data,
    layers: {
      ...data.layers,
      features: data.layers.features.filter((f) => f.id !== featureId),
    },
  };
}

export function addFeature(data: MapData, feature: MapFeature): MapData {
  return {
    ...data,
    layers: {
      ...data.layers,
      features: [...data.layers.features, feature],
    },
  };
}

export function updateLayer(
  data: MapData,
  layerId: string,
  patch: Partial<MapLayer>,
): MapData {
  return {
    ...data,
    layers: {
      ...data.layers,
      layers: data.layers.layers.map((l) =>
        l.id === layerId ? { ...l, ...patch } : l,
      ),
    },
  };
}

export function addLayer(data: MapData, layer: MapLayer): MapData {
  return {
    ...data,
    layers: {
      ...data.layers,
      layers: [...data.layers.layers, layer],
    },
  };
}

export function setOverlays(data: MapData, overlays: MapOverlay[]): MapData {
  return {
    ...data,
    manifest: { ...data.manifest, overlays },
  };
}
