import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { normalizeEditorErrorKey } from "@/lib/editor/editorErrors";
import { EditorShell } from "@/modules/editor/EditorShell";
import { EntityWorkspace } from "@/modules/worldbuilding/EntityWorkspace";
import { saveAllOpenTabs, useEditorStore } from "@/stores/useEditorStore";

export function EditorCanvas() {
  const { t } = useTranslation("editor");
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);
  const manuscript = useEditorStore((s) => s.manuscript);
  const isLoading = useEditorStore((s) => s.isLoading);
  const lastErrorKey = useEditorStore((s) => s.lastErrorKey);
  const lastErrorDetails = useEditorStore((s) => s.lastErrorDetails);
  const documentSyncKey = useEditorStore((s) => s.documentSyncKey);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void saveAllOpenTabs();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (isLoading) {
    return (
      <section className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{t("placeholder.loading")}</p>
      </section>
    );
  }

  if (!activeFilePath) {
    return (
      <section className="flex flex-1 items-center justify-center p-6">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {t("placeholder.noFile")}
        </p>
      </section>
    );
  }

  if (activeTabKind === "entity") {
    return <EntityWorkspace />;
  }

  if (!manuscript) {
    return (
      <section className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{t("placeholder.loading")}</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {lastErrorKey ? (
        <p className="shrink-0 px-1 text-xs text-destructive" role="alert">
          {t(normalizeEditorErrorKey(lastErrorKey), { defaultValue: lastErrorKey })}
          {lastErrorDetails ? (
            <span className="mt-0.5 block font-mono text-[10px] opacity-80">
              {lastErrorDetails}
            </span>
          ) : null}
        </p>
      ) : null}

      <section className="scroll-panel relative flex min-h-0 flex-1 flex-col">
        <EditorShell
          key={`${activeFilePath}:${documentSyncKey}`}
          manuscript={manuscript}
          syncKey={documentSyncKey}
        />
      </section>
    </section>
  );
}
