import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import type { FsChangeEvent } from "@/lib/types/fs";
import { useEntitySearchStore } from "@/stores/useEntitySearchStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useProjectStore } from "@/stores/useProjectStore";

/**
 * Escucha `fs-changed` mientras hay proyecto activo: refresca explorador e índice de entidades.
 */
export function useFsWatcher() {
  const activeProject = useProjectStore((s) => s.activeProject);

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    let disposed = false;
    const notifyFsChange = useFileTreeStore.getState().notifyFsChange;
    const rebuildEntityIndex = useEntitySearchStore.getState().rebuildIndex;

    const unlistenPromise = listen<FsChangeEvent>("fs-changed", (event) => {
      if (disposed) {
        return;
      }
      const { kind, paths } = event.payload;
      const summary =
        paths.length === 1 ? `${kind}: ${paths[0]}` : `${kind}: ${paths.length} rutas`;
      notifyFsChange(summary);

      const touchesMd = paths.some((p) => p.toLowerCase().endsWith(".md"));
      if (
        touchesMd ||
        kind === "rename" ||
        kind === "remove" ||
        kind === "create" ||
        kind === "restore"
      ) {
        void rebuildEntityIndex();
      }
    });

    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [activeProject]);
}
