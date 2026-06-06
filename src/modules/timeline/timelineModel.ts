import { fromAbsoluteDay, resolveTimeSortKey, toAbsoluteDay } from "@/lib/calendar";
import { annualAppliesInYear } from "@/lib/calendar/calendarMarkers";
import { annualKindToLegendCategory } from "@/lib/calendar/legend";
import type { CalendarAnnualEvent, CalendarConfig } from "@/lib/types/calendar";
import { timelineMarkerId } from "@/lib/calendar/timeMarks";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

export type TimelineItemKind = "file" | "annual";

export interface TimelineDisplayItem {
  id: string;
  kind: TimelineItemKind;
  label: string;
  sortKey: bigint;
  path?: string;
  blockIndex?: number;
  lane: "manuscript" | "below";
  annualKind?: "birthday" | "cosmic";
}

const MANUSCRIPT_PREFIX = "Manuscrito/";

export function fileDisplayName(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? path;
  return base.replace(/\.md$/i, "");
}

export function isManuscriptPath(path: string): boolean {
  return path.replace(/\\/g, "/").startsWith(MANUSCRIPT_PREFIX);
}

export function isTimedEventPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return !normalized.startsWith(MANUSCRIPT_PREFIX);
}

function sortKeyForEvent(
  event: TimelineEvent,
  calendar: CalendarConfig,
): bigint | null {
  if (event.timestamp) {
    try {
      return BigInt(event.timestamp);
    } catch {
      /* fall through */
    }
  }
  const resolved = resolveTimeSortKey(event.rawTime, calendar);
  if (!resolved) return null;
  try {
    return BigInt(resolved);
  } catch {
    return null;
  }
}

function matchesFileFilters(
  event: TimelineEvent,
  filters: TimelineFilterState,
): boolean {
  const manuscript = isManuscriptPath(event.path);
  const timedEvent = isTimedEventPath(event.path);
  if (manuscript && filters.manuscript) return true;
  if (timedEvent && filters.events) return true;
  return false;
}

function annualMatchesFilter(
  annual: CalendarAnnualEvent,
  filters: TimelineFilterState,
): boolean {
  const category = annualKindToLegendCategory(annual.kind);
  if (category === "birthday" || category === "festival") return filters.festivals;
  if (category === "anniversary") return filters.anniversaries;
  if (category === "cosmic") return filters.cosmic;
  return true;
}

export function buildTimelineItems(
  events: TimelineEvent[],
  calendar: CalendarConfig,
  filters: TimelineFilterState,
): TimelineDisplayItem[] {
  const items: TimelineDisplayItem[] = [];

  for (const event of events) {
    if (!matchesFileFilters(event, filters)) continue;
    const sortKey = sortKeyForEvent(event, calendar);
    if (sortKey === null) continue;

    const manuscript = isManuscriptPath(event.path);
    items.push({
      id: timelineMarkerId(event),
      kind: "file",
      label: fileDisplayName(event.path),
      sortKey,
      path: event.path,
      blockIndex: event.blockIndex,
      lane: manuscript ? "manuscript" : "below",
    });
  }

  const annualActive = filters.festivals || filters.anniversaries || filters.cosmic;
  if (annualActive && items.length > 0) {
    const years = items.map((item) =>
      Number(fromAbsoluteDay(item.sortKey, calendar).year),
    );
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    for (const annual of calendar.annualEvents ?? []) {
      if (!annual.day || annual.day < 1) continue;
      if (!annualMatchesFilter(annual, filters)) continue;

      for (let year = minYear; year <= maxYear; year++) {
        if (!annualAppliesInYear(annual, year)) continue;
        const sortKey = toAbsoluteDay(
          { day: annual.day, month: annual.month, year },
          calendar,
        );
        items.push({
          id: `annual:${annual.id}:${year}`,
          kind: "annual",
          label: annual.name,
          sortKey,
          lane: "below",
          annualKind:
            annualKindToLegendCategory(annual.kind) === "cosmic"
              ? "cosmic"
              : "birthday",
        });
      }
    }
  }

  items.sort((a, b) => {
    if (a.sortKey === b.sortKey) return a.label.localeCompare(b.label);
    return a.sortKey < b.sortKey ? -1 : 1;
  });

  return items;
}

export interface PlacedTimelineItem extends TimelineDisplayItem {
  x: number;
  y: number;
  width: number;
  dateLabel?: string;
}

export function estimateLabelWidth(label: string): number {
  return Math.min(200, Math.max(72, label.length * 7 + 20));
}

/** Etiqueta compacta de fecha bajo el eje (día-mes-año). */
export function formatTimelineDate(sortKey: bigint, calendar: CalendarConfig): string {
  const parts = fromAbsoluteDay(sortKey, calendar);
  return `${parts.day}-${parts.month}-${parts.year}`;
}

/** Apila manuscritos hacia arriba cuando se solapan en X (carril 0 = más cerca del eje). */
export function layoutManuscriptLanesAbove(
  manuscriptItems: TimelineDisplayItem[],
  xForKey: (key: bigint) => number,
  estimateWidth: (label: string) => number,
): Map<string, number> {
  type Interval = { left: number; right: number };
  const lanes: Interval[][] = [];
  const result = new Map<string, number>();

  const sorted = [...manuscriptItems].sort((a, b) => {
    const xa = xForKey(a.sortKey);
    const xb = xForKey(b.sortKey);
    return xa - xb || a.id.localeCompare(b.id);
  });

  for (const item of sorted) {
    const x = xForKey(item.sortKey);
    const half = estimateWidth(item.label) / 2;
    const interval = { left: x - half, right: x + half };

    let laneIndex = 0;
    while (laneIndex < lanes.length) {
      const conflict = lanes[laneIndex].some(
        (existing) => interval.left < existing.right && interval.right > existing.left,
      );
      if (!conflict) break;
      laneIndex += 1;
    }

    if (laneIndex >= lanes.length) lanes.push([]);
    lanes[laneIndex].push(interval);
    result.set(item.id, laneIndex);
  }

  return result;
}

const COLLISION_X_EPS = 6;
const COLLISION_GAP = 10;

/** Separa cajas que comparten la misma X para evitar solapamiento visual. */
export function spreadCollidingBoxes(
  placed: PlacedTimelineItem[],
  lane: PlacedTimelineItem["lane"],
): void {
  const subset = placed
    .filter((item) => item.lane === lane)
    .sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.id.localeCompare(b.id);
    });

  let clusterStart = 0;
  while (clusterStart < subset.length) {
    let clusterEnd = clusterStart + 1;
    while (
      clusterEnd < subset.length &&
      Math.abs(subset[clusterEnd].x - subset[clusterStart].x) < COLLISION_X_EPS
    ) {
      clusterEnd += 1;
    }

    const cluster = subset.slice(clusterStart, clusterEnd);
    if (cluster.length > 1) {
      const totalWidth =
        cluster.reduce((sum, item) => sum + item.width, 0) +
        COLLISION_GAP * (cluster.length - 1);
      const center = cluster.reduce((sum, item) => sum + item.x, 0) / cluster.length;
      let cursor = center - totalWidth / 2;
      for (const item of cluster) {
        item.x = cursor + item.width / 2;
        cursor += item.width + COLLISION_GAP;
      }
    }

    clusterStart = clusterEnd;
  }
}

/** Asigna carriles bajo el eje para que las cajas no se solapen en X. */
export function layoutBelowLanes(
  belowItems: TimelineDisplayItem[],
  xForKey: (key: bigint) => number,
): Map<string, number> {
  type Interval = { left: number; right: number };
  const lanes: Interval[][] = [];
  const result = new Map<string, number>();

  const sorted = [...belowItems].sort((a, b) => {
    const xa = xForKey(a.sortKey);
    const xb = xForKey(b.sortKey);
    return xa - xb;
  });

  for (const item of sorted) {
    const x = xForKey(item.sortKey);
    const half = estimateLabelWidth(item.label) / 2;
    const interval = { left: x - half, right: x + half };

    let laneIndex = 0;
    while (laneIndex < lanes.length) {
      const conflict = lanes[laneIndex].some(
        (existing) => interval.left < existing.right && interval.right > existing.left,
      );
      if (!conflict) break;
      laneIndex += 1;
    }

    if (laneIndex >= lanes.length) lanes.push([]);
    lanes[laneIndex].push(interval);
    result.set(item.id, laneIndex);
  }

  return result;
}
