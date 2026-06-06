import type { ProjectMeta } from "@/lib/types/models";

export type { ProjectMeta };

/** Entrada en `recents.json` del AppData local (no forma parte de la obra). */
export interface RecentProjectEntry {
  path: string;
  name: string;
  lastOpenedAt: number;
  exists: boolean;
}

export type ProjectTemplateId = "standard" | "blank";
