import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

import { MapDesdeDialog } from "./MapDesdeDialog";

interface MapDesdeFieldProps {
  mapId: string;
  desde: string | null;
  calendar: CalendarConfig | null;
  baselineConfig: CalendarConfig | null;
  events: TimelineEvent[];
  onUpdate: (desde: string | null) => Promise<void>;
  onSuggest: () => Promise<void>;
}

export function MapDesdeField({
  mapId: _mapId,
  desde,
  calendar,
  baselineConfig,
  events,
  onUpdate,
  onSuggest,
}: MapDesdeFieldProps) {
  const { t } = useTranslation("maps");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const display = formatMapDesdeDisplay(desde, calendar);
  const isUnset = !desde?.trim();

  const handleSave = async (nextDesde: string) => {
    setBusy(true);
    try {
      await onUpdate(nextDesde);
    } finally {
      setBusy(false);
    }
  };

  const handleSuggest = async () => {
    setBusy(true);
    try {
      await onSuggest();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">{t("desde.label")}</span>
        {isUnset ? (
          <span className="text-muted-foreground">{t("desde.unset")}</span>
        ) : (
          <span className="font-medium">{display}</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={busy || !calendar}
          onClick={() => setDialogOpen(true)}
        >
          {t("desde.edit")}
        </Button>
        {isUnset ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={busy || !calendar}
            onClick={() => void handleSuggest()}
          >
            {t("desde.suggest")}
          </Button>
        ) : null}
      </div>

      <MapDesdeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialDesde={desde}
        calendar={calendar}
        baselineConfig={baselineConfig}
        events={events}
        busy={busy}
        onSave={handleSave}
      />
    </>
  );
}
