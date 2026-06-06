import { open } from "@tauri-apps/plugin-dialog";
import { ImageIcon, PenLine } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { mapErrorKey } from "@/lib/maps/mapErrors";
import type { MapSummary } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

type CreateMode = "blank" | "import";

const BLANK_PRESETS = [
  { id: "small", width: 1200, height: 800 },
  { id: "medium", width: 2400, height: 1600 },
  { id: "large", width: 4000, height: 3000 },
] as const;

interface CreateMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (summary: MapSummary) => void;
}

export function CreateMapDialog({
  open: dialogOpen,
  onOpenChange,
  onCreated,
}: CreateMapDialogProps) {
  const { t } = useTranslation("maps");
  const [mode, setMode] = useState<CreateMode>("blank");
  const [name, setName] = useState("");
  const [presetId, setPresetId] =
    useState<(typeof BLANK_PRESETS)[number]["id"]>("medium");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const preset = BLANK_PRESETS.find((p) => p.id === presetId) ?? BLANK_PRESETS[1];

  function resetForm() {
    setMode("blank");
    setName("");
    setPresetId("medium");
    setImagePath(null);
    setErrorKey(null);
    setBusy(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function pickImage() {
    const picked = await open({
      multiple: false,
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (picked && typeof picked === "string") {
      setImagePath(picked);
    }
  }

  async function submit() {
    setBusy(true);
    setErrorKey(null);
    try {
      const trimmedName = name.trim() || t("createMap");
      let summary: MapSummary;

      if (mode === "blank") {
        summary = await invokeCommand<MapSummary>("create_blank_map_cmd", {
          name: trimmedName,
          width: preset.width,
          height: preset.height,
        });
        onCreated(summary);
      } else {
        if (!imagePath) return;
        summary = await invokeCommand<MapSummary>("create_map_cmd", {
          name: trimmedName,
          sourceImagePath: imagePath,
        });
        onCreated(summary);
      }

      handleOpenChange(false);
      resetForm();
    } catch (err) {
      setErrorKey(mapErrorKey(parseAppError(err)));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = mode === "blank" ? name.trim().length > 0 : Boolean(imagePath);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createMapTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
          <Button
            type="button"
            variant={mode === "blank" ? "secondary" : "ghost"}
            className="h-8 flex-1 gap-1.5 text-xs"
            onClick={() => setMode("blank")}
          >
            <PenLine className="size-3.5" />
            {t("createModeBlank")}
          </Button>
          <Button
            type="button"
            variant={mode === "import" ? "secondary" : "ghost"}
            className="h-8 flex-1 gap-1.5 text-xs"
            onClick={() => setMode("import")}
          >
            <ImageIcon className="size-3.5" />
            {t("createModeImport")}
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="map-name">{t("mapName")}</Label>
            <Input
              id="map-name"
              value={name}
              placeholder={t("mapNamePlaceholder")}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {mode === "blank" ? (
            <div className="space-y-2">
              <Label>{t("blankSizeLabel")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {BLANK_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPresetId(p.id)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-left text-xs transition-colors",
                      presetId === p.id
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <span className="block font-medium">{t(`blankSize.${p.id}`)}</span>
                    <span className="text-[10px] opacity-80">
                      {p.width}×{p.height}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("blankHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void pickImage()}
              >
                {t("pickImage")}
              </Button>
              {imagePath ? (
                <p className="truncate text-xs text-muted-foreground">{imagePath}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t("importHint")}</p>
              )}
            </div>
          )}

          {errorKey ? (
            <p className="text-sm text-destructive">
              {t(errorKey, { defaultValue: errorKey })}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={busy || !canSubmit}
            onClick={() => void submit()}
          >
            {busy ? t("creating") : t("createMap")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
