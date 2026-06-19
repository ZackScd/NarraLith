/** Ruta relativa al proyecto para un asset de mapa (p. ej. imagen base). */
export function mapAssetProjectPath(mapId: string, baseImageRel: string): string {
  const normalized = baseImageRel.replace(/\\/g, "/");
  return `.narralith/maps/${mapId}/${normalized}`;
}
