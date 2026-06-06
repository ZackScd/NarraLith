import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateField } from "@/lib/types/entityTemplate";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTemplatePrefsStore } from "@/stores/useTemplatePrefsStore";

interface EntityFormCustomizerProps {
  templateId: string;
  fields: TemplateField[];
}

export function EntityFormCustomizer({
  templateId,
  fields,
}: EntityFormCustomizerProps) {
  const { t } = useTranslation("worldbuilding");
  const projectPath = useProjectStore((s) => s.activeProject?.rootPath ?? null);
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const prefs = useTemplatePrefsStore((s) => s.getPrefs(projectPath, templateId));
  const toggleHidden = useTemplatePrefsStore((s) => s.toggleHidden);
  const addCustomField = useTemplatePrefsStore((s) => s.addCustomField);
  const removeCustomField = useTemplatePrefsStore((s) => s.removeCustomField);

  const customizable = fields.filter(
    (f) => f.type !== "markdownBody" && f.key !== "_body",
  );

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t("customize.collapse") : t("customize.expand")}
      </Button>
      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-muted-foreground">{t("customize.hint")}</p>
          <div className="space-y-2">
            <p className="text-xs font-medium">{t("customize.hideFields")}</p>
            {customizable.map((field) => (
              <label key={field.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prefs.hiddenKeys.includes(field.key)}
                  onChange={() => toggleHidden(projectPath, templateId, field.key)}
                />
                {t(field.labelKey.replace(/^worldbuilding\./, ""), {
                  defaultValue: field.key,
                })}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">{t("customize.customFields")}</p>
            {prefs.customFields.map((cf) => (
              <div key={cf.key} className="flex items-center justify-between text-sm">
                <span>
                  {cf.label} <span className="text-muted-foreground">({cf.key})</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCustomField(projectPath, templateId, cf.key)}
                >
                  {t("customize.remove")}
                </Button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("customize.fieldKey")}</Label>
                <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("customize.fieldLabel")}</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!newKey.trim()}
              onClick={() => {
                const key = newKey.trim().replace(/\s+/g, "_");
                addCustomField(projectPath, templateId, {
                  key,
                  label: newLabel.trim() || key,
                });
                setNewKey("");
                setNewLabel("");
              }}
            >
              {t("customize.addField")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
