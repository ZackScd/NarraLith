import {
  Layers,
  Map as MapIcon,
  MapPin,
  MousePointerClick,
  Network,
  Paintbrush,
  PanelRightClose,
  PanelRightOpen,
  Sticker,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMapEditPanelStore,
  type MapEditPanelSectionId,
} from "@/stores/useMapEditPanelStore";

interface MapEditSidePanelProps {
  isNavView: boolean;
  mapsSection: React.ReactNode;
  layersSection: React.ReactNode | null;
  patchesSection: React.ReactNode;
  navSection: React.ReactNode | null;
  hotspotsSection: React.ReactNode | null;
  locationsSection: React.ReactNode | null;
  studioSection: React.ReactNode | null;
}

type RailItem = {
  id: MapEditPanelSectionId;
  icon: typeof MapIcon;
  labelKey: string;
  hidden?: boolean;
  disabled?: boolean;
};

export function MapEditSidePanel({
  isNavView,
  mapsSection,
  layersSection,
  patchesSection,
  navSection,
  hotspotsSection,
  locationsSection,
  studioSection,
}: MapEditSidePanelProps) {
  const { t } = useTranslation("maps");
  const contentExpanded = useMapEditPanelStore((s) => s.contentExpanded);
  const activeSection = useMapEditPanelStore((s) => s.activeSection);
  const toggleContentExpanded = useMapEditPanelStore((s) => s.toggleContentExpanded);
  const openSection = useMapEditPanelStore((s) => s.openSection);

  const railItems: RailItem[] = [
    { id: "maps", icon: MapIcon, labelKey: "editPanel.sections.maps" },
    { id: "layers", icon: Layers, labelKey: "editPanel.sections.layers" },
    { id: "patches", icon: Sticker, labelKey: "editPanel.sections.patches" },
    {
      id: "nav",
      icon: Network,
      labelKey: "editPanel.sections.nav",
      hidden: isNavView,
    },
    {
      id: "hotspots",
      icon: MousePointerClick,
      labelKey: "editPanel.sections.hotspots",
      hidden: isNavView,
    },
    {
      id: "locations",
      icon: MapPin,
      labelKey: "editPanel.sections.locations",
      hidden: isNavView,
    },
    { id: "studio", icon: Paintbrush, labelKey: "editPanel.sections.studio" },
  ];

  const sectionContent: Record<MapEditPanelSectionId, React.ReactNode | null> = {
    maps: mapsSection,
    layers: layersSection,
    patches: patchesSection,
    nav: navSection,
    hotspots: hotspotsSection,
    locations: locationsSection,
    studio: studioSection,
  };

  const activeLabelKey =
    railItems.find((item) => item.id === activeSection)?.labelKey ??
    "editPanel.sections.layers";

  return (
    <aside
      className="flex h-full min-h-0 shrink-0 border-l border-border/60 bg-card"
      aria-label={t("editPanel.title")}
    >
      {contentExpanded ? (
        <div className="flex min-h-0 w-64 flex-col">
          <div className="shrink-0 border-b border-border/60 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(activeLabelKey)}
            </h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {sectionContent[activeSection]}
          </div>
        </div>
      ) : null}

      <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-l border-border/60 py-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={
            contentExpanded ? t("editPanel.collapse") : t("editPanel.expand")
          }
          aria-label={
            contentExpanded ? t("editPanel.collapse") : t("editPanel.expand")
          }
          onClick={toggleContentExpanded}
        >
          {contentExpanded ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </Button>

        {railItems
          .filter((item) => !item.hidden)
          .map(({ id, icon: Icon, labelKey, disabled }) => (
            <Button
              key={id}
              type="button"
              size="icon"
              variant={activeSection === id && contentExpanded ? "secondary" : "ghost"}
              className={cn(
                "size-8",
                activeSection === id &&
                  contentExpanded &&
                  "border border-primary/30",
              )}
              disabled={disabled}
              title={t(labelKey)}
              aria-label={t(labelKey)}
              aria-pressed={activeSection === id && contentExpanded}
              onClick={() => openSection(id)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
      </div>
    </aside>
  );
}
