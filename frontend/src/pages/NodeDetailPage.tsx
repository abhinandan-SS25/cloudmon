/* ═══════════════════════════════════════════════════════════════
   NodeDetailPage.tsx — Spatial Server Editor
   Tabs: Services canvas · Firewall rules · Storage volumes · Config
   ═══════════════════════════════════════════════════════════════ */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Server, HardDrive, Shield, Plus, Trash2, Settings,
  Activity, Cpu, X, Cloud, MonitorSmartphone, Layers,
  MemoryStick, Network, ChevronRight, AlertTriangle,
  CheckCircle2, Clock, Box, Wrench, GitBranch,
  ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import catalog from '../data/componentCatalog';
import { CLOUD_MAPPINGS } from '../data/cloudInstanceTypes';
import type { CloudServiceOption } from '../data/cloudInstanceTypes';
import {
  CyNode, DockerContainer, EnvVar, FirewallRule, HostPort, Phase, VolumeMount,
} from '../types';
import type { CloudProvider, DeploymentMode } from '../types';
import {
  findLeafById, nextContainerId, nextHostPortId, nextVolumeId,
} from '../utils/canvasUtils';

/* ── Exports used by Editor.tsx ──────────────────────────────── */
export const COMPUTE_TYPES = new Set([
  'web_server', 'app_server', 'microservice', 'container',
  'kubernetes', 'monolithic_api', 'graphql', 'serverless',
]);
const DATA_TYPES = new Set([
  'postgres', 'sql', 'dynamodb', 'non_relational', 'redis', 'memcached',
  'elasticsearch', 'cassandra', 'influxdb', 'neo4j',
]);
export const CONFIGURABLE_TYPES = new Set([...COMPUTE_TYPES, ...DATA_TYPES]);

/* ── Canvas constants ────────────────────────────────────────── */
const NODE_W      = 228;
const NODE_H      = 112;
const PORT_ITEM_H = 68;

/* ── Canvas item kinds ───────────────────────────────────────── */
type ItemKind =
  | 'docker'      // Docker container
  | 'k8s_pod'     // Kubernetes Pod
  | 'k8s_deploy'  // K8s Deployment / ReplicaSet
  | 'k8s_cronjob' // K8s CronJob
  | 'lb'          // Load Balancer
  | 'sidecar'     // Sidecar proxy (Envoy / Istio)
  | 'queue';      // Message queue worker

interface ItemKindConfig {
  label: string;
  emoji: string;
  accent: string;
  defaultName: string;
}

const ITEM_KINDS: Record<ItemKind, ItemKindConfig> = {
  docker:      { label: 'Docker Container',  emoji: '🐳', accent: '#0099e6', defaultName: 'Container'   },
  k8s_pod:     { label: 'Kubernetes Pod',    emoji: '⬡',  accent: '#326CE5', defaultName: 'Pod'          },
  k8s_deploy:  { label: 'K8s Deployment',   emoji: '🚀', accent: '#326CE5', defaultName: 'Deployment'   },
  k8s_cronjob: { label: 'K8s CronJob',      emoji: '⏰', accent: '#7c3aed', defaultName: 'CronJob'      },
  lb:          { label: 'Load Balancer',     emoji: '⚖',  accent: '#059669', defaultName: 'Load Balancer'},
  sidecar:     { label: 'Sidecar Proxy',     emoji: '🔧', accent: '#d97706', defaultName: 'Sidecar'      },
  queue:       { label: 'Message Queue',     emoji: '📨', accent: '#e53e3e', defaultName: 'Queue Worker' },
};

/* restartPolicy still used as a persistence proxy for runtime info */
const KIND_TO_RESTART: Record<ItemKind, DockerContainer['restartPolicy']> = {
  docker: 'always', k8s_pod: 'unless-stopped', k8s_deploy: 'unless-stopped',
  k8s_cronjob: 'on-failure', lb: 'always', sidecar: 'always', queue: 'on-failure',
};

/* ── Cloud provider info ─────────────────────────────────────── */
const PROVIDER_COLORS  = { aws: '#FF9900', gcp: '#4285F4', azure: '#0078D4' } as const;
const PROVIDER_LABELS  = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' } as const;
const PROVIDER_EMOJI   = { aws: '⬡', gcp: '◎', azure: '△' } as const;

/* ── Misc helpers ────────────────────────────────────────────── */
const genId = (p: string) => `${p}-${Math.random().toString(36).substr(2, 6)}`;
function nextFirewallId() { return `fw-${Math.random().toString(36).substr(2,6)}`; }

interface ServiceConn { id: string; source: string; target: string; }
interface NodePos { x: number; y: number; }

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = x1 + Math.abs(x2 - x1) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

/* ════════════════════════════════════════════════════════════════
   DeployBadge – coloured pill showing where the node lives
   ════════════════════════════════════════════════════════════════ */
function DeployBadge({
  mode, provider, instanceType, onClick,
}: { mode: DeploymentMode; provider?: CloudProvider; instanceType?: string; onClick?: () => void }) {
  const isCloud = mode === 'cloud' && provider;
  const color   = isCloud ? PROVIDER_COLORS[provider!] : '#6b7280';
  const label   = isCloud
    ? `${PROVIDER_EMOJI[provider!]} ${PROVIDER_LABELS[provider!]}${instanceType ? ` · ${instanceType}` : ''}`
    : '🖥 Local / Test';
  return (
    <button
      className="ndp-deploy-badge"
      style={{ borderColor: color, color }}
      onClick={onClick}
      title="Click to change deployment"
    >
      {label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   CanvasItemCard – draggable card for any item kind
   ════════════════════════════════════════════════════════════════ */
interface CanvasItemCardProps {
  container: DockerContainer;
  kind: ItemKind;
  pos: NodePos;
  selected: boolean;
  connecting: boolean;
  dragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectStart: () => void;
  onConnectEnd: () => void;
}

function CanvasItemCard({
  container, kind, pos, selected, connecting, dragging,
  onMouseDown, onConnectStart, onConnectEnd,
}: CanvasItemCardProps) {
  const kc      = ITEM_KINDS[kind];
  const ramGb   = container.resources?.memoryMb   ? (container.resources.memoryMb / 1024).toFixed(1)     : '—';
  const cpuC    = container.resources?.cpuMillicores ? (container.resources.cpuMillicores / 1000).toFixed(1) : '—';
  const reps    = (kind === 'k8s_deploy' || kind === 'k8s_pod') && container.notes
    ? parseInt(container.notes) || 1 : 1;

  return (
    <div
      className={`ndp-service-node${selected ? ' selected' : ''}${connecting ? ' connecting' : ''}`}
      style={{
        width: NODE_W,
        height: NODE_H,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        cursor: dragging ? 'grabbing' : connecting ? 'crosshair' : 'grab',
        '--item-accent': kc.accent,
      } as React.CSSProperties}
      onMouseDown={onMouseDown}
    >
      <div className="ndp-service-header" style={{ borderBottomColor: kc.accent + '44' }}>
        <div className="ndp-runtime-icon" style={{ background: kc.accent + '18', color: kc.accent }}>
          {kc.emoji}
        </div>
        <div className="ndp-service-name-block">
          <span className="ndp-service-name">{container.name || kc.defaultName}</span>
          <span className="ndp-service-kind">{kc.label}</span>
        </div>
        {reps > 1 && <span className="ndp-replicas-badge">×{reps}</span>}
      </div>
      <div className="ndp-service-body">
        <div className="ndp-service-image">
          {container.image}{container.tag ? `:${container.tag}` : ''}
        </div>
        <div className="ndp-service-stats">
          <span className="ndp-stat-chip"><Activity size={9}/> {ramGb}G</span>
          <span className="ndp-stat-chip"><Cpu size={9}/> {cpuC}c</span>
          {container.env.length > 0 && (
            <span className="ndp-stat-chip">{container.env.length} env</span>
          )}
        </div>
      </div>
      <div className="ndp-handle-in" onMouseUp={onConnectEnd} title="Connect target" />
      <button
        className={`ndp-handle-out${connecting ? ' active' : ''}`}
        onMouseDown={e => { e.stopPropagation(); onConnectStart(); }}
        title="Draw connection"
      >
        {connecting ? '×' : '+'}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PortEntry
   ════════════════════════════════════════════════════════════════ */
function PortEntry({
  port, index, selected, connecting, action, onClick, onJackClick,
}: {
  port: HostPort; index: number; selected: boolean; connecting: boolean;
  action: 'allow' | 'deny'; onClick: () => void; onJackClick: () => void;
}) {
  return (
    <div
      className={`ndp-port-entry${selected ? ' selected' : ''}${action === 'deny' ? ' denied' : ''}`}
      style={{ top: index * PORT_ITEM_H + 8 }}
      onClick={onClick}
    >
      <div className="ndp-port-meta">
        <div className="ndp-port-badges">
          <span className={`ndp-action-badge ${action}`}>{action.toUpperCase()}</span>
          <span className="ndp-port-proto">{port.protocol.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span className="ndp-port-num">:{port.port}</span>
          <span className="ndp-port-service">{port.service}</span>
        </div>
      </div>
      <div className="ndp-jack">
        <button
          className={`ndp-jack-btn${connecting ? ' active' : ''}`}
          onMouseDown={e => { e.stopPropagation(); onJackClick(); }}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ConfigPanel — deployment + HW + perf overrides + notes
   ════════════════════════════════════════════════════════════════ */
function ConfigPanel({
  node,
  maxRam, maxCpu,
  onUpdate,
  onMaxRamChange, onMaxCpuChange,
}: {
  node: CyNode;
  maxRam: number; maxCpu: number;
  onUpdate: (n: CyNode) => void;
  onMaxRamChange: (v: number) => void;
  onMaxCpuChange: (v: number) => void;
}) {
  const cfg = node.config;
  const mode: DeploymentMode = cfg.deployment ?? 'local';
  const cloudOptions: CloudServiceOption[] = CLOUD_MAPPINGS[node.type] ?? [];
  const activeProvider = cfg.cloudProvider;
  const activeService  = cloudOptions.find(o => o.provider === activeProvider);
  const spec = catalog[node.type];

  const upd = (patch: Partial<typeof cfg>) => onUpdate({ ...node, config: { ...cfg, ...patch } });

  const setMode = (m: DeploymentMode) => {
    if (m === 'local') {
      upd({ deployment: 'local', cloudProvider: undefined, instanceType: undefined, region: undefined });
    } else {
      const first   = cloudOptions[0];
      const firstIt = first?.instanceTypes[0];
      upd({
        deployment: 'cloud',
        cloudProvider: first?.provider as CloudProvider,
        instanceType: firstIt?.id,
        region: first?.regions[0],
        customCostPerHour: firstIt?.costPerHour,
      });
    }
  };
  const setProvider = (p: CloudProvider) => {
    const svc    = cloudOptions.find(o => o.provider === p);
    const firstIt = svc?.instanceTypes[0];
    upd({ cloudProvider: p, instanceType: firstIt?.id, region: svc?.regions[0], customCostPerHour: firstIt?.costPerHour });
  };

  return (
    <div className="ndp-tab-panel cfg-panel">

      {/* ── Deployment strategy ── */}
      <div className="cfg-section">
        <div className="cfg-section-title"><Cloud size={13} /> Deployment Strategy</div>
        <div className="cfg-deploy-toggle">
          <button className={`cfg-deploy-btn${mode === 'local' ? ' active' : ''}`} onClick={() => setMode('local')}>
            <MonitorSmartphone size={14} /> Local / Self-Hosted
          </button>
          <button className={`cfg-deploy-btn${mode === 'cloud' ? ' active' : ''}`} onClick={() => setMode('cloud')}
            disabled={cloudOptions.length === 0}>
            <Cloud size={14} /> Managed Cloud {cloudOptions.length === 0 && '(N/A)'}
          </button>
        </div>

        {mode === 'cloud' && cloudOptions.length > 0 && (
          <>
            {/* Provider pills */}
            <div className="cfg-provider-row">
              {cloudOptions.map(svc => (
                <button
                  key={svc.provider}
                  className={`cfg-provider-btn${cfg.cloudProvider === svc.provider ? ' active' : ''}`}
                  style={{
                    '--pcolor': PROVIDER_COLORS[svc.provider as CloudProvider],
                  } as React.CSSProperties}
                  onClick={() => setProvider(svc.provider as CloudProvider)}
                >
                  {PROVIDER_EMOJI[svc.provider as CloudProvider]}&nbsp;{PROVIDER_LABELS[svc.provider as CloudProvider]}
                </button>
              ))}
            </div>

            {/* Instance type */}
            {activeService && (
              <div className="cfg-instance-wrap">
                <div className="ndp-field">
                  <label className="ndp-label">Instance Type</label>
                  <select className="ndp-select"
                    value={cfg.instanceType ?? ''}
                    onChange={e => {
                      const it = activeService.instanceTypes.find(t => t.id === e.target.value);
                      upd({ instanceType: e.target.value, customCostPerHour: it?.costPerHour });
                    }}>
                    {activeService.instanceTypes.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.id} — ${it.costPerHour.toFixed(3)}/hr
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ndp-field">
                  <label className="ndp-label">Region</label>
                  <select className="ndp-select"
                    value={cfg.region ?? ''}
                    onChange={e => upd({ region: e.target.value })}>
                    {activeService.regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Host specifications ── */}
      <div className="cfg-section">
        <div className="cfg-section-title"><Server size={13} /> Host Specifications</div>
        <div className="cfg-grid3">
          <div className="ndp-field">
            <label className="ndp-label">Instances</label>
            <input className="ndp-input" type="number" min={1} value={cfg.instances}
              onChange={e => upd({ instances: Number(e.target.value) || 1 })} />
          </div>
          <div className="ndp-field">
            <label className="ndp-label">Max RAM (GB)</label>
            <input className="ndp-input" type="number" step={8} value={maxRam}
              onChange={e => { onMaxRamChange(Number(e.target.value)); upd({ ramGb: Number(e.target.value) }); }} />
          </div>
          <div className="ndp-field">
            <label className="ndp-label">CPU Cores</label>
            <input className="ndp-input" type="number" step={2} value={maxCpu}
              onChange={e => { onMaxCpuChange(Number(e.target.value)); upd({ cpuCores: Number(e.target.value) }); }} />
          </div>
          <div className="ndp-field">
            <label className="ndp-label">Disk (GB)</label>
            <input className="ndp-input" type="number" step={20} value={cfg.diskGb ?? ''}
              placeholder="GB" onChange={e => upd({ diskGb: Number(e.target.value) || undefined })} />
          </div>
          <div className="ndp-field">
            <label className="ndp-label">OS / Image</label>
            <input className="ndp-input" value={cfg.osType ?? ''} placeholder="ubuntu-22.04"
              onChange={e => upd({ osType: e.target.value || undefined })} />
          </div>
          <div className="ndp-field">
            <label className="ndp-label">IP Address</label>
            <input className="ndp-input mono" value={cfg.ip ?? ''} placeholder="10.0.0.1"
              onChange={e => upd({ ip: e.target.value || undefined })} />
          </div>
        </div>
      </div>

      {/* ── Performance overrides ── */}
      <div className="cfg-section">
        <div className="cfg-section-title"><Activity size={13} /> Performance Overrides</div>
        <div className="cfg-grid3">
          <div className="ndp-field">
            <label className="ndp-label">Latency (ms)</label>
            <input className="ndp-input" type="number" min={0}
              value={cfg.customLatencyMs ?? (spec?.latencyMs.avg ?? '')}
              placeholder={spec ? `${spec.latencyMs.avg} (default)` : ''}
              onChange={e => upd({ customLatencyMs: Number(e.target.value) || undefined })} />
          </div>
          <div className="ndp-field">
            <label className="ndp-label">Throughput (rps)</label>
            <input className="ndp-input" type="number" min={0}
              value={cfg.customThroughputRps ?? (spec?.throughputRps ?? '')}
              placeholder={spec ? `${spec.throughputRps} (default)` : ''}
              onChange={e => upd({ customThroughputRps: Number(e.target.value) || undefined })} />
          </div>
          <div className="ndp-field">
            <label className="ndp-label">Cost/hr (USD)</label>
            <input className="ndp-input" type="number" min={0} step={0.001}
              value={cfg.customCostPerHour ?? (spec?.costPerHour ?? '')}
              placeholder={spec ? `$${spec.costPerHour.toFixed(3)} (default)` : ''}
              onChange={e => upd({ customCostPerHour: Number(e.target.value) || undefined })} />
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="cfg-section">
        <div className="cfg-section-title"><Box size={13} /> Notes</div>
        <textarea className="ndp-input cfg-notes" rows={5}
          placeholder="Architecture decisions, runbook links, caveats…"
          value={cfg.notes ?? ''}
          onChange={e => upd({ notes: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Inspector — right sidebar, context-sensitive per tab/selection
   ════════════════════════════════════════════════════════════════ */
interface InspectorProps {
  selectedId: string | null;
  containers: DockerContainer[];
  hostPorts: HostPort[];
  volumes: VolumeMount[];
  firewallRules: FirewallRule[];
  portActions: Record<string, 'allow' | 'deny'>;
  canvasKinds: Record<string, ItemKind>;
  node: CyNode;
  maxRam: number; maxCpu: number;
  onUpdateNode: (n: CyNode) => void;
  onUpdateContainer: (c: DockerContainer) => void;
  onUpdatePort: (p: HostPort) => void;
  onUpdateVolume: (v: VolumeMount) => void;
  onUpdateFirewall: (r: FirewallRule) => void;
  onPortAction: (id: string, a: 'allow' | 'deny') => void;
  onKindChange: (id: string, kind: ItemKind) => void;
  onDelete: () => void;
  onMaxRamChange: (v: number) => void;
  onMaxCpuChange: (v: number) => void;
}

function Inspector(p: InspectorProps) {
  const {
    selectedId, containers, hostPorts, volumes, firewallRules, portActions,
    canvasKinds, node, maxRam, maxCpu,
    onUpdateNode, onUpdateContainer, onUpdatePort, onUpdateVolume, onUpdateFirewall,
    onPortAction, onKindChange, onDelete, onMaxRamChange, onMaxCpuChange,
  } = p;

  const container = selectedId ? containers.find(c => c.id === selectedId)    : null;
  const port      = selectedId ? hostPorts.find(px => px.id === selectedId)   : null;
  const volume    = selectedId ? volumes.find(v => v.id === selectedId)       : null;
  const fwRule    = selectedId ? firewallRules.find(r => r.id === selectedId) : null;
  const kind      = container ? (canvasKinds[container.id] ?? 'docker') : 'docker';
  const action    = selectedId ? (portActions[selectedId] ?? 'allow') : 'allow';
  const spec      = catalog[node.type];

  /* derive title */
  let title = 'Configuration';
  if (!selectedId) title = 'Server Overview';
  if (container) title = ITEM_KINDS[kind].label;
  if (port)      title = 'Port Rule';
  if (volume)    title = 'Volume';
  if (fwRule)    title = fwRule.direction === 'inbound' ? 'Inbound Rule' : 'Outbound Rule';

  const mode: DeploymentMode = node.config.deployment ?? 'local';
  const effectiveCost = node.config.customCostPerHour ?? spec?.costPerHour ?? 0;
  const latencyMs     = node.config.customLatencyMs   ?? spec?.latencyMs.avg ?? 0;
  const throughput    = node.config.customThroughputRps ?? spec?.throughputRps ?? 0;

  return (
    <div className="ndp-inspector">
      <div className="ndp-inspector-head">
        <div className="ndp-inspector-title">
          <Settings size={14} color="var(--text-dim)" />
          {title}
        </div>
        {selectedId && (
          <button className="ndp-inspector-del" onClick={onDelete} title="Delete">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="ndp-inspector-body">

        {/* ════ No selection: overview + full config ════ */}
        {!selectedId && (
          <>
            <div className="insp-overview-stat-row">
              <span className="insp-stat"><Activity size={11}/> {latencyMs} ms</span>
              <span className="insp-stat"><Cpu size={11}/> {(node.config.customThroughputRps ?? throughput)} rps</span>
              <span className="insp-stat">${effectiveCost.toFixed(3)}/hr</span>
            </div>
            <div className="insp-overview-chips">
              <span className="insp-chip">📦 {containers.length} service{containers.length !== 1 ? 's' : ''}</span>
              <span className="insp-chip">🔌 {hostPorts.length} port{hostPorts.length !== 1 ? 's' : ''}</span>
              <span className="insp-chip">🛡 {firewallRules.length} rule{firewallRules.length !== 1 ? 's' : ''}</span>
            </div>
            {spec && (
              <>
                <hr className="ndp-section-divider" />
                <p className="ndp-section-label">Spec Reference</p>
                <div className="insp-spec-table">
                  <div className="insp-spec-row"><span>Avg latency</span><strong>{spec.latencyMs.avg} ms</strong></div>
                  <div className="insp-spec-row"><span>p99 latency</span><strong>{spec.latencyMs.p99} ms</strong></div>
                  <div className="insp-spec-row"><span>Peak throughput</span><strong>{spec.throughputRps.toLocaleString()} rps</strong></div>
                  <div className="insp-spec-row"><span>Cost / hr</span><strong>${spec.costPerHour.toFixed(3)}</strong></div>
                  <div className="insp-spec-row"><span>Scalable</span><strong>{spec.horizontallyScalable ? '✅ Yes' : '❌ No'}</strong></div>
                </div>
                <p className="insp-description">{spec.description}</p>
              </>
            )}
            <hr className="ndp-section-divider" />
            <ConfigPanel
              node={node}
              maxRam={maxRam} maxCpu={maxCpu}
              onUpdate={onUpdateNode}
              onMaxRamChange={onMaxRamChange}
              onMaxCpuChange={onMaxCpuChange}
            />
          </>
        )}

        {/* ════ Container / service item ════ */}
        {container && (
          <>
            <div className="ndp-field">
              <label className="ndp-label">Service Name</label>
              <input className="ndp-input" value={container.name}
                onChange={e => onUpdateContainer({ ...container, name: e.target.value })} />
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Kind</label>
              <div className="ndp-kind-picker">
                {(Object.entries(ITEM_KINDS) as [ItemKind, ItemKindConfig][]).map(([k, kc]) => (
                  <button
                    key={k}
                    className={`ndp-kind-btn${kind === k ? ' active' : ''}`}
                    style={{ '--kcolor': kc.accent } as React.CSSProperties}
                    onClick={() => onKindChange(container.id, k)}
                    title={kc.label}
                  >
                    {kc.emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Image</label>
              <input className="ndp-input mono" value={`${container.image}${container.tag ? `:${container.tag}` : ''}`}
                onChange={e => {
                  const [img, ...rest] = e.target.value.split(':');
                  onUpdateContainer({ ...container, image: img, tag: rest.join(':') || 'latest' });
                }} />
            </div>
            {(kind === 'k8s_pod' || kind === 'k8s_deploy') && (
              <div className="ndp-field">
                <label className="ndp-label">Replicas</label>
                <input className="ndp-input" type="number" min={1}
                  value={parseInt(container.notes ?? '1') || 1}
                  onChange={e => onUpdateContainer({ ...container, notes: String(Math.max(1, Number(e.target.value))) })} />
              </div>
            )}
            <hr className="ndp-section-divider" />
            <div className="ndp-grid2">
              <div className="ndp-field">
                <label className="ndp-label">RAM (GB)</label>
                <input className="ndp-input" type="number" step="0.5"
                  value={container.resources?.memoryMb ? container.resources.memoryMb / 1024 : ''}
                  placeholder="GB"
                  onChange={e => onUpdateContainer({ ...container, resources: { ...container.resources, memoryMb: Number(e.target.value) * 1024 } })} />
              </div>
              <div className="ndp-field">
                <label className="ndp-label">vCPU</label>
                <input className="ndp-input" type="number" step="0.5"
                  value={container.resources?.cpuMillicores ? container.resources.cpuMillicores / 1000 : ''}
                  placeholder="cores"
                  onChange={e => onUpdateContainer({ ...container, resources: { ...container.resources, cpuMillicores: Number(e.target.value) * 1000 } })} />
              </div>
            </div>
            <hr className="ndp-section-divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="ndp-label" style={{ marginBottom: 0 }}>Environment Vars</label>
              <button className="ndp-env-add-btn"
                onClick={() => onUpdateContainer({ ...container, env: [...container.env, { key: '', value: '' }] })}>
                <Plus size={11} /> Add
              </button>
            </div>
            {container.env.length === 0
              ? <div className="ndp-env-empty">No env vars.</div>
              : <div className="ndp-env-list">
                  {container.env.map((ev, i) => (
                    <div key={i} className="ndp-env-row">
                      <input className="ndp-input ndp-env-key mono" placeholder="KEY" value={ev.key}
                        onChange={e => {
                          const next = [...container.env]; next[i] = { ...next[i], key: e.target.value };
                          onUpdateContainer({ ...container, env: next });
                        }} />
                      <span className="ndp-env-eq">=</span>
                      <input className="ndp-input ndp-env-val" placeholder="value" value={ev.value}
                        onChange={e => {
                          const next = [...container.env]; next[i] = { ...next[i], value: e.target.value };
                          onUpdateContainer({ ...container, env: next });
                        }} />
                      <button className="ndp-icon-btn"
                        onClick={() => onUpdateContainer({ ...container, env: container.env.filter((_, j) => j !== i) })}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
            }
          </>
        )}

        {/* ════ Port entry ════ */}
        {port && (
          <>
            <div className="ndp-toggle-row">
              <button className={`ndp-toggle-btn allow${action === 'allow' ? ' active' : ''}`}
                onClick={() => onPortAction(port.id, 'allow')}>ALLOW</button>
              <button className={`ndp-toggle-btn deny${action === 'deny' ? ' active' : ''}`}
                onClick={() => onPortAction(port.id, 'deny')}>DENY</button>
            </div>
            <div className="ndp-grid2">
              <div className="ndp-field">
                <label className="ndp-label">Port</label>
                <input className="ndp-input mono" type="number" value={port.port}
                  onChange={e => onUpdatePort({ ...port, port: Number(e.target.value) })} />
              </div>
              <div className="ndp-field">
                <label className="ndp-label">Protocol</label>
                <select className="ndp-select" value={port.protocol}
                  onChange={e => onUpdatePort({ ...port, protocol: e.target.value as 'tcp' | 'udp' })}>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                </select>
              </div>
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Service Label</label>
              <input className="ndp-input" value={port.service}
                onChange={e => onUpdatePort({ ...port, service: e.target.value })} />
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Description</label>
              <input className="ndp-input" value={port.description ?? ''}
                onChange={e => onUpdatePort({ ...port, description: e.target.value || undefined })} />
            </div>
          </>
        )}

        {/* ════ Volume ════ */}
        {volume && (
          <>
            <div className="ndp-field">
              <label className="ndp-label">Name</label>
              <input className="ndp-input" value={volume.name}
                onChange={e => onUpdateVolume({ ...volume, name: e.target.value })} />
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Mount Path</label>
              <input className="ndp-input mono" value={volume.containerPath}
                onChange={e => onUpdateVolume({ ...volume, containerPath: e.target.value })} />
            </div>
            <div className="ndp-grid2">
              <div className="ndp-field">
                <label className="ndp-label">Size (GB)</label>
                <input className="ndp-input" type="number" step="10" value={volume.sizeGb ?? ''}
                  placeholder="unlimited"
                  onChange={e => onUpdateVolume({ ...volume, sizeGb: Number(e.target.value) || undefined })} />
              </div>
              <div className="ndp-field">
                <label className="ndp-label">Type</label>
                <select className="ndp-select" value={volume.type}
                  onChange={e => onUpdateVolume({ ...volume, type: e.target.value as VolumeMount['type'] })}>
                  <option value="volume">Named Volume</option>
                  <option value="bind">Bind Mount</option>
                  <option value="tmpfs">tmpfs</option>
                </select>
              </div>
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Access</label>
              <select className="ndp-select" value={volume.readOnly ? 'ro' : 'rw'}
                onChange={e => onUpdateVolume({ ...volume, readOnly: e.target.value === 'ro' })}>
                <option value="rw">Read / Write</option>
                <option value="ro">Read Only</option>
              </select>
            </div>
          </>
        )}

        {/* ════ Firewall rule ════ */}
        {fwRule && (
          <>
            <div className="ndp-toggle-row">
              <button className={`ndp-toggle-btn allow${fwRule.action === 'allow' ? ' active' : ''}`}
                onClick={() => onUpdateFirewall({ ...fwRule, action: 'allow' })}>ALLOW</button>
              <button className={`ndp-toggle-btn deny${fwRule.action === 'deny' ? ' active' : ''}`}
                onClick={() => onUpdateFirewall({ ...fwRule, action: 'deny' })}>DENY</button>
            </div>
            <div className="ndp-toggle-row" style={{ marginTop: 6 }}>
              <button className={`ndp-toggle-btn allow${fwRule.direction === 'inbound' ? ' active' : ''}`}
                onClick={() => onUpdateFirewall({ ...fwRule, direction: 'inbound' })}>INBOUND</button>
              <button className={`ndp-toggle-btn deny${fwRule.direction === 'outbound' ? ' active' : ''}`}
                onClick={() => onUpdateFirewall({ ...fwRule, direction: 'outbound' })}>OUTBOUND</button>
            </div>
            <hr className="ndp-section-divider" />
            <div className="ndp-grid2">
              <div className="ndp-field">
                <label className="ndp-label">Port / Range</label>
                <input className="ndp-input mono" value={fwRule.portRange}
                  placeholder="80, 80-443, *"
                  onChange={e => onUpdateFirewall({ ...fwRule, portRange: e.target.value })} />
              </div>
              <div className="ndp-field">
                <label className="ndp-label">Protocol</label>
                <select className="ndp-select" value={fwRule.protocol}
                  onChange={e => onUpdateFirewall({ ...fwRule, protocol: e.target.value as FirewallRule['protocol'] })}>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <div className="ndp-field">
              <label className="ndp-label">CIDR / Source</label>
              <input className="ndp-input mono" value={fwRule.cidr}
                placeholder="0.0.0.0/0"
                onChange={e => onUpdateFirewall({ ...fwRule, cidr: e.target.value })} />
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Priority</label>
              <input className="ndp-input" type="number" value={fwRule.priority ?? 100}
                onChange={e => onUpdateFirewall({ ...fwRule, priority: Number(e.target.value) })} />
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Description</label>
              <input className="ndp-input" value={fwRule.description ?? ''}
                onChange={e => onUpdateFirewall({ ...fwRule, description: e.target.value || undefined })} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main — NodeDetailPage
   ════════════════════════════════════════════════════════════════ */
export default function NodeDetailPage() {
  const { projectId, nodeId, requestId } = useParams<{
    projectId: string; nodeId: string; requestId?: string;
  }>();
  const { getProject, updateNode } = useProjects();

  const project = getProject(projectId ?? '');
  const phase: Phase = requestId ? 'request' : 'base';

  const canvas = useMemo(() => {
    if (!project) return null;
    if (phase === 'base') return project.base;
    const req = findLeafById(project.requests, requestId ?? '');
    return req?.canvas ?? null;
  }, [project, phase, requestId]);

  const originalNode = canvas?.nodes.find(n => n.id === nodeId) ?? null;
  const [localNode,  setLocalNode]  = useState<CyNode | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalNode(originalNode ? { ...originalNode, config: { ...originalNode.config } } : null);
    setSaveStatus('saved');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, requestId, projectId]);

  const handleChange = useCallback((updated: CyNode) => {
    setLocalNode(updated);
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateNode(projectId ?? '', phase, requestId ?? '', updated);
      setSaveStatus('saved');
    }, 600);
  }, [projectId, phase, requestId, updateNode]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  /* ── UI state ─────────────────────────────────────────────── */
  const [nodePositions, setNodePositions] = useState<Record<string, NodePos>>({});
  const [canvasKinds,   setCanvasKinds]   = useState<Record<string, ItemKind>>({});
  const [portActions,   setPortActions]   = useState<Record<string, 'allow' | 'deny'>>({});
  const [connections,   setConnections]   = useState<ServiceConn[]>([]);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [draggingId,    setDraggingId]    = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos,      setMousePos]      = useState({ x: 0, y: 0 });
  // Default 8GB / 4 CPU — realistic single-server spec; user can change in Config panel
  const [maxRam,        setMaxRam]        = useState(8);
  const [maxCpu,        setMaxCpu]        = useState(4);
  const [localVolumes,  setLocalVolumes]  = useState<VolumeMount[]>([]);
  const [localFirewall, setLocalFirewall] = useState<FirewallRule[]>([]);
  // Canvas viewport: zoom/pan
  const [zoom,    setZoom]    = useState(1);
  const [panX,    setPanX]    = useState(24);
  const [panY,    setPanY]    = useState(24);
  const [spaceDown,   setSpaceDown]   = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef  = useRef<HTMLDivElement>(null);
  // Keep stable refs for the wheel handler (avoids stale closure)
  const viewRef = useRef({ zoom: 1, panX: 24, panY: 24, minZoom: 0.125 });
  const panRef  = useRef({ active: false, startX: 0, startY: 0, initPanX: 24, initPanY: 24 });

  /* Seed from node config on load */
  useEffect(() => {
    if (!localNode) return;
    if (localNode.config.ramGb)    setMaxRam(localNode.config.ramGb);
    if (localNode.config.cpuCores) setMaxCpu(localNode.config.cpuCores);
    if (localNode.config.firewallRules) setLocalFirewall(localNode.config.firewallRules);
  }, [nodeId]); // eslint-disable-line

  /* Seed canvas positions */
  useEffect(() => {
    if (!localNode?.config.containers) return;
    setNodePositions(prev => {
      const next = { ...prev };
      localNode.config.containers!.forEach((c, i) => {
        if (!next[c.id]) next[c.id] = { x: 24 + (i % 3) * 260, y: 24 + Math.floor(i / 3) * 140 };
      });
      return next;
    });
  }, [localNode?.config.containers?.length]); // eslint-disable-line

  /* Space bar for pan mode */
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault(); setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  /* Wheel-zoom (passive:false required to call preventDefault) */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom: z, panX: px, panY: py, minZoom: mz } = viewRef.current;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZ = Math.max(mz, Math.min(3, z * factor));
      // Zoom centred on cursor
      const newPx = mx - (mx - px) * (newZ / z);
      const newPy = my - (my - py) * (newZ / z);
      setZoom(newZ); setPanX(newPx); setPanY(newPy);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []); // stable via ref

  if (!project || !localNode) {
    return (
      <div className="ndp-root">
        <div style={{ margin: 'auto', textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <p>Node not found.</p>
          <Link to="/projects">← Projects</Link>
        </div>
      </div>
    );
  }

  const containers   = localNode.config.containers ?? [];
  const hostPorts    = localNode.config.hostPorts  ?? [];
  const volumes      = localVolumes;
  const firewallRules = localFirewall;
  const spec         = catalog[localNode.type];
  const reqName      = requestId ? findLeafById(project.requests, requestId)?.name : null;
  const backUrl      = requestId ? `/projects/${projectId}/requests/${requestId}` : `/projects/${projectId}`;

  const mode: DeploymentMode = localNode.config.deployment ?? 'local';
  const provider = localNode.config.cloudProvider;

  const usedRam = containers.reduce((s, c) => s + (c.resources?.memoryMb ?? 0) / 1024, 0);
  const usedCpu = containers.reduce((s, c) => s + (c.resources?.cpuMillicores ?? 0) / 1000, 0);

  // Min zoom is proportional to RAM: 1GB → can only zoom to 1×, 2GB → 0.5×, etc.
  const minZoom = Math.max(0.08, 1 / maxRam);
  // Keep ref in sync every render
  viewRef.current = { zoom, panX, panY, minZoom };

  // Screen → canvas coordinate transform
  const screenToCanvas = (cx: number, cy: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (cx - rect.left - panX) / zoom, y: (cy - rect.top - panY) / zoom };
  };

  /* CRUD helpers */
  const setContainers = (next: DockerContainer[]) =>
    handleChange({ ...localNode, config: { ...localNode.config, containers: next } });
  const setHostPorts  = (next: HostPort[]) =>
    handleChange({ ...localNode, config: { ...localNode.config, hostPorts: next } });
  const setFirewall = (next: FirewallRule[]) => {
    setLocalFirewall(next);
    handleChange({ ...localNode, config: { ...localNode.config, firewallRules: next } });
  };
  const setVolumes = (next: VolumeMount[]) => setLocalVolumes(next);

  const addContainer = (kind: ItemKind = 'docker') => {
    const kc = ITEM_KINDS[kind];
    const c: DockerContainer = {
      id: nextContainerId(), name: kc.defaultName,
      image: kind === 'lb' ? 'nginx' : kind === 'queue' ? 'rabbitmq' : kind === 'sidecar' ? 'envoyproxy/envoy' : 'app',
      tag: 'latest', ports: [], env: [], volumes: [], resources: {}, restartPolicy: KIND_TO_RESTART[kind],
    };
    setContainers([...containers, c]);
    setCanvasKinds(prev => ({ ...prev, [c.id]: kind }));
    setNodePositions(prev => ({
      ...prev,
      [c.id]: { x: 20 + (containers.length % 3) * 260, y: 20 + Math.floor(containers.length / 3) * 140 },
    }));
    setSelectedId(c.id);
  };

  const addHostPort = () => {
    const p: HostPort = { id: nextHostPortId(), port: 8080, protocol: 'tcp', service: 'New Port' };
    setHostPorts([...hostPorts, p]);
    setPortActions(prev => ({ ...prev, [p.id]: 'allow' }));
    setSelectedId(p.id);
  };

  const addVolume = () => {
    const v: VolumeMount = {
      id: nextVolumeId(), name: 'new-volume',
      containerPath: '/data', readOnly: false, type: 'volume', sizeGb: 100,
    };
    setVolumes([...volumes, v]);
    setSelectedId(v.id);
  };

  const addFirewallRule = () => {
    const r: FirewallRule = {
      id: nextFirewallId(), direction: 'inbound', protocol: 'tcp',
      portRange: '80', cidr: '0.0.0.0/0', action: 'allow', priority: 100,
    };
    setFirewall([...firewallRules, r]);
    setSelectedId(r.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (containers.some(c => c.id === selectedId)) {
      setContainers(containers.filter(c => c.id !== selectedId));
      setConnections(prev => prev.filter(cn => cn.source !== selectedId && cn.target !== selectedId));
    } else if (selectedId.startsWith('hp-')) {
      setHostPorts(hostPorts.filter(p => p.id !== selectedId));
    } else if (selectedId.startsWith('vol-')) {
      setVolumes(volumes.filter((v: VolumeMount) => v.id !== selectedId));
    } else if (selectedId.startsWith('fw-')) {
      setFirewall(firewallRules.filter(r => r.id !== selectedId));
    }
    setSelectedId(null);
  };

  /* Canvas handlers */
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== id)
        setConnections(prev => [...prev, { id: genId('conn'), source: connectingFrom, target: id }]);
      setConnectingFrom(null);
      return;
    }
    setSelectedId(id);
    setDraggingId(id);
    const cp = screenToCanvas(e.clientX, e.clientY);
    const pos = nodePositions[id] ?? { x: 0, y: 0 };
    dragOffset.current = { x: cp.x - pos.x, y: cp.y - pos.y };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    // Panning (middle mouse or space+drag)
    if (panRef.current.active) {
      setPanX(panRef.current.initPanX + e.clientX - panRef.current.startX);
      setPanY(panRef.current.initPanY + e.clientY - panRef.current.startY);
      return;
    }
    const cp = screenToCanvas(e.clientX, e.clientY);
    if (connectingFrom) { setMousePos(cp); return; }
    if (draggingId) {
      setNodePositions(prev => ({
        ...prev,
        [draggingId]: {
          x: Math.max(0, cp.x - dragOffset.current.x),
          y: Math.max(0, cp.y - dragOffset.current.y),
        },
      }));
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle mouse or space+left to pan
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, initPanX: panX, initPanY: panY };
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingId(null);
    panRef.current.active = false;
  };

  const anchorR = (id: string) => { const p = nodePositions[id] ?? { x:0, y:0 }; return { x: p.x + NODE_W, y: p.y + NODE_H/2 }; };
  const anchorL = (id: string) => { const p = nodePositions[id] ?? { x:0, y:0 }; return { x: p.x, y: p.y + NODE_H/2 }; };

  return (
    <div className="ndp-root">
      <div className="ndp-main-col">

        {/* ── Topbar: breadcrumb + ribbon tabs + save pill ── */}
        <div className="ndp-topbar">
          <div className="ndp-breadcrumb">
            <Link to="/projects">Projects</Link>
            <span className="ndp-breadcrumb-sep">›</span>
            <Link to={`/projects/${projectId}`}>{project.name}</Link>
            {reqName && (
              <>
                <span className="ndp-breadcrumb-sep">›</span>
                <Link to={backUrl}>{reqName}</Link>
              </>
            )}
            <span className="ndp-breadcrumb-sep">›</span>
            <span className="ndp-breadcrumb-current">{localNode.label}</span>
          </div>

          <span className={`ndp-save-pill ndp-save-pill--${saveStatus}`}>
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⟳ Saving…' : '● Unsaved'}
          </span>
        </div>

        {/* ── Chassis ── */}
        <div className="ndp-chassis-wrap">
          <div className="ndp-chassis">

            {/* ── Chassis Header ── */}
            <div className="ndp-chassis-header">
              <div className="ndp-chassis-id">
                <div className="ndp-chassis-icon" style={{ background: spec?.color ?? 'var(--surface2)', color: spec?.textColor ?? 'var(--text-main)' }}>
                  {spec?.icon ?? <Server size={16} />}
                </div>
                <div>
                  <div className="ndp-chassis-name">{localNode.label}</div>
                  <div className="ndp-chassis-sub">{spec?.label ?? localNode.type} · {spec?.category ?? 'Node'}</div>
                </div>
                <DeployBadge
                  mode={mode}
                  provider={provider}
                  instanceType={localNode.config.instanceType}
                onClick={() => setSelectedId(null)}
                />
              </div>
              <div className="ndp-chassis-controls">
                <div className="ndp-meter ndp-meter--ram">
                  <div className="ndp-meter-head"><span>RAM</span><span>{usedRam.toFixed(1)}/{maxRam}G</span></div>
                  <div className="ndp-meter-bar">
                    <div className="ndp-meter-fill" style={{ width: `${Math.min(100, (usedRam/maxRam)*100)}%` }} />
                  </div>
                </div>
                <div className="ndp-meter ndp-meter--cpu">
                  <div className="ndp-meter-head"><span>CPU</span><span>{usedCpu.toFixed(1)}/{maxCpu}c</span></div>
                  <div className="ndp-meter-bar">
                    <div className="ndp-meter-fill" style={{ width: `${Math.min(100, (usedCpu/maxCpu)*100)}%` }} />
                  </div>
                </div>
                <div className="ndp-chassis-divider" />
                {/* Add service dropdown — click-toggled to avoid CSS hover glitch */}
                <div className="ndp-add-dropdown" style={{ position: 'relative' }}>
                  <button
                    className="btn-primary ndp-add-main"
                    style={{ height: 34, padding: '0 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setShowAddMenu(p => !p)}
                  >
                    <Plus size={13} /> Add Service
                  </button>
                  {showAddMenu && (
                    <div className="ndp-add-menu" style={{ display: 'flex', flexDirection: 'column' }}>
                      {(Object.entries(ITEM_KINDS) as [ItemKind, ItemKindConfig][]).map(([k, kc]) => (
                        <button key={k} className="ndp-add-menu-item" onClick={() => { addContainer(k); setShowAddMenu(false); }}>
                          <span>{kc.emoji}</span> {kc.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Chassis body: always visible ── */}
            <div className="ndp-chassis-body">
                  {/* Network Edge + Firewall – left panel */}
                  <div className="ndp-net-edge">
                    {/* Ports */}
                    <div className="ndp-panel-head">
                      <span className="ndp-panel-title"><Network size={12} /> Ports</span>
                      <button className="ndp-panel-add" onClick={addHostPort} title="Add port"><Plus size={13} /></button>
                    </div>
                    <div className="ndp-net-scroll" style={{ minHeight: hostPorts.length * PORT_ITEM_H + 16 }}>
                      {hostPorts.map((hp, i) => (
                        <PortEntry
                          key={hp.id} port={hp} index={i}
                          selected={selectedId === hp.id}
                          connecting={connectingFrom === hp.id}
                          action={portActions[hp.id] ?? 'allow'}
                          onClick={() => setSelectedId(hp.id)}
                          onJackClick={() => setConnectingFrom(connectingFrom === hp.id ? null : hp.id)}
                        />
                      ))}
                      {hostPorts.length === 0 && <div className="ndp-panel-empty">No ports exposed.</div>}
                    </div>
                    {/* Firewall */}
                    <div className="ndp-panel-head" style={{ borderTop: '1px solid var(--border)', marginTop: 0 }}>
                      <span className="ndp-panel-title"><Shield size={12} style={{ color: '#ef4444' }} /> Firewall
                        {firewallRules.length > 0 && <span className="ndp-ribbon-badge" style={{ marginLeft: 4 }}>{firewallRules.length}</span>}
                      </span>
                      <button className="ndp-panel-add" onClick={addFirewallRule} title="Add rule"><Plus size={13} /></button>
                    </div>
                    <div className="ndp-net-scroll">
                      {firewallRules.length === 0
                        ? <div className="ndp-panel-empty">No rules. Click + to add.</div>
                        : firewallRules.map(r => (
                          <div
                            key={r.id}
                            className={`fw-rule-row-compact${selectedId === r.id ? ' selected' : ''} ${r.action}`}
                            onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                          >
                            <span className={`fw-action-dot ${r.action}`} />
                            <span className={`fw-badge-sm fw-badge ${r.action}`}>{r.action.toUpperCase()}</span>
                            <span className="fw-port">{r.portRange}</span>
                            <span className="fw-proto">{r.protocol.toUpperCase()}</span>
                            <span className="fw-cidr">{r.cidr}</span>
                            <button className="fw-del-btn" style={{ marginLeft: 'auto' }}
                              onClick={e => { e.stopPropagation(); setFirewall(firewallRules.filter(x => x.id !== r.id)); if (selectedId === r.id) setSelectedId(null); }}>
                              <X size={11} />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Canvas — zoom/pan viewport */}
                  <div
                    className="ndp-canvas-wrap"
                    ref={canvasRef}
                    style={{ cursor: spaceDown ? (panRef.current.active ? 'grabbing' : 'grab') : undefined }}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseDown={handleCanvasMouseDown}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const kind = e.dataTransfer.getData('itemKind') as ItemKind;
                      const itemName = e.dataTransfer.getData('itemName');
                      if (kind && ITEM_KINDS[kind]) {
                        const cp = screenToCanvas(e.clientX, e.clientY);
                        const x = Math.max(0, cp.x - NODE_W / 2);
                        const y = Math.max(0, cp.y - NODE_H / 2);
                        const kc = ITEM_KINDS[kind];
                        const c: DockerContainer = {
                          id: nextContainerId(), name: itemName || kc.defaultName,
                          image: kind === 'lb' ? 'nginx' : kind === 'queue' ? 'rabbitmq' : kind === 'sidecar' ? 'envoyproxy/envoy' : 'app',
                          tag: 'latest', ports: [], env: [], volumes: [], resources: {}, restartPolicy: KIND_TO_RESTART[kind],
                        };
                        setContainers([...containers, c]);
                        setCanvasKinds(prev => ({ ...prev, [c.id]: kind }));
                        setNodePositions(prev => ({ ...prev, [c.id]: { x, y } }));
                        setSelectedId(c.id);
                      }
                    }}
                    onClick={e => {
                      const t = e.target as HTMLElement;
                      if (t.classList.contains('ndp-canvas-wrap') || t.classList.contains('ndp-canvas-viewport') || t.tagName === 'svg') {
                        setSelectedId(null); setConnectingFrom(null); setShowAddMenu(false);
                      }
                    }}
                  >
                    {/* ── Panning viewport – all canvas items live here ── */}
                    <div
                      className="ndp-canvas-viewport"
                      style={{ transform: `translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin: '0 0' }}
                    >
                      <svg className="ndp-canvas-svg" style={{ position: 'absolute', top: 0, left: 0, width: 6000, height: 4000, overflow: 'visible', pointerEvents: 'none' }}>
                        {connectingFrom && containers.find(c => c.id === connectingFrom) && (() => {
                          const src = anchorR(connectingFrom);
                          return <path d={bezier(src.x, src.y, mousePos.x, mousePos.y)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" />;
                        })()}
                        {connections.map(conn => {
                          if (!containers.find(c => c.id === conn.source) || !containers.find(c => c.id === conn.target)) return null;
                          const s = anchorR(conn.source), t = anchorL(conn.target);
                          return (
                            <g key={conn.id} style={{ pointerEvents: 'all', cursor: 'pointer' }}
                              onClick={() => setConnections(prev => prev.filter(c => c.id !== conn.id))}>
                              <path d={bezier(s.x, s.y, t.x, t.y)} fill="none" stroke="transparent" strokeWidth="20" />
                              <path d={bezier(s.x, s.y, t.x, t.y)} fill="none" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />
                              <path d={bezier(s.x, s.y, t.x, t.y)} fill="none" stroke="var(--accent)" strokeWidth="2" className="ndp-data-flow" strokeLinecap="round" />
                            </g>
                          );
                        })}
                      </svg>
                      {containers.map(c => (
                        <CanvasItemCard
                          key={c.id}
                          container={c}
                          kind={canvasKinds[c.id] ?? (c.restartPolicy === 'unless-stopped' ? 'k8s_pod' : c.restartPolicy === 'on-failure' ? 'k8s_cronjob' : 'docker')}
                          pos={nodePositions[c.id] ?? { x: 24, y: 24 }}
                          selected={selectedId === c.id}
                          connecting={connectingFrom === c.id}
                          dragging={draggingId === c.id}
                          onMouseDown={e => handleNodeMouseDown(e, c.id)}
                          onConnectStart={() => {
                            if (connectingFrom === c.id) { setConnectingFrom(null); return; }
                            setConnectingFrom(c.id);
                            const pos = nodePositions[c.id] ?? { x: 0, y: 0 };
                            setMousePos({ x: pos.x + NODE_W, y: pos.y + NODE_H / 2 });
                          }}
                          onConnectEnd={() => {
                            if (connectingFrom && connectingFrom !== c.id) {
                              setConnections(prev => [...prev, { id: genId('conn'), source: connectingFrom, target: c.id }]);
                              setConnectingFrom(null);
                            }
                          }}
                        />
                      ))}
                      {containers.length === 0 && (
                        <div className="ndp-canvas-empty" style={{ pointerEvents: 'none', transform: `scale(${1/zoom})`, transformOrigin: '50% 40%' }}>
                          <div className="ndp-canvas-empty-icon">📦</div>
                          <div>Drag a service from the top menu, or click "Add Service"</div>
                        </div>
                      )}
                    </div>{/* /ndp-canvas-viewport */}

                    {/* ── Zoom HUD ── */}
                    <div className="ndp-zoom-hud">
                      <button className="ndp-zoom-btn" onClick={() => { const nz = Math.min(3, zoom * 1.2); const cx = canvasRef.current!.clientWidth/2, cy = canvasRef.current!.clientHeight/2; setPanX(cx - (cx-panX)*(nz/zoom)); setPanY(cy - (cy-panY)*(nz/zoom)); setZoom(nz); }} title="Zoom in"><ZoomIn size={13}/></button>
                      <span className="ndp-zoom-pct">{Math.round(zoom*100)}%</span>
                      <button className="ndp-zoom-btn" onClick={() => { const nz = Math.max(minZoom, zoom / 1.2); const cx = canvasRef.current!.clientWidth/2, cy = canvasRef.current!.clientHeight/2; setPanX(cx - (cx-panX)*(nz/zoom)); setPanY(cy - (cy-panY)*(nz/zoom)); setZoom(nz); }} title="Zoom out (max zoom-out scales with RAM)"><ZoomOut size={13}/></button>
                      <button className="ndp-zoom-btn ndp-zoom-reset" onClick={() => { setZoom(1); setPanX(24); setPanY(24); }} title="Reset view"><Maximize2 size={12}/></button>
                    </div>
                  </div>
            </div>{/* /ndp-chassis-body */}

              {/* Storage strip */}
              <div className="ndp-storage">
                  <div className="ndp-panel-head">
                    <span className="ndp-panel-title"><HardDrive size={12} style={{ color: '#7c3aed' }} /> Storage</span>
                    <button className="ndp-panel-add" onClick={addVolume}><Plus size={13} /></button>
                  </div>
                  <div className="ndp-storage-body">
                    {volumes.map(vol => (
                      <div key={vol.id}
                        className={`ndp-vol-card${selectedId === vol.id ? ' selected' : ''}`}
                        onClick={() => setSelectedId(vol.id)}>
                        <div className="ndp-vol-top">
                          <span className="ndp-vol-name">{vol.name}</span>
                          <span className="ndp-vol-type">{vol.type}</span>
                        </div>
                        <div className="ndp-vol-mount">{vol.containerPath}</div>
                        <div className="ndp-vol-size">
                          <span className="ndp-vol-gb">{vol.sizeGb ?? '—'}</span>
                          <span className="ndp-vol-unit"> GB</span>
                        </div>
                      </div>
                    ))}
                    {volumes.length === 0 && <div className="ndp-storage-empty">No volumes attached.</div>}
                  </div>
              </div>{/* /ndp-storage */}

          </div>{/* /ndp-chassis */}
        </div>
      </div>{/* /ndp-main-col */}

      {/* ── Inspector ── */}
      <Inspector
        selectedId={selectedId}
        containers={containers}
        hostPorts={hostPorts}
        volumes={volumes}
        firewallRules={firewallRules}
        portActions={portActions}
        canvasKinds={canvasKinds}
        node={localNode}
        maxRam={maxRam} maxCpu={maxCpu}
        onUpdateNode={handleChange}
        onUpdateContainer={c => setContainers(containers.map(x => x.id === c.id ? c : x))}
        onUpdatePort={hp => setHostPorts(hostPorts.map(x => x.id === hp.id ? hp : x))}
        onUpdateVolume={(v: VolumeMount) => setVolumes(volumes.map((x: VolumeMount) => x.id === v.id ? v : x))}
        onUpdateFirewall={r => setFirewall(firewallRules.map(x => x.id === r.id ? r : x))}
        onPortAction={(id, action) => setPortActions(prev => ({ ...prev, [id]: action }))}
        onKindChange={(id, kind) => setCanvasKinds(prev => ({ ...prev, [id]: kind }))}
        onDelete={deleteSelected}
        onMaxRamChange={setMaxRam}
        onMaxCpuChange={setMaxCpu}
      />
    </div>
  );
}
