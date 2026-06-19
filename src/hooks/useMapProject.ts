import { useCallback, useEffect, useState } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { mapErrorKey } from "@/lib/maps/mapErrors";
import type {
  MapCreateDraft,
  MapDocumentV1,
  MapDrawingV2,
  MapSessionV2,
  MapSummaryV2,
  OpenPreference,
} from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";
import { useProjectStore } from "@/stores/useProjectStore";

interface SessionSnapshot {
  key: string;
  session: MapSessionV2 | null;
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

  const [sessionSnapshot, setSessionSnapshot] = useState<SessionSnapshot | null>(null);
  const [activeSnapshot, setActiveSnapshot] = useState<ActiveSnapshot | null>(null);
  const [creating, setCreating] = useState(false);
  const [canvasBusy, setCanvasBusy] = useState(false);

  const sessionKey = rootPath;
  const activeKey = `${rootPath}:${activeMapId ?? ""}`;

  const loadSession = useCallback(
    async (options?: { applyInitial?: boolean }) => {
      if (!rootPath) return null;
      const applyInitial = options?.applyInitial ?? false;
      try {
        const session = await invokeCommand<MapSessionV2>("get_maps_session_cmd");
        setSessionSnapshot({ key: sessionKey, session, errorKey: null });

        if (applyInitial) {
          if (session.initialMapId) {
            useMapStore.getState().setActiveMap(session.initialMapId);
            trackAction("map", "resolveInitial", {
              mapId: session.initialMapId,
              reason: session.initialReason,
              openPreference: session.openPreference,
            });
            trackAction("map", "open", { mapId: session.initialMapId });
          } else {
            useMapStore.getState().setActiveMap(null);
            trackAction("map", "resolveInitial", {
              mapId: null,
              reason: session.initialReason,
              openPreference: session.openPreference,
            });
          }
        }

        return session;
      } catch (err) {
        setSessionSnapshot({
          key: sessionKey,
          session: null,
          errorKey: mapErrorKey(parseAppError(err)),
        });
        return null;
      }
    },
    [rootPath, sessionKey],
  );

  const refreshActiveMap = useCallback(async () => {
    if (!activeMapId || !rootPath) return;
    try {
      const [document, drawing] = await Promise.all([
        invokeCommand<MapDocumentV1>("get_map_document_cmd", { mapId: activeMapId }),
        invokeCommand<MapDrawingV2>("get_map_drawing_cmd", { mapId: activeMapId }),
      ]);
      setActiveSnapshot({
        key: activeKey,
        document,
        drawing,
        errorKey: null,
      });
    } catch (err) {
      setActiveSnapshot({
        key: activeKey,
        document: null,
        drawing: null,
        errorKey: mapErrorKey(parseAppError(err)),
      });
    }
  }, [activeKey, activeMapId, rootPath]);

  useEffect(() => {
    if (!rootPath) {
      setSessionSnapshot(null);
      return;
    }
    void loadSession({ applyInitial: true });
  }, [loadSession, rootPath]);

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

  const selectMap = useCallback(
    async (mapId: string) => {
      const fromMapId = useMapStore.getState().activeMapId;
      if (fromMapId === mapId) return;
      const fromMode = useMapStore.getState().viewMode;

      await invokeCommand("record_map_viewed_cmd", { mapId });
      useMapStore.getState().setActiveMap(mapId);
      if (fromMode !== "interactive") {
        trackAction("map", "setViewMode", {
          mapId,
          mode: "interactive",
          fromMode,
        });
      }
      trackAction("map", "select", { mapId, fromMapId });
      await loadSession();
    },
    [loadSession],
  );

  const setOpenPreference = useCallback(
    async (openPreference: OpenPreference) => {
      await invokeCommand("set_open_preference_cmd", { openPreference });
      trackAction("map", "setOpenPreference", { openPreference });
      await loadSession();
    },
    [loadSession],
  );

  const setDefaultOnOpen = useCallback(
    async (mapId: string, enabled: boolean) => {
      await invokeCommand("set_default_on_open_cmd", { mapId, enabled });
      trackAction("map", "setDefaultOnOpen", { mapId, enabled });
      await loadSession();
    },
    [loadSession],
  );

  const createMap = useCallback(
    async (draft: MapCreateDraft) => {
      setCreating(true);
      try {
        const fromMapId = useMapStore.getState().activeMapId;
        const fromMode = useMapStore.getState().viewMode;
        const summary = await invokeCommand<MapSummaryV2>("create_map_cmd", {
          name: draft.name,
          mode: draft.mode,
          width: draft.mode === "blank" ? draft.width : null,
          height: draft.mode === "blank" ? draft.height : null,
          sourcePath: draft.mode === "import" ? draft.importPath : null,
        });
        useMapStore.getState().setActiveMap(summary.id);
        if (fromMode !== "interactive") {
          trackAction("map", "setViewMode", {
            mapId: summary.id,
            mode: "interactive",
            fromMode,
          });
        }
        trackAction("map", "create", {
          mode: draft.mode,
          width: summary.width,
          height: summary.height,
          mapId: summary.id,
        });
        trackAction("map", "select", { mapId: summary.id, fromMapId });
        await loadSession();
        return summary;
      } finally {
        setCreating(false);
      }
    },
    [loadSession],
  );

  const expandCanvas = useCallback(
    async (addRight: number, addBottom: number) => {
      if (!activeMapId) return null;
      const strokesBefore =
        activeSnapshot?.key === activeKey
          ? activeSnapshot.drawing?.layers.reduce(
              (n, layer) => n + layer.strokes.length,
              0,
            ) ?? 0
          : 0;
      setCanvasBusy(true);
      try {
        const document = await invokeCommand<MapDocumentV1>("expand_map_canvas_cmd", {
          mapId: activeMapId,
          addRight,
          addBottom,
        });
        trackAction("map", "expandCanvas", {
          mapId: activeMapId,
          addRight,
          addBottom,
          newWidth: document.width,
          newHeight: document.height,
        });
        await loadSession();
        await refreshActiveMap();
        return { document, strokesBefore };
      } finally {
        setCanvasBusy(false);
      }
    },
    [activeKey, activeMapId, activeSnapshot, loadSession, refreshActiveMap],
  );

  const cropCanvas = useCallback(
    async (newWidth: number, newHeight: number) => {
      if (!activeMapId) return null;
      const strokesBefore =
        activeSnapshot?.key === activeKey
          ? activeSnapshot.drawing?.layers.reduce(
              (n, layer) => n + layer.strokes.length,
              0,
            ) ?? 0
          : 0;
      setCanvasBusy(true);
      try {
        const document = await invokeCommand<MapDocumentV1>("crop_map_canvas_cmd", {
          mapId: activeMapId,
          newWidth,
          newHeight,
        });
        await refreshActiveMap();
        const strokesAfter =
          useMapStore.getState().activeMapId === activeMapId
            ? (await invokeCommand<MapDrawingV2>("get_map_drawing_cmd", {
                mapId: activeMapId,
              })).layers.reduce((n, layer) => n + layer.strokes.length, 0)
            : strokesBefore;
        trackAction("map", "cropCanvas", {
          mapId: activeMapId,
          newWidth: document.width,
          newHeight: document.height,
          strokesRemoved: Math.max(0, strokesBefore - strokesAfter),
        });
        await loadSession();
        return document;
      } finally {
        setCanvasBusy(false);
      }
    },
    [activeKey, activeMapId, activeSnapshot, loadSession, refreshActiveMap],
  );

  const session =
    sessionSnapshot?.key === sessionKey ? sessionSnapshot.session : null;
  const maps = session?.maps ?? [];
  const openPreference = session?.openPreference ?? "lastViewed";
  const loadingSession = Boolean(rootPath) && sessionSnapshot?.key !== sessionKey;
  const loadingActive = Boolean(activeMapId) && activeSnapshot?.key !== activeKey;

  const document =
    activeSnapshot?.key === activeKey ? activeSnapshot.document : null;
  const drawing = activeSnapshot?.key === activeKey ? activeSnapshot.drawing : null;

  const errorKey =
    sessionSnapshot?.key === sessionKey
      ? sessionSnapshot.errorKey
      : activeSnapshot?.key === activeKey
        ? activeSnapshot.errorKey
        : null;

  return {
    maps,
    openPreference,
    document,
    drawing,
    loading: loadingSession || loadingActive,
    creating,
    canvasBusy,
    errorKey,
    loadSession,
    refreshActiveMap,
    selectMap,
    setOpenPreference,
    setDefaultOnOpen,
    createMap,
    expandCanvas,
    cropCanvas,
  };
}
