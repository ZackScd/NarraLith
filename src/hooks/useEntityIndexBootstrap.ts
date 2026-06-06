import { useEffect } from "react";

import { useEntitySearchStore } from "@/stores/useEntitySearchStore";
import { useProjectStore } from "@/stores/useProjectStore";

/**
 * Reconstruye MiniSearch desde SQLite al abrir proyecto y lo vacía al cerrar.
 */
export function useEntityIndexBootstrap() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const rebuildIndex = useEntitySearchStore((s) => s.rebuildIndex);
  const reset = useEntitySearchStore((s) => s.reset);

  useEffect(() => {
    if (!activeProject) {
      reset();
      return;
    }

    void rebuildIndex();
  }, [activeProject, rebuildIndex, reset]);
}
