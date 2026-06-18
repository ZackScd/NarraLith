import { Loader2, Map as MapIcon, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMapProject } from "@/hooks/useMapProject";
import {
  MAP_CREATE_DEFAULT_HEIGHT,
  MAP_CREATE_DEFAULT_WIDTH,
} from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";
import { cn } from "@/lib/utils";

export function MapWorkspace() {
  const { t } = useTranslation("maps");
  const activeMapId = useMapStore((s) => s.activeMapId);
  const setActiveMap = useMapStore((s) => s.setActiveMap);
  const { maps, document, drawing, loading, creating, errorKey, createBlankMap } =
    useMapProject();

  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapIcon className="size-5 text-muted-foreground" />
          <h1 className="text-sm font-semibold">{t("title")}</h1>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
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

        {maps.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {maps.map((map) => (
              <button
                key={map.id}
                type="button"
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors hover:bg-muted/40",
                  activeMapId === map.id
                    ? "border-primary bg-muted/30"
                    : "border-border/60",
                )}
                onClick={() => setActiveMap(map.id)}
              >
                <p className="font-medium">{map.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {map.width} × {map.height}
                </p>
              </button>
            ))}
          </div>
        ) : null}

        {activeMapId && document && drawing ? (
          <section className="mt-6 rounded-lg border border-border/60 p-4">
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
