import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { MapSummary } from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";

interface MapBreadcrumbProps {
  maps: MapSummary[];
}

export function MapBreadcrumb({ maps }: MapBreadcrumbProps) {
  const { t } = useTranslation("maps");
  const mapStack = useMapStore((s) => s.mapStack);
  const popToMap = useMapStore((s) => s.popToMap);

  if (mapStack.length === 0) return null;

  const nameById = new Map(maps.map((m) => [m.id, m.name]));

  return (
    <nav
      className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      aria-label={t("breadcrumb.root")}
    >
      <button
        type="button"
        className="hover:text-foreground"
        onClick={() => popToMap(mapStack[0])}
      >
        {t("breadcrumb.root")}
      </button>
      {mapStack.map((id) => (
        <span key={id} className="flex items-center gap-1">
          <ChevronRight className="size-3.5" />
          <button
            type="button"
            className="font-medium text-foreground hover:underline"
            onClick={() => popToMap(id)}
          >
            {nameById.get(id) ?? id}
          </button>
        </span>
      ))}
    </nav>
  );
}
