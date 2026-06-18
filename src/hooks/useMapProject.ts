import { useCallback, useEffect, useState } from "react";

import { invokeCommand, parseAppError } from "@/lib/ipc";
import { mapErrorKey } from "@/lib/maps/mapErrors";
import type { MapDocumentV1, MapDrawingV2, MapSummaryV2 } from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";
import { useProjectStore } from "@/stores/useProjectStore";

interface ListSnapshot {
  key: string;
  maps: MapSummaryV2[];
  errorKey: string | null;
}

interface ActiveSnapshot {
  key: string;
  document: MapDocumentV1 | null;
  drawing: MapDrawingV2 | null;
  errorKey: string | null;
}

export function useMapProject() {
  const activeMapId = useMapStore((s) => s.activeMapId);
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath ?? "");

  const [listSnapshot, setListSnapshot] = useState<ListSnapshot | null>(null);
  const [activeSnapshot, setActiveSnapshot] = useState<ActiveSnapshot | null>(null);
  const [creating, setCreating] = useState(false);

  const listKey = rootPath;
  const activeKey = `${rootPath}:${activeMapId ?? ""}`;

  const loadMaps = useCallback(async () => {
    if (!rootPath) return;
    try {
      const maps = await invokeCommand<MapSummaryV2[]>("list_project_maps");
      setListSnapshot({ key: listKey, maps, errorKey: null });
    } catch (err) {
      setListSnapshot({
        key: listKey,
        maps: [],
        errorKey: mapErrorKey(parseAppError(err)),
      });
    }
  }, [listKey, rootPath]);

  useEffect(() => {
    if (!rootPath) {
      setListSnapshot(null);
      return;
    }
    void loadMaps();
  }, [loadMaps, rootPath]);

  useEffect(() => {
    if (!activeMapId || !rootPath) {
      setActiveSnapshot(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const [document, drawing] = await Promise.all([
          invokeCommand<MapDocumentV1>("get_map_document_cmd", { mapId: activeMapId }),
          invokeCommand<MapDrawingV2>("get_map_drawing_cmd", { mapId: activeMapId }),
        ]);
        if (!cancelled) {
          setActiveSnapshot({
            key: activeKey,
            document,
            drawing,
            errorKey: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setActiveSnapshot({
            key: activeKey,
            document: null,
            drawing: null,
            errorKey: mapErrorKey(parseAppError(err)),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeKey, activeMapId, rootPath]);

  const createBlankMap = useCallback(
    async (name: string, width: number, height: number) => {
      setCreating(true);
      try {
        const summary = await invokeCommand<MapSummaryV2>("create_blank_map_cmd", {
          name,
          width,
          height,
        });
        await loadMaps();
        useMapStore.getState().setActiveMap(summary.id);
        return summary;
      } finally {
        setCreating(false);
      }
    },
    [loadMaps],
  );

  const maps = listSnapshot?.key === listKey ? listSnapshot.maps : [];
  const loadingList = Boolean(rootPath) && listSnapshot?.key !== listKey;
  const loadingActive = Boolean(activeMapId) && activeSnapshot?.key !== activeKey;

  const document =
    activeSnapshot?.key === activeKey ? activeSnapshot.document : null;
  const drawing = activeSnapshot?.key === activeKey ? activeSnapshot.drawing : null;

  const errorKey =
    listSnapshot?.key === listKey
      ? listSnapshot.errorKey
      : activeSnapshot?.key === activeKey
        ? activeSnapshot.errorKey
        : null;

  return {
    maps,
    document,
    drawing,
    loading: loadingList || loadingActive,
    creating,
    errorKey,
    loadMaps,
    createBlankMap,
  };
}
