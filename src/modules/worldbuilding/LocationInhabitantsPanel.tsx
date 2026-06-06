import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useLocationInhabitants } from "@/hooks/useLocationInhabitants";
import { useEditorStore } from "@/stores/useEditorStore";

interface LocationInhabitantsPanelProps {
  locationPath: string;
}

export function LocationInhabitantsPanel({
  locationPath,
}: LocationInhabitantsPanelProps) {
  const { t } = useTranslation("worldbuilding");
  const { rows, isLoading, errorKey } = useLocationInhabitants(locationPath);
  const openDocument = useEditorStore((s) => s.openDocument);

  return (
    <section className="space-y-3 rounded-md border border-border p-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t("inhabitants.title")}
      </h2>
      {isLoading && (
        <p className="text-sm text-muted-foreground">{t("inhabitants.loading")}</p>
      )}
      {errorKey && (
        <p className="text-sm text-destructive" role="alert">
          {t(errorKey)}
        </p>
      )}
      {!isLoading && !errorKey && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("inhabitants.empty")}</p>
      )}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.path}>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-full justify-start px-2"
              onClick={() => void openDocument(row.path)}
            >
              <span className="text-sm">{row.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{row.category}</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
