import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatTimeTagDisplay, parseTimeTag } from "@/lib/calendar/dateTags";
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
  const parts = parseTimeTag(value);
  const includeHour = calendar?.hoursEnabled !== false;
  const label =
    parts != null
      ? formatTimeTagDisplay(parts, {
          hour,
          includeHour: includeHour && hour != null,
        })
      : value;

  return (
    <ManuscriptTagChip
      icon={Calendar}
      label={label}
      title={t("metadata.time")}
      visible={visible}
      invalid={parts == null}
      data-inline-tag-value={value}
    />
  );
}
