import { useEffect, useState } from "react";
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
import { invokeCommand, parseAppError } from "@/lib/ipc";
import type { FolderMeta } from "@/lib/types/folder";
import { normalizeEntityErrorKey } from "@/lib/worldbuilding/entityErrors";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

interface FolderDescriptionDialogProps {
  dirPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FolderDescriptionDialog({
  dirPath,
  open,
  onOpenChange,
}: FolderDescriptionDialogProps) {
  const { t } = useTranslation("worldbuilding");
  const refreshFromBackend = useFileTreeStore((s) => s.refreshFromBackend);
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [title, setTitle] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const loadKey = open && dirPath ? dirPath : "";

  useEffect(() => {
    if (!loadKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const meta = await invokeCommand<FolderMeta>("get_folder_meta", {
          relativeDir: loadKey,
        });
        if (!cancelled) {
          setDescription(meta.description ?? "");
          setImagePath(meta.imagePath ?? "");
          setTitle(meta.title ?? "");
          setErrorKey(null);
          setLoadedKey(loadKey);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorKey(parseAppError(err)?.key ?? "error.unknown");
          setLoadedKey(loadKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const isLoading = Boolean(loadKey) && loadedKey !== loadKey;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setErrorKey(null);
    try {
      await invokeCommand("set_folder_description", {
        relativeDir: dirPath,
        description,
        imagePath: imagePath.trim() || null,
        title: title.trim() || null,
      });
      refreshFromBackend();
      setLoadedKey(null);
      onOpenChange(false);
    } catch (err) {
      const key = parseAppError(err)?.key ?? "error.unknown";
      setErrorKey(normalizeEntityErrorKey(key));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{t("folderEdit.title")}</DialogTitle>
            <DialogDescription>{t("folderEdit.description")}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("folderEdit.loading")}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="folder-title">{t("folderEdit.titleLabel")}</Label>
                <Input
                  id="folder-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="folder-desc">{t("folderEdit.descriptionLabel")}</Label>
                <textarea
                  id="folder-desc"
                  className="border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="folder-image">{t("folderEdit.imageLabel")}</Label>
                <Input
                  id="folder-image"
                  value={imagePath}
                  placeholder={t("folderEdit.imagePlaceholder")}
                  onChange={(e) => setImagePath(e.target.value)}
                />
              </div>
            </div>
          )}

          {errorKey && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {t(normalizeEntityErrorKey(errorKey), { defaultValue: errorKey })}
            </p>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("folderEdit.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || isSaving}>
              {isSaving ? t("folderEdit.saving") : t("folderEdit.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
