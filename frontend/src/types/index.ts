// frontend/src/types/index.ts

// --- User ---
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  plan: string;
  created_at: string;
}

// --- Auth ---
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// --- Workflow ---
export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: string;
  subtype?: string;
  config: Record<string, unknown>;
  position: NodePosition;
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  graph_data: GraphData;
  is_active: boolean;
  concurrency_policy: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  node_count: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowListResponse {
  workflows: WorkflowListItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface WorkflowCreateResponse {
  id: string;
  name: string;
  webhook_url: string;
  created_at: string;
}
