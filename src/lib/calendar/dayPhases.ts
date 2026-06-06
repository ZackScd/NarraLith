import type {
  CalendarConfig,
  CalendarDayPhase,
  CalendarSeason,
  CalendarSeasonDayPhases,
} from "@/lib/types/calendar";

export function isGlobalDayPhasesMode(mode: string | undefined): boolean {
  return mode === "global";
}

export function resolveGlobalDayPhases(
  draft: CalendarConfig,
  defaultLabels: {
    dawn: string;
    noon: string;
    sunset: string;
    dusk: string;
    midnight: string;
  },
): CalendarDayPhase[] {
  const existing = draft.globalDayPhases ?? [];
  if (existing.length > 0) {
    return clampDayPhases(existing, draft.hoursPerDay);
  }
  return createDefaultDayPhases(draft.hoursPerDay, defaultLabels);
}

export function newDayPhaseId(): string {
  return `phase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultDayPhases(
  hoursPerDay: number,
  labels: {
    dawn: string;
    noon: string;
    sunset: string;
    dusk: string;
    midnight: string;
  },
): CalendarDayPhase[] {
  const h = Math.max(1, hoursPerDay);
  const at = (fraction: number) =>
    Math.min(h - 1, Math.max(0, Math.floor(h * fraction)));
  return [
    { id: newDayPhaseId(), name: labels.midnight, hour: 0 },
    { id: newDayPhaseId(), name: labels.dawn, hour: at(0.25) },
    { id: newDayPhaseId(), name: labels.noon, hour: at(0.5) },
    { id: newDayPhaseId(), name: labels.sunset, hour: at(0.75) },
    { id: newDayPhaseId(), name: labels.dusk, hour: at(0.83) },
  ];
}

export function clampPhaseHour(hour: number, hoursPerDay: number): number {
  const max = Math.max(0, hoursPerDay - 1);
  return Math.max(0, Math.min(max, Math.floor(hour) || 0));
}

export function clampDayPhases(
  phases: CalendarDayPhase[],
  hoursPerDay: number,
): CalendarDayPhase[] {
  return phases.map((p) => ({
    ...p,
    hour: clampPhaseHour(p.hour, hoursPerDay),
  }));
}

/** `true` si cada fase tiene una hora mayor o igual que la anterior (orden del día). */
export function areDayPhaseHoursAscending(phases: CalendarDayPhase[]): boolean {
  for (let i = 1; i < phases.length; i++) {
    if (phases[i].hour < phases[i - 1].hour) {
      return false;
    }
  }
  return true;
}

/** Mantiene una entrada por estación; conserva fases existentes y añade entradas nuevas. */
export function syncSeasonDayPhases(
  seasons: CalendarSeason[],
  existing: CalendarSeasonDayPhases[],
  hoursPerDay: number,
  defaultLabels: {
    dawn: string;
    noon: string;
    sunset: string;
    dusk: string;
    midnight: string;
  },
): CalendarSeasonDayPhases[] {
  const byId = new Map(existing.map((e) => [e.seasonId, e]));
  return seasons.map((season) => {
    const prev = byId.get(season.id);
    if (prev) {
      return {
        ...prev,
        name: season.name,
        phases: clampDayPhases(
          prev.phases.length > 0
            ? prev.phases
            : createDefaultDayPhases(hoursPerDay, defaultLabels),
          hoursPerDay,
        ),
      };
    }
    return {
      seasonId: season.id,
      name: season.name,
      phases: createDefaultDayPhases(hoursPerDay, defaultLabels),
    };
  });
}
