import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TimeTagChipProps {
  value: string;
  visible?: boolean;
}

export function TimeTagChip({ value, visible = true }: TimeTagChipProps) {
  const { t } = useTranslation("editor");

  if (!visible) {
    return null;
  }

  return (
    <span
      className="narra-inline-time-tag inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 font-sans text-[11px] text-foreground"
      title={t("metadata.time")}
      data-inline-tag-value={value}
    >
      <Calendar className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </span>
  );
}
