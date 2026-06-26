import { useEffect } from "react";
import {
  Crop,
  Layers,
  MapPin,
  Paintbrush,
  Pencil,
  Settings,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { FloatingPanelFrame } from "@/components/workspace-ui/FloatingPanelFrame";
import { Button } from "@/components/ui/button";
import {
  MAP_FLOATING_PANEL_MIN_HEIGHT,
  MAP_FLOATING_PANEL_WIDTH,
  useMapFloatingToolsStore,
  type MapFloatingToolsSectionId,
} from "@/stores/useMapFloatingToolsStore";
import { cn } from "@/lib/utils";

interface MapFloatingToolsPanelProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  railMount: HTMLElement | null;
  settingsSection: React.ReactNode;
  layersWindow: React.ReactNode | null;
  locationsSection: React.ReactNode | null;
  studioSection: React.ReactNode | null;
  canvasSection: React.ReactNode | null;
}

type RailSectionItem = {
  id: MapFloatingToolsSectionId;
  icon: typeof Layers;
  labelKey: string;
  hidden?: boolean;
};

export function MapFloatingToolsPanel({
  isEditMode,
  onToggleEditMode,
  railMount,
  settingsSection,
  layersWindow,
  locationsSection,
  studioSection,
  canvasSection,
}: MapFloatingToolsPanelProps) {
  const { t } = useTranslation("maps");
  const isOpen = useMapFloatingToolsStore((s) => s.isOpen);
  const position = useMapFloatingToolsStore((s) => s.position);
  const activeSection = useMapFloatingToolsStore((s) => s.activeSection);
  const setPosition = useMapFloatingToolsStore((s) => s.setPosition);
  const openSection = useMapFloatingToolsStore((s) => s.openSection);
  const close = useMapFloatingToolsStore((s) => s.close);

  useEffect(() => {
    if (!isEditMode) {
      close();
    }
  }, [close, isEditMode]);

  const handleSectionClick = (sectionId: MapFloatingToolsSectionId) => {
    if (activeSection === sectionId && isOpen) {
      close();
      return;
    }
    openSection(sectionId);
  };

  const editRailSections: RailSectionItem[] = [
    { id: "layers", icon: Layers, labelKey: "editPanel.sections.layers" },
    {
      id: "locations",
      icon: MapPin,
      labelKey: "editPanel.sections.locations",
    },
    { id: "studio", icon: Paintbrush, labelKey: "editPanel.sections.studio" },
    { id: "canvas", icon: Crop, labelKey: "editPanel.sections.canvas" },
  ];

  const sectionContent: Partial<Record<MapFloatingToolsSectionId, React.ReactNode | null>> = {
    settings: settingsSection,
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
  const showLayersWindow = isOpen && activeSection === "layers" && layersWindow;

  const rail = (
    <div
      className="flex h-full min-h-0 w-full flex-col border-l border-border/60 bg-card pt-1"
      aria-label={t(isEditMode ? "editPanel.title" : "editPanel.interactiveTitle")}
    >
      <div className="flex flex-col items-center gap-1">
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
                  variant={activeSection === id && isOpen ? "secondary" : "ghost"}
                  className={cn(
                    "size-8",
                    activeSection === id && isOpen && "border border-primary/30",
                  )}
                  title={t(labelKey)}
                  aria-label={t(labelKey)}
                  aria-pressed={activeSection === id && isOpen}
                  onClick={() => handleSectionClick(id)}
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
          variant={activeSection === "settings" && isOpen ? "secondary" : "ghost"}
          className={cn(
            "size-8",
            activeSection === "settings" && isOpen && "border border-primary/30",
          )}
          title={t("editPanel.sections.settings")}
          aria-label={t("editPanel.sections.settings")}
          aria-pressed={activeSection === "settings" && isOpen}
          onClick={() => handleSectionClick("settings")}
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {railMount ? createPortal(rail, railMount) : null}
      {showLayersWindow ? layersWindow : null}
      {isOpen && panelContent && activeSection !== "layers" ? (
        <FloatingPanelFrame
          position={position}
          onPositionChange={setPosition}
          title={t(activeLabelKey)}
          ariaLabel={t(isEditMode ? "editPanel.title" : "editPanel.interactiveTitle")}
          onClose={close}
          closeAriaLabel={t("editPanel.closeWindow")}
          minWidth={MAP_FLOATING_PANEL_WIDTH}
          minHeight={MAP_FLOATING_PANEL_MIN_HEIGHT}
          width={MAP_FLOATING_PANEL_WIDTH}
          className="z-50 max-h-[min(70vh,640px)]"
          bodyClassName="min-h-0 flex-1 overflow-y-auto"
        >
          {panelContent}
        </FloatingPanelFrame>
      ) : null}
    </>
  );
}
