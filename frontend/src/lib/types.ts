export type NodeRole = 'hub' | 'bridge' | 'leaf' | 'isolated' | 'normal';

export interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
  is_primary_key: boolean;
}

export interface SchemaNode {
  id: string;
  schema: string;
  name: string;
  columns: Column[];
  column_count: number;
  row_estimate: number;
  connectivity: number;
  in_degree: number;
  out_degree: number;
  role: NodeRole;
  summary: string;
  pulse_offset: number;
  // injected by force graph at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface SchemaEdge {
  id: string;
  source: string;
  target: string;
  source_column: string;
  target_column: string;
  constraint_name: string;
}

export interface GraphData {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
}

export interface Insight {
  id: string;
  type: 'architecture' | 'warning' | 'design' | 'suggestion' | 'info' | 'performance';
  title: string;
  body: string;
  affected_nodes: string[];
  icon: string;
}

export interface ConnectResponse {
  graph: GraphData;
  insights: Insight[];
  table_count: number;
  edge_count: number;
}

export interface PathResult {
  path: string[];
  description: string;
  hop_count: number;
}
