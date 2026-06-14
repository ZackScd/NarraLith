import { useEffect, lazy, Suspense, type ReactNode } from "react";

import i18n from "@/i18n/config";
import { useAuditBootstrap } from "@/hooks/useAuditBootstrap";
import { useAuditLogShortcut } from "@/hooks/useAuditLogShortcut";
import { applyTheme } from "@/lib/theme";
import { AuditLogViewer } from "@/modules/debug/AuditLogViewer";
import { ProjectLauncher } from "@/modules/project/ProjectLauncher";
import { WorkspaceShell } from "@/modules/layout/WorkspaceShell";
import { useAppStore } from "@/stores";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const LauncherDebugNavMenu = __AUDIT_ENABLED__
  ? lazy(() =>
      import("@/modules/debug/DebugNavMenu").then((mod) => ({
        default: mod.DebugNavMenu,
      })),
    )
  : null;

const launcherNavBtn =
  "flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground";

function App() {
  const setInitialized = useAppStore((s) => s.setInitialized);
  const activeProject = useProjectStore((s) => s.activeProject);
  const recents = useProjectStore((s) => s.recents);
  const hasHydrated = useProjectStore((s) => s.hasHydrated);
  const hydrate = useProjectStore((s) => s.hydrate);

  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);

  useAuditBootstrap();
  useAuditLogShortcut();

  useEffect(() => {
    setInitialized(true);
    void hydrate();
  }, [setInitialized, hydrate]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
    document.documentElement.lang = locale;
  }, [locale]);

  let content: ReactNode;

  if (!hasHydrated) {
    content = (
      <main className="flex h-screen items-center justify-center overflow-hidden bg-background">
        <div
          className="size-8 animate-pulse rounded-full bg-muted"
          aria-busy="true"
          aria-label="Loading"
        />
      </main>
    );
  } else if (!activeProject) {
    content = <ProjectLauncher variant={recents.length === 0 ? "welcome" : "picker"} />;
  } else {
    content = <WorkspaceShell />;
  }

  return (
    <>
      {content}
      {__AUDIT_ENABLED__ ? <AuditLogViewer /> : null}
      {!activeProject && LauncherDebugNavMenu ? (
        <Suspense fallback={null}>
          <LauncherDebugNavMenu navBtnClassName={launcherNavBtn} menuPlacement="floating" />
        </Suspense>
      ) : null}
    </>
  );
}

export default App;
