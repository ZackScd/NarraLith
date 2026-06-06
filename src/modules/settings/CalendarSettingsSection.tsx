import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calendarErrorI18nKey } from "@/stores/useCalendarStore";
import {
  createEmptyMonth,
  useCalendarStore,
  validateCalendarDraft,
} from "@/stores/useCalendarStore";
import type { CalendarConfig } from "@/lib/types/calendar";

function CalendarSettingsForm({ initialConfig }: { initialConfig: CalendarConfig }) {
  const { t } = useTranslation("calendar");
  const isSaving = useCalendarStore((s) => s.isSaving);
  const lastErrorKey = useCalendarStore((s) => s.lastErrorKey);
  const saveCalendar = useCalendarStore((s) => s.saveCalendar);
  const [draft, setDraft] = useState(() => structuredClone(initialConfig));
  const [validationKey, setValidationKey] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const updateMonth = (index: number, field: "name" | "days", value: string) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const months = [...prev.months];
      const month = { ...months[index] };
      if (field === "name") {
        month.name = value;
      } else {
        month.days = Math.max(1, Number(value) || 1);
      }
      months[index] = month;
      return { ...prev, months };
    });
  };

  const handleSave = async () => {
    const clientError = validateCalendarDraft(draft);
    if (clientError) {
      setValidationKey(clientError);
      return;
    }
    setValidationKey(null);
    const ok = await saveCalendar(draft);
    if (ok) {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    }
  };

  return (
    <section className="space-y-4 border-t border-border pt-4">
      <div>
        <h3 className="text-sm font-medium">{t("sectionTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("sectionDescription")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("dateFormatHint")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cal-days-week">{t("daysPerWeek")}</Label>
          <Input
            id="cal-days-week"
            type="number"
            min={1}
            value={draft.daysPerWeek}
            onChange={(e) =>
              setDraft({
                ...draft,
                daysPerWeek: Math.max(1, Number(e.target.value) || 7),
              })
            }
          />
        </div>
        <div className="space-y-1 flex flex-col justify-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.leapRules.enabled}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  leapRules: { ...draft.leapRules, enabled: e.target.checked },
                })
              }
            />
            {t("leapEnabled")}
          </label>
        </div>
      </div>

      {draft.leapRules.enabled && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label>{t("leapEveryYears")}</Label>
            <Input
              type="number"
              min={1}
              value={draft.leapRules.everyYears}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  leapRules: {
                    ...draft.leapRules,
                    everyYears: Math.max(1, Number(e.target.value) || 4),
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("leapExtraDays")}</Label>
            <Input
              type="number"
              min={1}
              value={draft.leapRules.extraDays}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  leapRules: {
                    ...draft.leapRules,
                    extraDays: Math.max(1, Number(e.target.value) || 1),
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("leapMonthIndex")}</Label>
            <Input
              type="number"
              min={0}
              max={Math.max(0, draft.months.length - 1)}
              value={draft.leapRules.monthIndex}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  leapRules: {
                    ...draft.leapRules,
                    monthIndex: Math.max(0, Number(e.target.value) || 0),
                  },
                })
              }
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {draft.months.map((month, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label>{t("monthName")}</Label>
              <Input
                value={month.name}
                onChange={(e) => updateMonth(index, "name", e.target.value)}
              />
            </div>
            <div className="w-20 space-y-1">
              <Label>{t("monthDays")}</Label>
              <Input
                type="number"
                min={1}
                value={month.days}
                onChange={(e) => updateMonth(index, "days", e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removeMonth")}
              disabled={draft.months.length <= 1}
              onClick={() =>
                setDraft({
                  ...draft,
                  months: draft.months.filter((_, i) => i !== index),
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setDraft({ ...draft, months: [...draft.months, createEmptyMonth()] })
          }
        >
          <Plus className="mr-1 size-4" />
          {t("addMonth")}
        </Button>
      </div>

      {validationKey && (
        <p className="text-xs text-destructive" role="alert">
          {t(validationKey)}
        </p>
      )}
      {lastErrorKey && (
        <p className="text-xs text-destructive" role="alert">
          {t(calendarErrorI18nKey(lastErrorKey), { defaultValue: lastErrorKey })}
        </p>
      )}

      <Button
        type="button"
        size="sm"
        disabled={isSaving}
        onClick={() => void handleSave()}
      >
        {isSaving ? t("saving") : t("save")}
      </Button>
      {savedFlash && <p className="text-xs text-muted-foreground">{t("saved")}</p>}
    </section>
  );
}

export function CalendarSettingsSection() {
  const { t } = useTranslation("calendar");
  const config = useCalendarStore((s) => s.config);
  const isLoading = useCalendarStore((s) => s.isLoading);

  if (isLoading || !config) {
    return <p className="text-xs text-muted-foreground">{t("saving")}</p>;
  }

  return (
    <CalendarSettingsForm
      key={`${config.version}-${config.months.length}-${config.months.map((m) => m.name).join()}`}
      initialConfig={config}
    />
  );
}
