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
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";

export function CalendarDraftDialogs() {
  const { t } = useTranslation("calendarView");

  const unsavedOpen = useCalendarViewStore((s) => s.unsavedDialogOpen);
  const unsavedContext = useCalendarViewStore((s) => s.unsavedContext);
  const cancelUnsaved = useCalendarViewStore((s) => s.cancelUnsaved);
  const confirmDiscardUnsaved = useCalendarViewStore((s) => s.confirmDiscardUnsaved);
  const confirmSaveUnsaved = useCalendarViewStore((s) => s.confirmSaveUnsaved);
  const isSaving = useCalendarViewStore((s) => s.isSavingDraft);

  const deleteOpen = useCalendarViewStore((s) => s.deleteDialogOpen);
  const setDeleteDialogOpen = useCalendarViewStore((s) => s.setDeleteDialogOpen);
  const resetCalendarToDefault = useCalendarViewStore((s) => s.resetCalendarToDefault);
  const resetCalendarToBlank = useCalendarViewStore((s) => s.resetCalendarToBlank);
  const isResetting = useCalendarViewStore((s) => s.isResettingCalendar);

  const unsavedMessage =
    unsavedContext === "section"
      ? t("unsaved.messageSection")
      : t("unsaved.messageLeave");

  return (
    <>
      <Dialog open={unsavedOpen} onOpenChange={(next) => !next && cancelUnsaved()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unsaved.title")}</DialogTitle>
            <DialogDescription>{unsavedMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => cancelUnsaved()}>
              {t("unsaved.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => confirmDiscardUnsaved()}
            >
              {t("unsaved.discard")}
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => void confirmSaveUnsaved()}
            >
              {isSaving ? t("actions.saving") : t("unsaved.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => !next && !isResetting && setDeleteDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteCalendar.title")}</DialogTitle>
            <DialogDescription>{t("deleteCalendar.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isResetting}
              onClick={() => void resetCalendarToDefault()}
            >
              {isResetting ? t("actions.saving") : t("deleteCalendar.restoreDefault")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={isResetting}
              onClick={() => void resetCalendarToBlank()}
            >
              {isResetting ? t("actions.saving") : t("deleteCalendar.leaveBlank")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={isResetting}
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("deleteCalendar.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
