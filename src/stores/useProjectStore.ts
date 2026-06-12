import { create } from "zustand";
import { open } from "@tauri-apps/plugin-dialog";

import { invokeCommand, parseAppError } from "@/lib/ipc";
import { audit } from "@/lib/audit";
import { useEditorStore } from "@/stores/useEditorStore";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useEntitySearchStore } from "@/stores/useEntitySearchStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useMapStore } from "@/stores/useMapStore";
import { useProjectTimelineStore } from "@/stores/useProjectTimelineStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { ProjectMeta } from "@/lib/types/models";
import type { RecentProjectEntry } from "@/lib/types/project";

interface ProjectState {
  activeProject: ProjectMeta | null;
  recents: RecentProjectEntry[];
  /** Carga de comandos IPC (crear/abrir/cerrar), no bloquea la pantalla inicial. */
  isLoading: boolean;
  /** Primera comprobación de sesión completada (éxito o error). */
  hasHydrated: boolean;
  lastErrorKey: string | null;
  hydrate: () => Promise<void>;
  loadRecents: () => Promise<void>;
  createProject: (
    parentPath: string,
    name: string,
    templateId: string,
  ) => Promise<boolean>;
  openProject: (path: string) => Promise<boolean>;
  openProjectDialog: () => Promise<boolean>;
  closeProject: () => Promise<void>;
  removeRecent: (path: string) => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  activeProject: null,
  recents: [],
  isLoading: false,
  hasHydrated: false,
  lastErrorKey: null,

  clearError: () => set({ lastErrorKey: null }),

  hydrate: async () => {
    if (get().hasHydrated) {
      await get().loadRecents();
      return;
    }

    set({ lastErrorKey: null, isLoading: true });
    try {
      const recents = await invokeCommand<RecentProjectEntry[]>("list_recent_projects");
      set({ recents });

      let active = await invokeCommand<ProjectMeta | null>("get_active_project");

      if (!active) {
        const latest = recents.find((entry) => entry.exists);
        if (latest) {
          active = await invokeCommand<ProjectMeta>("open_project", {
            path: latest.path,
          });
        }
      }

      if (active) {
        set({ activeProject: active });
        void useCalendarStore.getState().loadCalendar();
        await get().loadRecents();
      }
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
    } finally {
      set({ hasHydrated: true, isLoading: false });
    }
  },

  loadRecents: async () => {
    try {
      const recents = await invokeCommand<RecentProjectEntry[]>("list_recent_projects");
      set({ recents });
    } catch {
      set({ recents: [] });
    }
  },

  createProject: async (parentPath, name, templateId) => {
    set({ isLoading: true, lastErrorKey: null });
    try {
      const locale = useSettingsStore.getState().locale;
      const meta = await invokeCommand<ProjectMeta>("create_project", {
        parentPath,
        name,
        templateId,
        locale,
      });
      set({ activeProject: meta });
      audit.info("project", "obs.project.open", { name: meta.name, created: true });
      await get().loadRecents();
      void useCalendarStore.getState().loadCalendar();
      return true;
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  openProject: async (path) => {
    set({ isLoading: true, lastErrorKey: null });
    try {
      const meta = await invokeCommand<ProjectMeta>("open_project", { path });
      set({ activeProject: meta });
      audit.info("project", "obs.project.open", { name: meta.name });
      await get().loadRecents();
      void useCalendarStore.getState().loadCalendar();
      return true;
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  openProjectDialog: async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "NarraLith",
    });
    if (!selected || Array.isArray(selected)) {
      return false;
    }
    return get().openProject(selected);
  },

  closeProject: async () => {
    const projectName = get().activeProject?.name;
    set({ isLoading: true, lastErrorKey: null });
    try {
      await invokeCommand("close_project");
      useFileTreeStore.getState().reset();
      useEditorStore.getState().reset();
      useEntitySearchStore.getState().reset();
      useCalendarStore.getState().reset();
      useProjectTimelineStore.getState().reset();
      useWorkspaceStore.getState().reset();
      useMapStore.getState().reset();
      set({ activeProject: null });
      audit.info("project", "obs.project.close", { name: projectName ?? null });
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  removeRecent: async (path) => {
    try {
      await invokeCommand("remove_recent_project", { path });
      await get().loadRecents();
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
    }
  },
}));
