export interface TimelineEvent {
  path: string;
  blockIndex: number;
  title?: string | null;
  snippet?: string | null;
  timestamp?: string | null;
  rawTime: string;
  timeHour?: number | null;
  segmentId?: string | null;
  tagKind?: string | null;
  charOffset?: number | null;
  isParallel: boolean;
  characters: string[];
  location?: string | null;
  persistedAt?: number | null;
}

export interface LastAddedTimeMarker {
  path: string;
  blockIndex: number;
  rawTime: string;
  persistedAt: number;
}

export type TimelineCategory = "all" | "manuscript" | "worldbuilding" | "parallel";

export interface TimelineFilters {
  entityPath?: string;
  category?: TimelineCategory;
  fromTimestamp?: string;
  toTimestamp?: string;
  limit?: number;
}
