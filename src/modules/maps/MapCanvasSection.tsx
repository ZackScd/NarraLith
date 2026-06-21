import { Loader2, Maximize2, Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface MapCanvasSectionProps {
  width: number;
  height: number;
  busy?: boolean;
  onExpand: () => void;
  onCrop: () => void;
}

export function MapCanvasSection({
  width,
  height,
  busy = false,
  onExpand,
  onCrop,
}: MapCanvasSectionProps) {
  const { t } = useTranslation("maps");

  return (
    <div className="flex flex-col gap-4 p-3">
      <p className="text-[11px] text-muted-foreground">
        {t("canvas.currentSize", { width, height })}
      </p>
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          disabled={busy}
          onClick={onExpand}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Maximize2 className="size-3.5" />}
          {t("canvas.expandAction")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          disabled={busy}
          onClick={onCrop}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Scissors className="size-3.5" />}
          {t("canvas.cropAction")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("canvas.sectionHint")}</p>
    </div>
  );
}
