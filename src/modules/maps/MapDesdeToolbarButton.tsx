import { CalendarClock, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import { cn } from "@/lib/utils";

import { MapDesdeDialog } from "./MapDesdeDialog";

interface MapDesdeToolbarButtonProps {
  mapId: string;
  desde: string | null;
  desdeDisplay: string | null;
  calendar: CalendarConfig | null;
  baselineConfig: CalendarConfig | null;
  events: TimelineEvent[];
  disabled?: boolean;
  onUpdate: (desde: string | null) => Promise<void>;
  onSuggest: () => Promise<void>;
}

export function MapDesdeToolbarButton({
  mapId: _mapId,
  desde,
  desdeDisplay,
  calendar,
  baselineConfig,
  events,
  disabled = false,
  onUpdate,
  onSuggest,
}: MapDesdeToolbarButtonProps) {
  const { t } = useTranslation("maps");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isUnset = !desde?.trim();
  const title = isUnset
    ? t("topBar.configureDesde")
    : t("topBar.configureDesdeWithDate", { date: desdeDisplay ?? "" });

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
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={cn("size-7 shrink-0", isUnset && "border-dashed")}
        disabled={disabled || busy || !calendar}
        title={title}
        aria-label={title}
        onClick={() => setDialogOpen(true)}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CalendarClock className="size-3.5" />
        )}
      </Button>
      <MapDesdeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialDesde={desde}
        calendar={calendar}
        baselineConfig={baselineConfig}
        events={events}
        busy={busy}
        onSave={handleSave}
        onSuggest={isUnset ? handleSuggest : undefined}
      />
    </>
  );
}
