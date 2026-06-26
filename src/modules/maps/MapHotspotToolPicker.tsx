import { Circle, Lasso, SquareDashedMousePointer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  useMapHotspotDrawStore,
  type MapHotspotDrawTool,
} from "@/stores/useMapHotspotDrawStore";
import { cn } from "@/lib/utils";

interface MapHotspotToolPickerProps {
  disabled?: boolean;
}

const TOOLS: { id: MapHotspotDrawTool; icon: typeof Lasso; labelKey: string }[] = [
  { id: "lasso", icon: Lasso, labelKey: "hotspot.tools.lasso" },
  { id: "rect", icon: SquareDashedMousePointer, labelKey: "hotspot.tools.rect" },
  { id: "circle", icon: Circle, labelKey: "hotspot.tools.circle" },
];

export function MapHotspotToolPicker({ disabled = false }: MapHotspotToolPickerProps) {
  const { t } = useTranslation("maps");
  const tool = useMapHotspotDrawStore((s) => s.tool);
  const setTool = useMapHotspotDrawStore((s) => s.setTool);

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5">
      {TOOLS.map(({ id, icon: Icon, labelKey }) => (
        <Button
          key={id}
          type="button"
          size="icon"
          variant={tool === id ? "secondary" : "ghost"}
          className={cn("size-7", tool === id && "border border-primary/30")}
          disabled={disabled}
          title={t(labelKey)}
          aria-label={t(labelKey)}
          aria-pressed={tool === id}
          onClick={() => setTool(id)}
        >
          <Icon className="size-3.5" />
        </Button>
      ))}
    </div>
  );
}
