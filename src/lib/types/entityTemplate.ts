/** Contrato IPC ↔ plantillas YAML de ficha (Fase 4.1). */

export type FieldType =
  | "shortText"
  | "longText"
  | "markdownBody"
  | "image"
  | "relation"
  | "date"
  | "select"
  | "multiSelect"
  | "keyValue"
  | "nested";

export interface TemplateSelectOption {
  value: string;
  labelKey: string;
}

export interface NestedFieldDef {
  key: string;
  labelKey: string;
}

export interface TemplateField {
  key: string;
  type: FieldType;
  labelKey: string;
  required?: boolean;
  default?: unknown;
  options?: TemplateSelectOption[];
  relationCategories?: string[];
  imageCategory?: string;
  multiple?: boolean;
  nestedFields?: NestedFieldDef[];
}

export interface TemplateSection {
  id: string;
  labelKey: string;
  fields: TemplateField[];
}

export interface EntityTemplate {
  id: string;
  labelKey: string;
  features?: string[];
  sections: TemplateSection[];
}

export interface TemplateSummary {
  id: string;
  labelKey: string;
}
