import { useEffect, useState } from "react";

import { useAutoSnapshotIndicator } from "@/hooks/useAutoSnapshotIndicator";
import { useUiRenderAudit } from "@/lib/render-audit/hooks/useUiRenderAudit";
import { useAuditBootstrap } from "@/hooks/useAuditBootstrap";
import { useAuditLogShortcut } from "@/hooks/useAuditLogShortcut";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";
import { useEditorFsSync } from "@/hooks/useEditorFsSync";
import { usePersistManuscriptTabs } from "@/hooks/usePersistManuscriptTabs";
import { useRestoreLastManuscriptFile } from "@/hooks/useRestoreLastManuscriptFile";
import { useSaveShortcut } from "@/hooks/useSaveShortcut";
import { useEntityIndexBootstrap } from "@/hooks/useEntityIndexBootstrap";
import { useFsWatcher } from "@/hooks/useFsWatcher";
import { EditorCanvas } from "@/modules/editor/EditorCanvas";
import { EditorSidePanel } from "@/modules/editor/EditorSidePanel";
import { ExternalReloadDialog } from "@/modules/editor/ExternalReloadDialog";
import { UnsavedChangesDialog } from "@/modules/editor/UnsavedChangesDialog";
import { FileExplorer } from "@/modules/explorer/FileExplorer";
import { GlobalNav } from "@/modules/layout/GlobalNav";
import { ResizableLeftPanel } from "@/modules/layout/ResizableLeftPanel";
import { ResizableRightPanel } from "@/modules/layout/ResizableRightPanel";
import { WorkspaceTopBar } from "@/modules/layout/WorkspaceTopBar";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { SettingsDialog } from "@/modules/settings/SettingsDialog";
import { GraphView } from "@/modules/graph/GraphView";
import { MapWorkspace } from "@/modules/maps/MapWorkspace";
import { ConsistencyPanel } from "@/modules/consistency/ConsistencyPanel";
import { CalendarWorkspace } from "@/modules/calendar/CalendarWorkspace";
import { CalendarDraftDialogs } from "@/modules/calendar/CalendarDraftDialogs";
import { TimelineView } from "@/modules/timeline/TimelineView";
import { TimelineSidePanel } from "@/modules/timeline/TimelineSidePanel";
import { VersionHistoryPanel } from "@/modules/versions/VersionHistoryPanel";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { guardCalendarNavigation } from "@/stores/useCalendarViewStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function WorkspaceShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const closeProject = useProjectStore((s) => s.closeProject);
  const viewMode = useFileTreeStore((s) => s.viewMode);
  const setViewMode = useFileTreeStore((s) => s.setViewMode);
  const mainView = useWorkspaceStore((s) => s.mainView);
  const setMainView = useWorkspaceStore((s) => s.setMainView);

  const handleMainViewChange = (view: typeof mainView) => {
    if (mainView === "calendar" && view !== "calendar") {
      guardCalendarNavigation(() => setMainView(view), "leave");
      return;
    }
    setMainView(view);
  };
  const explorerOpen = useLayoutStore((s) => s.explorerOpen);
  const explorerWidth = useLayoutStore((s) => s.explorerWidth);
  const setExplorerWidth = useLayoutStore((s) => s.setExplorerWidth);
  const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth);
  const setRightPanelWidth = useLayoutStore((s) => s.setRightPanelWidth);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);

  useEntityIndexBootstrap();
  useAuditBootstrap();
  useUiRenderAudit();
  useAuditLogShortcut();
  useSaveShortcut();
  useFsWatcher();
  useEditorFsSync();
  usePersistManuscriptTabs();
  useRestoreLastManuscriptFile();
  useEditorAutoSave();
  useAutoSnapshotIndicator();

  useEffect(() => {
    const preventNativeContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", preventNativeContextMenu);
    return () => window.removeEventListener("contextmenu", preventNativeContextMenu);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <WorkspaceTopBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <GlobalNav
            editorViewMode={viewMode === "all" ? "manuscript" : viewMode}
            onEditorViewMode={(mode) => setViewMode(mode)}
            mainView={mainView}
            onMainViewChange={handleMainViewChange}
            onOpenHistory={() => setVersionsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          {explorerOpen && mainView === "editor" ? (
            <ResizableLeftPanel width={explorerWidth} onWidthChange={setExplorerWidth}>
              <FileExplorer />
            </ResizableLeftPanel>
          ) : null}

          <main
            className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
              mainView === "map" || mainView === "calendar" ? "" : "p-4"
            }`}
          >
            {mainView === "calendar" ? (
              <CalendarWorkspace />
            ) : mainView === "timeline" ? (
              <TimelineView />
            ) : mainView === "consistency" ? (
              <ConsistencyPanel />
            ) : mainView === "map" ? (
              <MapWorkspace />
            ) : mainView === "graph" ? (
              <GraphView />
            ) : (
              <EditorCanvas />
            )}
          </main>
        </div>
      </div>

      {mainView === "editor" ? (
        <ResizableRightPanel
          width={rightPanelWidth}
          onWidthChange={setRightPanelWidth}
          collapsed={rightPanelCollapsed}
        >
          <EditorSidePanel />
        </ResizableRightPanel>
      ) : null}

      {mainView === "timeline" ? (
        <ResizableRightPanel
          width={rightPanelWidth}
          onWidthChange={setRightPanelWidth}
          collapsed={rightPanelCollapsed}
        >
          <TimelineSidePanel />
        </ResizableRightPanel>
      ) : null}

      <UnsavedChangesDialog />
      <CalendarDraftDialogs />
      <ExternalReloadDialog />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onCloseProject={async () => {
          await closeProject();
          setSettingsOpen(false);
        }}
        onOpenAllExplorer={() => {
          setViewMode("all");
          setMainView("editor");
        }}
        onOpenConsistency={() => setMainView("consistency")}
      />
      <VersionHistoryPanel open={versionsOpen} onOpenChange={setVersionsOpen} />
    </div>
  );
}
