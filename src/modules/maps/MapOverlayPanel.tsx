import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { mapErrorKey } from "@/lib/maps/mapErrors";
import { newOverlayId, setOverlays } from "@/lib/maps/mapMutations";
import type { MapData, MapOverlay } from "@/lib/types/maps";

interface MapOverlayPanelProps {
  data: MapData;
  onChange: (next: MapData) => void;
  onError: (key: string) => void;
}

export function MapOverlayPanel({ data, onChange, onError }: MapOverlayPanelProps) {
  const { t } = useTranslation("maps");

  async function addOverlay() {
    const picked = await open({
      multiple: false,
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (!picked || typeof picked !== "string") return;

    try {
      const [imagePath, width, height] = await invokeCommand<[string, number, number]>(
        "import_overlay_image_cmd",
        { sourceImagePath: picked },
      );
      const margin = 40;
      const overlay: MapOverlay = {
        id: newOverlayId(),
        name: t("overlays.name"),
        imagePath,
        bounds: [
          [margin, margin],
          [margin + height * 0.4, margin + width * 0.4],
        ],
        fromTimestamp: null,
        toTimestamp: null,
        zIndex: data.manifest.overlays.length + 1,
      };
      onChange(setOverlays(data, [...data.manifest.overlays, overlay]));
    } catch (err) {
      onError(mapErrorKey(parseAppError(err)));
    }
  }

  function updateOverlay(id: string, patch: Partial<MapOverlay>) {
    const overlays = data.manifest.overlays.map((o) =>
      o.id === id ? { ...o, ...patch } : o,
    );
    onChange(setOverlays(data, overlays));
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("overlays.title")}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void addOverlay()}
        >
          {t("overlays.add")}
        </Button>
      </div>
      <ul className="space-y-2">
        {data.manifest.overlays.map((overlay) => (
          <li key={overlay.id} className="rounded-md border border-border p-2 text-xs">
            <Input
              value={overlay.name}
              className="mb-2 h-8 text-xs"
              onChange={(e) => updateOverlay(overlay.id, { name: e.target.value })}
            />
            <Label className="text-[11px]">{t("overlays.from")}</Label>
            <Input
              value={overlay.fromTimestamp ?? ""}
              className="mb-1 h-8 text-xs"
              onChange={(e) =>
                updateOverlay(overlay.id, {
                  fromTimestamp: e.target.value || null,
                })
              }
            />
            <Label className="text-[11px]">{t("overlays.to")}</Label>
            <Input
              value={overlay.toTimestamp ?? ""}
              className="h-8 text-xs"
              onChange={(e) =>
                updateOverlay(overlay.id, {
                  toTimestamp: e.target.value || null,
                })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
