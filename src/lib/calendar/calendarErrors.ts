/** Clave i18n (namespace `calendar`) para errores de guardado o validación. */
export function calendarErrorKey(key: string | null | undefined): string {
  if (!key) {
    return "errors.unknown";
  }
  if (key.startsWith("validation.")) {
    return key;
  }
  const known = [
    "error.calendar.invalid_json",
    "error.calendar.months_required",
    "error.calendar.invalid_days_per_week",
    "error.calendar.invalid_hours_per_day",
    "error.calendar.invalid_epoch",
    "error.calendar.month_name_required",
    "error.calendar.month_days_required",
    "error.calendar.invalid_leap_rules",
    "error.calendar.invalid_annual_event",
    "error.calendar.invalid_season",
    "error.calendar.invalid_date",
    "error.unknown",
  ] as const;
  if ((known as readonly string[]).includes(key)) {
    if (key === "error.unknown") {
      return "errors.unknown";
    }
    const suffix = key.replace("error.calendar.", "");
    return `errors.${suffix}`;
  }
  return "errors.unknown";
}
