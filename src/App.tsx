import { useEffect } from "react";

import i18n from "@/i18n/config";
import { applyTheme } from "@/lib/theme";
import { ProjectLauncher } from "@/modules/project/ProjectLauncher";
import { WorkspaceShell } from "@/modules/layout/WorkspaceShell";
import { useAppStore } from "@/stores";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

function App() {
  const setInitialized = useAppStore((s) => s.setInitialized);
  const activeProject = useProjectStore((s) => s.activeProject);
  const recents = useProjectStore((s) => s.recents);
  const hasHydrated = useProjectStore((s) => s.hasHydrated);
  const hydrate = useProjectStore((s) => s.hydrate);

  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);

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

  if (!hasHydrated) {
    return (
      <main className="flex h-screen items-center justify-center overflow-hidden bg-background">
        <div
          className="size-8 animate-pulse rounded-full bg-muted"
          aria-busy="true"
          aria-label="Loading"
        />
      </main>
    );
  }

  if (!activeProject) {
    return <ProjectLauncher variant={recents.length === 0 ? "welcome" : "picker"} />;
  }

  return <WorkspaceShell />;
}

export default App;
