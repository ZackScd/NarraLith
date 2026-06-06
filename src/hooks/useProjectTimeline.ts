import { useEffect, useRef } from "react";

import { useEditorStore } from "@/stores/useEditorStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjectTimelineStore } from "@/stores/useProjectTimelineStore";

export function useProjectTimeline() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const metadataSaveStatus = useEditorStore((s) => s.metadataSaveStatus);

  const events = useProjectTimelineStore((s) => s.events);
  const lastAdded = useProjectTimelineStore((s) => s.lastAdded);
  const loading = useProjectTimelineStore((s) => s.loading);
  const hasLoaded = useProjectTimelineStore((s) => s.hasLoaded);
  const errorKey = useProjectTimelineStore((s) => s.errorKey);
  const load = useProjectTimelineStore((s) => s.load);

  const prevSaveStatus = useRef(saveStatus);
  const prevMetadataSaveStatus = useRef(metadataSaveStatus);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [activeProject, load]);

  useEffect(() => {
    const savedDocument = prevSaveStatus.current !== "saved" && saveStatus === "saved";
    const savedMetadata =
      prevMetadataSaveStatus.current !== "saved" && metadataSaveStatus === "saved";
    prevSaveStatus.current = saveStatus;
    prevMetadataSaveStatus.current = metadataSaveStatus;
    if (savedDocument || savedMetadata) {
      void load();
    }
  }, [saveStatus, metadataSaveStatus, load]);

  return { events, lastAdded, loading, hasLoaded, errorKey, reload: load };
}
