import { useEffect } from "react";
import {
  Crop,
  Layers,
  MapPin,
  MousePointerClick,
  Network,
  Paintbrush,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Settings,
  Sticker,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMapEditPanelStore,
  type MapEditPanelSectionId,
} from "@/stores/useMapEditPanelStore";

const INTERACTIVE_SECTIONS: MapEditPanelSectionId[] = ["settings"];

interface MapEditSidePanelProps {
  isEditMode: boolean;
  isNavView: boolean;
  onToggleEditMode: () => void;
  railMount: HTMLElement | null;
  contentMount: HTMLElement | null;
  settingsSection: React.ReactNode;
  layersSection: React.ReactNode | null;
  patchesSection: React.ReactNode | null;
  navSection: React.ReactNode | null;
  hotspotsSection: React.ReactNode | null;
  locationsSection: React.ReactNode | null;
  studioSection: React.ReactNode | null;
  canvasSection: React.ReactNode | null;
}

type RailSectionItem = {
  kind: "section";
  id: MapEditPanelSectionId;
  icon: typeof Layers;
  labelKey: string;
  hidden?: boolean;
};

export function MapEditSidePanel({
  isEditMode,
  isNavView,
  onToggleEditMode,
  railMount,
  contentMount,
  settingsSection,
  layersSection,
  patchesSection,
  navSection,
  hotspotsSection,
  locationsSection,
  studioSection,
  canvasSection,
}: MapEditSidePanelProps) {
  const { t } = useTranslation("maps");
  const contentExpanded = useMapEditPanelStore((s) => s.contentExpanded);
  const activeSection = useMapEditPanelStore((s) => s.activeSection);
  const toggleContentExpanded = useMapEditPanelStore((s) => s.toggleContentExpanded);
  const openSection = useMapEditPanelStore((s) => s.openSection);
  const setActiveSection = useMapEditPanelStore((s) => s.setActiveSection);

  useEffect(() => {
    if (!isEditMode && !INTERACTIVE_SECTIONS.includes(activeSection)) {
      setActiveSection("settings");
    }
  }, [activeSection, isEditMode, setActiveSection]);

  const editRailSections: RailSectionItem[] = [
    { kind: "section", id: "layers", icon: Layers, labelKey: "editPanel.sections.layers" },
    { kind: "section", id: "patches", icon: Sticker, labelKey: "editPanel.sections.patches" },
    {
      kind: "section",
      id: "nav",
      icon: Network,
      labelKey: "editPanel.sections.nav",
      hidden: isNavView,
    },
    {
      kind: "section",
      id: "hotspots",
      icon: MousePointerClick,
      labelKey: "editPanel.sections.hotspots",
      hidden: isNavView,
    },
    {
      kind: "section",
      id: "locations",
      icon: MapPin,
      labelKey: "editPanel.sections.locations",
      hidden: isNavView,
    },
    { kind: "section", id: "studio", icon: Paintbrush, labelKey: "editPanel.sections.studio" },
    { kind: "section", id: "canvas", icon: Crop, labelKey: "editPanel.sections.canvas" },
  ];

  const sectionContent: Partial<Record<MapEditPanelSectionId, React.ReactNode | null>> = {
    settings: settingsSection,
    layers: layersSection,
    patches: patchesSection,
    nav: navSection,
    hotspots: hotspotsSection,
    locations: locationsSection,
    studio: studioSection,
    canvas: canvasSection,
  };

  const activeLabelKey =
    activeSection === "settings"
      ? "editPanel.sections.settings"
      : activeSection === "canvas"
        ? "editPanel.sections.canvas"
        : (editRailSections.find((item) => item.id === activeSection)?.labelKey ??
          "editPanel.sections.layers");

  const panelContent = sectionContent[activeSection];

  const rail = (
    <div
      className="flex h-full min-h-0 w-full flex-col border-l border-border/60 bg-card pt-1"
      aria-label={t(isEditMode ? "editPanel.title" : "editPanel.interactiveTitle")}
    >
      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={contentExpanded ? t("editPanel.collapse") : t("editPanel.expand")}
          aria-label={contentExpanded ? t("editPanel.collapse") : t("editPanel.expand")}
          onClick={toggleContentExpanded}
        >
          {contentExpanded ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          size="icon"
          variant={isEditMode ? "secondary" : "ghost"}
          className={cn("size-8", isEditMode && "border border-primary/30")}
          title={isEditMode ? t("viewMode.exitEdit") : t("viewMode.enterEdit")}
          aria-label={isEditMode ? t("viewMode.exitEdit") : t("viewMode.enterEdit")}
          aria-pressed={isEditMode}
          onClick={onToggleEditMode}
        >
          <Pencil className="size-4" />
        </Button>

        {isEditMode
          ? editRailSections
              .filter((item) => !item.hidden)
              .map(({ id, icon: Icon, labelKey }) => (
                <Button
                  key={id}
                  type="button"
                  size="icon"
                  variant={activeSection === id && contentExpanded ? "secondary" : "ghost"}
                  className={cn(
                    "size-8",
                    activeSection === id && contentExpanded && "border border-primary/30",
                  )}
                  title={t(labelKey)}
                  aria-label={t(labelKey)}
                  aria-pressed={activeSection === id && contentExpanded}
                  onClick={() => openSection(id)}
                >
                  <Icon className="size-4" />
                </Button>
              ))
          : null}
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 pb-2">
        <Button
          type="button"
          size="icon"
          variant={activeSection === "settings" && contentExpanded ? "secondary" : "ghost"}
          className={cn(
            "size-8",
            activeSection === "settings" && contentExpanded && "border border-primary/30",
          )}
          title={t("editPanel.sections.settings")}
          aria-label={t("editPanel.sections.settings")}
          aria-pressed={activeSection === "settings" && contentExpanded}
          onClick={() => openSection("settings")}
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );

  const contentPanel =
    contentExpanded && panelContent ? (
      <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-l border-border/60 bg-card">
        <div className="shrink-0 border-b border-border/60 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(activeLabelKey)}
          </h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{panelContent}</div>
      </aside>
    ) : null;

  return (
    <>
      {railMount ? createPortal(rail, railMount) : null}
      {contentMount && contentPanel ? createPortal(contentPanel, contentMount) : null}
    </>
  );
}
