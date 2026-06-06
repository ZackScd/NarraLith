import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConsistencyIssues } from "@/hooks/useConsistencyIssues";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function ConsistencyPanel() {
  const { t } = useTranslation("consistency");
  const { issues, isLoading, dismissIssue } = useConsistencyIssues();
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const setMainView = useWorkspaceStore((s) => s.setMainView);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("dismissedHint")}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                {t(`severity.${issue.severity}`, { defaultValue: issue.severity })}
              </p>
              <p className="mt-1 text-sm font-medium">
                {t("dualLocation", {
                  character: issue.character,
                  rawTime: issue.rawTime,
                })}
              </p>
              <ul className="mt-2 space-y-1">
                {issue.paths.map((ref) => (
                  <li
                    key={`${ref.path}:${ref.blockIndex}`}
                    className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                  >
                    <span className="truncate">
                      {ref.path}
                      {ref.location ? ` — ${ref.location}` : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void requestOpenDocument(ref.path);
                        setMainView("editor");
                      }}
                    >
                      {t("openScene")}
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void dismissIssue(issue.id)}
              >
                {t("dismiss")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ConsistencyNavIcon() {
  return <AlertTriangle className="size-4" />;
}
