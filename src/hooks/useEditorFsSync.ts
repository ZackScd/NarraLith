import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import {
  shouldIgnoreFsReload,
  tabPathsToReloadOnFsChange,
} from "@/lib/editor/fsSync";
import { audit } from "@/lib/audit";
import type { FsChangeEvent } from "@/lib/types/fs";
import { useEditorStore } from "@/stores/useEditorStore";
import { useProjectStore } from "@/stores/useProjectStore";

/**
 * Recarga pestañas afectadas por cambios en disco (watcher o CRUD con `fs-changed`).
 * Pestaña activa con `isDirty` → diálogo; inactivas sin dirty → recarga en segundo plano.
 * `remove` cierra pestañas bajo la ruta eliminada; `restore` recarga todas.
 */
export function useEditorFsSync() {
  const activeProject = useProjectStore((s) => s.activeProject);

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    let disposed = false;

    const unlistenPromise = listen<FsChangeEvent>("fs-changed", async (event) => {
      if (disposed) {
        return;
      }

      const { paths, fromPath, kind } = event.payload;
      const editor = useEditorStore.getState();

      audit.info("editor", "obs.editor.fs.sync", {
        kind,
        paths,
        ...(fromPath ? { fromPath } : {}),
      });

      if (kind === "remove") {
        editor.closeTabsRemovedFromDisk(paths);
        return;
      }

      if (kind === "restore") {
        await editor.reloadAllTabsFromDisk();
        return;
      }

      if (kind === "rename" && fromPath && paths.length > 0) {
        editor.remapTabPath(fromPath, paths[0]);
      }

      const state = useEditorStore.getState();
      const toReload = tabPathsToReloadOnFsChange(event.payload, state.tabOrder);
      if (toReload.length === 0) {
        return;
      }

      const activePath = state.activeFilePath;
      if (activePath && toReload.includes(activePath)) {
        if (shouldIgnoreFsReload(activePath)) {
          audit.debug("fs", "obs.fs.self_save.ignore", { path: activePath });
          return;
        }
        if (state.isDirty) {
          state.requestExternalReload();
        } else {
          await state.reloadDocumentFromDisk();
        }
      }

      for (const path of toReload) {
        if (path === activePath) {
          continue;
        }
        if (shouldIgnoreFsReload(path)) {
          audit.debug("fs", "obs.fs.self_save.ignore", { path });
          continue;
        }
        const tab = state.tabs[path];
        if (!tab || tab.isDirty || tab.kind === "entity") {
          continue;
        }
        await useEditorStore.getState().reloadTabFromDisk(path);
      }
    });

    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [activeProject]);
}
