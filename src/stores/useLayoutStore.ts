import { create } from "zustand";

const LAYOUT_KEY = "narralith-layout";

interface LayoutPersist {
  explorerOpen: boolean;
  explorerWidth: number;
  rightPanelWidth: number;
  rightPanelCollapsed: boolean;
  /** §1.3 — OFF: barra, esquinas y chips inline se ocultan (texto plano en lienzo). */
  inlineMetadataVisible: boolean;
}

function loadLayout(): LayoutPersist {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LayoutPersist>;
      return {
        explorerOpen: parsed.explorerOpen ?? true,
        explorerWidth: clampExplorerWidth(parsed.explorerWidth ?? 260),
        rightPanelWidth: clampWidth(parsed.rightPanelWidth ?? 264),
        rightPanelCollapsed: parsed.rightPanelCollapsed ?? false,
        inlineMetadataVisible: parsed.inlineMetadataVisible ?? false,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    explorerOpen: true,
    explorerWidth: 260,
    rightPanelWidth: 264,
    rightPanelCollapsed: false,
    inlineMetadataVisible: false,
  };
}

function clampWidth(value: number): number {
  return Math.min(480, Math.max(180, value));
}

function clampExplorerWidth(value: number): number {
  return Math.min(520, Math.max(200, value));
}

function persistLayout(state: LayoutPersist) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(state));
}

interface LayoutState extends LayoutPersist {
  toggleExplorer: () => void;
  setExplorerOpen: (open: boolean) => void;
  setExplorerWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  toggleRightPanelCollapsed: () => void;
  setInlineMetadataVisible: (visible: boolean) => void;
  toggleInlineMetadata: () => void;
}

const initial = loadLayout();

export const useLayoutStore = create<LayoutState>((set, get) => {
  function snapshot(): LayoutPersist {
    return {
      explorerOpen: get().explorerOpen,
      explorerWidth: get().explorerWidth,
      rightPanelWidth: get().rightPanelWidth,
      rightPanelCollapsed: get().rightPanelCollapsed,
      inlineMetadataVisible: get().inlineMetadataVisible,
    };
  }

  return {
    ...initial,

    toggleExplorer: () => {
      const next = !get().explorerOpen;
      set({ explorerOpen: next });
      persistLayout({ ...snapshot(), explorerOpen: next });
    },

    setExplorerOpen: (open) => {
      set({ explorerOpen: open });
      persistLayout({ ...snapshot(), explorerOpen: open });
    },

    setExplorerWidth: (width) => {
      const clamped = clampExplorerWidth(width);
      set({ explorerWidth: clamped });
      persistLayout({ ...snapshot(), explorerWidth: clamped });
    },

    setRightPanelWidth: (width) => {
      const clamped = clampWidth(width);
      set({ rightPanelWidth: clamped });
      persistLayout({ ...snapshot(), rightPanelWidth: clamped });
    },

    setRightPanelCollapsed: (rightPanelCollapsed) => {
      set({ rightPanelCollapsed });
      persistLayout({ ...snapshot(), rightPanelCollapsed });
    },

    toggleRightPanelCollapsed: () => {
      const rightPanelCollapsed = !get().rightPanelCollapsed;
      set({ rightPanelCollapsed });
      persistLayout({ ...snapshot(), rightPanelCollapsed });
    },

    setInlineMetadataVisible: (visible) => {
      set({ inlineMetadataVisible: visible });
      persistLayout({ ...snapshot(), inlineMetadataVisible: visible });
    },

    toggleInlineMetadata: () => {
      const next = !get().inlineMetadataVisible;
      set({ inlineMetadataVisible: next });
      persistLayout({ ...snapshot(), inlineMetadataVisible: next });
    },
  };
});
