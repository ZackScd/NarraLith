import { parseDateString } from "@/lib/calendar/engine";
import { classifyTimeTag } from "@/lib/calendar/classifyTimeTag";
import {
  canAlignMonthsAt,
  isInsertedMonth,
  isSameMonthDaysChange,
  isShiftedMonthRemoval,
  monthStructuralSig,
} from "@/lib/calendar/calendarMonthAlign";
import type {
  CalendarConfig,
  CalendarEpoch,
  CalendarMonth,
  LeapRules,
  SpecialYearCycle,
} from "@/lib/types/calendar";

export type CalendarStructuralChangeKind =
  | "month_added"
  | "month_removed"
  | "month_reordered"
  | "month_days_changed"
  | "epoch_changed"
  | "leap_changed"
  | "week_grid_changed"
  | "special_year_added"
  | "special_year_removed"
  | "special_year_changed";

export interface CalendarStructuralChange {
  kind: CalendarStructuralChangeKind;
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
}

export interface CalendarStructuralDiffResult {
  changes: CalendarStructuralChange[];
  isStructural: boolean;
  affectsTimeMarkers: boolean;
  affectedMarkerCount: number;
  summary: string;
}

export interface CalendarStructuralDiffOptions {
  baselineConfig?: CalendarConfig | null;
  timelineRawTimes?: string[];
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const key of a) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const key of b) {
    const next = (counts.get(key) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(key, next);
  }
  return [...counts.values()].every((value) => value === 0);
}

function epochEqual(a: CalendarEpoch, b: CalendarEpoch): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function leapEqual(a: LeapRules, b: LeapRules): boolean {
  return (
    a.enabled === b.enabled &&
    a.everyYears === b.everyYears &&
    a.extraDays === b.extraDays &&
    a.monthIndex === b.monthIndex &&
    (a.linkedPath ?? "") === (b.linkedPath ?? "")
  );
}

function specialYearCycleStructural(cycle: SpecialYearCycle): string {
  return JSON.stringify({
    intervalYears: cycle.intervalYears,
    startsAtYear: cycle.startsAtYear,
    syncFromBase: cycle.syncFromBase,
    months: cycle.months.map((month) => monthStructuralSig(month)),
  });
}

function diffSpecialYearCycles(
  diskConfig: CalendarConfig,
  draftConfig: CalendarConfig,
): CalendarStructuralChange[] {
  const changes: CalendarStructuralChange[] = [];
  const diskEnabled = diskConfig.specialYearsEnabled !== false;
  const draftEnabled = draftConfig.specialYearsEnabled !== false;

  if (diskEnabled !== draftEnabled) {
    changes.push({
      kind: "special_year_changed",
      summaryKey: draftEnabled
        ? "structuralDiff.specialYearsEnabled"
        : "structuralDiff.specialYearsDisabled",
    });
  }

  const diskCycles = diskConfig.specialYearCycles ?? [];
  const draftCycles = draftConfig.specialYearCycles ?? [];
  const diskById = new Map(diskCycles.map((cycle) => [cycle.id, cycle]));
  const draftById = new Map(draftCycles.map((cycle) => [cycle.id, cycle]));

  for (const diskCycle of diskCycles) {
    const draftCycle = draftById.get(diskCycle.id);
    if (!draftCycle) {
      changes.push({
        kind: "special_year_removed",
        summaryKey: "structuralDiff.specialYearRemoved",
        summaryParams: { name: diskCycle.name.trim() || diskCycle.id },
      });
      continue;
    }
    if (specialYearCycleStructural(diskCycle) !== specialYearCycleStructural(draftCycle)) {
      changes.push({
        kind: "special_year_changed",
        summaryKey: "structuralDiff.specialYearModified",
        summaryParams: { name: draftCycle.name.trim() || draftCycle.id },
      });
    }
  }

  for (const draftCycle of draftCycles) {
    if (!diskById.has(draftCycle.id)) {
      changes.push({
        kind: "special_year_added",
        summaryKey: "structuralDiff.specialYearAdded",
        summaryParams: { name: draftCycle.name.trim() || draftCycle.id },
      });
    }
  }

  return changes;
}

function diffWeekGrid(disk: CalendarConfig, draft: CalendarConfig): CalendarStructuralChange[] {
  if (disk.daysPerWeek === draft.daysPerWeek) {
    return [];
  }
  return [
    {
      kind: "week_grid_changed",
      summaryKey: "structuralDiff.weekGridChanged",
      summaryParams: {
        from: disk.daysPerWeek,
        to: draft.daysPerWeek,
      },
    },
  ];
}

function diffMonths(
  diskMonths: CalendarMonth[],
  draftMonths: CalendarMonth[],
): CalendarStructuralChange[] {
  const diskSigs = diskMonths.map(monthStructuralSig);
  const draftSigs = draftMonths.map(monthStructuralSig);

  if (diskSigs.length === draftSigs.length && diskSigs.every((sig, i) => sig === draftSigs[i])) {
    return [];
  }

  if (
    diskSigs.length === draftSigs.length &&
    sameMultiset(diskSigs, draftSigs) &&
    !diskSigs.every((sig, i) => sig === draftSigs[i])
  ) {
    return [
      {
        kind: "month_reordered",
        summaryKey: "structuralDiff.monthReordered",
      },
    ];
  }

  const changes: CalendarStructuralChange[] = [];
  let i = 0;
  let j = 0;

  while (i < diskMonths.length || j < draftMonths.length) {
    if (
      i < diskMonths.length &&
      j < draftMonths.length &&
      canAlignMonthsAt(diskMonths, draftMonths, diskSigs, draftSigs, i, j)
    ) {
      i += 1;
      j += 1;
      continue;
    }

    if (
      i < diskMonths.length &&
      (isShiftedMonthRemoval(diskMonths, draftMonths, diskSigs, draftSigs, i, j) ||
        j >= draftMonths.length)
    ) {
      changes.push({
        kind: "month_removed",
        summaryKey: "structuralDiff.monthRemoved",
        summaryParams: { index: i + 1, name: diskMonths[i]!.name },
      });
      i += 1;
      continue;
    }

    if (
      i < diskMonths.length &&
      j < draftMonths.length &&
      isSameMonthDaysChange(diskMonths, draftMonths, diskSigs, draftSigs, i, j)
    ) {
      changes.push({
        kind: "month_days_changed",
        summaryKey: "structuralDiff.monthDaysChanged",
        summaryParams: {
          index: j + 1,
          fromDays: diskMonths[i]!.days,
          toDays: draftMonths[j]!.days,
        },
      });
      i += 1;
      j += 1;
      continue;
    }

    if (
      j < draftMonths.length &&
      (isInsertedMonth(diskMonths, draftMonths, diskSigs, draftSigs, i, j) || i >= diskMonths.length)
    ) {
      changes.push({
        kind: "month_added",
        summaryKey: "structuralDiff.monthAdded",
        summaryParams: { index: j + 1, days: draftMonths[j]!.days },
      });
      j += 1;
      continue;
    }

    if (i < diskMonths.length) {
      changes.push({
        kind: "month_removed",
        summaryKey: "structuralDiff.monthRemoved",
        summaryParams: { index: i + 1, name: diskMonths[i]!.name },
      });
      i += 1;
      continue;
    }

    changes.push({
      kind: "month_added",
      summaryKey: "structuralDiff.monthAdded",
      summaryParams: { index: j + 1, days: draftMonths[j]!.days },
    });
    j += 1;
  }

  return changes;
}

export function countAffectedTimeMarkers(
  draftConfig: CalendarConfig,
  baselineConfig: CalendarConfig | null | undefined,
  timelineRawTimes: string[],
  options?: { structuralEdit?: boolean },
): number {
  if (!baselineConfig) return 0;

  let count = 0;
  for (const raw of timelineRawTimes) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const classified = classifyTimeTag(trimmed, draftConfig, baselineConfig);
    if (classified.status === "invalid") {
      count += 1;
      continue;
    }
    if (classified.status === "structure_stale" && options?.structuralEdit) {
      count += 1;
      continue;
    }
    if (classified.status !== "valid") continue;

    const draftParsed = parseDateString(trimmed, draftConfig);
    if (draftParsed.kind !== "instant") continue;

    const baselineParsed = parseDateString(trimmed, baselineConfig);
    if (baselineParsed.kind !== "instant") continue;

    if (draftParsed.absoluteDay !== baselineParsed.absoluteDay) {
      count += 1;
    }
  }
  return count;
}

function hoursGridChanged(disk: CalendarConfig, draft: CalendarConfig): boolean {
  return (
    disk.hoursPerDay !== draft.hoursPerDay ||
    (disk.hoursEnabled ?? false) !== (draft.hoursEnabled ?? false)
  );
}

export function calendarStructuralDiff(
  diskConfig: CalendarConfig,
  draftConfig: CalendarConfig,
  options?: CalendarStructuralDiffOptions,
): CalendarStructuralDiffResult {
  const changes: CalendarStructuralChange[] = [];

  changes.push(...diffMonths(diskConfig.months, draftConfig.months));

  if (!epochEqual(diskConfig.epoch, draftConfig.epoch)) {
    changes.push({
      kind: "epoch_changed",
      summaryKey: "structuralDiff.epochChanged",
    });
  }

  if (!leapEqual(diskConfig.leapRules, draftConfig.leapRules)) {
    changes.push({
      kind: "leap_changed",
      summaryKey: "structuralDiff.leapChanged",
    });
  }

  changes.push(...diffWeekGrid(diskConfig, draftConfig));
  changes.push(...diffSpecialYearCycles(diskConfig, draftConfig));

  const hoursChanged = hoursGridChanged(diskConfig, draftConfig);
  const structuralEdit = changes.length > 0 || hoursChanged;

  const affectedMarkerCount = countAffectedTimeMarkers(
    draftConfig,
    options?.baselineConfig,
    options?.timelineRawTimes ?? [],
    { structuralEdit },
  );

  const isStructural = structuralEdit;
  const affectsTimeMarkers = affectedMarkerCount > 0;

  let summary = "";
  if (affectsTimeMarkers) {
    summary = "markers";
  } else if (isStructural) {
    summary = "structural";
  }

  return {
    changes,
    isStructural,
    affectsTimeMarkers,
    affectedMarkerCount,
    summary,
  };
}
