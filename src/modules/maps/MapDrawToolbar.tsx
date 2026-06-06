import { MousePointer2, MapPin, Pentagon, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { MapDrawMode } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

interface MapDrawToolbarProps {
  mode: MapDrawMode;
  onModeChange: (mode: MapDrawMode) => void;
}

const TOOLS: { id: MapDrawMode; icon: typeof MousePointer2 }[] = [
  { id: "select", icon: MousePointer2 },
  { id: "pin", icon: MapPin },
  { id: "polygon", icon: Pentagon },
  { id: "delete", icon: Trash2 },
];

export function MapDrawToolbar({ mode, onModeChange }: MapDrawToolbarProps) {
  const { t } = useTranslation("maps");

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border/70 bg-background/60 p-0.5">
      {TOOLS.map(({ id, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          size="icon"
          variant={mode === id ? "secondary" : "ghost"}
          className={cn("size-7", mode === id && "border border-primary/30")}
          onClick={() => onModeChange(id)}
          title={t(`tools.${id}`)}
          aria-label={t(`tools.${id}`)}
        >
          <Icon className="size-3.5" />
        </Button>
      ))}
    </div>
  );
}
