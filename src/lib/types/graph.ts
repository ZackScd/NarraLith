/** Tipos IPC grafo (espejo de Rust `graph::query`). */

export interface GraphNodeView {
  id: string;
  entityId: string;
  label: string;
  path: string;
  category: string;
  degree: number;
  color: string;
}

export interface GraphLinkView {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNodeView[];
  links: GraphLinkView[];
  truncated: boolean;
}

export interface GraphDataFilters {
  categories?: string[];
  limit?: number;
}

export interface GraphSimNode extends GraphNodeView {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphSimLink {
  id: string;
  source: string | GraphSimNode;
  target: string | GraphSimNode;
  weight: number;
}
