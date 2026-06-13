import { Calendar } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { classifyTimeTag } from "@/lib/calendar/classifyTimeTag";
import { formatTimeTagDisplay, parseTimeTag } from "@/lib/calendar/dateTags";
import {
  isStaleTimeTagStatus,
  timeTagTooltipTitle,
} from "@/lib/calendar/timeTagUi";
import { ManuscriptTagChip } from "@/modules/editor/components/ManuscriptTagChip";
import { useCalendarStore } from "@/stores/useCalendarStore";

interface TimeTagChipProps {
  value: string;
  hour?: number | null;
  visible?: boolean;
}

export function TimeTagChip({ value, hour = null, visible = true }: TimeTagChipProps) {
  const { t } = useTranslation("editor");
  const calendar = useCalendarStore((s) => s.config);
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);

  const classified = useMemo(() => {
    if (!calendar) return null;
    return classifyTimeTag(value, calendar, baselineConfig);
  }, [value, calendar, baselineConfig]);

  const parts = parseTimeTag(value);
  const includeHour = calendar?.hoursEnabled !== false;
  const label =
    parts != null
      ? formatTimeTagDisplay(parts, {
          hour,
          includeHour: includeHour && hour != null,
        })
      : value;

  const invalid = classified != null && isStaleTimeTagStatus(classified.status);

  const title = timeTagTooltipTitle(t, classified?.status, value);

  return (
    <ManuscriptTagChip
      icon={Calendar}
      label={label}
      title={title}
      visible={visible}
      invalid={invalid}
      data-inline-tag-value={value}
    />
  );
}
