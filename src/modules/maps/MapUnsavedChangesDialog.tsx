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
import {
  cancelMapUnsavedNavigation,
  confirmMapUnsavedDiscard,
  confirmMapUnsavedSave,
} from "@/lib/maps/mapDrawingGuard";
import { useMapUnsavedStore } from "@/stores/useMapUnsavedStore";

function messageKeyForContext(
  context: ReturnType<typeof useMapUnsavedStore.getState>["context"],
): string {
  switch (context) {
    case "mapSwitch":
      return "unsaved.messageMapSwitch";
    case "exitEdit":
      return "unsaved.messageExitEdit";
    case "canvasOp":
      return "unsaved.messageCanvasOp";
    case "projectSwitch":
      return "unsaved.messageProjectSwitch";
    case "leave":
    default:
      return "unsaved.messageLeave";
  }
}

export function MapUnsavedChangesDialog() {
  const { t } = useTranslation("maps");
  const open = useMapUnsavedStore((s) => s.dialogOpen);
  const context = useMapUnsavedStore((s) => s.context);
  const isSaving = useMapUnsavedStore((s) => s.isSaving);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && cancelMapUnsavedNavigation()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("unsaved.title")}</DialogTitle>
          <DialogDescription>{t(messageKeyForContext(context))}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => cancelMapUnsavedNavigation()}>
            {t("unsaved.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSaving}
            onClick={() => confirmMapUnsavedDiscard()}
          >
            {t("unsaved.discard")}
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void confirmMapUnsavedSave()}
          >
            {isSaving ? t("unsaved.saving") : t("unsaved.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
