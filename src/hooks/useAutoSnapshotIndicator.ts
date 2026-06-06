import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { formatSnapshotDate } from "@/lib/versions/formatSnapshotDate";
import { useProjectStore } from "@/stores/useProjectStore";

interface AutoSnapshotEvent {
  createdAt: number;
}

interface AutoSnapshotSnapshot {
  projectKey: string;
  createdAt: number;
}

/**
 * Escucha snapshots automáticos del backend y expone la hora del último para la UI.
 */
export function useAutoSnapshotIndicator() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const projectKey = activeProject?.rootPath ?? "";
  const [snapshot, setSnapshot] = useState<AutoSnapshotSnapshot | null>(null);

  useEffect(() => {
    if (!projectKey) {
      return;
    }

    let disposed = false;

    const unlistenPromise = listen<AutoSnapshotEvent>("auto-snapshot", (event) => {
      if (!disposed) {
        setSnapshot({ projectKey, createdAt: event.payload.createdAt });
      }
    });

    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [projectKey]);

  const lastAutoAt =
    projectKey && snapshot?.projectKey === projectKey ? snapshot.createdAt : null;

  const lastAutoLabel =
    lastAutoAt !== null ? formatSnapshotDate(lastAutoAt, navigator.language) : null;

  return { lastAutoAt, lastAutoLabel };
}
