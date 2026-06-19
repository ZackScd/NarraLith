import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { MapNavFrame } from "@/lib/types/maps";

interface MapNavBreadcrumbProps {
  mapName: string;
  navStack: MapNavFrame[];
  onPop: () => void;
  onPopToDepth: (depth: number) => void;
}

export function MapNavBreadcrumb({
  mapName,
  navStack,
  onPop,
  onPopToDepth,
}: MapNavBreadcrumbProps) {
  const { t } = useTranslation("maps");

  if (navStack.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2">
      <Button size="sm" variant="outline" onClick={onPop}>
        <ChevronLeft className="size-4" />
        {t("nav.back")}
      </Button>
      <nav
        className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground"
        aria-label={t("nav.breadcrumbAria")}
      >
        <button
          type="button"
          className="truncate rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
          onClick={() => onPopToDepth(0)}
        >
          {mapName || t("nav.breadcrumbRoot")}
        </button>
        {navStack.map((frame, index) => (
          <span key={frame.navId} className="flex min-w-0 items-center gap-1">
            <span aria-hidden>›</span>
            <button
              type="button"
              className="truncate rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
              onClick={() => onPopToDepth(index + 1)}
              aria-current={index === navStack.length - 1 ? "page" : undefined}
            >
              {frame.name}
            </button>
          </span>
        ))}
      </nav>
    </div>
  );
}
