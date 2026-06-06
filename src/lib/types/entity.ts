import type { EntityTemplate } from "@/lib/types/entityTemplate";

export interface EntityDocument {
  path: string;
  templateId: string;
  frontmatter: Record<string, unknown>;
  body: string;
  yamlErrorKey?: string | null;
}

export interface EntityTabState {
  templateId: string;
  template: EntityTemplate;
  frontmatter: Record<string, unknown>;
  body: string;
  savedFingerprint: string;
}

export interface CreateEntityPayload {
  parentPath: string;
  name: string;
  templateId?: string;
}

export interface TimelineEntry {
  sourcePath: string;
  blockIndex: number;
  snippet?: string | null;
  timeLabel?: string | null;
  sortKey: string;
}

export interface InhabitantRow {
  path: string;
  name: string;
  category: string;
}
