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

/* ── Port binding (host:container mapping) ────────────────────── */
export interface PortBinding {
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
}

/* ── Environment variable ─────────────────────────────────────── */
export interface EnvVar {
  key: string;
  value: string;
  secret?: boolean;
}

/* ── Volume mount ─────────────────────────────────────────────── */
export type VolumeMountType = 'bind' | 'volume' | 'tmpfs';
export interface VolumeMount {
  id: string;
  name: string;              // named volume or host path
  containerPath: string;
  readOnly: boolean;
  sizeGb?: number;
  type: VolumeMountType;
}

/* ── Resource limits ──────────────────────────────────────────── */
export interface ResourceLimits {
  cpuMillicores?: number;    // 1000 = 1 vCPU core
  memoryMb?: number;
}

/* ── Health check ─────────────────────────────────────────────── */
export type HealthCheckType = 'http' | 'tcp' | 'exec';
export interface HealthCheck {
  type: HealthCheckType;
  path?: string;             // HTTP endpoint, e.g. "/healthz"
  port?: number;
  command?: string;          // exec command
  intervalSeconds: number;
  timeoutSeconds: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

/* ── Docker container (sub-component living inside a compute node) */
export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  tag: string;               // "latest", "1.23.0", etc.
  ports: PortBinding[];
  env: EnvVar[];
  volumes: VolumeMount[];
  resources: ResourceLimits;
  restartPolicy: 'always' | 'unless-stopped' | 'on-failure' | 'no';
  healthCheck?: HealthCheck;
  notes?: string;
}

/* ── Firewall / security-group rule ──────────────────────────── */
export interface FirewallRule {
  id: string;
  direction: 'inbound' | 'outbound';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  portRange: string;         // "80", "80-443", or "*"
  cidr: string;              // "0.0.0.0/0", "10.0.0.0/8", etc.
  action: 'allow' | 'deny';
  description?: string;
  priority?: number;
}

/* ── Host-level port exposure ─────────────────────────────────── */
export interface HostPort {
  id: string;
  port: number;
  protocol: 'tcp' | 'udp';
  service: string;           // descriptive name, e.g. "HTTP", "Postgres"
  description?: string;
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
  ip?: string;
  // ── Internal sub-components (for compute / server nodes) ──────
  containers?: DockerContainer[];  // Docker containers hosted on this node
  firewallRules?: FirewallRule[];  // Security-group / NFW rules
  hostPorts?: HostPort[];          // Host-level exposed ports
  globalEnv?: EnvVar[];            // Ambient environment variables
  // ── Server/VM hardware spec overrides ─────────────────────────
  osType?: string;                 // e.g. "ubuntu-22.04", "alpine-3.18"
  cpuCores?: number;               // vCPU count
  ramGb?: number;                  // RAM in GB
  diskGb?: number;                 // Primary disk in GB
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
