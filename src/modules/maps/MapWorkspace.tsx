import { Loader2, Map as MapIcon, Plus, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMapProject } from "@/hooks/useMapProject";
import {
  MAP_CREATE_DEFAULT_HEIGHT,
  MAP_CREATE_DEFAULT_WIDTH,
  type OpenPreference,
} from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

export function MapWorkspace() {
  const { t } = useTranslation("maps");
  const activeMapId = useMapStore((s) => s.activeMapId);
  const {
    maps,
    openPreference,
    document,
    drawing,
    loading,
    creating,
    errorKey,
    selectMap,
    setOpenPreference,
    setDefaultOnOpen,
    createBlankMap,
  } = useMapProject();

  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const activeSummary = maps.find((map) => map.id === activeMapId);
  const isPinned = activeSummary?.defaultOnOpen === true;
  const showEmpty = !loading && maps.length === 0;

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError(t("errors.name_required"));
      return;
    }
    setCreateError(null);
    try {
      await createBlankMap(trimmed, MAP_CREATE_DEFAULT_WIDTH, MAP_CREATE_DEFAULT_HEIGHT);
      setNewName("");
    } catch {
      setCreateError(t("errors.generic"));
    }
  };

  const handleMapChange = (mapId: string) => {
    if (!mapId) return;
    void selectMap(mapId);
  };

  const handlePreferenceChange = (value: OpenPreference) => {
    void setOpenPreference(value);
  };

  const handlePinToggle = () => {
    if (!activeMapId) return;
    void setDefaultOnOpen(activeMapId, !isPinned);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapIcon className="size-5 text-muted-foreground" />
            <h1 className="text-sm font-semibold">{t("title")}</h1>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Input
              className="max-w-[220px]"
              placeholder={t("mapNamePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
            />
            <Button
              size="sm"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t("createMap")}
            </Button>
          </div>
        </div>

        {maps.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="map-selector">{t("selector.label")}</Label>
              <select
                id="map-selector"
                className={SELECT_CLASS}
                value={activeMapId ?? ""}
                onChange={(e) => handleMapChange(e.target.value)}
              >
                {maps.map((map) => (
                  <option key={map.id} value={map.id}>
                    {t("selector.option", {
                      name: map.name,
                      width: map.width,
                      height: map.height,
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="map-open-preference">{t("openPreference.label")}</Label>
              <select
                id="map-open-preference"
                className={SELECT_CLASS}
                value={openPreference}
                onChange={(e) => handlePreferenceChange(e.target.value as OpenPreference)}
              >
                <option value="lastViewed">{t("openPreference.lastViewed")}</option>
                <option value="pinned">{t("openPreference.pinned")}</option>
                <option value="lastModified">{t("openPreference.lastModified")}</option>
              </select>
            </div>

            {activeMapId ? (
              <div className="space-y-1.5">
                <span className="block text-sm font-medium leading-none">{t("pin.label")}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-pressed={isPinned}
                  title={isPinned ? t("pin.unpin") : t("pin.pin")}
                  onClick={handlePinToggle}
                >
                  <Star
                    className={cn(
                      "size-4",
                      isPinned ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                    )}
                  />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading && maps.length === 0 ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loadingMaps")}
          </div>
        ) : null}

        {errorKey ? (
          <p className="mb-4 text-sm text-destructive">{t(errorKey)}</p>
        ) : null}

        {createError ? (
          <p className="mb-4 text-sm text-destructive">{createError}</p>
        ) : null}

        {showEmpty ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
            <MapIcon className="size-10 text-muted-foreground/60" />
            <h2 className="text-lg font-medium">{t("emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
          </div>
        ) : null}

        {activeMapId && document && drawing ? (
          <section className="rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold">{document.name}</h2>
            <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.id")}</dt>
                <dd className="font-mono text-xs text-foreground">{document.id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.canvas")}</dt>
                <dd>
                  {document.width} × {document.height}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.layers")}</dt>
                <dd>{drawing.layers.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.strokes")}</dt>
                <dd>
                  {drawing.layers.reduce((n, layer) => n + layer.strokes.length, 0)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">{t("placeholderHint")}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
