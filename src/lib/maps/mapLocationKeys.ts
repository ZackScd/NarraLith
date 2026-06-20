/** Normaliza clave ubicación para lookup pins (MAP-011 D2). */
export function normalizeLocationKey(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
