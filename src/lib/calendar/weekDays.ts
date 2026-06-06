import { toAbsoluteDay } from "@/lib/calendar/engine";
import type { CalendarConfig, CalendarWeekDay } from "@/lib/types/calendar";

/** Inicial mostrada en la cabecera de la grilla (primera letra del nombre). */
export function weekDayHeaderInitial(name: string, index: number): string {
  const trimmed = name.trim();
  if (trimmed.length > 0) {
    const first = [...trimmed][0] ?? "";
    return first.toLocaleUpperCase();
  }
  return String(index + 1);
}

export function syncWeekDays(
  daysPerWeek: number,
  existing: CalendarWeekDay[] | undefined,
  defaultName: (oneBasedIndex: number) => string,
): CalendarWeekDay[] {
  const count = Math.max(1, Math.floor(daysPerWeek) || 1);
  const prev = existing ?? [];
  return Array.from({ length: count }, (_, i) => {
    const kept = prev[i]?.name;
    if (kept !== undefined && kept !== "") {
      return { name: kept };
    }
    return { name: defaultName(i + 1) };
  });
}

export function resolveWeekDayNames(config: CalendarConfig): string[] {
  const count = Math.max(1, config.daysPerWeek);
  const stored = config.weekDays ?? [];
  return Array.from({ length: count }, (_, i) => stored[i]?.name ?? "");
}

/** Índice 0-based del día de la semana en el calendario ficticio del proyecto. */
export function resolveWeekDayIndex(
  year: number,
  month: number,
  day: number,
  config: CalendarConfig,
): number {
  const abs = toAbsoluteDay({ year, month, day }, config);
  const mod = Number(abs % BigInt(config.daysPerWeek));
  return ((mod % config.daysPerWeek) + config.daysPerWeek) % config.daysPerWeek;
}

/** Nombre del día de la semana desde `config.weekDays`. */
export function resolveWeekDayName(
  year: number,
  month: number,
  day: number,
  config: CalendarConfig,
): string {
  const index = resolveWeekDayIndex(year, month, day, config);
  const name = config.weekDays?.[index]?.name?.trim();
  if (name) return name;
  return `Día ${index + 1}`;
}

/** Etiquetas cortas (iniciales) para la fila de días de la semana en la grilla. */
export function resolveWeekDayHeaders(config: CalendarConfig): string[] {
  return resolveWeekDayNames(config).map((name, i) => weekDayHeaderInitial(name, i));
}
