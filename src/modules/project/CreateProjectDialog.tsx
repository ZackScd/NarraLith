import { useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";

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
import { useProjectStore } from "@/stores/useProjectStore";
import type { ProjectTemplateId } from "@/lib/types/project";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  open: isOpen,
  onOpenChange,
}: CreateProjectDialogProps) {
  const { t } = useTranslation("project");
  const createProject = useProjectStore((s) => s.createProject);
  const isLoading = useProjectStore((s) => s.isLoading);
  const lastErrorKey = useProjectStore((s) => s.lastErrorKey);
  const clearError = useProjectStore((s) => s.clearError);

  const [name, setName] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [templateId, setTemplateId] = useState<ProjectTemplateId>("standard");

  async function handleBrowseParent() {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected && !Array.isArray(selected)) {
      setParentPath(selected);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!name.trim() || !parentPath) {
      return;
    }
    const ok = await createProject(parentPath, name.trim(), templateId);
    if (ok) {
      onOpenChange(false);
      setName("");
      setParentPath("");
      setTemplateId("standard");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
            <DialogDescription>{t("createDialog.description")}</DialogDescription>
          </DialogHeader>

          {lastErrorKey && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {t(lastErrorKey, { defaultValue: lastErrorKey })}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">{t("createDialog.nameLabel")}</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("createDialog.namePlaceholder")}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-template">
                {t("createDialog.templateLabel")}
              </Label>
              <select
                id="project-template"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value as ProjectTemplateId)}
              >
                <option value="standard">{t("createDialog.templateStandard")}</option>
                <option value="blank">{t("createDialog.templateBlank")}</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="parent-path">{t("createDialog.parentLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="parent-path"
                  readOnly
                  value={parentPath}
                  placeholder={t("createDialog.parentPlaceholder")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleBrowseParent()}
                >
                  {t("createDialog.browse")}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("createDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !parentPath}>
              {t("createDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
