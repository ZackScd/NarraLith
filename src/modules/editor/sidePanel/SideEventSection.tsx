import { useTranslation } from "react-i18next";

import { ManuscriptEventCard } from "@/components/workspace-ui";

export function SideEventSection() {
  const { t } = useTranslation("editor");

  return (
    <section className="flex shrink-0 flex-col border-b border-border/60 px-3 py-3">
      <ManuscriptEventCard
        sectionTitle={t("panel.eventSectionTitle")}
        namePlaceholder={t("panel.eventNamePlaceholder")}
        descriptionPlaceholder={t("panel.eventDescriptionPlaceholder")}
        closeAriaLabel={t("panel.eventCloseBlock")}
        expandAriaLabel={t("panel.eventExpandBlock")}
      />
    </section>
  );
}
