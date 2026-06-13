import type { AuditLevel } from "@/lib/audit/types";

export type RenderLogChannel = "standard" | "verbose";

export type UiLogChannel = RenderLogChannel | "both";

export interface UiLogOptions {
  channel?: UiLogChannel;
  level?: AuditLevel;
}

export interface RenderAuditSettings {
  renderLogEnabled: boolean;
  renderClearLogsOnNextBoot: boolean;
  renderMaxBufferSize: number;
  renderLevel: AuditLevel;
  renderVerboseEnabled: boolean;
  renderVerboseClearLogsOnNextBoot: boolean;
  renderVerboseMaxBufferSize: number;
  renderVerboseLevel: AuditLevel;
}

export interface RenderAuditApi {
  ui: (
    event: string,
    payload?: Record<string, unknown>,
    options?: UiLogOptions,
  ) => void;
  isStandardEnabled: () => boolean;
  isVerboseEnabled: () => boolean;
  setStandardEnabled: (enabled: boolean) => void;
  setVerboseEnabled: (enabled: boolean) => void;
  getSettings: () => Readonly<RenderAuditSettings>;
  patchSettings: (patch: Partial<RenderAuditSettings>) => void;
  getStandardSnapshot: () => import("@/lib/audit/types").AuditEntry[];
  getVerboseSnapshot: () => import("@/lib/audit/types").AuditEntry[];
  subscribeStandard: (listener: () => void) => () => void;
  subscribeVerbose: (listener: () => void) => () => void;
  clearStandardBuffer: () => void;
  clearVerboseBuffer: () => void;
  setStandardPersistHandler: (
    handler: ((entry: import("@/lib/audit/types").AuditEntry) => void) | null,
  ) => void;
  setVerbosePersistHandler: (
    handler: ((entry: import("@/lib/audit/types").AuditEntry) => void) | null,
  ) => void;
  reportDegraded: (reason: string) => void;
}
