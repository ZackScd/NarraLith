export interface FloatingPosition {
  x: number;
  y: number;
}

export interface FloatingPanelSize {
  width: number;
  height: number;
}

export interface ClampFloatingPositionOptions {
  viewportMargin?: number;
  minWidth?: number;
  minHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

const DEFAULT_MARGIN = 8;

export function clampFloatingPosition(
  x: number,
  y: number,
  size: FloatingPanelSize,
  options: ClampFloatingPositionOptions = {},
): FloatingPosition {
  const margin = options.viewportMargin ?? DEFAULT_MARGIN;
  const viewportWidth =
    options.viewportWidth ??
    (typeof window !== "undefined" ? window.innerWidth : 1024);
  const viewportHeight =
    options.viewportHeight ??
    (typeof window !== "undefined" ? window.innerHeight : 720);

  const width = Math.max(options.minWidth ?? 0, size.width);
  const height = Math.max(options.minHeight ?? 0, size.height);

  const maxX = Math.max(margin, viewportWidth - width - margin);
  const maxY = Math.max(margin, viewportHeight - height - margin);

  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY),
  };
}
