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
import { FolderDescriptionDialog } from "@/modules/explorer/FolderDescriptionDialog";
import { CreateEntityDialog } from "@/modules/worldbuilding/CreateEntityDialog";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

export type ExplorerDialogState =
  | { type: "none" }
  | { type: "createEntity"; parentPath: string }
  | { type: "delete"; path: string; name: string; isDir: boolean }
  | { type: "folderDescription"; dirPath: string };

interface ExplorerDialogsProps {
  dialog: ExplorerDialogState;
  onClose: () => void;
}

function dialogFormKey(dialog: Exclude<ExplorerDialogState, { type: "none" }>): string {
  switch (dialog.type) {
    case "delete":
      return `delete:${dialog.path}`;
    case "createEntity":
      return `createEntity:${dialog.parentPath}`;
    case "folderDescription":
      return `folderDescription:${dialog.dirPath}`;
  }
}

export function ExplorerDialogs({ dialog, onClose }: ExplorerDialogsProps) {
  if (dialog.type === "none") {
    return null;
  }

  if (dialog.type === "folderDescription") {
    return (
      <FolderDescriptionDialog
        key={dialogFormKey(dialog)}
        dirPath={dialog.dirPath}
        open
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      />
    );
  }

  if (dialog.type === "createEntity") {
    return (
      <CreateEntityDialog
        key={dialogFormKey(dialog)}
        parentPath={dialog.parentPath}
        open
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      />
    );
  }

  return (
    <ExplorerDeleteDialog key={dialogFormKey(dialog)} dialog={dialog} onClose={onClose} />
  );
}

function ExplorerDeleteDialog({
  dialog,
  onClose,
}: {
  dialog: Extract<ExplorerDialogState, { type: "delete" }>;
  onClose: () => void;
}) {
  const { t } = useTranslation("explorer");
  const deletePath = useFileTreeStore((s) => s.deletePath);

  function handleOpenChange(next: boolean) {
    if (!next) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await deletePath(dialog.path, dialog.isDir);
    if (ok) {
      handleOpenChange(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>
              <p>{t("delete.message", { name: dialog.name })}</p>
              {dialog.isDir && (
                <p className="mt-2 text-destructive">{t("delete.folderWarning")}</p>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              {t("delete.cancel")}
            </Button>
            <Button type="submit" variant="destructive">
              {t("delete.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
