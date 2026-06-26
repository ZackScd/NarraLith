import { sortSecondariesForCompose } from "@/lib/maps/mapSecondaryVisibility";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSecondarySummaryV1 } from "@/lib/types/maps";
import type { PatchListSortMode } from "@/stores/useMapLayersWindowStore";

export function sortSecondariesForPanel(
  secondaries: MapSecondarySummaryV1[],
  mode: PatchListSortMode,
  calendar: CalendarConfig | null,
): MapSecondarySummaryV1[] {
  if (mode === "manual") {
    return secondaries;
  }
  if (mode === "chrono" && calendar) {
    return sortSecondariesForCompose(secondaries, calendar);
  }
  if (mode === "baseFirst") {
    return [...secondaries].reverse();
  }
  return secondaries;
}
