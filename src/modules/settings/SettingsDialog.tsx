import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Label } from "@/components/ui/label";
import { EDITOR_SAVE_LIMITS } from "@/lib/types/editorSettings";
import { AppearanceSettingsSection } from "@/modules/settings/AppearanceSettingsSection";
import { ManuscriptSettingsSection } from "@/modules/settings/ManuscriptSettingsSection";
import { useSettingsStore } from "@/stores/useSettingsStore";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseProject?: () => Promise<void> | void;
  onOpenAllExplorer?: () => void;
  onOpenConsistency?: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onCloseProject,
  onOpenAllExplorer,
  onOpenConsistency,
}: SettingsDialogProps) {
  const { t } = useTranslation("settings");
  const autosaveEnabled = useSettingsStore((s) => s.autosaveEnabled);
  const autosaveDebounceSec = useSettingsStore((s) => s.autosaveDebounceSec);
  const autosaveIntervalSec = useSettingsStore((s) => s.autosaveIntervalSec);
  const graphAutoRebuildOnView = useSettingsStore((s) => s.graphAutoRebuildOnView);
  const setEditorSave = useSettingsStore((s) => s.setEditorSave);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <AppearanceSettingsSection />

        <ManuscriptSettingsSection />

        <section className="space-y-4 border-t border-border pt-4">
          <h3 className="text-sm font-medium">{t("editor.sectionTitle")}</h3>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={autosaveEnabled}
              onChange={(e) => setEditorSave({ autosaveEnabled: e.target.checked })}
            />
            {t("editor.autosaveEnabled")}
          </label>

          {autosaveEnabled && (
            <div className="space-y-3 pl-1">
              <div className="space-y-1">
                <Label htmlFor="autosave-debounce">{t("editor.debounceLabel")}</Label>
                <EditableNumberInput
                  id="autosave-debounce"
                  min={EDITOR_SAVE_LIMITS.debounceMin}
                  max={EDITOR_SAVE_LIMITS.debounceMax}
                  fallback={30}
                  value={autosaveDebounceSec}
                  onValueChange={(n) => setEditorSave({ autosaveDebounceSec: n ?? 30 })}
                />
                <p className="text-xs text-muted-foreground">
                  {t("editor.debounceHint")}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="autosave-interval">{t("editor.intervalLabel")}</Label>
                <EditableNumberInput
                  id="autosave-interval"
                  min={EDITOR_SAVE_LIMITS.intervalMin}
                  max={EDITOR_SAVE_LIMITS.intervalMax}
                  fallback={0}
                  value={autosaveIntervalSec}
                  onValueChange={(n) => setEditorSave({ autosaveIntervalSec: n ?? 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  {t("editor.intervalHint")}
                </p>
              </div>
            </div>
          )}

          {!autosaveEnabled && (
            <p className="text-xs text-muted-foreground">{t("editor.manualHint")}</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("graph.sectionTitle")}</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={graphAutoRebuildOnView}
              onChange={(e) =>
                setEditorSave({ graphAutoRebuildOnView: e.target.checked })
              }
            />
            {t("graph.autoRebuildOnView")}
          </label>
          <p className="text-xs text-muted-foreground">{t("graph.autoRebuildHint")}</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("explorer.sectionTitle")}</h3>
          {onOpenAllExplorer ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onOpenAllExplorer();
                onOpenChange(false);
              }}
            >
              {t("explorer.openAllView")}
            </Button>
          ) : null}
          {onOpenConsistency ? (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onOpenConsistency();
                onOpenChange(false);
              }}
            >
              {t("explorer.openConsistency")}
            </Button>
          ) : null}
        </section>

        {onCloseProject ? (
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-medium">{t("project.sectionTitle")}</h3>
            <Button
              type="button"
              variant="destructive"
              className="w-full justify-start"
              onClick={() => void onCloseProject()}
            >
              {t("project.closeProject")}
            </Button>
          </section>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
