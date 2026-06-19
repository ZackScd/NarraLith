import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clampToCalendar, daysInMonth, formatTimeTag } from "@/lib/calendar/dateTags";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { parseMapDesde } from "@/lib/maps/mapDesde";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSecondarySummaryV1 } from "@/lib/types/maps";

interface DateDraft {
  day: number;
  month: number;
  year: number;
}

interface MapSecondaryMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secondary: MapSecondarySummaryV1 | null;
  calendar: CalendarConfig | null;
  busy: boolean;
  onSave: (patch: {
    name: string;
    tiempoInicio: string;
    tiempoFin?: string | null;
  }) => Promise<void>;
}

function draftFromRaw(raw: string | null, calendar: CalendarConfig): DateDraft {
  const parsed = parseMapDesde(raw);
  if (parsed) {
    return clampToCalendar(parsed, calendar);
  }
  return clampToCalendar(
    {
      day: calendar.epoch.day,
      month: calendar.epoch.month,
      year: calendar.epoch.year,
    },
    calendar,
  );
}

export function MapSecondaryMetaDialog({
  open,
  onOpenChange,
  secondary,
  calendar,
  busy,
  onSave,
}: MapSecondaryMetaDialogProps) {
  const { t } = useTranslation("maps");
  const [name, setName] = useState("");
  const [inicioDraft, setInicioDraft] = useState<DateDraft>({ day: 1, month: 1, year: 1 });
  const [closeEnabled, setCloseEnabled] = useState(false);
  const [finDraft, setFinDraft] = useState<DateDraft>({ day: 1, month: 1, year: 1 });

  useEffect(() => {
    if (!open || !calendar || !secondary) return;
    setName(secondary.name);
    setInicioDraft(draftFromRaw(secondary.tiempoInicio, calendar));
    setCloseEnabled(Boolean(secondary.tiempoFin?.trim()));
    setFinDraft(draftFromRaw(secondary.tiempoFin ?? secondary.tiempoInicio, calendar));
  }, [calendar, open, secondary]);

  if (!calendar || !secondary) return null;

  const monthCount = Math.max(1, effectiveCalendarForYear(inicioDraft.year, calendar).months.length);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({
      name: name.trim(),
      tiempoInicio: formatTimeTag(clampToCalendar(inicioDraft, calendar)),
      tiempoFin: closeEnabled
        ? formatTimeTag(clampToCalendar(finDraft, calendar))
        : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("secondary.metaTitle")}</DialogTitle>
            <DialogDescription>{t("secondary.metaDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="secondary-meta-name">{t("secondary.nameLabel")}</Label>
              <Input
                id="secondary-meta-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("secondary.tiempoInicioLabel")}</Label>
              <div className="grid grid-cols-3 gap-2">
                <EditableNumberInput
                  className="h-9 w-full text-center text-sm"
                  value={inicioDraft.day}
                  min={1}
                  max={daysInMonth(inicioDraft.month - 1, inicioDraft.year, calendar)}
                  fallback={1}
                  onValueChange={(value) =>
                    setInicioDraft((prev) =>
                      clampToCalendar({ ...prev, day: value ?? 1 }, calendar),
                    )
                  }
                />
                <EditableNumberInput
                  className="h-9 w-full text-center text-sm"
                  value={inicioDraft.month}
                  min={1}
                  max={monthCount}
                  fallback={1}
                  onValueChange={(value) =>
                    setInicioDraft((prev) =>
                      clampToCalendar({ ...prev, month: value ?? 1 }, calendar),
                    )
                  }
                />
                <EditableNumberInput
                  className="h-9 w-full text-center text-sm"
                  value={inicioDraft.year}
                  fallback={calendar.epoch.year}
                  onValueChange={(value) =>
                    setInicioDraft((prev) =>
                      clampToCalendar({ ...prev, year: value ?? calendar.epoch.year }, calendar),
                    )
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="secondary-meta-close"
                type="checkbox"
                className="size-4 rounded border-input"
                checked={closeEnabled}
                onChange={(event) => setCloseEnabled(event.target.checked)}
              />
              <Label htmlFor="secondary-meta-close">{t("secondary.closePatchLabel")}</Label>
            </div>

            {closeEnabled ? (
              <div className="space-y-1.5">
                <Label>{t("secondary.tiempoFinLabel")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <EditableNumberInput
                    className="h-9 w-full text-center text-sm"
                    value={finDraft.day}
                    min={1}
                    max={daysInMonth(finDraft.month - 1, finDraft.year, calendar)}
                    fallback={1}
                    onValueChange={(value) =>
                      setFinDraft((prev) =>
                        clampToCalendar({ ...prev, day: value ?? 1 }, calendar),
                      )
                    }
                  />
                  <EditableNumberInput
                    className="h-9 w-full text-center text-sm"
                    value={finDraft.month}
                    min={1}
                    max={monthCount}
                    fallback={1}
                    onValueChange={(value) =>
                      setFinDraft((prev) =>
                        clampToCalendar({ ...prev, month: value ?? 1 }, calendar),
                      )
                    }
                  />
                  <EditableNumberInput
                    className="h-9 w-full text-center text-sm"
                    value={finDraft.year}
                    fallback={calendar.epoch.year}
                    onValueChange={(value) =>
                      setFinDraft((prev) =>
                        clampToCalendar(
                          { ...prev, year: value ?? calendar.epoch.year },
                          calendar,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("secondary.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("secondary.metaSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
