import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface MapEditToolbarProps {
  canvasBusy: boolean;
  onExpand: () => void;
  onCrop: () => void;
}

export function MapEditToolbar({ canvasBusy, onExpand, onCrop }: MapEditToolbarProps) {
  const { t } = useTranslation("maps");

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-2">
      <p className="text-xs text-muted-foreground">{t("editToolbar.placeholder")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={canvasBusy}
          onClick={onExpand}
        >
          {t("canvas.expandAction")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={canvasBusy}
          onClick={onCrop}
        >
          {t("canvas.cropAction")}
        </Button>
      </div>
    </footer>
  );
}
