import type { TimelineFilterState } from "@/stores/useTimelineStore";

import { PanelFilterCheckbox } from "./PanelFilterCheckbox";
import { PanelGroupLabel } from "./PanelGroupLabel";

export interface TimelineFiltersLabels {
  sectionFilters: string;
  sectionAnnuals: string;
  manuscript: string;
  events: string;
  festivals: string;
  anniversaries: string;
  cosmic: string;
}

interface TimelineFiltersSectionProps {
  filters: TimelineFilterState;
  onToggle: (key: keyof TimelineFilterState) => void;
  labels: TimelineFiltersLabels;
}

export function TimelineFiltersSection({
  filters,
  onToggle,
  labels,
}: TimelineFiltersSectionProps) {
  const toggle = (key: keyof TimelineFilterState) => () => onToggle(key);

  return (
    <>
      <PanelGroupLabel>{labels.sectionFilters}</PanelGroupLabel>
      <PanelFilterCheckbox
        checked={filters.manuscript}
        label={labels.manuscript}
        onCheckedChange={toggle("manuscript")}
      />
      <PanelFilterCheckbox
        checked={filters.events}
        label={labels.events}
        onCheckedChange={toggle("events")}
      />
      <PanelGroupLabel className="mt-2">{labels.sectionAnnuals}</PanelGroupLabel>
      <PanelFilterCheckbox
        checked={filters.festivals}
        label={labels.festivals}
        onCheckedChange={toggle("festivals")}
        indent
      />
      <PanelFilterCheckbox
        checked={filters.anniversaries}
        label={labels.anniversaries}
        onCheckedChange={toggle("anniversaries")}
        indent
      />
      <PanelFilterCheckbox
        checked={filters.cosmic}
        label={labels.cosmic}
        onCheckedChange={toggle("cosmic")}
        indent
      />
    </>
  );
}
