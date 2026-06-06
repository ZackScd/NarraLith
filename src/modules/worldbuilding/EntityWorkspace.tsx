import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { normalizeEntityErrorKey } from "@/lib/worldbuilding/entityErrors";
import { EntityFormRenderer } from "@/modules/worldbuilding/EntityFormRenderer";
import { LocationInhabitantsPanel } from "@/modules/worldbuilding/LocationInhabitantsPanel";
import { saveAllOpenTabs, useEditorStore } from "@/stores/useEditorStore";

export function EntityWorkspace() {
  const { t } = useTranslation("worldbuilding");
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const entity = useEditorStore((s) => s.entity);
  const isLoading = useEditorStore((s) => s.isLoading);
  const lastErrorKey = useEditorStore((s) => s.lastErrorKey);
  const patchEntityField = useEditorStore((s) => s.patchEntityField);
  const setEntityBody = useEditorStore((s) => s.setEntityBody);

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
        <p className="text-sm text-muted-foreground">{t("form.saving")}</p>
      </section>
    );
  }

  if (!activeFilePath || !entity) {
    return null;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {lastErrorKey ? (
        <p className="shrink-0 text-xs text-destructive" role="alert">
          {t(normalizeEntityErrorKey(lastErrorKey), { defaultValue: lastErrorKey })}
        </p>
      ) : null}

      <section className="scroll-panel mt-2 min-h-0 flex-1 px-1">
        <section className="mx-auto max-w-2xl space-y-6">
          {entity.template.features?.includes("inhabitants") && (
            <LocationInhabitantsPanel locationPath={activeFilePath} />
          )}
        </section>
        <EntityFormRenderer
          entity={entity}
          onPatchField={patchEntityField}
          onBodyChange={setEntityBody}
        />
      </section>
    </section>
  );
}
