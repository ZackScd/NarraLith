import { useTranslation } from "react-i18next";

import { BacklinksPanel } from "@/modules/references/BacklinksPanel";

/** Referencias entrantes y menciones no vinculadas (Fase 3.4 / 5.4). */
export function SideReferencesSection() {
  const { t } = useTranslation("references");

  return (
    <section
      className="flex min-h-0 flex-1 flex-col px-3 py-3"
      aria-label={t("panel.ariaLabel")}
    >
      <BacklinksPanel />
    </section>
  );
}
