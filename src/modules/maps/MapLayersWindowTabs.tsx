import { Layers, Network, Sticker } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { MapLayersWindowTab } from "@/stores/useMapLayersWindowStore";

const TAB_META: Record<
  MapLayersWindowTab,
  { icon: typeof Layers; labelKey: string; combinedLabelKey?: string }
> = {
  layers: {
    icon: Layers,
    labelKey: "layersWindow.tabs.layers",
    combinedLabelKey: "layersWindow.tabs.combined",
  },
  patches: { icon: Sticker, labelKey: "layersWindow.tabs.patches" },
  nav: { icon: Network, labelKey: "layersWindow.tabs.nav" },
};

interface MapLayersWindowTabsProps {
  activeTab: MapLayersWindowTab;
  combinedCapasParches: boolean;
  onSelectTab: (tab: MapLayersWindowTab) => void;
}

export function MapLayersWindowTabs({
  activeTab,
  combinedCapasParches,
  onSelectTab,
}: MapLayersWindowTabsProps) {
  const { t } = useTranslation("maps");

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      {(Object.keys(TAB_META) as MapLayersWindowTab[]).map((tabId) => {
        const { icon: Icon, labelKey, combinedLabelKey } = TAB_META[tabId];
        const isActive = activeTab === tabId;
        const showCombinedLabel = tabId === "layers" && combinedCapasParches && isActive;
        const label = t(showCombinedLabel && combinedLabelKey ? combinedLabelKey : labelKey);

        return (
          <button
            key={tabId}
            type="button"
            className={cn(
              "flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border text-[11px] font-medium transition-colors",
              isActive
                ? "min-w-[4.5rem] border-primary/40 bg-primary/10 px-2 text-foreground"
                : "size-7 border-transparent text-muted-foreground hover:bg-muted/60",
            )}
            aria-pressed={isActive}
            title={label}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onSelectTab(tabId)}
          >
            <Icon className="size-3.5 shrink-0" />
            {isActive ? <span className="truncate">{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
