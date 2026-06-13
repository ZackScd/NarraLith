import { Copy, X } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { audit } from "@/lib/audit";
import { AUDIT_LEVEL_RANK } from "@/lib/audit/defaults";
import type { AuditEntry, AuditLevel } from "@/lib/audit/types";
import { renderAudit } from "@/lib/render-audit";
import { cn } from "@/lib/utils";
import { useAuditStore, type AuditViewerTab } from "@/stores/useAuditStore";

const LEVELS: AuditLevel[] = ["trace", "debug", "info", "warn", "error"];

function formatTime(ts: number): string {
  const date = new Date(ts);
  const base = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

function formatPayload(payload: Record<string, unknown> | undefined): string | null {
  if (!payload || Object.keys(payload).length === 0) {
    return null;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
}

const LEVEL_CLASS: Record<AuditLevel, string> = {
  trace: "text-muted-foreground",
  debug: "text-muted-foreground",
  info: "text-foreground",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
};

function matchesFilter(entry: AuditEntry, query: string, minLevel: AuditLevel): boolean {
  if (AUDIT_LEVEL_RANK[entry.level] < AUDIT_LEVEL_RANK[minLevel]) {
    return false;
  }
  if (!query) {
    return true;
  }
  const haystack = [
    entry.event,
    entry.domain,
    entry.correlationId ?? "",
    entry.message ?? "",
    entry.payload ? JSON.stringify(entry.payload) : "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const payload = formatPayload(entry.payload);

  return (
    <li className="border-b border-border/60 px-3 py-2 text-xs">
      <div className="flex items-baseline gap-2">
        <time className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formatTime(entry.ts)}
        </time>
        <span className={cn("shrink-0 uppercase", LEVEL_CLASS[entry.level])}>{entry.level}</span>
        <span className="min-w-0 truncate font-medium">{entry.event}</span>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
        <span>{entry.domain}</span>
        <span>{entry.source}</span>
        {entry.correlationId ? <span className="truncate">corr: {entry.correlationId}</span> : null}
        {entry.durationMs != null ? <span>{entry.durationMs}ms</span> : null}
      </div>
      {payload ? (
        <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/40 p-1 font-mono text-[10px]">
          {payload}
        </pre>
      ) : null}
    </li>
  );
}

function useAuditEntries(tab: AuditViewerTab) {
  return useSyncExternalStore(
    (listener) => {
      if (tab === "system") {
        return audit.subscribe(listener);
      }
      if (tab === "ui") {
        return renderAudit.subscribeStandard(listener);
      }
      return renderAudit.subscribeVerbose(listener);
    },
    () => {
      if (tab === "system") {
        return audit.getSnapshot();
      }
      if (tab === "ui") {
        return renderAudit.getStandardSnapshot();
      }
      return renderAudit.getVerboseSnapshot();
    },
    () => {
      if (tab === "system") {
        return audit.getSnapshot();
      }
      if (tab === "ui") {
        return renderAudit.getStandardSnapshot();
      }
      return renderAudit.getVerboseSnapshot();
    },
  );
}

function AuditLogViewerPanel() {
  const { t } = useTranslation("debug");
  const setViewerOpen = useAuditStore((s) => s.setViewerOpen);
  const viewerTab = useAuditStore((s) => s.viewerTab);
  const setViewerTab = useAuditStore((s) => s.setViewerTab);
  const settings = useAuditStore((s) => s.settings);
  const [query, setQuery] = useState("");
  const [minLevel, setMinLevel] = useState<AuditLevel>("info");

  const entries = useAuditEntries(viewerTab);

  const channelEnabled =
    viewerTab === "system"
      ? (settings?.enabled ?? false)
      : viewerTab === "ui"
        ? (settings?.renderLogEnabled ?? false)
        : (settings?.renderVerboseEnabled ?? false);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...entries]
      .reverse()
      .filter((entry) => matchesFilter(entry, normalized, minLevel));
  }, [entries, minLevel, query]);

  const handleCopy = async () => {
    const lines = filteredEntries.map((entry) => JSON.stringify(entry));
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      console.debug("[audit] copy failed");
    }
  };

  const tabs: { id: AuditViewerTab; label: string }[] = [
    { id: "system", label: t("viewerTabSystem") },
    { id: "ui", label: t("viewerTabUi") },
    { id: "uiVerbose", label: t("viewerTabUiVerbose") },
  ];

  return (
    <aside
      className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl"
      role="dialog"
      aria-label={t("viewLog")}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{t("viewLog")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("viewerEntryCount", { count: filteredEntries.length })}
            {!channelEnabled ? ` · ${t("loggingDisabled")}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("viewerClose")}
          onClick={() => setViewerOpen(false)}
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex gap-1 border-b border-border px-3 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "rounded px-2 py-1 text-xs",
              viewerTab === tab.id
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
            onClick={() => setViewerTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 border-b border-border px-3 py-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("viewerFilterPlaceholder")}
          className="h-8 text-xs"
        />
        <div className="flex flex-wrap gap-1">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={cn(
                "rounded px-2 py-0.5 text-[10px] uppercase",
                minLevel === level
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
              onClick={() => setMinLevel(level)}
            >
              {level}+
            </button>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-full" onClick={() => void handleCopy()}>
          <Copy className="mr-2 size-3.5" />
          {t("viewerCopy")}
        </Button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("viewerEmpty")}
          </li>
        ) : (
          filteredEntries.map((entry) => <AuditEntryRow key={entry.id} entry={entry} />)
        )}
      </ul>
    </aside>
  );
}

/** Montado desde DebugNavMenu; no suscribe al store de audit hasta que está abierto. */
export function AuditLogViewer() {
  const open = useAuditStore((s) => s.viewerOpen);
  if (!open) {
    return null;
  }
  return <AuditLogViewerPanel />;
}
