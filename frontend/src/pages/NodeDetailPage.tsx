/* ═══════════════════════════════════════════════════════════════
   NodeDetailPage.tsx – Spatial "Inside a Server" Editor
   ═══════════════════════════════════════════════════════════════ */
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Server, HardDrive, Shield, Plus, Trash2, Settings,
  Activity, Cpu, X,
} from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import catalog from '../data/componentCatalog';
import {
  CyNode, DockerContainer, HostPort, Phase, VolumeMount,
} from '../types';
import {
  findLeafById, nextContainerId, nextHostPortId, nextVolumeId,
} from '../utils/canvasUtils';

/* ── Exported constants (used by Editor.tsx) ──────────────────── */
export const COMPUTE_TYPES = new Set([
  'web_server', 'app_server', 'microservice', 'container',
  'kubernetes', 'monolithic_api', 'graphql', 'serverless',
]);
const DATA_TYPES = new Set([
  'postgres', 'sql', 'dynamodb', 'non_relational', 'redis', 'memcached',
  'elasticsearch', 'cassandra', 'influxdb', 'neo4j',
]);
export const CONFIGURABLE_TYPES = new Set([...COMPUTE_TYPES, ...DATA_TYPES]);

/* ── Canvas layout constants ─────────────────────────────────── */
const NODE_W = 220;
const NODE_H = 108;
const PORT_ITEM_H = 68;

/* ── Runtime options ─────────────────────────────────────────── */
type RuntimeKey = 'docker' | 'kubernetes' | 'systemd' | 'binary';

const RUNTIME_LABELS: Record<RuntimeKey, { label: string; emoji: string }> = {
  docker:     { label: 'Docker Container',  emoji: '🐳' },
  kubernetes: { label: 'Kubernetes Pod',    emoji: '⬡' },
  systemd:    { label: 'Systemd Service',   emoji: '⚙' },
  binary:     { label: 'Standalone Binary', emoji: '▶' },
};

const RESTART_TO_RUNTIME: Record<string, RuntimeKey> = {
  'always':          'docker',
  'unless-stopped':  'kubernetes',
  'on-failure':      'systemd',
  'no':              'binary',
};

const RUNTIME_TO_RESTART: Record<RuntimeKey, DockerContainer['restartPolicy']> = {
  docker:     'always',
  kubernetes: 'unless-stopped',
  systemd:    'on-failure',
  binary:     'no',
};

const genId = (p: string) => `${p}-${Math.random().toString(36).substr(2, 6)}`;

interface ServiceConn { id: string; source: string; target: string; }
interface NodePos { x: number; y: number; }

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = x1 + Math.abs(x2 - x1) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

/* ════════════════════════════════════════════════════════════════
   ServiceNode
   ════════════════════════════════════════════════════════════════ */
interface ServiceNodeProps {
  container: DockerContainer;
  pos: NodePos;
  selected: boolean;
  connecting: boolean;
  dragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectStart: () => void;
  onConnectEnd: () => void;
}

function ServiceNode({ container, pos, selected, connecting, dragging, onMouseDown, onConnectStart, onConnectEnd }: ServiceNodeProps) {
  const runtime = RESTART_TO_RUNTIME[container.restartPolicy] ?? 'docker';
  const { emoji } = RUNTIME_LABELS[runtime];
  const ramGb = container.resources?.memoryMb ? (container.resources.memoryMb / 1024).toFixed(1) : '—';
  const cpuC  = container.resources?.cpuMillicores ? (container.resources.cpuMillicores / 1000).toFixed(1) : '—';

  return (
    <div
      className={`ndp-service-node${selected ? ' selected' : ''}`}
      style={{
        width: NODE_W,
        height: NODE_H,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        cursor: dragging ? 'grabbing' : connecting ? 'crosshair' : 'grab',
      }}
      onMouseDown={onMouseDown}
    >
      <div className="ndp-service-header">
        <div className={`ndp-runtime-icon ${runtime}`}>{emoji}</div>
        <span className="ndp-service-name">{container.name || 'Unnamed Service'}</span>
      </div>
      <div className="ndp-service-body">
        <div className="ndp-service-image">
          {container.image}{container.tag ? `:${container.tag}` : ''}
        </div>
        <div className="ndp-service-stats">
          <span className="ndp-stat-chip"><Activity size={9}/> {ramGb}G</span>
          <span className="ndp-stat-chip"><Cpu size={9}/> {cpuC}c</span>
        </div>
      </div>
      <div className="ndp-handle-in" onMouseUp={onConnectEnd} />
      <button
        className={`ndp-handle-out${connecting ? ' active' : ''}`}
        onMouseDown={e => { e.stopPropagation(); onConnectStart(); }}
      >
        {connecting ? '×' : '+'}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PortEntry
   ════════════════════════════════════════════════════════════════ */
interface PortEntryProps {
  port: HostPort; index: number; selected: boolean; connecting: boolean;
  action: 'allow' | 'deny';
  onClick: () => void;
  onJackClick: () => void;
}

function PortEntry({ port, index, selected, connecting, action, onClick, onJackClick }: PortEntryProps) {
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
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
   Inspector
   ════════════════════════════════════════════════════════════════ */
interface InspectorProps {
  selectedId: string | null;
  containers: DockerContainer[];
  hostPorts: HostPort[];
  volumes: VolumeMount[];
  portActions: Record<string, 'allow' | 'deny'>;
  serverName: string; maxRam: number; maxCpu: number;
  runtimeMap: Record<string, RuntimeKey>;
  onUpdateContainer: (c: DockerContainer) => void;
  onUpdatePort: (p: HostPort) => void;
  onUpdateVolume: (v: VolumeMount) => void;
  onPortAction: (id: string, action: 'allow' | 'deny') => void;
  onRuntimeChange: (id: string, runtime: RuntimeKey) => void;
  onServerNameChange: (v: string) => void;
  onMaxRamChange: (v: number) => void;
  onMaxCpuChange: (v: number) => void;
  onDelete: () => void;
}

function Inspector(props: InspectorProps) {
  const {
    selectedId, containers, hostPorts, volumes, portActions,
    serverName, maxRam, maxCpu, runtimeMap,
    onUpdateContainer, onUpdatePort, onUpdateVolume,
    onPortAction, onRuntimeChange,
    onServerNameChange, onMaxRamChange, onMaxCpuChange, onDelete,
  } = props;

  const container = selectedId ? containers.find(c => c.id === selectedId) : null;
  const port      = selectedId ? hostPorts.find(p => p.id === selectedId)  : null;
  const volume    = selectedId ? volumes.find(v => v.id === selectedId)    : null;
  const action    = selectedId ? (portActions[selectedId] ?? 'allow') : 'allow';
  const runtime   = container
    ? (runtimeMap[container.id] ?? RESTART_TO_RUNTIME[container.restartPolicy] ?? 'docker') as RuntimeKey
    : 'docker';

  const title = container ? 'Service Config' : port ? 'Firewall Rule' : volume ? 'Volume' : 'Host Server';

  return (
    <div className="ndp-inspector">
      <div className="ndp-inspector-head">
        <div className="ndp-inspector-title">
          <Settings size={15} color="var(--text-dim)" />
          {title}
        </div>
        {selectedId && (
          <button className="ndp-inspector-del" onClick={onDelete} title="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="ndp-inspector-body">
        {/* ── No selection: server specs ── */}
        {!selectedId && (
          <>
            <div className="ndp-info-box">Select a service, port, or volume to configure it.</div>
            <hr className="ndp-section-divider" />
            <p className="ndp-section-label">Host Specifications</p>
            <div className="ndp-field">
              <label className="ndp-label">Host Alias</label>
              <input className="ndp-input" value={serverName} onChange={e => onServerNameChange(e.target.value)} />
            </div>
            <div className="ndp-grid2">
              <div className="ndp-field">
                <label className="ndp-label">Max RAM (GB)</label>
                <input className="ndp-input" type="number" value={maxRam} onChange={e => onMaxRamChange(Number(e.target.value))} />
              </div>
              <div className="ndp-field">
                <label className="ndp-label">CPU Cores</label>
                <input className="ndp-input" type="number" value={maxCpu} onChange={e => onMaxCpuChange(Number(e.target.value))} />
              </div>
            </div>
          </>
        )}

        {/* ── Container config ── */}
        {container && (
          <>
            <div className="ndp-field">
              <label className="ndp-label">Service Name</label>
              <input className="ndp-input" value={container.name}
                onChange={e => onUpdateContainer({ ...container, name: e.target.value })} />
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Runtime</label>
              <select className="ndp-select" value={runtime}
                onChange={e => {
                  const rt = e.target.value as RuntimeKey;
                  onRuntimeChange(container.id, rt);
                  onUpdateContainer({ ...container, restartPolicy: RUNTIME_TO_RESTART[rt] });
                }}>
                {(Object.entries(RUNTIME_LABELS) as [RuntimeKey, { label: string }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="ndp-field">
              <label className="ndp-label">Image</label>
              <input className="ndp-input mono" value={`${container.image}${container.tag ? `:${container.tag}` : ''}`}
                onChange={e => {
                  const [img, ...tagParts] = e.target.value.split(':');
                  onUpdateContainer({ ...container, image: img, tag: tagParts.join(':') || 'latest' });
                }} />
            </div>
            <hr className="ndp-section-divider" />
            <div className="ndp-grid2">
              <div className="ndp-field">
                <label className="ndp-label">RAM (GB)</label>
                <input className="ndp-input" type="number" step="0.5"
                  value={container.resources?.memoryMb ? container.resources.memoryMb / 1024 : ''}
                  placeholder="GB"
                  onChange={e => onUpdateContainer({
                    ...container,
                    resources: { ...container.resources, memoryMb: Number(e.target.value) * 1024 },
                  })} />
              </div>
              <div className="ndp-field">
                <label className="ndp-label">vCPU</label>
                <input className="ndp-input" type="number" step="0.5"
                  value={container.resources?.cpuMillicores ? container.resources.cpuMillicores / 1000 : ''}
                  placeholder="cores"
                  onChange={e => onUpdateContainer({
                    ...container,
                    resources: { ...container.resources, cpuMillicores: Number(e.target.value) * 1000 },
                  })} />
              </div>
            </div>
            <hr className="ndp-section-divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="ndp-label" style={{ marginBottom: 0 }}>Environment Variables</label>
              <button className="ndp-env-add-btn"
                onClick={() => onUpdateContainer({ ...container, env: [...container.env, { key: '', value: '' }] })}>
                <Plus size={12} /> Add
              </button>
            </div>
            {container.env.length === 0
              ? <div className="ndp-env-empty">No env vars set.</div>
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
                        onClick={() => onUpdateContainer({ ...container, env: container.env.filter((_, idx) => idx !== i) })}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
            }
          </>
        )}

        {/* ── Port/Firewall config ── */}
        {port && (
          <>
            <div className="ndp-toggle-row">
              <button
                className={`ndp-toggle-btn allow${action === 'allow' ? ' active' : ''}`}
                onClick={() => onPortAction(port.id, 'allow')}>ALLOW</button>
              <button
                className={`ndp-toggle-btn deny${action === 'deny' ? ' active' : ''}`}
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
          </>
        )}

        {/* ── Volume config ── */}
        {volume && (
          <>
            <div className="ndp-field">
              <label className="ndp-label">Volume Name</label>
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
                  placeholder="GB"
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
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main export
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
  const [localNode, setLocalNode] = useState<CyNode | null>(null);
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

  /* ── Spatial / UI state (not persisted) ─────────────────── */
  const [nodePositions,  setNodePositions]  = useState<Record<string, NodePos>>({});
  const [runtimeMap,     setRuntimeMap]     = useState<Record<string, RuntimeKey>>({});
  const [portActions,    setPortActions]    = useState<Record<string, 'allow' | 'deny'>>({});
  const [connections,    setConnections]    = useState<ServiceConn[]>([]);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [draggingId,     setDraggingId]     = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos,       setMousePos]       = useState({ x: 0, y: 0 });
  const [maxRam,         setMaxRam]         = useState(128);
  const [maxCpu,         setMaxCpu]         = useState(64);
  const [localVolumes,   setLocalVolumes]   = useState<VolumeMount[]>([]);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef  = useRef<HTMLDivElement>(null);

  /* Seed maxRam/maxCpu from node config once on load */
  useEffect(() => {
    if (localNode) {
      if (localNode.config.ramGb)    setMaxRam(localNode.config.ramGb);
      if (localNode.config.cpuCores) setMaxCpu(localNode.config.cpuCores);
    }
  }, [nodeId]); // eslint-disable-line

  /* Seed positions for new containers */
  useEffect(() => {
    if (!localNode?.config.containers) return;
    setNodePositions(prev => {
      const next = { ...prev };
      localNode.config.containers!.forEach((c, i) => {
        if (!next[c.id]) {
          next[c.id] = { x: 20 + (i % 3) * 260, y: 20 + Math.floor(i / 3) * 140 };
        }
      });
      return next;
    });
  }, [localNode?.config.containers?.length]); // eslint-disable-line

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

  const containers = localNode.config.containers ?? [];
  const hostPorts  = localNode.config.hostPorts   ?? [];
  const volumes    = localVolumes;
  const spec       = catalog[localNode.type];
  const reqName    = requestId ? findLeafById(project.requests, requestId)?.name : null;
  const backUrl    = requestId ? `/projects/${projectId}/requests/${requestId}` : `/projects/${projectId}`;

  const usedRam = containers.reduce((s, c) => s + (c.resources?.memoryMb ?? 0) / 1024, 0);
  const usedCpu = containers.reduce((s, c) => s + (c.resources?.cpuMillicores ?? 0) / 1000, 0);

  /* ── Canvas event handlers ─────────────────────────────── */
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== id) {
        setConnections(prev => [...prev, { id: genId('conn'), source: connectingFrom, target: id }]);
      }
      setConnectingFrom(null);
      return;
    }
    setSelectedId(id);
    setDraggingId(id);
    const rect = canvasRef.current!.getBoundingClientRect();
    const pos  = nodePositions[id] ?? { x: 0, y: 0 };
    dragOffset.current = { x: e.clientX - rect.left - pos.x, y: e.clientY - rect.top - pos.y };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (connectingFrom) { setMousePos({ x: mx, y: my }); return; }
    if (draggingId) {
      setNodePositions(prev => ({
        ...prev,
        [draggingId]: {
          x: Math.max(0, Math.min(mx - dragOffset.current.x, rect.width  - NODE_W)),
          y: Math.max(0, Math.min(my - dragOffset.current.y, rect.height - NODE_H)),
        },
      }));
    }
  };

  const handleCanvasMouseUp  = () => setDraggingId(null);
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) { setSelectedId(null); setConnectingFrom(null); }
  };

  /* ── Persist helpers ──────────────────────────────────── */
  const setContainers = (next: DockerContainer[]) =>
    handleChange({ ...localNode, config: { ...localNode.config, containers: next } });
  const setHostPorts = (next: HostPort[]) =>
    handleChange({ ...localNode, config: { ...localNode.config, hostPorts: next } });
  // volumes are local-only (not in NodeConfig); use setLocalVolumes directly
  const setVolumes = (next: VolumeMount[]) => setLocalVolumes(next);

  const addContainer = () => {
    const c: DockerContainer = {
      id: nextContainerId(), name: 'New Service',
      image: 'image', tag: 'latest',
      ports: [], env: [], volumes: [], resources: {}, restartPolicy: 'always',
    };
    setContainers([...containers, c]);
    setNodePositions(prev => ({
      ...prev,
      [c.id]: { x: 20 + (containers.length % 3) * 260, y: 20 + Math.floor(containers.length / 3) * 140 },
    }));
    setSelectedId(c.id);
  };

  const addHostPort = () => {
    const p: HostPort = { id: nextHostPortId(), port: 8080, protocol: 'tcp', service: 'New' };
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

  const deleteSelected = () => {
    if (!selectedId) return;
    if (containers.some(c => c.id === selectedId)) {
      setContainers(containers.filter(c => c.id !== selectedId));
      setConnections(prev => prev.filter(cn => cn.source !== selectedId && cn.target !== selectedId));
    } else if (selectedId.startsWith('hp-')) {
      setHostPorts(hostPorts.filter(p => p.id !== selectedId));
    } else if (selectedId.startsWith('vol-')) {
      setVolumes(volumes.filter((v: VolumeMount) => v.id !== selectedId));
    }
    setSelectedId(null);
  };

  /* ── SVG anchors ──────────────────────────────────────── */
  const anchorR = (id: string) => {
    const p = nodePositions[id] ?? { x: 0, y: 0 };
    return { x: p.x + NODE_W, y: p.y + NODE_H / 2 };
  };
  const anchorL = (id: string) => {
    const p = nodePositions[id] ?? { x: 0, y: 0 };
    return { x: p.x, y: p.y + NODE_H / 2 };
  };

  return (
    <div className="ndp-root">
      {/* ─────────────── Main Col ─────────────────────────── */}
      <div className="ndp-main-col">

        {/* Topbar */}
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

        {/* Chassis */}
        <div className="ndp-chassis-wrap">
          <div className="ndp-chassis">

            {/* Header */}
            <div className="ndp-chassis-header">
              <div className="ndp-chassis-id">
                <div className="ndp-chassis-icon"><Server size={20} /></div>
                <div>
                  <div className="ndp-chassis-name">{localNode.label}</div>
                  <div className="ndp-chassis-sub">
                    {spec?.label ?? localNode.type} · {spec?.category ?? 'Node'}
                  </div>
                </div>
              </div>
              <div className="ndp-chassis-controls">
                <div className="ndp-meter ndp-meter--ram">
                  <div className="ndp-meter-head">
                    <span>RAM</span>
                    <span>{usedRam.toFixed(1)} / {maxRam}G</span>
                  </div>
                  <div className="ndp-meter-bar">
                    <div className="ndp-meter-fill" style={{ width: `${Math.min(100, (usedRam / maxRam) * 100)}%` }} />
                  </div>
                </div>
                <div className="ndp-meter ndp-meter--cpu">
                  <div className="ndp-meter-head">
                    <span>CPU</span>
                    <span>{usedCpu.toFixed(1)} / {maxCpu}c</span>
                  </div>
                  <div className="ndp-meter-bar">
                    <div className="ndp-meter-fill" style={{ width: `${Math.min(100, (usedCpu / maxCpu) * 100)}%` }} />
                  </div>
                </div>
                <div className="ndp-chassis-divider" />
                <button
                  className="btn-primary"
                  style={{ height: 34, padding: '0 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={addContainer}
                >
                  <Plus size={14} /> Add Service
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="ndp-chassis-body">

              {/* Network Edge */}
              <div className="ndp-net-edge">
                <div className="ndp-panel-head">
                  <span className="ndp-panel-title">
                    <Shield size={13} /> Network Edge
                  </span>
                  <button className="ndp-panel-add" onClick={addHostPort} title="Add port">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="ndp-net-scroll" style={{ minHeight: hostPorts.length * PORT_ITEM_H + 16 }}>
                  {hostPorts.map((p, i) => (
                    <PortEntry
                      key={p.id}
                      port={p}
                      index={i}
                      selected={selectedId === p.id}
                      connecting={connectingFrom === p.id}
                      action={portActions[p.id] ?? 'allow'}
                      onClick={() => setSelectedId(p.id)}
                      onJackClick={() => setConnectingFrom(connectingFrom === p.id ? null : p.id)}
                    />
                  ))}
                  {hostPorts.length === 0 && (
                    <div className="ndp-panel-empty">No ports exposed.</div>
                  )}
                </div>
              </div>

              {/* Canvas */}
              <div
                className="ndp-canvas-wrap"
                ref={canvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onClick={handleCanvasClick}
              >
                {/* SVG layer */}
                <svg className="ndp-canvas-svg">
                  {/* Live drag line */}
                  {connectingFrom && containers.find(c => c.id === connectingFrom) && (() => {
                    const src = anchorR(connectingFrom);
                    return (
                      <path
                        d={bezier(src.x, src.y, mousePos.x, mousePos.y)}
                        fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4"
                      />
                    );
                  })()}

                  {/* Connections */}
                  {connections.map(conn => {
                    const src = containers.find(c => c.id === conn.source);
                    const tgt = containers.find(c => c.id === conn.target);
                    if (!src || !tgt) return null;
                    const s = anchorR(conn.source);
                    const t = anchorL(conn.target);
                    return (
                      <g key={conn.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setConnections(prev => prev.filter(c => c.id !== conn.id))}
                      >
                        <path d={bezier(s.x, s.y, t.x, t.y)} fill="none" stroke="transparent" strokeWidth="20" />
                        <path d={bezier(s.x, s.y, t.x, t.y)} fill="none" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />
                        <path d={bezier(s.x, s.y, t.x, t.y)} fill="none" stroke="var(--accent)"
                          strokeWidth="2" className="ndp-data-flow" strokeLinecap="round" />
                      </g>
                    );
                  })}
                </svg>

                {/* Service nodes */}
                {containers.map(c => (
                  <ServiceNode
                    key={c.id}
                    container={c}
                    pos={nodePositions[c.id] ?? { x: 20, y: 20 }}
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
                  <div className="ndp-canvas-empty">
                    <div className="ndp-canvas-empty-icon">📦</div>
                    <div>Add a service to get started</div>
                  </div>
                )}
              </div>
            </div>

            {/* Storage strip */}
            <div className="ndp-storage">
              <div className="ndp-panel-head">
                <span className="ndp-panel-title">
                  <HardDrive size={13} style={{ color: '#7c3aed' }} /> Storage Subsystem
                </span>
                <button className="ndp-panel-add" onClick={addVolume} title="Add volume">
                  <Plus size={14} />
                </button>
              </div>
              <div className="ndp-storage-body">
                {volumes.map(vol => (
                  <div
                    key={vol.id}
                    className={`ndp-vol-card${selectedId === vol.id ? ' selected' : ''}`}
                    onClick={() => setSelectedId(vol.id)}
                  >
                    <div className="ndp-vol-top">
                      <span className="ndp-vol-name">{vol.name}</span>
                      <span className="ndp-vol-type">{vol.type}</span>
                    </div>
                    <div className="ndp-vol-mount">{vol.containerPath}</div>
                    <div className="ndp-vol-size">
                      <span className="ndp-vol-gb">{vol.sizeGb ?? '—'}</span>
                      <span className="ndp-vol-unit">&nbsp;GB</span>
                    </div>
                  </div>
                ))}
                {volumes.length === 0 && (
                  <div className="ndp-storage-empty">No volumes attached.</div>
                )}
              </div>
            </div>

          </div>{/* /ndp-chassis */}
        </div>
      </div>{/* /ndp-main-col */}

      {/* ─────────────── Inspector ────────────────────────── */}
      <Inspector
        selectedId={selectedId}
        containers={containers}
        hostPorts={hostPorts}
        volumes={volumes}
        portActions={portActions}
        serverName={localNode.label}
        maxRam={maxRam}
        maxCpu={maxCpu}
        runtimeMap={runtimeMap}
        onUpdateContainer={c => setContainers(containers.map(x => x.id === c.id ? c : x))}
        onUpdatePort={p => setHostPorts(hostPorts.map(x => x.id === p.id ? p : x))}
        onUpdateVolume={(v: VolumeMount) => setVolumes(volumes.map((x: VolumeMount) => x.id === v.id ? v : x))}
        onPortAction={(id, action) => setPortActions(prev => ({ ...prev, [id]: action }))}
        onRuntimeChange={(id, rt) => setRuntimeMap(prev => ({ ...prev, [id]: rt }))}
        onServerNameChange={name => handleChange({ ...localNode, label: name })}
        onMaxRamChange={v => {
          setMaxRam(v);
          handleChange({ ...localNode, config: { ...localNode.config, ramGb: v } });
        }}
        onMaxCpuChange={v => {
          setMaxCpu(v);
          handleChange({ ...localNode, config: { ...localNode.config, cpuCores: v } });
        }}
        onDelete={deleteSelected}
      />
    </div>
  );
}
