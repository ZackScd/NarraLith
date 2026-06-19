import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import { trackAction } from "@/lib/action-audit/trackAction";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

import { MapDesdeDialog } from "./MapDesdeDialog";

interface MapPreviewTFieldProps {
  mapId: string;
  previewT: string | null;
  calendar: CalendarConfig | null;
  baselineConfig: CalendarConfig | null;
  events: TimelineEvent[];
  onChange: (previewT: string) => void;
}

export function MapPreviewTField({
  mapId,
  previewT,
  calendar,
  baselineConfig,
  events,
  onChange,
}: MapPreviewTFieldProps) {
  const { t } = useTranslation("maps");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const display = formatMapDesdeDisplay(previewT, calendar);

  const handleSave = async (nextT: string) => {
    setBusy(true);
    try {
      const previousT = previewT;
      onChange(nextT);
      trackAction("map", "previewTSet", {
        mapId,
        previewT: nextT,
        previousT,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">{t("previewT.label")}</span>
        {display ? (
          <span className="font-medium">{display}</span>
        ) : (
          <span className="text-muted-foreground">{t("previewT.unset")}</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={busy || !calendar}
          onClick={() => setDialogOpen(true)}
        >
          {t("previewT.edit")}
        </Button>
      </div>

      <MapDesdeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialDesde={previewT}
        calendar={calendar}
        baselineConfig={baselineConfig}
        events={events}
        busy={busy}
        onSave={handleSave}
        titleKey="previewT.dialogTitle"
        descriptionKey="previewT.dialogDescription"
      />
    </>
  );
}
