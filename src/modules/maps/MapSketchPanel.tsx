import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import { X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { mapErrorKey } from "@/lib/maps/mapErrors";

const Excalidraw = lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  await import("@excalidraw/excalidraw/index.css");
  return { default: mod.Excalidraw };
});

/** Fondo del lienzo de bocetos, alineado con el tema oscuro de la app. */
const SKETCH_BG = "#18181b";

interface StoredSketch {
  type?: string;
  version?: number;
  elements?: ExcalidrawInitialDataState["elements"];
  appState?: Partial<AppState>;
  files?: BinaryFiles;
}

interface MapSketchPanelProps {
  mapId: string;
  visible: boolean;
  onError: (key: string) => void;
  onClose?: () => void;
}

function toInitialData(
  raw: StoredSketch | null,
): ExcalidrawInitialDataState | undefined {
  if (!raw) {
    return {
      elements: [],
      appState: { viewBackgroundColor: SKETCH_BG },
    };
  }
  return {
    elements: raw.elements ?? [],
    appState: {
      ...raw.appState,
      viewBackgroundColor: raw.appState?.viewBackgroundColor ?? SKETCH_BG,
    },
    files: raw.files,
    scrollToContent: true,
  };
}

export function MapSketchPanel({
  mapId,
  visible,
  onError,
  onClose,
}: MapSketchPanelProps) {
  const { t } = useTranslation("maps");
  const [initialData, setInitialData] = useState<
    ExcalidrawInitialDataState | undefined
  >(undefined);
  const [sketchKey, setSketchKey] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPayload = useRef<StoredSketch | null>(null);

  const loadSketch = useCallback(async () => {
    try {
      const raw = await invokeCommand<StoredSketch | null>("get_map_sketch_cmd", {
        mapId,
      });
      return toInitialData(raw);
    } catch (err) {
      onError(mapErrorKey(parseAppError(err)));
      return undefined;
    }
  }, [mapId, onError]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await loadSketch();
      if (!cancelled) {
        setInitialData(data);
        setSketchKey(mapId);
      }
    })();
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingPayload.current) {
        void invokeCommand("save_map_sketch_cmd", {
          mapId,
          sketch: pendingPayload.current,
        });
      }
    };
  }, [loadSketch, mapId]);

  const ready = sketchKey === mapId;
  const displayInitial = ready ? initialData : undefined;

  const scheduleSave = useCallback(
    (
      elements: ExcalidrawInitialDataState["elements"],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      const payload: StoredSketch = {
        type: "excalidraw",
        version: 2,
        elements: elements ? [...elements] : [],
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor ?? SKETCH_BG,
          gridSize: appState.gridSize,
        },
        files,
      };
      pendingPayload.current = payload;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void invokeCommand("save_map_sketch_cmd", { mapId, sketch: payload }).catch(
          (err) => {
            onError(mapErrorKey(parseAppError(err)));
          },
        );
      }, 700);
    },
    [mapId, onError],
  );

  if (!visible) {
    return null;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
        <div>
          <p className="text-xs font-medium text-foreground">{t("sketches.title")}</p>
          <p className="text-[10px] text-muted-foreground">{t("sketches.hint")}</p>
        </div>
        {onClose ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={onClose}
            aria-label={t("sketches.hide")}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1 [&_.excalidraw]:!h-full [&_.excalidraw]:!w-full">
        {!ready ? (
          <p className="p-3 text-xs text-muted-foreground">{t("sketches.loading")}</p>
        ) : (
          <Suspense
            fallback={
              <p className="p-3 text-xs text-muted-foreground">
                {t("sketches.loading")}
              </p>
            }
          >
            <Excalidraw
              key={mapId}
              theme="dark"
              initialData={displayInitial}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  export: false,
                  saveToActiveFile: false,
                },
              }}
              onChange={(elements, appState, files) => {
                scheduleSave(elements, appState, files);
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
