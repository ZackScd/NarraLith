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

export function ExternalReloadDialog() {
  const { t } = useTranslation("editor");
  const open = useEditorStore((s) => s.showExternalReloadDialog);
  const confirmExternalReload = useEditorStore((s) => s.confirmExternalReload);
  const dismissExternalReload = useEditorStore((s) => s.dismissExternalReload);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismissExternalReload()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("externalReload.title")}</DialogTitle>
          <DialogDescription>{t("externalReload.message")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => dismissExternalReload()}>
            {t("externalReload.keepEditing")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirmExternalReload()}
          >
            {t("externalReload.reload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
