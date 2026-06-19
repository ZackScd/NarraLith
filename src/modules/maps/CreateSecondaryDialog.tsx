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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clampToCalendar, daysInMonth, formatTimeTag, parseTimeTag } from "@/lib/calendar/dateTags";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { parseMapDesde } from "@/lib/maps/mapDesde";
import type { CalendarConfig } from "@/lib/types/calendar";

interface DateDraft {
  day: number;
  month: number;
  year: number;
}

interface CreateSecondaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: CalendarConfig | null;
  defaultTiempoInicio: string | null;
  mapDesde: string | null;
  busy: boolean;
  onCreate: (draft: {
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

export function CreateSecondaryDialog({
  open,
  onOpenChange,
  calendar,
  defaultTiempoInicio,
  mapDesde,
  busy,
  onCreate,
}: CreateSecondaryDialogProps) {
  const { t } = useTranslation("maps");
  const [name, setName] = useState("");
  const [inicioDraft, setInicioDraft] = useState<DateDraft>({ day: 1, month: 1, year: 1 });
  const [closeEnabled, setCloseEnabled] = useState(false);
  const [finDraft, setFinDraft] = useState<DateDraft>({ day: 1, month: 1, year: 1 });
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !calendar) return;
    setName("");
    setInicioDraft(draftFromRaw(defaultTiempoInicio, calendar));
    setFinDraft(draftFromRaw(defaultTiempoInicio, calendar));
    setCloseEnabled(false);
    setErrorKey(null);
  }, [calendar, defaultTiempoInicio, open]);

  const showDesdeWarning = useMemo(() => !mapDesde?.trim(), [mapDesde]);

  if (!calendar) return null;

  const monthCount = Math.max(1, effectiveCalendarForYear(inicioDraft.year, calendar).months.length);
  const maxInicioDay = daysInMonth(inicioDraft.month - 1, inicioDraft.year, calendar);
  const maxFinDay = daysInMonth(finDraft.month - 1, finDraft.year, calendar);

  const patchInicio = (patch: Partial<DateDraft>) => {
    setInicioDraft((prev) => clampToCalendar({ ...prev, ...patch }, calendar));
  };

  const patchFin = (patch: Partial<DateDraft>) => {
    setFinDraft((prev) => clampToCalendar({ ...prev, ...patch }, calendar));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorKey("secondary.errors.name_required");
      return;
    }
    const tiempoInicio = formatTimeTag(clampToCalendar(inicioDraft, calendar));
    if (!parseTimeTag(tiempoInicio)) {
      setErrorKey("errors.invalid_desde");
      return;
    }
    const tiempoFin = closeEnabled
      ? formatTimeTag(clampToCalendar(finDraft, calendar))
      : null;
    try {
      await onCreate({ name: trimmed, tiempoInicio, tiempoFin });
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
            <DialogTitle>{t("secondary.createTitle")}</DialogTitle>
            <DialogDescription>{t("secondary.createDescription")}</DialogDescription>
          </DialogHeader>

          {showDesdeWarning ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("secondary.noDesdeWarning")}
            </p>
          ) : null}

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="secondary-name">{t("secondary.nameLabel")}</Label>
              <Input
                id="secondary-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("secondary.namePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("secondary.tiempoInicioLabel")}</Label>
              <div className="grid grid-cols-3 gap-2">
                <EditableNumberInput
                  className="h-9 w-full text-center text-sm"
                  value={inicioDraft.day}
                  min={1}
                  max={maxInicioDay}
                  fallback={1}
                  onValueChange={(value) => patchInicio({ day: value ?? 1 })}
                />
                <EditableNumberInput
                  className="h-9 w-full text-center text-sm"
                  value={inicioDraft.month}
                  min={1}
                  max={monthCount}
                  fallback={1}
                  onValueChange={(value) => patchInicio({ month: value ?? 1 })}
                />
                <EditableNumberInput
                  className="h-9 w-full text-center text-sm"
                  value={inicioDraft.year}
                  fallback={calendar.epoch.year}
                  onValueChange={(value) =>
                    patchInicio({ year: value ?? calendar.epoch.year })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="secondary-close-enabled"
                type="checkbox"
                className="size-4 rounded border-input"
                checked={closeEnabled}
                onChange={(event) => setCloseEnabled(event.target.checked)}
              />
              <Label htmlFor="secondary-close-enabled">{t("secondary.closePatchLabel")}</Label>
            </div>

            {closeEnabled ? (
              <div className="space-y-1.5">
                <Label>{t("secondary.tiempoFinLabel")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <EditableNumberInput
                    className="h-9 w-full text-center text-sm"
                    value={finDraft.day}
                    min={1}
                    max={maxFinDay}
                    fallback={1}
                    onValueChange={(value) => patchFin({ day: value ?? 1 })}
                  />
                  <EditableNumberInput
                    className="h-9 w-full text-center text-sm"
                    value={finDraft.month}
                    min={1}
                    max={monthCount}
                    fallback={1}
                    onValueChange={(value) => patchFin({ month: value ?? 1 })}
                  />
                  <EditableNumberInput
                    className="h-9 w-full text-center text-sm"
                    value={finDraft.year}
                    fallback={calendar.epoch.year}
                    onValueChange={(value) =>
                      patchFin({ year: value ?? calendar.epoch.year })
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          {errorKey ? <p className="text-sm text-destructive">{t(errorKey)}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("secondary.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("secondary.createSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
