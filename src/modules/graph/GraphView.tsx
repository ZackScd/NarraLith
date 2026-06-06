import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useGraphProject } from "@/hooks/useGraphProject";
import { useGraphSimulation } from "@/hooks/useGraphSimulation";
import { GraphFilterPanel } from "@/modules/graph/GraphFilterPanel";
import type { GraphSimNode } from "@/lib/types/graph";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

function useContainerSize() {
  const [size, setSize] = useState({ width: 640, height: 480 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const setContainer = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const update = () => {
      setSize({
        width: Math.max(320, node.clientWidth),
        height: Math.max(240, node.clientHeight),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  return { size, setContainer };
}

export function GraphView() {
  const { t } = useTranslation("graph");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { data, loading, rebuilding, errorKey, rebuildIndex, loadData } =
    useGraphProject(selectedCategories);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const setMainView = useWorkspaceStore((s) => s.setMainView);
  const { size, setContainer } = useContainerSize();

  const handleNodeClick = useCallback(
    (node: GraphSimNode) => {
      void requestOpenDocument(node.path);
      setMainView("editor");
    },
    [requestOpenDocument, setMainView],
  );

  const { canvasRef } = useGraphSimulation(
    data,
    size.width,
    size.height,
    handleNodeClick,
  );

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.nodes.map((n) => n.category))].sort();
  }, [data]);

  const linkedCount = data?.links.length ?? 0;
  const nodeCount = data?.nodes.length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("stats", { nodes: nodeCount, links: linkedCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading || rebuilding}
            onClick={() => void loadData()}
          >
            {t("refresh")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={rebuilding}
            onClick={() => void rebuildIndex()}
          >
            {rebuilding ? t("rebuilding") : t("rebuild")}
          </Button>
        </div>
      </div>

      {errorKey ? (
        <p className="text-sm text-destructive">
          {t(errorKey, { defaultValue: errorKey })}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : null}

      {!loading && data && data.nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      {data && data.nodes.length > 0 ? (
        <div className="flex min-h-0 flex-1 gap-3">
          <div
            ref={setContainer}
            className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-zinc-950"
          >
            <canvas
              ref={canvasRef}
              width={size.width}
              height={size.height}
              className="block h-full w-full touch-none"
            />
          </div>
          <GraphFilterPanel
            categories={categories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />
        </div>
      ) : null}
    </div>
  );
}
