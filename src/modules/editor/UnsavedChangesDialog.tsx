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
import { useEditorStore } from "@/stores/useEditorStore";

export function UnsavedChangesDialog() {
  const { t } = useTranslation("editor");
  const open = useEditorStore((s) => s.showUnsavedDialog);
  const unsavedAction = useEditorStore((s) => s.unsavedAction);
  const confirmDiscardUnsaved = useEditorStore((s) => s.confirmDiscardUnsaved);
  const cancelPendingUnsaved = useEditorStore((s) => s.cancelPendingUnsaved);

  const message =
    unsavedAction === "close" ? t("unsaved.messageClose") : t("unsaved.message");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && cancelPendingUnsaved()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("unsaved.title")}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => cancelPendingUnsaved()}>
            {t("unsaved.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirmDiscardUnsaved()}
          >
            {t("unsaved.discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
