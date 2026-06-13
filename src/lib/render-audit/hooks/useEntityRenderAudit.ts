import { useEffect } from "react";

import { listChildrenAt } from "@/lib/explorer/treeNav";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

export function useEntityRenderAudit(): void {
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);
  const entity = useEditorStore((s) => s.entity);
  const viewMode = useFileTreeStore((s) => s.viewMode);
  const explorerLayout = useFileTreeStore((s) => s.explorerLayout);
  const cardPath = useFileTreeStore((s) => s.cardPath);
  const tree = useFileTreeStore((s) => s.tree);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (activeTabKind !== "entity" || !activeFilePath) {
      return;
    }
    renderAudit.ui(UI_EVENTS.entity.workspace, {
      entityPath: activeFilePath,
      layout: "editor",
      templateId: entity?.templateId ?? null,
    });
  }, [activeTabKind, activeFilePath, entity?.templateId]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (viewMode !== "worldbuilding" || explorerLayout !== "cards") {
      return;
    }
    const { folders, files } = listChildrenAt(tree, cardPath);
    const visibleCards = [...folders, ...files].slice(0, 40).map((node) => node.path);
    renderAudit.ui(UI_EVENTS.entity.cardGrid, {
      cardPath: cardPath || "/",
      visibleCards,
      total: folders.length + files.length,
    });
  }, [viewMode, explorerLayout, cardPath, tree]);
}
