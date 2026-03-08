/* ═══════════════════════════════════════════════════════════════
   NodeCard.tsx
   Neo-Brutalist canvas node card with lucide icons, hover tooltip
   with editable label/IP, stats grid, and action buttons.
   Uses App.css classes (no Tailwind required).
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import {
  Monitor, Smartphone, Globe, Router, Split, Layout, Box, Zap,
  Database, Layers, Search, Package, HardDrive, Folder, MessageSquare,
  Activity, Send, Radio, Cpu, Wind, Snowflake, Fan, Key, Compass,
  Lock, Network, FileText, GitCommit, Shield, Server,
  Sigma, BrainCircuit, BarChart2, GitMerge, Boxes,
} from 'lucide-react';
import { Container } from 'lucide-react';
import type { CyNode } from '../types';
import catalog from '../data/componentCatalog';

/* ── Helper ───────────────────────────────────────────────────── */
function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

/* ── Node-type → icon / colours catalog ─────────────────────── */
export interface CatalogSpec {
  icon: React.ElementType;
  bg: string;
  text: string;
  category: string;
}

export const NODE_CATALOG: Record<string, CatalogSpec> = {
  // Client
  client:          { icon: Monitor,       bg: '#dbeafe', text: '#1e40af', category: 'Client'    },
  mobile_client:   { icon: Smartphone,    bg: '#dbeafe', text: '#1e40af', category: 'Client'    },
  // Network
  cdn:             { icon: Globe,         bg: '#d1fae5', text: '#065f46', category: 'Network'   },
  api_gateway:     { icon: Router,        bg: '#d1fae5', text: '#065f46', category: 'Network'   },
  load_balancer:   { icon: Split,         bg: '#d1fae5', text: '#065f46', category: 'Network'   },
  lb:              { icon: Split,         bg: '#d1fae5', text: '#065f46', category: 'Network'   },
  // Compute
  web_server:      { icon: Layout,        bg: '#ede9fe', text: '#4c1d95', category: 'Compute'   },
  app_server:      { icon: Server,        bg: '#ede9fe', text: '#4c1d95', category: 'Compute'   },
  microservice:    { icon: Box,           bg: '#ede9fe', text: '#4c1d95', category: 'Compute'   },
  serverless:      { icon: Zap,           bg: '#ede9fe', text: '#4c1d95', category: 'Serverless'},
  container:       { icon: Container,     bg: '#e0f2fe', text: '#0c4a6e', category: 'Container' },
  kubernetes:      { icon: Boxes,         bg: '#e0f2fe', text: '#0c4a6e', category: 'K8s'       },
  monolithic_api:  { icon: Server,        bg: '#ede9fe', text: '#4c1d95', category: 'Compute'   },
  graphql:         { icon: GitMerge,      bg: '#fdf2f8', text: '#831843', category: 'API'       },
  // Databases
  postgres:        { icon: Database,      bg: '#ffedd5', text: '#7c2d12', category: 'Database'  },
  sql:             { icon: Database,      bg: '#ffedd5', text: '#7c2d12', category: 'Database'  },
  dynamodb:        { icon: Database,      bg: '#ffedd5', text: '#7c2d12', category: 'Database'  },
  non_relational:  { icon: Layers,        bg: '#ffedd5', text: '#7c2d12', category: 'Database'  },
  redis:           { icon: Zap,           bg: '#fee2e2', text: '#991b1b', category: 'Cache'     },
  memcached:       { icon: Zap,           bg: '#fee2e2', text: '#991b1b', category: 'Cache'     },
  elasticsearch:   { icon: Search,        bg: '#ffedd5', text: '#7c2d12', category: 'Search'    },
  cassandra:       { icon: Database,      bg: '#ffedd5', text: '#7c2d12', category: 'Database'  },
  influxdb:        { icon: BarChart2,     bg: '#ffedd5', text: '#7c2d12', category: 'TSDB'      },
  neo4j:           { icon: Network,       bg: '#ffedd5', text: '#7c2d12', category: 'Graph DB'  },
  // Storage
  object_storage:  { icon: Package,       bg: '#fef9c3', text: '#713f12', category: 'Storage'   },
  block_storage:   { icon: HardDrive,     bg: '#fef9c3', text: '#713f12', category: 'Storage'   },
  nfs:             { icon: Folder,        bg: '#fef9c3', text: '#713f12', category: 'Storage'   },
  // Messaging
  message_queue:   { icon: MessageSquare, bg: '#f3e8ff', text: '#4c1d95', category: 'Messaging' },
  queue:           { icon: MessageSquare, bg: '#f3e8ff', text: '#4c1d95', category: 'Messaging' },
  kafka:           { icon: Activity,      bg: '#f3e8ff', text: '#4c1d95', category: 'Streaming' },
  rabbitmq:        { icon: Send,          bg: '#f3e8ff', text: '#4c1d95', category: 'Messaging' },
  pulsar:          { icon: Radio,         bg: '#f3e8ff', text: '#4c1d95', category: 'Messaging' },
  // Data
  spark:           { icon: Cpu,           bg: '#cffafe', text: '#164e63', category: 'Data Eng'  },
  flink:           { icon: Wind,          bg: '#cffafe', text: '#164e63', category: 'Data Eng'  },
  snowflake_dw:    { icon: Snowflake,     bg: '#cffafe', text: '#164e63', category: 'Warehouse' },
  airflow:         { icon: Fan,           bg: '#cffafe', text: '#164e63', category: 'Pipeline'  },
  // Control
  zookeeper:       { icon: Key,           bg: '#f1f5f9', text: '#0f172a', category: 'Control'   },
  consul:          { icon: Compass,       bg: '#f1f5f9', text: '#0f172a', category: 'Control'   },
  vault:           { icon: Lock,          bg: '#f1f5f9', text: '#0f172a', category: 'Secrets'   },
  istio:           { icon: Network,       bg: '#f1f5f9', text: '#0f172a', category: 'Mesh'      },
  sidecar:         { icon: Network,       bg: '#f1f5f9', text: '#0f172a', category: 'Sidecar'   },
  // Observability
  monitoring:      { icon: Activity,      bg: '#fce7f3', text: '#831843', category: 'Metrics'   },
  logging:         { icon: FileText,      bg: '#fce7f3', text: '#831843', category: 'Logs'      },
  tracing:         { icon: GitCommit,     bg: '#fce7f3', text: '#831843', category: 'Traces'    },
  // AI / ML
  ml_model:        { icon: BrainCircuit,  bg: '#e0e7ff', text: '#3730a3', category: 'ML'        },
  analytics:       { icon: Sigma,         bg: '#e0e7ff', text: '#3730a3', category: 'Analytics' },
};

const FALLBACK_SPEC: CatalogSpec = {
  icon: Box, bg: '#f1f5f9', text: '#334155', category: 'Node',
};

/* ── Props ────────────────────────────────────────────────────── */
export interface NodeCardProps {
  node:         CyNode;
  selected:     boolean;
  isBottleneck: boolean;
  showHandles?: boolean;
  onMouseDown:  (e: React.MouseEvent<HTMLDivElement>) => void;
  onConnect?:   (e: React.MouseEvent<HTMLDivElement>) => void;
  onInspect?:   () => void;
  onConfigure?: () => void;
  onUpdate?:    (updated: CyNode) => void;
}

/* ── Component ────────────────────────────────────────────────── */
const HANDLE_SIDES = ['top', 'bottom', 'left', 'right'] as const;

export const NodeCard = React.memo(function NodeCard({
  node,
  selected,
  isBottleneck,
  showHandles = false,
  onMouseDown,
  onConnect,
  onInspect,
  onConfigure,
  onUpdate,
}: NodeCardProps) {
  const spec        = NODE_CATALOG[node.type] ?? FALLBACK_SPEC;
  const cspec       = catalog?.[node.type];
  const IconComponent = spec.icon;

  const instances      = node.config.instances || 1;
  const ipAddress      = node.config.ip;
  const containerCount = node.config.containers?.length ?? 0;
  const firewallCount  = node.config.firewallRules?.length ?? 0;
  const latMs = node.config.customLatencyMs     ?? cspec?.latencyMs?.avg ?? 0;
  const rps   = node.config.customThroughputRps ?? cspec?.throughputRps  ?? 0;
  const cost  = node.config.customCostPerHour   ?? cspec?.costPerHour    ?? 0;

  const cardClass = [
    'node-card',
    selected     ? 'selected'   : '',
    isBottleneck ? 'bottleneck' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClass}
      style={{ '--theme-color': spec.text, '--theme-bg': spec.bg } as React.CSSProperties}
      onMouseDown={onMouseDown}
    >
      {/* ── Icon box ──────────────────────────────────────── */}
      <div className="icon-wrapper">
        <IconComponent size={28} strokeWidth={2} color={spec.text} />
        {isBottleneck && <div className="badge-alert" title="Bottleneck" />}
        {instances > 1 && (
          <div className="badge-instances">×{instances}</div>
        )}

        {/* ── Edge connection handles ────────────────────────── */}
        {HANDLE_SIDES.map((side) => (
          <div
            key={side}
            className={`conn-handle conn-handle--${side}${showHandles ? ' conn-handle--visible' : ''}`}
            onMouseDown={(e) => { e.stopPropagation(); onConnect?.(e); }}
          />
        ))}

        {/* ── Hover tooltip — anchored to bottom of icon box ─── */}
        <div className="nc-tooltip">
          <div className="nc-tt-type">{spec.category}</div>

          {isBottleneck && (
            <div className="nc-tt-warn">⚠ Bottleneck detected</div>
          )}

          <input
            className="nc-tt-input nc-tt-input--label"
            value={node.label}
            placeholder="Node label"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate?.({ ...node, label: e.target.value })}
          />
          <input
            className="nc-tt-input nc-tt-input--ip"
            value={node.config.ip ?? ''}
            placeholder="IP / Hostname"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) =>
              onUpdate?.({
                ...node,
                config: { ...node.config, ip: e.target.value || undefined },
              })
            }
          />

          <div className="nc-tt-divider" />

          <div className="nc-tt-row">
            <span>Latency</span>
            <strong>{latMs} ms</strong>
          </div>
          <div className="nc-tt-row">
            <span>Throughput</span>
            <strong>{fmt(rps)} rps</strong>
          </div>
          <div className="nc-tt-row">
            <span>Cost</span>
            <strong>${cost.toFixed(3)}/hr</strong>
          </div>
          {instances > 1 && (
            <div className="nc-tt-row">
              <span>Scale</span>
              <strong>×{instances} nodes</strong>
            </div>
          )}

          <div className="nc-tt-actions">
            <button
              className="nc-tt-btn"
              onMouseDown={(e) => { e.stopPropagation(); onInspect?.(); }}
            >
              Inspect
            </button>
            {onConfigure && (
              <button
                className="nc-tt-btn nc-tt-btn--primary"
                onMouseDown={(e) => { e.stopPropagation(); onConfigure(); }}
              >
                Config →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Text area (below the square) ───────────────────────── */}
      <div className="text-area">
        <div className="label-text">{node.label}</div>
        {ipAddress && <div className="ip-text">{ipAddress}</div>}
        {(containerCount > 0 || firewallCount > 0) && (
          <div className="nc-micro-badges">
            {containerCount > 0 && (
              <span
                className="nc-micro-badge nc-micro-badge--container"
                title={`${containerCount} container${containerCount !== 1 ? 's' : ''}`}
              >
                <Container size={8} /> {containerCount}
              </span>
            )}
            {firewallCount > 0 && (
              <span
                className="nc-micro-badge nc-micro-badge--firewall"
                title={`${firewallCount} firewall rule${firewallCount !== 1 ? 's' : ''}`}
              >
                <Shield size={8} /> {firewallCount}
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  );
}, (prev, next) =>
  prev.selected     === next.selected
  && prev.isBottleneck === next.isBottleneck
  && prev.node.label  === next.node.label
  && prev.node.config === next.node.config
);
