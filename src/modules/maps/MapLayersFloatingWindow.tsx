import { useTranslation } from "react-i18next";

import { FloatingPanelFrame } from "@/components/workspace-ui/FloatingPanelFrame";
import {
  MAP_FLOATING_PANEL_MIN_HEIGHT,
  useMapFloatingToolsStore,
} from "@/stores/useMapFloatingToolsStore";
import {
  useMapLayersWindowStore,
  type MapLayersWindowTab,
} from "@/stores/useMapLayersWindowStore";

import { MapLayersWindowTabs } from "./MapLayersWindowTabs";

export const MAP_LAYERS_WINDOW_WIDTH = 300;

interface MapLayersFloatingWindowProps {
  ariaLabel: string;
  layersTab: React.ReactNode | null;
  patchesTab: React.ReactNode | null;
  navTab: React.ReactNode | null;
  combinedView: React.ReactNode | null;
}

export function MapLayersFloatingWindow({
  ariaLabel,
  layersTab,
  patchesTab,
  navTab,
  combinedView,
}: MapLayersFloatingWindowProps) {
  const { t } = useTranslation("maps");
  const position = useMapFloatingToolsStore((s) => s.position);
  const setPosition = useMapFloatingToolsStore((s) => s.setPosition);
  const close = useMapFloatingToolsStore((s) => s.close);

  const activeTab = useMapLayersWindowStore((s) => s.activeTab);
  const combinedCapasParches = useMapLayersWindowStore((s) => s.combinedCapasParches);
  const setActiveTab = useMapLayersWindowStore((s) => s.setActiveTab);

  const handleSelectTab = (tab: MapLayersWindowTab) => {
    if (tab !== "layers" && combinedCapasParches) {
      useMapLayersWindowStore.setState({ combinedCapasParches: false });
    }
    setActiveTab(tab);
  };

  const body =
    activeTab === "layers"
      ? combinedCapasParches
        ? combinedView
        : layersTab
      : activeTab === "patches"
        ? patchesTab
        : navTab;

  return (
    <FloatingPanelFrame
      position={position}
      onPositionChange={setPosition}
      ariaLabel={ariaLabel}
      headerContent={
        <MapLayersWindowTabs
          activeTab={activeTab}
          combinedCapasParches={combinedCapasParches}
          onSelectTab={handleSelectTab}
        />
      }
      onClose={close}
      closeAriaLabel={t("editPanel.closeWindow")}
      minWidth={MAP_LAYERS_WINDOW_WIDTH}
      minHeight={MAP_FLOATING_PANEL_MIN_HEIGHT}
      width={MAP_LAYERS_WINDOW_WIDTH}
      className="z-50 max-h-[min(70vh,640px)]"
      bodyClassName="min-h-0 flex max-h-[min(70vh,600px)] flex-1 flex-col overflow-hidden"
    >
      {body ?? (
        <p className="px-3 py-4 text-sm text-muted-foreground">{t("layersWindow.tabEmpty")}</p>
      )}
    </FloatingPanelFrame>
  );
}
