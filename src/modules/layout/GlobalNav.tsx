import { BookOpen, Clock, Globe, History, Map, Network, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ExplorerViewMode } from "@/lib/types/fs";
import { cn } from "@/lib/utils";
import type { WorkspaceMainView } from "@/stores/useWorkspaceStore";

interface GlobalNavProps {
  editorViewMode: ExplorerViewMode;
  onEditorViewMode: (mode: "manuscript" | "worldbuilding") => void;
  mainView: WorkspaceMainView;
  onMainViewChange: (view: WorkspaceMainView) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

const EDITOR_MODES: {
  id: "manuscript" | "worldbuilding";
  icon: typeof BookOpen;
}[] = [
  { id: "manuscript", icon: BookOpen },
  { id: "worldbuilding", icon: Globe },
];

export function GlobalNav({
  editorViewMode,
  onEditorViewMode,
  mainView,
  onMainViewChange,
  onOpenHistory,
  onOpenSettings,
}: GlobalNavProps) {
  const { t } = useTranslation("explorer");
  const { t: tTimeline } = useTranslation("timeline");
  const { t: tMaps } = useTranslation("maps");
  const { t: tGraph } = useTranslation("graph");
  const { t: tVersions } = useTranslation("versions");
  const { t: tSettings } = useTranslation("settings");

  const navBtn =
    "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <nav
      className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-card py-3"
      aria-label={t("title")}
    >
      <div className="flex w-full flex-col items-center gap-1 px-1.5">
        {EDITOR_MODES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={t(`view.${id}`)}
            aria-label={t(`view.${id}`)}
            aria-pressed={mainView === "editor" && editorViewMode === id}
            className={cn(
              navBtn,
              mainView === "editor" &&
                editorViewMode === id &&
                "bg-muted text-foreground",
            )}
            onClick={() => {
              onMainViewChange("editor");
              onEditorViewMode(id);
            }}
          >
            <Icon className="size-4" />
          </button>
        ))}

        <button
          type="button"
          title={tTimeline("title")}
          aria-label={tTimeline("title")}
          aria-pressed={mainView === "timeline"}
          className={cn(navBtn, mainView === "timeline" && "bg-muted text-foreground")}
          onClick={() => onMainViewChange("timeline")}
        >
          <Clock className="size-4" />
        </button>

        <button
          type="button"
          title={tMaps("title")}
          aria-label={tMaps("title")}
          aria-pressed={mainView === "map"}
          className={cn(navBtn, mainView === "map" && "bg-muted text-foreground")}
          onClick={() => onMainViewChange("map")}
        >
          <Map className="size-4" />
        </button>

        <button
          type="button"
          title={tGraph("title")}
          aria-label={tGraph("title")}
          aria-pressed={mainView === "graph"}
          className={cn(navBtn, mainView === "graph" && "bg-muted text-foreground")}
          onClick={() => onMainViewChange("graph")}
        >
          <Network className="size-4" />
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 px-1.5">
        <button
          type="button"
          title={tVersions("title")}
          aria-label={tVersions("title")}
          className={navBtn}
          onClick={onOpenHistory}
        >
          <History className="size-4" />
        </button>
        <button
          type="button"
          title={tSettings("title")}
          aria-label={tSettings("title")}
          className={navBtn}
          onClick={onOpenSettings}
        >
          <Settings className="size-4" />
        </button>
      </div>
    </nav>
  );
}
