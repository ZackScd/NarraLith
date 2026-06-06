import { Map, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface MapEmptyStateProps {
  onCreate: () => void;
}

export function MapEmptyState({ onCreate }: MapEmptyStateProps) {
  const { t } = useTranslation("maps");

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
        <Map className="size-8 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{t("emptyTitle")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </div>
      <Button type="button" className="gap-2" onClick={onCreate}>
        <Plus className="size-4" />
        {t("createMap")}
      </Button>
    </div>
  );
}
