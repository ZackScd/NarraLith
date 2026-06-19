import { Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
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
import {
  applyAspectToHeight,
  applyAspectToWidth,
  aspectRatioValue,
  isDimensionInRange,
} from "@/lib/maps/mapAspectRatio";
import type {
  MapAspectPreset,
  MapCreateDraft,
  MapCreateMode,
  MapSizePresetId,
} from "@/lib/types/maps";
import {
  MAP_CREATE_DEFAULT_HEIGHT,
  MAP_CREATE_DEFAULT_WIDTH,
  MAP_SIZE_PRESETS,
} from "@/lib/types/maps";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

interface CreateMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onCreate: (draft: MapCreateDraft) => Promise<void>;
}

export function CreateMapDialog({
  open: isOpen,
  onOpenChange,
  creating,
  onCreate,
}: CreateMapDialogProps) {
  const { t } = useTranslation("maps");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<MapCreateMode>("blank");
  const [sizePreset, setSizePreset] = useState<MapSizePresetId>("default");
  const [aspectPreset, setAspectPreset] = useState<MapAspectPreset>("none");
  const [customAspectW, setCustomAspectW] = useState("16");
  const [customAspectH, setCustomAspectH] = useState("9");
  const [width, setWidth] = useState(MAP_CREATE_DEFAULT_WIDTH);
  const [height, setHeight] = useState(MAP_CREATE_DEFAULT_HEIGHT);
  const [importPath, setImportPath] = useState<string | null>(null);
  const [importLabel, setImportLabel] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const ratio = aspectRatioValue(
    aspectPreset,
    Number(customAspectW) || 1,
    Number(customAspectH) || 1,
  );

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setMode("blank");
    setSizePreset("default");
    setAspectPreset("none");
    setCustomAspectW("16");
    setCustomAspectH("9");
    setWidth(MAP_CREATE_DEFAULT_WIDTH);
    setHeight(MAP_CREATE_DEFAULT_HEIGHT);
    setImportPath(null);
    setImportLabel(null);
    setErrorKey(null);
  }, [isOpen]);

  const applySizePreset = (presetId: MapSizePresetId) => {
    setSizePreset(presetId);
    if (presetId === "custom") return;
    const preset = MAP_SIZE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    if (ratio) {
      setWidth(preset.width);
      setHeight(applyAspectToWidth(preset.width, ratio));
    } else {
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  const handleWidthChange = (value: number) => {
    setSizePreset("custom");
    if (ratio) {
      setWidth(value);
      setHeight(applyAspectToWidth(value, ratio));
      return;
    }
    setWidth(value);
  };

  const handleHeightChange = (value: number) => {
    setSizePreset("custom");
    if (ratio) {
      setHeight(value);
      setWidth(applyAspectToHeight(value, ratio));
      return;
    }
    setHeight(value);
  };

  const handleAspectChange = (value: MapAspectPreset) => {
    setAspectPreset(value);
    if (value === "none") return;
    const nextRatio = aspectRatioValue(
      value,
      Number(customAspectW) || 1,
      Number(customAspectH) || 1,
    );
    if (nextRatio) {
      setHeight(applyAspectToWidth(width, nextRatio));
    }
  };

  const handleBrowseImport = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: t("create.importFilter"),
          extensions: ["png", "jpg", "jpeg", "webp"],
        },
      ],
    });
    if (selected && !Array.isArray(selected)) {
      setImportPath(selected);
      setImportLabel(selected.split(/[/\\]/).pop() ?? selected);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorKey("errors.name_required");
      return;
    }
    if (mode === "import") {
      if (!importPath) {
        setErrorKey("create.errors.import_required");
        return;
      }
    } else if (!isDimensionInRange(width) || !isDimensionInRange(height)) {
      setErrorKey("errors.invalid_dimensions");
      return;
    }
    setErrorKey(null);
    try {
      await onCreate({
        name: trimmed,
        mode,
        width,
        height,
        importPath,
      });
      onOpenChange(false);
    } catch {
      setErrorKey("errors.generic");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{t("create.title")}</DialogTitle>
            <DialogDescription>{t("create.description")}</DialogDescription>
          </DialogHeader>

          {errorKey ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {t(errorKey)}
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-map-name">{t("create.nameLabel")}</Label>
              <Input
                id="create-map-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("mapNamePlaceholder")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-map-mode">{t("create.modeLabel")}</Label>
              <select
                id="create-map-mode"
                className={SELECT_CLASS}
                value={mode}
                onChange={(e) => setMode(e.target.value as MapCreateMode)}
              >
                <option value="blank">{t("create.modeBlank")}</option>
                <option value="import">{t("create.modeImport")}</option>
              </select>
            </div>

            {mode === "blank" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="create-map-preset">{t("create.presetLabel")}</Label>
                  <select
                    id="create-map-preset"
                    className={SELECT_CLASS}
                    value={sizePreset}
                    onChange={(e) =>
                      applySizePreset(e.target.value as MapSizePresetId)
                    }
                  >
                    <option value="default">{t("create.presetDefault")}</option>
                    <option value="hd">{t("create.presetHd")}</option>
                    <option value="square">{t("create.presetSquare")}</option>
                    <option value="a4ish">{t("create.presetA4ish")}</option>
                    <option value="custom">{t("create.presetCustom")}</option>
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-map-width">{t("create.widthLabel")}</Label>
                    <Input
                      id="create-map-width"
                      type="number"
                      min={512}
                      max={8192}
                      value={width}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-map-height">{t("create.heightLabel")}</Label>
                    <Input
                      id="create-map-height"
                      type="number"
                      min={512}
                      max={8192}
                      value={height}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-map-aspect">{t("create.aspectLabel")}</Label>
                  <select
                    id="create-map-aspect"
                    className={SELECT_CLASS}
                    value={aspectPreset}
                    onChange={(e) =>
                      handleAspectChange(e.target.value as MapAspectPreset)
                    }
                  >
                    <option value="none">{t("create.aspectNone")}</option>
                    <option value="16:9">{t("create.aspect169")}</option>
                    <option value="4:3">{t("create.aspect43")}</option>
                    <option value="1:1">{t("create.aspect11")}</option>
                    <option value="custom">{t("create.aspectCustom")}</option>
                  </select>
                </div>

                {aspectPreset === "custom" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="create-aspect-w">{t("create.customAspectW")}</Label>
                      <Input
                        id="create-aspect-w"
                        type="number"
                        min={1}
                        value={customAspectW}
                        onChange={(e) => {
                          setCustomAspectW(e.target.value);
                          const nextRatio = aspectRatioValue(
                            "custom",
                            Number(e.target.value) || 1,
                            Number(customAspectH) || 1,
                          );
                          if (nextRatio) {
                            setHeight(applyAspectToWidth(width, nextRatio));
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-aspect-h">{t("create.customAspectH")}</Label>
                      <Input
                        id="create-aspect-h"
                        type="number"
                        min={1}
                        value={customAspectH}
                        onChange={(e) => {
                          setCustomAspectH(e.target.value);
                          const nextRatio = aspectRatioValue(
                            "custom",
                            Number(customAspectW) || 1,
                            Number(e.target.value) || 1,
                          );
                          if (nextRatio) {
                            setHeight(applyAspectToWidth(width, nextRatio));
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-2">
                <Label>{t("create.importLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={importLabel ?? ""}
                    placeholder={t("create.importPlaceholder")}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => void handleBrowseImport()}>
                    {t("create.importBrowse")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("create.importHint")}</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("create.cancel")}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
