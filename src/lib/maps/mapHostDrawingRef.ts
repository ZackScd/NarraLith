import type { MapHostDrawingRef } from "@/lib/types/maps";

export function hostDrawingRefKey(ref: MapHostDrawingRef): string {
  return ref.kind === "principal" ? "principal" : `nav:${ref.id}`;
}

export function parseHostDrawingRefKey(key: string): MapHostDrawingRef | null {
  if (key === "principal") {
    return { kind: "principal" };
  }
  if (key.startsWith("nav:")) {
    const id = key.slice("nav:".length);
    if (id.length > 0) {
      return { kind: "nav", id };
    }
  }
  return null;
}

export function isSameHostDrawingRef(a: MapHostDrawingRef, b: MapHostDrawingRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "principal" && b.kind === "principal") return true;
  if (a.kind === "nav" && b.kind === "nav") return a.id === b.id;
  return false;
}

export const PRINCIPAL_HOST_DRAWING_REF: MapHostDrawingRef = { kind: "principal" };
