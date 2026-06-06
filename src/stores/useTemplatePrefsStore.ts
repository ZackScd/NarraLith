import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomFieldDef {
  key: string;
  label: string;
}

interface TemplatePrefs {
  hiddenKeys: string[];
  customFields: CustomFieldDef[];
}

interface TemplatePrefsState {
  byScope: Record<string, Record<string, TemplatePrefs>>;
  getPrefs: (projectPath: string | null, templateId: string) => TemplatePrefs;
  setHiddenKeys: (
    projectPath: string | null,
    templateId: string,
    hiddenKeys: string[],
  ) => void;
  toggleHidden: (projectPath: string | null, templateId: string, key: string) => void;
  addCustomField: (
    projectPath: string | null,
    templateId: string,
    field: CustomFieldDef,
  ) => void;
  removeCustomField: (
    projectPath: string | null,
    templateId: string,
    key: string,
  ) => void;
}

const EMPTY: TemplatePrefs = { hiddenKeys: [], customFields: [] };

function scopeKey(projectPath: string | null): string {
  return projectPath?.replace(/\\/g, "/") ?? "_no_project";
}

export const useTemplatePrefsStore = create<TemplatePrefsState>()(
  persist(
    (set, get) => ({
      byScope: {},

      getPrefs(projectPath, templateId) {
        return get().byScope[scopeKey(projectPath)]?.[templateId] ?? EMPTY;
      },

      setHiddenKeys(projectPath, templateId, hiddenKeys) {
        const sk = scopeKey(projectPath);
        set((state) => ({
          byScope: {
            ...state.byScope,
            [sk]: {
              ...state.byScope[sk],
              [templateId]: {
                ...(state.byScope[sk]?.[templateId] ?? EMPTY),
                hiddenKeys,
              },
            },
          },
        }));
      },

      toggleHidden(projectPath, templateId, key) {
        const prefs = get().getPrefs(projectPath, templateId);
        const next = prefs.hiddenKeys.includes(key)
          ? prefs.hiddenKeys.filter((k) => k !== key)
          : [...prefs.hiddenKeys, key];
        get().setHiddenKeys(projectPath, templateId, next);
      },

      addCustomField(projectPath, templateId, field) {
        const sk = scopeKey(projectPath);
        const prefs = get().getPrefs(projectPath, templateId);
        if (prefs.customFields.some((f) => f.key === field.key)) {
          return;
        }
        set((state) => ({
          byScope: {
            ...state.byScope,
            [sk]: {
              ...state.byScope[sk],
              [templateId]: {
                ...prefs,
                customFields: [...prefs.customFields, field],
              },
            },
          },
        }));
      },

      removeCustomField(projectPath, templateId, key) {
        const sk = scopeKey(projectPath);
        const prefs = get().getPrefs(projectPath, templateId);
        set((state) => ({
          byScope: {
            ...state.byScope,
            [sk]: {
              ...state.byScope[sk],
              [templateId]: {
                ...prefs,
                customFields: prefs.customFields.filter((f) => f.key !== key),
              },
            },
          },
        }));
      },
    }),
    { name: "narralith-template-prefs" },
  ),
);
