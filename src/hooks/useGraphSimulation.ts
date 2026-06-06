import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

import type { GraphData, GraphSimLink, GraphSimNode } from "@/lib/types/graph";

const MIN_RADIUS = 4;
const MAX_RADIUS = 22;
const CHARGE = -140;
const LINK_DISTANCE = 90;
const ALPHA_DECAY = 0.028;

function nodeRadius(degree: number): number {
  const base = Math.sqrt(Math.max(degree, 1)) * 2.2;
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, base));
}

function resolveNodeId(value: string | GraphSimNode): string {
  return typeof value === "string" ? value : value.id;
}

export function useGraphSimulation(
  data: GraphData | null,
  width: number,
  height: number,
  onNodeClick?: (node: GraphSimNode) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const simulationRef = useRef<d3.Simulation<GraphSimNode, GraphSimLink> | null>(null);
  const nodesRef = useRef<GraphSimNode[]>([]);
  const linksRef = useRef<GraphSimLink[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);

  useEffect(() => {
    if (!data || width <= 0 || height <= 0) {
      return;
    }

    const nodes: GraphSimNode[] = data.nodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 40,
      y: height / 2 + (Math.random() - 0.5) * 40,
    }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const links: GraphSimLink[] = data.links
      .filter((l) => nodeById.has(l.sourceId) && nodeById.has(l.targetId))
      .map((l) => ({
        id: l.id,
        source: nodeById.get(l.sourceId)!,
        target: nodeById.get(l.targetId)!,
        weight: l.weight,
      }));

    nodesRef.current = nodes;
    linksRef.current = links;

    simulationRef.current?.stop();
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphSimNode, GraphSimLink>(links)
          .id((d) => d.id)
          .distance(LINK_DISTANCE)
          .strength(0.6),
      )
      .force("charge", d3.forceManyBody().strength(CHARGE))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide<GraphSimNode>().radius((d) => nodeRadius(d.degree) + 2),
      )
      .alphaDecay(ALPHA_DECAY);

    simulationRef.current = simulation;

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const neighborMap = new Map<string, Set<string>>();
    for (const link of links) {
      const a = resolveNodeId(link.source);
      const b = resolveNodeId(link.target);
      if (!neighborMap.has(a)) neighborMap.set(a, new Set());
      if (!neighborMap.has(b)) neighborMap.set(b, new Set());
      neighborMap.get(a)!.add(b);
      neighborMap.get(b)!.add(a);
    }

    const draw = () => {
      const hovered = hoveredIdRef.current;
      const highlight = new Set<string>();
      if (hovered) {
        highlight.add(hovered);
        for (const n of neighborMap.get(hovered) ?? []) {
          highlight.add(n);
        }
      }

      ctx.save();
      ctx.fillStyle = "#0a0a0b";
      ctx.fillRect(0, 0, width, height);

      const t = transformRef.current;
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      for (const link of linksRef.current) {
        const s = link.source as GraphSimNode;
        const tg = link.target as GraphSimNode;
        if (s.x == null || s.y == null || tg.x == null || tg.y == null) continue;
        const faded = hovered && !highlight.has(s.id) && !highlight.has(tg.id);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tg.x, tg.y);
        ctx.strokeStyle = faded ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.45)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (const node of nodesRef.current) {
        if (node.x == null || node.y == null) continue;
        const r = nodeRadius(node.degree);
        const faded = hovered && !highlight.has(node.id);
        const alpha = faded ? 0.18 : 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        if (node.id === hovered) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 16;
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      if (hovered) {
        const node = nodesRef.current.find((n) => n.id === hovered);
        if (node?.x != null && node?.y != null) {
          ctx.font = "12px system-ui, sans-serif";
          ctx.fillStyle = "#f4f4f5";
          ctx.textAlign = "center";
          ctx.fillText(node.label, node.x, node.y - nodeRadius(node.degree) - 8);
        }
      }

      ctx.restore();
    };

    drawRef.current = draw;

    simulation.on("tick", draw);
    draw();

    return () => {
      simulation.stop();
    };
  }, [data, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const selection = d3.select(canvas);
    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        drawRef.current?.();
      });

    selection.call(zoom);

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const t = transformRef.current;
      const x = (event.clientX - rect.left - t.x) / t.k;
      const y = (event.clientY - rect.top - t.y) / t.k;

      let found: string | null = null;
      for (const node of nodesRef.current) {
        if (node.x == null || node.y == null) continue;
        const r = nodeRadius(node.degree);
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy <= r * r) {
          found = node.id;
          break;
        }
      }
      hoveredIdRef.current = found;
      setHoveredId(found);
      drawRef.current?.();
      canvas.style.cursor = found ? "pointer" : "grab";
    };

    const onClick = () => {
      const id = hoveredIdRef.current;
      if (!id || !onNodeClick) return;
      const node = nodesRef.current.find((n) => n.id === id);
      if (node) onNodeClick(node);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      selection.on(".zoom", null);
    };
  }, [data, onNodeClick]);

  return { canvasRef, hoveredId };
}
