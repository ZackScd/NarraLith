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
import { invokeCommand, parseAppError } from "@/lib/ipc";
import type { EntityDocument } from "@/lib/types/entity";
import { normalizeEntityErrorKey } from "@/lib/worldbuilding/entityErrors";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

interface CreateEntityDialogProps {
  parentPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEntityDialog({
  parentPath,
  open,
  onOpenChange,
}: CreateEntityDialogProps) {
  const { t } = useTranslation("worldbuilding");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const openDocument = useEditorStore((s) => s.openDocument);
  const loadTree = useFileTreeStore((s) => s.loadTree);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    setErrorKey(null);
    try {
      const doc = await invokeCommand<EntityDocument>("create_entity", {
        parentPath,
        name: trimmed,
      });
      onOpenChange(false);
      setName("");
      await loadTree();
      await openDocument(doc.path);
    } catch (err) {
      const parsed = parseAppError(err);
      setErrorKey(parsed?.key ?? "error.entity.save_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setErrorKey(null);
          setName("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{t("create.title")}</DialogTitle>
            <DialogDescription>
              {t("create.description")}
              {parentPath ? (
                <span className="mt-2 block font-mono text-xs text-muted-foreground">
                  {t("create.targetFolder", { path: parentPath })}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="entity-name">{t("create.nameLabel")}</Label>
            <Input
              id="entity-name"
              className="mt-2"
              value={name}
              placeholder={t("create.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errorKey && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {t(normalizeEntityErrorKey(errorKey), { defaultValue: errorKey })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("create.cancel")}
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {t("create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
