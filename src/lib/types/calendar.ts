export interface CalendarEpoch {
  year: number;
  month: number;
  day: number;
}

export interface CalendarWeekDay {
  name: string;
}

export interface CalendarMonth {
  name: string;
  days: number;
  /** Horas por día (índice 0 = día 1). Si falta, se usa `hoursPerDay` del proyecto. */
  dayHours?: number[];
}

export interface LeapRules {
  enabled: boolean;
  everyYears: number;
  extraDays: number;
  monthIndex: number;
  linkedPath?: string;
}

export interface CalendarEra {
  name: string;
  startsAtYear: number;
}

export interface CalendarMonthDay {
  month: number;
  day: number;
}

export interface CalendarSeason {
  id: string;
  name: string;
  from: CalendarMonthDay;
  to: CalendarMonthDay;
  /** Ruta relativa opcional a un archivo con descripción de la estación. */
  linkedPath?: string;
  /** Color de resaltado suave en la vista anual. */
  highlightColor?: string;
  /** Opacidad del resaltado (0–1). Por defecto 0.18. */
  highlightOpacity?: number;
}

/** Momento del día (amanecer, mediodía, etc.) dentro de las horas del día. */
export interface CalendarDayPhase {
  id: string;
  name: string;
  /** Hora dentro del día (0 .. hoursPerDay - 1). */
  hour: number;
}

/** Horario de fases por estación (editable con independencia de la lista de estaciones). */
export interface CalendarSeasonDayPhases {
  seasonId: string;
  name: string;
  phases: CalendarDayPhase[];
}

/** `global`: un horario para todo el año; `perSeason`: uno por estación. */
export type CalendarDayPhasesMode = "global" | "perSeason";

export type CalendarAnnualKind = "festival" | "anniversary" | "cosmic";

export interface CalendarAnnualEvent {
  id: string;
  name: string;
  month: number;
  day: number;
  kind: CalendarAnnualKind | string;
  /** Años entre repeticiones; vacío = cada año. */
  repeatEveryYears?: number | null;
  startsAtYear: number;
  description?: string;
  /** Ruta relativa opcional (manuscrito, ficha, etc.). */
  linkedPath?: string;
  /** Hora dentro del día (0 .. hoursPerDay - 1); opcional. */
  hour?: number | null;
}

export interface SpecialYearCycle {
  id: string;
  name: string;
  intervalYears: number;
  startsAtYear: number;
  syncFromBase: boolean;
  months: CalendarMonth[];
  linkedPath?: string;
}

export interface CalendarConfig {
  version: number;
  epoch: CalendarEpoch;
  daysPerWeek: number;
  /** Nombres de cada día de la semana (índice 0 = primer día de la columna). */
  weekDays?: CalendarWeekDay[];
  hoursPerDay: number;
  /** Si true, las etiquetas de tiempo pueden incluir hora. */
  hoursEnabled?: boolean;
  months: CalendarMonth[];
  leapRules: LeapRules;
  eras: CalendarEra[];
  annualEvents: CalendarAnnualEvent[];
  /** Si true, se pueden definir ciclos de años especiales. */
  specialYearsEnabled?: boolean;
  specialYearCycles?: SpecialYearCycle[];
  seasons?: CalendarSeason[];
  /** Modo de fases del día; por defecto `perSeason`. */
  dayPhasesMode?: CalendarDayPhasesMode;
  /** Fases compartidas cuando `dayPhasesMode === "global"`. */
  globalDayPhases?: CalendarDayPhase[];
  /** Fases del día por estación (se sincroniza con `seasons` por `seasonId`). */
  seasonDayPhases?: CalendarSeasonDayPhases[];
}

export type ParsedTimeKind = "instant" | "mythic" | "unknown" | "invalid";

export interface ParsedTimeInstant {
  kind: "instant";
  absoluteDay: bigint;
}

export interface ParsedTimeSpecial {
  kind: "mythic" | "unknown";
}

export interface ParsedTimeInvalid {
  kind: "invalid";
}

export type ParsedTime = ParsedTimeInstant | ParsedTimeSpecial | ParsedTimeInvalid;

/** Formato MVP: `día.mes.año` con mes 1-indexado (ej. `14.3.1024`). */
export const CALENDAR_DATE_FORMAT_DOC =
  "day.month.year — e.g. 14.3.1024 (day 14, month 3, year 1024). Special labels: mythic, unknown.";

export const MYTHIC_SORT_KEY = "9223372036854775806";
export const UNKNOWN_SORT_KEY = "9223372036854775807";
