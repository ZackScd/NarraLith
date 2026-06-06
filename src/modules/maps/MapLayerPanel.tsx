import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntitySearch } from "@/hooks/useEntitySearch";
import {
  addLayer,
  newMapLayerId,
  updateFeature,
  updateLayer,
} from "@/lib/maps/mapMutations";
import type { MapData, MapSummary } from "@/lib/types/maps";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";
import { useMapStore } from "@/stores/useMapStore";

interface MapLayerPanelProps {
  data: MapData;
  maps: MapSummary[];
  onChange: (next: MapData) => void;
}

export function MapLayerPanel({ data, maps, onChange }: MapLayerPanelProps) {
  const { t } = useTranslation("maps");
  const selectedFeatureId = useMapStore((s) => s.selectedFeatureId);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const { isReady, searchDebounced } = useEntitySearch();
  const [entityQuery, setEntityQuery] = useState("");
  const [hits, setHits] = useState<{ name: string; path: string }[]>([]);

  const selected = useMemo(
    () => data.layers.features.find((f) => f.id === selectedFeatureId) ?? null,
    [data.layers.features, selectedFeatureId],
  );

  function runSearch(q: string) {
    if (!isReady) {
      setHits([]);
      return;
    }
    searchDebounced(q, 8, (results) => {
      setHits(results.map((h) => ({ name: h.name, path: h.path })));
    });
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">{t("layers.title")}</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const layer = {
                id: newMapLayerId(),
                name: `${t("layers.title")} ${data.layers.layers.length + 1}`,
                visible: true,
                opacity: 1,
                zIndex: data.layers.layers.length,
                categoryFilter: null,
              };
              onChange(addLayer(data, layer));
            }}
          >
            {t("layers.add")}
          </Button>
        </div>
        <ul className="space-y-2">
          {data.layers.layers.map((layer) => (
            <li key={layer.id} className="rounded-md border border-border p-2 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  aria-label={t("layers.visible")}
                  onChange={(e) =>
                    onChange(updateLayer(data, layer.id, { visible: e.target.checked }))
                  }
                />
                <span className="flex-1 truncate font-medium">{layer.name}</span>
              </div>
              <Label className="mt-2 text-xs">{t("layers.categoryFilter")}</Label>
              <Input
                className="h-8 text-xs"
                value={layer.categoryFilter ?? ""}
                placeholder="location"
                onChange={(e) =>
                  onChange(
                    updateLayer(data, layer.id, {
                      categoryFilter: e.target.value || null,
                    }),
                  )
                }
              />
              <Label className="mt-2 text-xs">{t("layers.opacity")}</Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={layer.opacity}
                className="w-full"
                onChange={(e) =>
                  onChange(
                    updateLayer(data, layer.id, { opacity: Number(e.target.value) }),
                  )
                }
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border pt-3">
        <h3 className="mb-2 text-sm font-medium">{t("layers.properties")}</h3>
        {!selected ? (
          <p className="text-xs text-muted-foreground">{t("layers.noSelection")}</p>
        ) : (
          <div className="space-y-2">
            <div>
              <Label htmlFor="feat-label">{t("layers.label")}</Label>
              <Input
                id="feat-label"
                value={selected.label ?? ""}
                onChange={(e) =>
                  onChange(
                    updateFeature(data, selected.id, { label: e.target.value || null }),
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="feat-entity">{t("layers.entity")}</Label>
              <Input
                id="feat-entity"
                value={entityQuery || selected.entityPath || ""}
                placeholder={t("layers.entityPlaceholder")}
                onChange={(e) => {
                  setEntityQuery(e.target.value);
                  runSearch(e.target.value);
                }}
                onFocus={() => runSearch(entityQuery)}
              />
              {hits.length > 0 && (
                <ul className="mt-1 max-h-32 overflow-y-auto rounded border border-border bg-popover p-1">
                  {hits.map((h) => (
                    <li key={h.path}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded px-2 py-1 text-left text-xs hover:bg-accent",
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onChange(
                            updateFeature(data, selected.id, { entityPath: h.path }),
                          );
                          setEntityQuery(h.path);
                          setHits([]);
                        }}
                      >
                        {h.name}
                        <span className="ml-1 text-muted-foreground">{h.path}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selected.entityPath ? (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  className="mt-1 h-auto p-0"
                  onClick={() => void requestOpenDocument(selected.entityPath!)}
                >
                  {t("layers.openEntity")}
                </Button>
              ) : null}
            </div>
            <div>
              <Label htmlFor="feat-child">{t("layers.childMap")}</Label>
              <select
                id="feat-child"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={selected.childMapId ?? ""}
                onChange={(e) =>
                  onChange(
                    updateFeature(data, selected.id, {
                      childMapId: e.target.value || null,
                    }),
                  )
                }
              >
                <option value="">{t("layers.childMapNone")}</option>
                {maps
                  .filter((m) => m.id !== data.manifest.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
