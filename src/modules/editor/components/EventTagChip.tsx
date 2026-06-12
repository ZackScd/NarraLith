import { Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ManuscriptTagChip } from "@/modules/editor/components/ManuscriptTagChip";

interface EventTagChipProps {
  eventName: string;
  visible?: boolean;
}

export function EventTagChip({ eventName, visible = true }: EventTagChipProps) {
  const { t } = useTranslation("editor");
  const label = eventName.trim() || t("panel.eventNamePlaceholder");

  return (
    <ManuscriptTagChip
      icon={Bookmark}
      label={label}
      title={t("metadata.event")}
      visible={visible}
    />
  );
}
