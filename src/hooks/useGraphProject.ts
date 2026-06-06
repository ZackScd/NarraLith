import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { graphErrorKey } from "@/lib/graph/graphErrors";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import type { GraphData, GraphDataFilters } from "@/lib/types/graph";
import { useSettingsStore } from "@/stores/useSettingsStore";

function buildFilters(selectedCategories: string[]): GraphDataFilters {
  return {
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
  };
}

async function fetchGraphData(filters: GraphDataFilters): Promise<GraphData> {
  return invokeCommand<GraphData>("get_graph_data_cmd", { filters });
}

export function useGraphProject(selectedCategories: string[]) {
  const graphAutoRebuildOnView = useSettingsStore((s) => s.graphAutoRebuildOnView);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const didAutoRebuild = useRef(false);

  const filters = useMemo(() => buildFilters(selectedCategories), [selectedCategories]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setErrorKey(null);
    });

    void fetchGraphData(filters)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorKey(graphErrorKey(parseAppError(err)));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, refreshNonce]);

  const loadData = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  const rebuildIndex = useCallback(async () => {
    setRebuilding(true);
    setErrorKey(null);
    try {
      await invokeCommand("rebuild_graph_index_cmd");
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      setErrorKey(graphErrorKey(parseAppError(err)));
    } finally {
      setRebuilding(false);
    }
  }, []);

  useEffect(() => {
    if (!graphAutoRebuildOnView || didAutoRebuild.current) return;
    didAutoRebuild.current = true;
    void Promise.resolve().then(() => rebuildIndex());
  }, [graphAutoRebuildOnView, rebuildIndex]);

  useEffect(() => {
    let cancelled = false;
    const unlisten = listen("graph-index-updated", () => {
      if (!cancelled) setRefreshNonce((n) => n + 1);
    });
    return () => {
      cancelled = true;
      void unlisten.then((fn) => fn());
    };
  }, []);

  return {
    data,
    loading,
    rebuilding,
    errorKey,
    loadData,
    rebuildIndex,
  };
}
