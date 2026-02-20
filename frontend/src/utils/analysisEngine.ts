/* ═══════════════════════════════════════════════════════════════
   analysisEngine.ts – Architecture Analysis Engine
   Computes latency, throughput, cost, max users, and distribution
   gain for a given canvas (base or request flow).
   ═══════════════════════════════════════════════════════════════ */
import { AnalysisResult, CanvasState, CloudCostBreakdown, CyEdge, CyNode, DistributionGain } from '../types';
import catalog from '../data/componentCatalog';

/* ── Cloud provider cost multipliers (AWS = 1.0 baseline) ────── */
const PROVIDER_MULT = { aws: 1.0, gcp: 0.88, azure: 0.97 } as const;

function providerBreakdown(
  baseCostPerHour: number,
  mult: number,
  throughput: number,
  latency: number
): CloudCostBreakdown {
  const cph = Math.round(baseCostPerHour * mult * 100) / 100;
  const cpm = throughput > 0 && latency > 0
    ? Math.round((cph / throughput / 3600) * 1_000_000 * 100) / 100
    : 0;
  return { costPerHour: cph, costPerMillion: cpm };
}

const ZERO_CLOUD_COSTS = {
  aws:   { costPerHour: 0, costPerMillion: 0 },
  gcp:   { costPerHour: 0, costPerMillion: 0 },
  azure: { costPerHour: 0, costPerMillion: 0 },
};

/* ── Effective per-node metrics (honoring config overrides) ─── */
function effectiveLatency(node: CyNode): number {
  if (node.config.customLatencyMs !== undefined) return node.config.customLatencyMs;
  const spec = catalog[node.type];
  return spec ? spec.latencyMs.avg : 10;
}

function effectiveThroughput(node: CyNode): number {
  const base =
    node.config.customThroughputRps !== undefined
      ? node.config.customThroughputRps
      : (catalog[node.type]?.throughputRps ?? 1000);
  const instances = node.config.instances || 1;
  const spec = catalog[node.type];
  // non-scalable services can't multiply
  if (spec && !spec.horizontallyScalable) return base;
  return base * instances;
}

function effectiveCost(node: CyNode): number {
  const base =
    node.config.customCostPerHour !== undefined
      ? node.config.customCostPerHour
      : (catalog[node.type]?.costPerHour ?? 0);
  return base * (node.config.instances || 1);
}

/* ── Find entry nodes (no incoming edges) ───────────────────── */
function entryNodes(nodes: CyNode[], edges: CyEdge[]): CyNode[] {
  const hasIncoming = new Set(edges.map((e) => e.target));
  return nodes.filter((n) => !hasIncoming.has(n.id));
}

/* ── DFS longest path (for critical path / worst latency) ───── */
function longestPath(
  nodes: CyNode[],
  edges: CyEdge[]
): { path: string[]; latency: number } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj: Record<string, string[]> = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) {
    if (adj[e.source]) adj[e.source].push(e.target);
  }

  let best: { path: string[]; latency: number } = { path: [], latency: 0 };

  const dfs = (id: string, path: string[], lat: number, visited: Set<string>) => {
    const n = nodeMap.get(id);
    if (!n) return;
    const newLat = lat + effectiveLatency(n) + 2; // +2ms network hop
    const newPath = [...path, id];
    if (newLat > best.latency) best = { path: newPath, latency: newLat };
    for (const next of adj[id]) {
      if (!visited.has(next)) {
        visited.add(next);
        dfs(next, newPath, newLat, visited);
        visited.delete(next);
      }
    }
  };

  const entries = entryNodes(nodes, edges);
  for (const entry of entries) {
    dfs(entry.id, [], 0, new Set([entry.id]));
  }
  return best;
}

/* ── Minimum throughput along a path ─────────────────────────── */
function pathThroughput(path: string[], nodes: CyNode[]): number {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let min = Infinity;
  for (const id of path) {
    const n = nodeMap.get(id);
    if (!n) continue;
    const t = effectiveThroughput(n);
    if (t < min) min = t;
  }
  return min === Infinity ? 0 : min;
}

/* ── Bottleneck node (lowest throughput in critical path) ────── */
function findBottleneck(
  path: string[],
  nodes: CyNode[]
): { id: string; label: string } | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let minT = Infinity;
  let bottleneck: CyNode | null = null;
  for (const id of path) {
    const n = nodeMap.get(id);
    if (!n) continue;
    const t = effectiveThroughput(n);
    if (t < minT) { minT = t; bottleneck = n; }
  }
  return bottleneck ? { id: bottleneck.id, label: bottleneck.label } : null;
}

/* ── Generate human-readable suggestions ─────────────────────── */
function generateSuggestions(
  nodes: CyNode[],
  bottleneck: { id: string; label: string } | null,
  throughput: number
): string[] {
  const suggestions: string[] = [];
  const warnings: string[] = [];

  // Monolithic bottleneck
  const monoliths = nodes.filter((n) => n.type === 'monolithic_api');
  if (monoliths.length > 0) {
    suggestions.push(
      `Monolithic API detected (${monoliths.map((n) => n.label).join(', ')}). ` +
        `Distributing this into microservices + Kafka can increase throughput by 10–20×.`
    );
    suggestions.push(
      'Consider decomposing by bounded context: auth service, user service, order service, etc.'
    );
  }

  // No cache in front of DB
  const hasDbs = nodes.some((n) => ['postgres', 'mysql', 'mongodb'].includes(n.type));
  const hasCache = nodes.some((n) => ['redis', 'memcached'].includes(n.type));
  if (hasDbs && !hasCache) {
    suggestions.push(
      'No caching layer detected. Adding Redis in front of your database can reduce latency by 95% for read-heavy workloads.'
    );
  }

  // No load balancer
  const hasLb = nodes.some((n) => ['load_balancer', 'api_gateway', 'cdn'].includes(n.type));
  const hasCompute = nodes.some((n) =>
    ['app_server', 'microservice', 'web_server', 'monolithic_api'].includes(n.type)
  );
  if (hasCompute && !hasLb) {
    warnings.push(
      'No load balancer or API gateway found. This is a single point of failure.'
    );
  }

  // No observability
  const hasObs = nodes.some((n) => ['monitoring', 'logging', 'tracing'].includes(n.type));
  if (nodes.length > 3 && !hasObs) {
    suggestions.push('Consider adding monitoring, logging, and distributed tracing for production observability.');
  }

  // Bottleneck advice
  if (bottleneck) {
    const spec = catalog[nodes.find((n) => n.id === bottleneck.id)?.type ?? ''];
    if (spec?.horizontallyScalable) {
      suggestions.push(
        `Bottleneck: "${bottleneck.label}" – increase instances to scale throughput linearly.`
      );
    } else {
      suggestions.push(
        `Bottleneck: "${bottleneck.label}" – this component cannot scale horizontally. Consider sharding or replacing with a scalable alternative.`
      );
    }
  }

  // No messaging for async work
  const hasMessaging = nodes.some((n) =>
    ['kafka', 'rabbitmq', 'message_queue', 'pulsar'].includes(n.type)
  );
  if (!hasMessaging && nodes.length > 4) {
    suggestions.push(
      'No async messaging layer. Adding Kafka or RabbitMQ can decouple services and absorb traffic spikes.'
    );
  }

  return [...warnings, ...suggestions];
}

/* ── Distribution gain analysis ──────────────────────────────── */
function computeDistributionGain(
  nodes: CyNode[],
  _edges: CyEdge[],
  currentLatency: number,
  currentThroughput: number,
  currentCost: number
): DistributionGain | undefined {
  const monoliths = nodes.filter((n) => n.type === 'monolithic_api');
  if (monoliths.length === 0) return undefined;

  // Simulate distributing monolith into 3 microservices + Kafka
  const monoThroughput = monoliths.reduce((a, n) => a + effectiveThroughput(n), 0);
  const distributedThroughputGain = 8; // microservices are ~8x faster per unit
  const distributedLatencyReduction = 0.4; // 40% lower latency in distributed mode
  const additionalCostFactor = 1.3; // 30% more infra cost for Kafka + extra services

  const distMaxUsers = Math.floor(
    ((currentThroughput - monoThroughput) + monoThroughput * distributedThroughputGain) *
      (currentLatency * distributedLatencyReduction) /
      1000
  );

  const currentMaxUsers = Math.floor((currentThroughput * currentLatency) / 1000);

  return {
    currentMaxUsers,
    distributedMaxUsers: Math.max(distMaxUsers, currentMaxUsers * 5),
    currentLatencyMs: currentLatency,
    distributedLatencyMs: Math.round(currentLatency * distributedLatencyReduction),
    currentCostPerHour: currentCost,
    distributedCostPerHour:
      currentCost +
      monoliths.length * 0.08 * 3 + // 3 microservices per monolith
      0.25 + // Kafka
      0.05, // Zookeeper/broker
    recommendation:
      'Distribute the monolithic API into domain microservices with Kafka event streaming. ' +
      'Expect ~' +
      Math.round(distributedLatencyReduction * 100) +
      '% lower p99 latency and ~' +
      distributedThroughputGain +
      '× higher throughput, at a ~' +
      Math.round((additionalCostFactor - 1) * 100) +
      '% cost increase.',
  };
}

/* ── Main analysis function ────────────────────────────────────── */
export function analyzeCanvas(canvas: CanvasState): AnalysisResult {
  const { nodes, edges } = canvas;

  if (nodes.length === 0) {
    return {
      totalLatencyMs: 0,
      p99LatencyMs: 0,
      throughputRps: 0,
      maxConcurrentUsers: 0,
      costPerHour: 0,
      costPerMillionRequests: 0,
      cloudCosts: ZERO_CLOUD_COSTS,
      bottleneckNodeId: null,
      bottleneckLabel: null,
      criticalPath: [],
      suggestions: ['Add some nodes to the canvas to analyse your architecture.'],
      warnings: [],
    };
  }

  // Critical path
  const { path: criticalPath, latency: totalLatency } = longestPath(nodes, edges);
  const p99Latency = Math.round(totalLatency * 1.4); // approximate p99 as 1.4× avg

  // Throughput
  const throughput =
    criticalPath.length > 0
      ? pathThroughput(criticalPath, nodes)
      : nodes.reduce((min, n) => Math.min(min, effectiveThroughput(n)), Infinity);

  // Cost
  const costPerHour = nodes.reduce((sum, n) => sum + effectiveCost(n), 0);

  // Cost per million requests
  const costPerMillion =
    throughput > 0 && totalLatency > 0
      ? (costPerHour / throughput / 3600) * 1_000_000
      : 0;

  // Max concurrent users (Little's Law: L = λW)
  const maxUsers =
    throughput > 0 && totalLatency > 0
      ? Math.floor((throughput * totalLatency) / 1000)
      : 0;

  // Bottleneck
  const bottleneck = findBottleneck(criticalPath, nodes);

  // Suggestions
  const suggestions = generateSuggestions(nodes, bottleneck, throughput);

  // Distribution gain
  const distributionGain = computeDistributionGain(
    nodes,
    edges,
    totalLatency,
    throughput,
    costPerHour
  );

  return {
    totalLatencyMs: Math.round(totalLatency),
    p99LatencyMs: p99Latency,
    throughputRps: Math.round(throughput),
    maxConcurrentUsers: maxUsers,
    costPerHour: Math.round(costPerHour * 100) / 100,
    costPerMillionRequests: Math.round(costPerMillion * 100) / 100,
    cloudCosts: {
      aws:   providerBreakdown(costPerHour, PROVIDER_MULT.aws,   throughput, totalLatency),
      gcp:   providerBreakdown(costPerHour, PROVIDER_MULT.gcp,   throughput, totalLatency),
      azure: providerBreakdown(costPerHour, PROVIDER_MULT.azure, throughput, totalLatency),
    },
    bottleneckNodeId: bottleneck?.id ?? null,
    bottleneckLabel: bottleneck?.label ?? null,
    criticalPath,
    suggestions,
    warnings: [],
    distributionGain,
  };
}

/* ── Summarise all request files ──────────────────────────────── */
export interface ProjectSummary {
  totalCostPerHour: number;
  maxThroughputRps: number;
  avgLatencyMs: number;
  maxConcurrentUsers: number;
  requestCount: number;
  suggestions: string[];
}

export function summariseProject(
  baseAnalysis: AnalysisResult,
  requestAnalyses: AnalysisResult[]
): ProjectSummary {
  const all = [baseAnalysis, ...requestAnalyses].filter((a) => a.totalLatencyMs > 0);
  if (all.length === 0) {
    return {
      totalCostPerHour: 0,
      maxThroughputRps: 0,
      avgLatencyMs: 0,
      maxConcurrentUsers: 0,
      requestCount: 0,
      suggestions: [],
    };
  }
  return {
    totalCostPerHour: baseAnalysis.costPerHour,
    maxThroughputRps: Math.max(...all.map((a) => a.throughputRps)),
    avgLatencyMs: Math.round(
      all.reduce((s, a) => s + a.totalLatencyMs, 0) / all.length
    ),
    maxConcurrentUsers: Math.max(...all.map((a) => a.maxConcurrentUsers)),
    requestCount: requestAnalyses.length,
    suggestions: Array.from(new Set(all.flatMap((a) => a.suggestions))).slice(0, 5),
  };
}
