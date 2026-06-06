const DEFAULT_HIGHLIGHT_COLOR = "#3b82f6";
const DEFAULT_HIGHLIGHT_OPACITY = 0.18;

export function clampHighlightOpacity(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_HIGHLIGHT_OPACITY;
  return Math.max(0, Math.min(1, value));
}

export function hexToRgba(hex: string, alpha: number): string | null {
  const raw = hex.trim();
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(raw);
  if (!m) return null;
  const h = m[1]!;
  const full = h.length === 3 ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function seasonHighlightRgba(
  color: string | undefined,
  opacity: number | undefined,
): string {
  const alpha = clampHighlightOpacity(opacity);
  return (
    hexToRgba(color || DEFAULT_HIGHLIGHT_COLOR, alpha) ??
    hexToRgba(DEFAULT_HIGHLIGHT_COLOR, alpha) ??
    `rgba(59, 130, 246, ${alpha})`
  );
}
