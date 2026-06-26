import { resolveLayerEffectiveState } from "@/lib/maps/mapLayerGroups";
import { isImageLayer } from "@/lib/maps/mapImageLayers";
import type { MapDrawingV2 } from "@/lib/types/maps";

export function collectDrawingImageAssetPaths(drawing: MapDrawingV2): string[] {
  return drawing.layers
    .filter(isImageLayer)
    .map((layer) => layer.assetPath)
    .filter((path, index, all) => all.indexOf(path) === index);
}

export function drawMapImageLayers(
  ctx: CanvasRenderingContext2D,
  drawing: MapDrawingV2,
  images: ReadonlyMap<string, HTMLImageElement>,
): void {
  for (const layer of drawing.layers) {
    if (!isImageLayer(layer)) continue;
    const effective = resolveLayerEffectiveState(layer, drawing.groups);
    if (!effective.visible) continue;
    const image = images.get(layer.assetPath);
    if (!image) continue;
    ctx.save();
    ctx.globalAlpha = effective.opacity;
    ctx.drawImage(image, layer.x, layer.y, layer.width, layer.height);
    ctx.restore();
  }
}
