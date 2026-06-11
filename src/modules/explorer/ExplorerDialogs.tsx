import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderDescriptionDialog } from "@/modules/explorer/FolderDescriptionDialog";
import { CreateEntityDialog } from "@/modules/worldbuilding/CreateEntityDialog";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

export type ExplorerDialogState =
  | { type: "none" }
  | { type: "createFile"; parentPath: string }
  | { type: "createEntity"; parentPath: string }
  | { type: "createFolder"; parentPath: string }
  | { type: "rename"; path: string; currentName: string }
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
    case "rename":
      return `rename:${dialog.path}`;
    case "createFile":
      return `createFile:${dialog.parentPath}`;
    case "createEntity":
      return `createEntity:${dialog.parentPath}`;
    case "createFolder":
      return `createFolder:${dialog.parentPath}`;
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
    <ExplorerDialogForm key={dialogFormKey(dialog)} dialog={dialog} onClose={onClose} />
  );
}

function ExplorerDialogForm({
  dialog,
  onClose,
}: {
  dialog: Exclude<ExplorerDialogState, { type: "none" }>;
  onClose: () => void;
}) {
  const { t } = useTranslation("explorer");
  const createFile = useFileTreeStore((s) => s.createFile);
  const createFolder = useFileTreeStore((s) => s.createFolder);
  const renamePath = useFileTreeStore((s) => s.renamePath);
  const deletePath = useFileTreeStore((s) => s.deletePath);
  const [name, setName] = useState(() =>
    dialog.type === "rename" ? dialog.currentName : "",
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed && dialog.type !== "delete") {
      return;
    }

    let ok = false;
    switch (dialog.type) {
      case "createFile":
        ok = await createFile(dialog.parentPath, trimmed);
        break;
      case "createFolder":
        ok = await createFolder(dialog.parentPath, trimmed);
        break;
      case "rename":
        ok = await renamePath(dialog.path, trimmed);
        break;
      case "delete":
        ok = await deletePath(dialog.path, dialog.isDir);
        break;
      default:
        break;
    }

    if (ok) {
      handleOpenChange(false);
    }
  }

  const titleKey =
    dialog.type === "createFile"
      ? "createFile.title"
      : dialog.type === "createFolder"
        ? "createFolder.title"
        : dialog.type === "rename"
          ? "rename.title"
          : "delete.title";

  const nameLabelKey =
    dialog.type === "createFile"
      ? "createFile.nameLabel"
      : dialog.type === "createFolder"
        ? "createFolder.nameLabel"
        : "rename.nameLabel";

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{t(titleKey)}</DialogTitle>
            {dialog.type === "delete" ? (
              <DialogDescription>
                <p>{t("delete.message", { name: dialog.name })}</p>
                {dialog.isDir && (
                  <p className="mt-2 text-destructive">{t("delete.folderWarning")}</p>
                )}
              </DialogDescription>
            ) : (
              <DialogDescription />
            )}
          </DialogHeader>

          {dialog.type !== "delete" && (
            <div className="mt-4">
              <Label htmlFor="explorer-input">{t(nameLabelKey)}</Label>
              <Input
                id="explorer-input"
                className="mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  dialog.type === "createFile"
                    ? t("createFile.namePlaceholder")
                    : dialog.type === "createFolder"
                      ? t("createFolder.namePlaceholder")
                      : dialog.type === "rename"
                        ? dialog.currentName
                        : undefined
                }
                autoFocus
                required
              />
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              {t(
                dialog.type === "delete"
                  ? "delete.cancel"
                  : dialog.type === "rename"
                    ? "rename.cancel"
                    : dialog.type === "createFile"
                      ? "createFile.cancel"
                      : "createFolder.cancel",
              )}
            </Button>
            <Button
              type="submit"
              variant={dialog.type === "delete" ? "destructive" : "default"}
            >
              {t(
                dialog.type === "delete"
                  ? "delete.submit"
                  : dialog.type === "rename"
                    ? "rename.submit"
                    : dialog.type === "createFile"
                      ? "createFile.submit"
                      : "createFolder.submit",
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
