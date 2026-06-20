import { useCallback, useEffect, useRef, useState } from "react";

import { invokeCommand, parseAppError } from "@/lib/ipc";
import type { ProjectLocationOccurrenceV1 } from "@/lib/types/mapLocations";
import { useEditorStore } from "@/stores/useEditorStore";
import { useProjectStore } from "@/stores/useProjectStore";

export function useProjectLocations() {
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath ?? "");
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const metadataSaveStatus = useEditorStore((s) => s.metadataSaveStatus);

  const [occurrences, setOccurrences] = useState<ProjectLocationOccurrenceV1[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const prevSaveStatus = useRef(saveStatus);
  const prevMetadataSaveStatus = useRef(metadataSaveStatus);

  const load = useCallback(async () => {
    if (!rootPath) {
      setOccurrences([]);
      setHasLoaded(false);
      setErrorKey(null);
      return;
    }
    setLoading(true);
    try {
      const list = await invokeCommand<ProjectLocationOccurrenceV1[]>(
        "list_project_location_occurrences_cmd",
      );
      setOccurrences(list);
      setHasLoaded(true);
      setErrorKey(null);
    } catch (err) {
      setOccurrences([]);
      setHasLoaded(true);
      setErrorKey(parseAppError(err)?.key ?? "error.generic");
    } finally {
      setLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const savedDocument = prevSaveStatus.current !== "saved" && saveStatus === "saved";
    const savedMetadata =
      prevMetadataSaveStatus.current !== "saved" && metadataSaveStatus === "saved";
    prevSaveStatus.current = saveStatus;
    prevMetadataSaveStatus.current = metadataSaveStatus;
    if (savedDocument || savedMetadata) {
      void load();
    }
  }, [load, metadataSaveStatus, saveStatus]);

  return { occurrences, loading, hasLoaded, errorKey, reload: load };
}
