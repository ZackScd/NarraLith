import type { CalendarAnnualKind } from "@/lib/types/calendar";

export type CalendarLegendCategory =
  | "manuscript"
  | "event"
  | "birthday"
  | "cosmic"
  | "festival"
  | "anniversary";

export interface CalendarLegendItem {
  id: CalendarLegendCategory;
  labelKey: string;
  color: string;
}

export const CALENDAR_LEGEND: CalendarLegendItem[] = [
  { id: "manuscript", labelKey: "legend.manuscript", color: "var(--cal-manuscript)" },
  { id: "event", labelKey: "legend.event", color: "var(--cal-event)" },
  { id: "birthday", labelKey: "legend.birthday", color: "var(--cal-birthday)" },
  { id: "cosmic", labelKey: "legend.cosmic", color: "var(--cal-cosmic)" },
  { id: "festival", labelKey: "legend.festival", color: "var(--cal-festival)" },
  {
    id: "anniversary",
    labelKey: "legend.anniversary",
    color: "var(--cal-anniversary)",
  },
];

export function annualKindToLegendCategory(
  kind: string | undefined,
): CalendarLegendCategory {
  const k = (kind ?? "annual").toLowerCase();
  if (k === "birthday" || k === "cumpleaños") return "birthday";
  if (k === "cosmic" || k === "stellar" || k === "cósmico") return "cosmic";
  if (k === "anniversary" || k === "aniversario") return "anniversary";
  if (k === "festival" || k === "festividad") return "festival";
  return "festival";
}

export function legendCategoryForAnnualKind(
  kind: CalendarAnnualKind | string,
): CalendarLegendCategory {
  return annualKindToLegendCategory(kind);
}
