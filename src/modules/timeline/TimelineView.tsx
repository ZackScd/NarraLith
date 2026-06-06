import { useState } from "react";
import { useTranslation } from "react-i18next";

import { TimelineHorizontal } from "@/modules/timeline/TimelineHorizontal";
import { useTimelineStore } from "@/stores/useTimelineStore";

/** Altura de la franja del botón Calendario en el panel derecho (alineación). */
export const TIMELINE_CALENDAR_ROW_H = "h-12";

export function TimelineView() {
  const { t } = useTranslation("timeline");
  const orientation = useTimelineStore((s) => s.orientation);
  const [headerRangeLabel, setHeaderRangeLabel] = useState("");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h2>
        {headerRangeLabel ? (
          <>
            <span
              className="text-xl font-semibold tracking-tight text-muted-foreground"
              aria-hidden
            >
              ·
            </span>
            <span
              className="text-xl font-semibold tracking-tight text-foreground"
              aria-live="polite"
            >
              {headerRangeLabel}
            </span>
          </>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {orientation === "horizontal" ? (
          <TimelineHorizontal onRangeLabelChange={setHeaderRangeLabel} />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[var(--timeline-canvas)] text-sm text-muted-foreground">
            {t("verticalPlaceholder")}
          </div>
        )}
      </div>
    </div>
  );
}
