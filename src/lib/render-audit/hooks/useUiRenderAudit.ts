import { useEffect, useRef } from "react";

import type { FileTreeNode } from "@/lib/types/fs";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useCalendarPanelRenderAudit } from "@/lib/render-audit/hooks/useCalendarPanelRenderAudit";
import { useEditorRenderAudit } from "@/lib/render-audit/hooks/useEditorRenderAudit";
import { useEntityRenderAudit } from "@/lib/render-audit/hooks/useEntityRenderAudit";
import { useMapsRenderAuditStub } from "@/lib/render-audit/hooks/useMapsRenderAudit.stub";
import { useSidePanelRenderAudit } from "@/lib/render-audit/hooks/useSidePanelRenderAudit";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

function useDebouncedEffect(
  effect: () => void,
  deps: readonly unknown[],
  delayMs: number,
): void {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() && !renderAudit.isVerboseEnabled()) {
      return;
    }
    const timer = window.setTimeout(() => effectRef.current(), delayMs);
    return () => window.clearTimeout(timer);
  }, deps);
}

function useWorkspaceRenderAudit(): void {
  const mainView = useWorkspaceStore((s) => s.mainView);
  const explorerOpen = useLayoutStore((s) => s.explorerOpen);
  const explorerWidth = useLayoutStore((s) => s.explorerWidth);
  const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const prevView = useRef(mainView);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (prevView.current === mainView) {
      return;
    }
    renderAudit.ui(UI_EVENTS.workspace.viewChange, {
      from: prevView.current,
      to: mainView,
    });
    prevView.current = mainView;
  }, [mainView]);

  useDebouncedEffect(
    () => {
      renderAudit.ui(
        UI_EVENTS.workspace.layout,
        {
          mainView,
          explorerOpen,
          explorerWidth,
          rightPanelWidth,
          rightPanelCollapsed,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
        { channel: "both" },
      );
    },
    [mainView, explorerOpen, explorerWidth, rightPanelWidth, rightPanelCollapsed],
    300,
  );
}

function collectTreePaths(nodes: FileTreeNode[], max: number): { paths: string[]; total: number } {
  const paths: string[] = [];
  let total = 0;

  function walk(list: FileTreeNode[]): void {
    for (const node of list) {
      total += 1;
      if (paths.length < max) {
        paths.push(node.path);
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return { paths, total };
}

function useExplorerRenderAudit(): void {
  const selectedPath = useFileTreeStore((s) => s.selectedPath);
  const viewMode = useFileTreeStore((s) => s.viewMode);
  const explorerLayout = useFileTreeStore((s) => s.explorerLayout);
  const tree = useFileTreeStore((s) => s.tree);
  const searchQuery = useFileTreeStore((s) => s.searchQuery);
  const inlineCreate = useFileTreeStore((s) => s.inlineCreate);
  const inlineRename = useFileTreeStore((s) => s.inlineRename);
  const revision = useFileTreeStore((s) => s.revision);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() || !selectedPath) {
      return;
    }
    renderAudit.ui(UI_EVENTS.explorer.selection, { path: selectedPath });
  }, [selectedPath]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    renderAudit.ui(UI_EVENTS.explorer.viewMode, {
      viewMode,
      layout: explorerLayout,
    });
  }, [viewMode, explorerLayout]);

  useDebouncedEffect(
    () => {
      const { paths, total } = collectTreePaths(tree, 60);
      renderAudit.ui(
        UI_EVENTS.explorer.visibleTree,
        {
          paths,
          total,
          searchQuery: searchQuery || null,
          revision,
        },
        { channel: "standard" },
      );
      if (renderAudit.isVerboseEnabled()) {
        const verbose = collectTreePaths(tree, 500);
        renderAudit.ui(
          UI_EVENTS.explorer.visibleTree,
          {
            paths: verbose.paths,
            total: verbose.total,
            searchQuery: searchQuery || null,
            revision,
          },
          { channel: "verbose", level: "debug" },
        );
      }
    },
    [tree, searchQuery, revision],
    200,
  );

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (inlineCreate) {
      renderAudit.ui(UI_EVENTS.explorer.inlineEdit, {
        kind: inlineCreate.kind,
        parentPath: inlineCreate.parentPath,
      });
    } else if (inlineRename) {
      renderAudit.ui(UI_EVENTS.explorer.inlineEdit, {
        kind: "rename",
        parentPath: inlineRename.path,
        fileName: inlineRename.fileName,
      });
    }
  }, [inlineCreate, inlineRename]);
}

/** Monta hooks de instrumentación UI transversal (OBS-002). */
export function useUiRenderAudit(): void {
  useWorkspaceRenderAudit();
  useExplorerRenderAudit();
  useEditorRenderAudit();
  useSidePanelRenderAudit();
  useCalendarPanelRenderAudit();
  useEntityRenderAudit();
  useMapsRenderAuditStub();
}
