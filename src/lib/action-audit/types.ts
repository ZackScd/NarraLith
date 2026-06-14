import type { AuditLevel } from "@/lib/audit/types";

export type ActionLogChannel = "session" | "verbose";

export type ActionLogChannelOption = ActionLogChannel | "both";

export type ActionArea =
  | "workspace"
  | "explorer"
  | "editor"
  | "calendar"
  | "timeline"
  | "project"
  | "settings"
  | "dialog"
  | "layout"
  | "launcher"
  | "map"
  | "graph"
  | "consistency"
  | "entity"
  | "system";

export interface ActionLogOptions {
  channel?: ActionLogChannelOption;
  level?: AuditLevel;
}

export interface ActionAuditSettings {
  actionLogEnabled: boolean;
  actionClearLogsOnNextBoot: boolean;
  actionMaxBufferSize: number;
  actionLevel: AuditLevel;
  actionVerboseEnabled: boolean;
  actionVerboseClearLogsOnNextBoot: boolean;
  actionVerboseMaxBufferSize: number;
  actionVerboseLevel: AuditLevel;
}

export interface ActionAuditApi {
  track: (
    area: ActionArea,
    action: string,
    payload?: Record<string, unknown>,
    options?: ActionLogOptions,
  ) => void;
  isSessionEnabled: () => boolean;
  isVerboseEnabled: () => boolean;
  setSessionEnabled: (enabled: boolean) => void;
  setVerboseEnabled: (enabled: boolean) => void;
  getSettings: () => Readonly<ActionAuditSettings>;
  patchSettings: (patch: Partial<ActionAuditSettings>) => void;
  getSessionSnapshot: () => import("@/lib/audit/types").AuditEntry[];
  getVerboseSnapshot: () => import("@/lib/audit/types").AuditEntry[];
  subscribeSession: (listener: () => void) => () => void;
  subscribeVerbose: (listener: () => void) => () => void;
  clearSessionBuffer: () => void;
  clearVerboseBuffer: () => void;
  setSessionPersistHandler: (
    handler: ((entry: import("@/lib/audit/types").AuditEntry) => void) | null,
  ) => void;
  setVerbosePersistHandler: (
    handler: ((entry: import("@/lib/audit/types").AuditEntry) => void) | null,
  ) => void;
  reportDegraded: (reason: string) => void;
}
