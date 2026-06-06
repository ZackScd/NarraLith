import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityFormCustomizer } from "@/modules/worldbuilding/EntityFormCustomizer";
import { KeyValueField } from "@/modules/worldbuilding/fields/KeyValueField";
import { NestedField } from "@/modules/worldbuilding/fields/NestedField";
import { RelationField } from "@/modules/worldbuilding/fields/RelationField";
import { SelectField } from "@/modules/worldbuilding/fields/SelectField";
import type { EntityTabState } from "@/lib/types/entity";
import type { TemplateField } from "@/lib/types/entityTemplate";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTemplatePrefsStore } from "@/stores/useTemplatePrefsStore";

interface EntityFormRendererProps {
  entity: EntityTabState;
  onPatchField: (key: string, value: unknown) => void;
  onBodyChange: (body: string) => void;
}

export function EntityFormRenderer({
  entity,
  onPatchField,
  onBodyChange,
}: EntityFormRendererProps) {
  const { t } = useTranslation("worldbuilding");
  const { template, frontmatter, body, templateId } = entity;
  const projectPath = useProjectStore((s) => s.activeProject?.rootPath ?? null);
  const prefs = useTemplatePrefsStore((s) => s.getPrefs(projectPath, templateId));

  const allTemplateFields = useMemo(
    () => template.sections.flatMap((s) => s.fields),
    [template.sections],
  );

  const hidden = useMemo(() => new Set(prefs.hiddenKeys), [prefs.hiddenKeys]);

  function fieldLabel(field: TemplateField): string {
    return t(field.labelKey.replace(/^worldbuilding\./, ""), {
      defaultValue: field.labelKey,
    });
  }

  function renderField(field: TemplateField) {
    if (hidden.has(field.key)) {
      return null;
    }

    if (field.type === "markdownBody" || field.key === "_body") {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor="entity-body">{fieldLabel(field)}</Label>
          <textarea
            id="entity-body"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[200px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
          />
        </div>
      );
    }

    const raw = frontmatter[field.key];
    const strValue =
      field.key === "aliases" && Array.isArray(raw)
        ? raw.join(", ")
        : raw == null
          ? ""
          : String(raw);

    switch (field.type) {
      case "longText":
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{fieldLabel(field)}</Label>
            <textarea
              id={field.key}
              className="border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
              value={strValue}
              onChange={(e) => onPatchField(field.key, e.target.value)}
            />
          </div>
        );
      case "relation":
        return (
          <RelationField
            key={field.key}
            field={field}
            label={fieldLabel(field)}
            value={raw}
            onChange={(v) => onPatchField(field.key, v)}
          />
        );
      case "select":
      case "multiSelect":
        return (
          <SelectField
            key={field.key}
            field={field}
            label={fieldLabel(field)}
            value={strValue}
            onChange={(v) => onPatchField(field.key, v)}
          />
        );
      case "keyValue":
        return (
          <KeyValueField
            key={field.key}
            field={field}
            label={fieldLabel(field)}
            value={raw}
            onChange={(v) => onPatchField(field.key, v)}
          />
        );
      case "nested":
        return (
          <NestedField
            key={field.key}
            field={field}
            label={fieldLabel(field)}
            value={raw}
            onChange={(v) => onPatchField(field.key, v)}
          />
        );
      case "image":
      case "shortText":
      case "date":
      default:
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{fieldLabel(field)}</Label>
            <Input
              id={field.key}
              value={strValue}
              required={field.required}
              onChange={(e) => {
                const v = e.target.value;
                if (field.key === "aliases") {
                  const aliases = v
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  onPatchField("aliases", aliases);
                } else {
                  onPatchField(field.key, v);
                }
              }}
            />
          </div>
        );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-8">
      <EntityFormCustomizer templateId={templateId} fields={allTemplateFields} />

      {template.sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t(section.labelKey.replace(/^worldbuilding\./, ""), {
              defaultValue: section.labelKey,
            })}
          </h2>
          <div className="space-y-4">{section.fields.map(renderField)}</div>
        </section>
      ))}

      {prefs.customFields.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t("customize.customSection")}
          </h2>
          <div className="space-y-4">
            {prefs.customFields.map((cf) => (
              <div key={cf.key} className="space-y-1.5">
                <Label htmlFor={`custom-${cf.key}`}>{cf.label}</Label>
                <Input
                  id={`custom-${cf.key}`}
                  value={frontmatter[cf.key] == null ? "" : String(frontmatter[cf.key])}
                  onChange={(e) => onPatchField(cf.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
