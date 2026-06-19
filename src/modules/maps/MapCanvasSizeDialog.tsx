import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDimensionInRange } from "@/lib/maps/mapAspectRatio";
import { MAP_DIMENSION_MAX, MAP_DIMENSION_MIN } from "@/lib/types/maps";

export type MapCanvasSizeMode = "expand" | "crop";

interface MapCanvasSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: MapCanvasSizeMode;
  currentWidth: number;
  currentHeight: number;
  busy: boolean;
  onExpand: (addRight: number, addBottom: number) => Promise<void>;
  onCrop: (newWidth: number, newHeight: number) => Promise<void>;
}

export function MapCanvasSizeDialog({
  open: isOpen,
  onOpenChange,
  mode,
  currentWidth,
  currentHeight,
  busy,
  onExpand,
  onCrop,
}: MapCanvasSizeDialogProps) {
  const { t } = useTranslation("maps");
  const [addRight, setAddRight] = useState(0);
  const [addBottom, setAddBottom] = useState(0);
  const [newWidth, setNewWidth] = useState(currentWidth);
  const [newHeight, setNewHeight] = useState(currentHeight);
  const [confirmCrop, setConfirmCrop] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAddRight(0);
    setAddBottom(0);
    setNewWidth(currentWidth);
    setNewHeight(currentHeight);
    setConfirmCrop(false);
    setErrorKey(null);
  }, [currentHeight, currentWidth, isOpen]);

  const resultWidth = currentWidth + addRight;
  const resultHeight = currentHeight + addBottom;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey(null);

    if (mode === "expand") {
      if (addRight === 0 && addBottom === 0) {
        setErrorKey("canvas.errors.expand_zero");
        return;
      }
      if (!isDimensionInRange(resultWidth) || !isDimensionInRange(resultHeight)) {
        setErrorKey("errors.invalid_dimensions");
        return;
      }
      try {
        await onExpand(addRight, addBottom);
        onOpenChange(false);
      } catch {
        setErrorKey("errors.generic");
      }
      return;
    }

    if (newWidth >= currentWidth && newHeight >= currentHeight) {
      setErrorKey("canvas.errors.crop_not_smaller");
      return;
    }
    if (!isDimensionInRange(newWidth) || !isDimensionInRange(newHeight)) {
      setErrorKey("errors.invalid_dimensions");
      return;
    }
    if (!confirmCrop) {
      setErrorKey("canvas.errors.crop_confirm_required");
      return;
    }
    try {
      await onCrop(newWidth, newHeight);
      onOpenChange(false);
    } catch {
      setErrorKey("errors.generic");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>
              {mode === "expand" ? t("canvas.expandTitle") : t("canvas.cropTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "expand" ? t("canvas.expandDescription") : t("canvas.cropDescription")}
            </DialogDescription>
          </DialogHeader>

          <p className="mt-3 text-sm text-muted-foreground">
            {t("canvas.currentSize", { width: currentWidth, height: currentHeight })}
          </p>

          {errorKey ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {t(errorKey)}
            </p>
          ) : null}

          {mode === "expand" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expand-right">{t("canvas.addWidthLabel")}</Label>
                <Input
                  id="expand-right"
                  type="number"
                  min={0}
                  max={MAP_DIMENSION_MAX}
                  value={addRight}
                  onChange={(e) => setAddRight(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expand-bottom">{t("canvas.addHeightLabel")}</Label>
                <Input
                  id="expand-bottom"
                  type="number"
                  min={0}
                  max={MAP_DIMENSION_MAX}
                  value={addBottom}
                  onChange={(e) => setAddBottom(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <p className="sm:col-span-2 text-sm text-muted-foreground">
                {t("canvas.resultSize", { width: resultWidth, height: resultHeight })}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="crop-width">{t("canvas.newWidthLabel")}</Label>
                  <Input
                    id="crop-width"
                    type="number"
                    min={MAP_DIMENSION_MIN}
                    max={currentWidth}
                    value={newWidth}
                    onChange={(e) => setNewWidth(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crop-height">{t("canvas.newHeightLabel")}</Label>
                  <Input
                    id="crop-height"
                    type="number"
                    min={MAP_DIMENSION_MIN}
                    max={currentHeight}
                    value={newHeight}
                    onChange={(e) => setNewHeight(Number(e.target.value))}
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmCrop}
                  onChange={(e) => setConfirmCrop(e.target.checked)}
                />
                <span>{t("canvas.cropConfirm")}</span>
              </label>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("canvas.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "expand" ? t("canvas.expandSubmit") : t("canvas.cropSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
