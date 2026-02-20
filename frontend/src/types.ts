/* ═══════════════════════════════════════════════════════════════
   types.ts – All shared TypeScript types for CloudMon
   ═══════════════════════════════════════════════════════════════ */

export type Phase = 'base' | 'request';
export type View = 'landing' | 'projects' | 'project' | 'request';
export type CloudProvider = 'aws' | 'gcp' | 'azure';

export type ComponentCategory =
  | 'client'
  | 'network'
  | 'compute'
  | 'data'
  | 'messaging'
  | 'platform'
  | 'storage'
  | 'observability';

export type Protocol =
  | 'HTTP'
  | 'HTTPS'
  | 'TCP'
  | 'gRPC'
  | 'Kafka'
  | 'AMQP'
  | 'WebSocket'
  | 'SQL'
  | 'Redis'
  | 'UDP';

/* ── Component Specification (from catalog) ──────────────────── */
export interface LatencySpec {
  min: number;
  avg: number;
  max: number;
  p99: number;
}

export interface ComponentSpec {
  type: string;
  label: string;
  category: ComponentCategory;
  icon: string;          // emoji or short text used as visual
  color: string;         // hex colour for node header/icon
  textColor: string;     // text colour on the icon header
  latencyMs: LatencySpec;
  throughputRps: number; // single-instance peak req/sec
  costPerHour: number;   // USD – used as AWS baseline
  // per-provider hourly cost overrides (optional; fallback = costPerHour × multiplier)
  cloudCosts?: { aws: number; gcp: number; azure: number };
  maxConnections: number;
  horizontallyScalable: boolean;
  description: string;
  tags: string[];
}

/* ── Node instance on the canvas ─────────────────────────────── */
export type DeploymentMode = 'local' | 'cloud';

export interface NodeConfig {
  instances: number;
  /** 'local' = self-hosted / test; 'cloud' = managed cloud service */
  deployment: DeploymentMode;
  cloudProvider?: CloudProvider;   // which provider when deployment='cloud'
  instanceType?: string;           // provider-specific instance id, e.g. "t3.micro"
  region?: string;                 // provider region, e.g. "us-east-1"
  // overrides (always respected regardless of deployment mode)
  customLatencyMs?: number;
  customThroughputRps?: number;
  customCostPerHour?: number;
  notes?: string;
}

export interface CyNode {
  id: string;
  type: string;          // key into componentCatalog
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: NodeConfig;
  // request-flow metadata
  active?: boolean;
  sequenceOrder?: number;
}

/* ── Edge instance on the canvas ─────────────────────────────── */
export interface CyEdge {
  id: string;
  source: string;        // CyNode id
  target: string;        // CyNode id
  label?: string;
  protocol?: Protocol;
  dataSizeKb?: number;
  // request-flow metadata
  active?: boolean;
  sequenceOrder?: number;
}

/* ── Canvas state (nodes + edges) ────────────────────────────── */
export interface CanvasState {
  nodes: CyNode[];
  edges: CyEdge[];
}

/* ── Analysis results ────────────────────────────────────────── */
export interface CloudCostBreakdown {
  costPerHour: number;
  costPerMillion: number;
}

export interface AnalysisResult {
  totalLatencyMs: number;
  p99LatencyMs: number;
  throughputRps: number;
  maxConcurrentUsers: number;
  costPerHour: number;
  costPerMillionRequests: number;
  cloudCosts: { aws: CloudCostBreakdown; gcp: CloudCostBreakdown; azure: CloudCostBreakdown };
  bottleneckNodeId: string | null;
  bottleneckLabel: string | null;
  criticalPath: string[];         // ordered node ids
  suggestions: string[];
  warnings: string[];
  distributionGain?: DistributionGain;
}

export interface DistributionGain {
  currentMaxUsers: number;
  distributedMaxUsers: number;
  currentLatencyMs: number;
  distributedLatencyMs: number;
  currentCostPerHour: number;
  distributedCostPerHour: number;
  recommendation: string;
}

/* ── Request file (leaf node in the file tree) ───────────────── */
export interface RequestFile {
  kind: 'request';
  id: string;
  name: string;
  canvas: CanvasState;
  analysis?: AnalysisResult;
}

/* ── Folder node in the file tree ────────────────────────────── */
export interface RequestFolder {
  kind: 'folder';
  id: string;
  name: string;
  children: RequestTreeItem[];
  expanded?: boolean;
}

export type RequestTreeItem = RequestFile | RequestFolder;

/* ── Project ─────────────────────────────────────────────────── */
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  base: CanvasState;
  requests: RequestTreeItem[];  // nested file tree (folders + request leaves)
  activeRequestId?: string;
  cloudProvider: CloudProvider;
}

/* ── UI state ────────────────────────────────────────────────── */
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
  targetType: 'node' | 'edge' | 'canvas' | null;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface DragState {
  dragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
  nodeStartX: number;
  nodeStartY: number;
}

export interface ConnectState {
  connecting: boolean;
  sourceId: string | null;
  currentX: number;
  currentY: number;
}

export interface SelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}
