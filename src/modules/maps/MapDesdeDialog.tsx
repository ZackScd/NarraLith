import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { clampToCalendar, daysInMonth, formatTimeTag, parseTimeTag } from "@/lib/calendar/dateTags";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { resolveMarkerPlacement } from "@/lib/calendar/markerPlacement";
import { parseMapDesde } from "@/lib/maps/mapDesde";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

interface MapDesdeDraft {
  day: number;
  month: number;
  year: number;
}

interface MapDesdeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDesde: string | null;
  calendar: CalendarConfig | null;
  baselineConfig: CalendarConfig | null;
  events: TimelineEvent[];
  busy: boolean;
  onSave: (desde: string) => Promise<void>;
  titleKey?: string;
  descriptionKey?: string;
}

function draftFromDesde(
  initialDesde: string | null,
  calendar: CalendarConfig,
): MapDesdeDraft {
  const parsed = parseMapDesde(initialDesde);
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

function buildMarkedDates(
  events: TimelineEvent[],
  calendar: CalendarConfig,
  baselineConfig: CalendarConfig | null,
): MapDesdeDraft[] {
  const seen = new Set<string>();
  const results: MapDesdeDraft[] = [];

  for (const event of events) {
    const placement = resolveMarkerPlacement(event, calendar, baselineConfig);
    if (!placement) continue;
    const parsed = parseTimeTag(placement.rawTime);
    if (!parsed) continue;
    const key = formatTimeTag(parsed);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(clampToCalendar(parsed, calendar));
  }

  return results.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });
}

export function MapDesdeDialog({
  open,
  onOpenChange,
  initialDesde,
  calendar,
  baselineConfig,
  events,
  busy,
  onSave,
  titleKey = "desde.dialogTitle",
  descriptionKey = "desde.dialogDescription",
}: MapDesdeDialogProps) {
  const { t } = useTranslation("maps");
  const [draft, setDraft] = useState<MapDesdeDraft>({ day: 1, month: 1, year: 1 });
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !calendar) return;
    setDraft(draftFromDesde(initialDesde, calendar));
    setErrorKey(null);
  }, [calendar, initialDesde, open]);

  const markedDates = useMemo(() => {
    if (!calendar) return [];
    return buildMarkedDates(events, calendar, baselineConfig);
  }, [baselineConfig, calendar, events]);

  if (!calendar) return null;

  const monthCount = Math.max(1, effectiveCalendarForYear(draft.year, calendar).months.length);
  const maxDay = daysInMonth(draft.month - 1, draft.year, calendar);

  const patchDraft = (patch: Partial<MapDesdeDraft>) => {
    setDraft((prev) => clampToCalendar({ ...prev, ...patch }, calendar));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey(null);
    try {
      await onSave(formatTimeTag(clampToCalendar(draft, calendar)));
      onOpenChange(false);
    } catch {
      setErrorKey("errors.generic");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t(titleKey)}</DialogTitle>
            <DialogDescription>{t(descriptionKey)}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="map-desde-day">{t("desde.dayLabel")}</Label>
              <EditableNumberInput
                id="map-desde-day"
                className="h-9 w-full text-center text-sm"
                value={draft.day}
                min={1}
                max={maxDay}
                fallback={1}
                onValueChange={(value) => patchDraft({ day: value ?? 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="map-desde-month">{t("desde.monthLabel")}</Label>
              <EditableNumberInput
                id="map-desde-month"
                className="h-9 w-full text-center text-sm"
                value={draft.month}
                min={1}
                max={monthCount}
                fallback={1}
                onValueChange={(value) => patchDraft({ month: value ?? 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="map-desde-year">{t("desde.yearLabel")}</Label>
              <EditableNumberInput
                id="map-desde-year"
                className="h-9 w-full text-center text-sm"
                value={draft.year}
                fallback={calendar.epoch.year}
                onValueChange={(value) =>
                  patchDraft({ year: value ?? calendar.epoch.year })
                }
              />
            </div>
          </div>

          {markedDates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("desde.markedDatesLabel")}
              </p>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {markedDates.map((parts) => {
                  const raw = formatTimeTag(parts);
                  return (
                    <Button
                      key={raw}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setDraft(parts)}
                    >
                      {formatTimeTag(parts).replace(/\./g, "-")}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {errorKey ? (
            <p className="text-sm text-destructive">{t(errorKey)}</p>
          ) : null}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("desde.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("desde.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
