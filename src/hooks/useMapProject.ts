import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { invokeCommand, parseAppError } from "@/lib/ipc";
import { mapErrorKey } from "@/lib/maps/mapErrors";
import type { MapData, MapStateAt, MapSummary } from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";
import { useProjectStore } from "@/stores/useProjectStore";

type MapsListSnapshot = {
  key: string;
  maps: MapSummary[];
  errorKey: string | null;
};

type MapDataSnapshot = {
  key: string;
  data: MapData | null;
  errorKey: string | null;
};

type PreviewSnapshot = {
  key: string;
  state: MapStateAt | null;
  errorKey: string | null;
};

export function useMapProject() {
  const activeMapId = useMapStore((s) => s.activeMapId);
  const previewTimestamp = useMapStore((s) => s.previewTimestamp);
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath ?? "");

  const [listSnapshot, setListSnapshot] = useState<MapsListSnapshot | null>(null);
  const [dataSnapshot, setDataSnapshot] = useState<MapDataSnapshot | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<PreviewSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<MapData | null>(null);
  const [pendingData, setPendingData] = useState<MapData | null>(null);

  const listKey = rootPath;
  const dataKey = `${rootPath}:${activeMapId ?? ""}`;
  const previewKey = `${dataKey}:${previewTimestamp ?? ""}`;

  useEffect(() => {
    if (!rootPath) return;
    let cancelled = false;
    void (async () => {
      try {
        const maps = await invokeCommand<MapSummary[]>("list_project_maps");
        if (!cancelled) {
          setListSnapshot({ key: listKey, maps, errorKey: null });
        }
      } catch (err) {
        if (!cancelled) {
          setListSnapshot({
            key: listKey,
            maps: [],
            errorKey: mapErrorKey(parseAppError(err)),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listKey, rootPath]);

  useEffect(() => {
    if (!activeMapId || !rootPath) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await invokeCommand<MapData>("get_map_data_cmd", {
          mapId: activeMapId,
        });
        if (!cancelled) {
          setDataSnapshot({ key: dataKey, data: loaded, errorKey: null });
          setPendingData(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setDataSnapshot({
            key: dataKey,
            data: null,
            errorKey: mapErrorKey(parseAppError(err)),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataKey, activeMapId, rootPath]);

  useEffect(() => {
    if (!activeMapId || !rootPath) return;
    let cancelled = false;
    void (async () => {
      try {
        const state = await invokeCommand<MapStateAt>("get_map_state_at_cmd", {
          mapId: activeMapId,
          timestamp: previewTimestamp,
        });
        if (!cancelled) {
          setPreviewSnapshot({ key: previewKey, state, errorKey: null });
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewSnapshot({
            key: previewKey,
            state: null,
            errorKey: mapErrorKey(parseAppError(err)),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewKey, activeMapId, rootPath, previewTimestamp]);

  const maps = listSnapshot?.key === listKey ? listSnapshot.maps : [];
  const data =
    pendingData ?? (dataSnapshot?.key === dataKey ? dataSnapshot.data : null);
  const previewState =
    previewSnapshot?.key === previewKey ? previewSnapshot.state : null;
  const loadingList = listSnapshot?.key !== listKey;
  const loadingData = Boolean(activeMapId) && dataSnapshot?.key !== dataKey;
  const errorKey =
    listSnapshot?.key === listKey
      ? listSnapshot.errorKey
      : dataSnapshot?.key === dataKey
        ? dataSnapshot.errorKey
        : previewSnapshot?.key === previewKey
          ? previewSnapshot.errorKey
          : null;

  const loadMaps = useCallback(async () => {
    if (!rootPath) return;
    try {
      const list = await invokeCommand<MapSummary[]>("list_project_maps");
      setListSnapshot({ key: listKey, maps: list, errorKey: null });
    } catch (err) {
      setListSnapshot({
        key: listKey,
        maps: [],
        errorKey: mapErrorKey(parseAppError(err)),
      });
    }
  }, [listKey, rootPath]);

  const flushSave = useCallback(async () => {
    const payload = pendingSave.current;
    if (!payload) return;
    pendingSave.current = null;
    setSaving(true);
    try {
      await invokeCommand("save_map_data_cmd", { data: payload });
      setDataSnapshot({ key: dataKey, data: payload, errorKey: null });
      await loadMaps();
    } catch (err) {
      setDataSnapshot({
        key: dataKey,
        data: payload,
        errorKey: mapErrorKey(parseAppError(err)),
      });
    } finally {
      setSaving(false);
    }
  }, [dataKey, loadMaps]);

  const scheduleSave = useCallback(
    (next: MapData) => {
      setPendingData(next);
      pendingSave.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave();
      }, 500);
    },
    [flushSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingSave.current) {
        void invokeCommand("save_map_data_cmd", { data: pendingSave.current });
      }
    };
  }, []);

  const displayData = useMemo(() => {
    if (previewTimestamp && previewState) {
      return previewState;
    }
    return data;
  }, [previewTimestamp, previewState, data]);

  const reloadActiveMap = useCallback(async () => {
    if (!activeMapId || !rootPath) return;
    try {
      const loaded = await invokeCommand<MapData>("get_map_data_cmd", {
        mapId: activeMapId,
      });
      setDataSnapshot({ key: dataKey, data: loaded, errorKey: null });
      setPendingData(loaded);
    } catch (err) {
      setDataSnapshot({
        key: dataKey,
        data: null,
        errorKey: mapErrorKey(parseAppError(err)),
      });
    }
  }, [activeMapId, dataKey, rootPath]);

  return {
    maps,
    data,
    displayData,
    previewState,
    loading: loadingList || loadingData,
    saving,
    errorKey,
    loadMaps,
    reloadActiveMap,
    scheduleSave,
    flushSave,
  };
}
