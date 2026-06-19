import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import type { MapPreviewTSource } from "@/lib/maps/mapPreviewT";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

import { MapDesdeDialog } from "./MapDesdeDialog";

interface MapPreviewTFieldProps {
  previewT: string | null;
  calendar: CalendarConfig | null;
  baselineConfig: CalendarConfig | null;
  events: TimelineEvent[];
  allowEdit?: boolean;
  onPreviewTChange: (previewT: string, source: MapPreviewTSource) => void;
}

export function MapPreviewTField({
  previewT,
  calendar,
  baselineConfig,
  events,
  allowEdit = true,
  onPreviewTChange,
}: MapPreviewTFieldProps) {
  const { t } = useTranslation("maps");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const display = formatMapDesdeDisplay(previewT, calendar);

  const handleSave = async (nextT: string) => {
    setBusy(true);
    try {
      onPreviewTChange(nextT, "picker");
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
        {allowEdit ? (
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
        ) : null}
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
