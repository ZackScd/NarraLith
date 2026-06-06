import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { invokeCommand } from "@/lib/ipc";
import type { ConsistencyIssue } from "@/lib/types/consistency";
import { useProjectStore } from "@/stores/useProjectStore";

export function useConsistencyIssues() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const projectKey = activeProject?.rootPath ?? "";
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!projectKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setErrorKey(null);
      try {
        const list = await invokeCommand<ConsistencyIssue[]>("get_consistency_issues");
        if (!cancelled) {
          setIssues(list);
        }
      } catch {
        if (!cancelled) {
          setIssues([]);
          setErrorKey("loadFailed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setIssues([]);
      setIsLoading(false);
      setErrorKey(null);
    };
  }, [projectKey]);

  useEffect(() => {
    if (!projectKey) {
      return;
    }

    let disposed = false;

    const unlistenPromise = listen<{ issues: ConsistencyIssue[] }>(
      "consistency-updated",
      (event) => {
        if (!disposed) {
          setIssues(event.payload.issues);
          setIsLoading(false);
          setErrorKey(null);
        }
      },
    );

    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [projectKey]);

  const dismissIssue = async (issueId: string) => {
    const list = await invokeCommand<ConsistencyIssue[]>("dismiss_consistency_issue", {
      issueId,
    });
    setIssues(list);
  };

  return { issues, isLoading, errorKey, dismissIssue };
}
