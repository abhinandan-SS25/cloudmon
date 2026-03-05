/* ═══════════════════════════════════════════════════════════════
   NodeDetailPage.tsx – Per-node deep-configuration editor
   Route: /projects/:projectId/nodes/:nodeId         (base canvas)
          /projects/:projectId/requests/:requestId/nodes/:nodeId

   Behaves like a Figma "page": each node on the canvas can be
   "drilled into" to configure its internal components, firewall
   rules, environment, storage, and more.

   Supported tabs depend on component category:
   • Compute (servers, containers, k8s): All tabs
   • Data (DBs, caches):                Overview | Ports | Env | Firewall
   • Network / Other:                   Overview | Ports | Firewall
   ═══════════════════════════════════════════════════════════════ */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import catalog from '../data/componentCatalog';
import {
  CyNode,
  DockerContainer,
  EnvVar,
  FirewallRule,
  HealthCheck,
  HostPort,
  Phase,
  PortBinding,
  ResourceLimits,
  VolumeMount,
} from '../types';
import {
  findLeafById,
  nextContainerId,
  nextFirewallId,
  nextHostPortId,
  nextVolumeId,
} from '../utils/canvasUtils';

/* ── Which component categories get fully expanded tabs ────────── */
const COMPUTE_TYPES = new Set([
  'web_server', 'app_server', 'microservice', 'container', 'kubernetes',
  'monolithic_api', 'graphql', 'serverless',
]);
const DATA_TYPES = new Set([
  'postgres', 'sql', 'dynamodb', 'non_relational', 'redis', 'memcached',
  'elasticsearch', 'cassandra', 'influxdb', 'neo4j',
]);

function tabsFor(type: string): Tab[] {
  if (COMPUTE_TYPES.has(type))
    return ['overview', 'containers', 'ports', 'env', 'firewall'];
  if (DATA_TYPES.has(type))
    return ['overview', 'ports', 'env', 'firewall'];
  return ['overview', 'ports', 'firewall'];
}

type Tab = 'overview' | 'containers' | 'ports' | 'env' | 'firewall';

const TAB_LABELS: Record<Tab, string> = {
  overview:   'Overview',
  containers: 'Containers',
  ports:      'Ports',
  env:        'Env Vars',
  firewall:   'Firewall',
};

const TAB_ICONS: Record<Tab, string> = {
  overview:   '⚙',
  containers: '📦',
  ports:      '🔌',
  env:        '📋',
  firewall:   '🛡',
};

/* ════════════════════════════════════════════════════════════════
   Overview Tab
   ════════════════════════════════════════════════════════════════ */
const OS_OPTIONS = [
  'ubuntu-22.04', 'ubuntu-20.04', 'debian-12', 'alpine-3.18',
  'centos-9', 'rhel-9', 'windows-server-2022', 'amazon-linux-2023',
  'custom',
];

function OverviewTab({
  node,
  onChange,
}: {
  node: CyNode;
  onChange: (updated: CyNode) => void;
}) {
  const spec = catalog[node.type];
  const cfg = node.config;

  function patch(partial: Partial<typeof cfg>) {
    onChange({ ...node, config: { ...cfg, ...partial } });
  }

  return (
    <div className="nd-tab-content">
      {/* ── Identity ─────────────────────────────────────────────── */}
      <section className="nd-section">
        <h3 className="nd-section-title">Identity</h3>
        <div className="nd-field-grid">
          <label className="nd-label">
            Display Label
            <input
              className="nd-input"
              value={node.label}
              onChange={(e) => onChange({ ...node, label: e.target.value })}
            />
          </label>
          <label className="nd-label">
            Component Type
            <div className="nd-readonly">
              <span
                className="nd-type-badge"
                style={{ background: spec?.color ?? '#e2e8f0', color: spec?.textColor ?? '#334155' }}
              >
                {spec?.icon ?? '?'}
              </span>
              {spec?.label ?? node.type}
            </div>
          </label>
          <label className="nd-label">
            IP Address
            <input
              className="nd-input"
              placeholder="e.g. 10.0.1.5"
              value={cfg.ip ?? ''}
              onChange={(e) => patch({ ip: e.target.value })}
            />
          </label>
        </div>
      </section>

      {/* ── Scale ────────────────────────────────────────────────── */}
      <section className="nd-section">
        <h3 className="nd-section-title">Scale</h3>
        <div className="nd-field-grid">
          <label className="nd-label">
            Instances
            <input
              type="number"
              className="nd-input nd-input--sm"
              min={1}
              max={9999}
              value={cfg.instances}
              onChange={(e) => patch({ instances: Math.max(1, parseInt(e.target.value) || 1) })}
            />
          </label>
          <label className="nd-label">
            Custom Latency (ms)
            <input
              type="number"
              className="nd-input nd-input--sm"
              min={0}
              placeholder={`${spec?.latencyMs.avg ?? 0} (catalog)`}
              value={cfg.customLatencyMs ?? ''}
              onChange={(e) =>
                patch({ customLatencyMs: e.target.value ? parseFloat(e.target.value) : undefined })
              }
            />
          </label>
          <label className="nd-label">
            Custom Throughput (rps)
            <input
              type="number"
              className="nd-input nd-input--sm"
              min={0}
              placeholder={`${spec?.throughputRps ?? 0} (catalog)`}
              value={cfg.customThroughputRps ?? ''}
              onChange={(e) =>
                patch({
                  customThroughputRps: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
          </label>
          <label className="nd-label">
            Custom Cost ($/hr)
            <input
              type="number"
              className="nd-input nd-input--sm"
              min={0}
              step={0.01}
              placeholder={`${spec?.costPerHour ?? 0} (catalog)`}
              value={cfg.customCostPerHour ?? ''}
              onChange={(e) =>
                patch({
                  customCostPerHour: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
          </label>
        </div>
      </section>

      {/* ── Hardware spec (only for compute nodes) ───────────────── */}
      {(COMPUTE_TYPES.has(node.type) || DATA_TYPES.has(node.type)) && (
        <section className="nd-section">
          <h3 className="nd-section-title">Hardware / VM Spec</h3>
          <div className="nd-field-grid">
            <label className="nd-label">
              OS / Runtime
              <select
                className="nd-select"
                value={cfg.osType ?? ''}
                onChange={(e) => patch({ osType: e.target.value || undefined })}
              >
                <option value="">— select —</option>
                {OS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="nd-label">
              vCPU Cores
              <input
                type="number"
                className="nd-input nd-input--sm"
                min={0.25}
                step={0.25}
                placeholder="e.g. 2"
                value={cfg.cpuCores ?? ''}
                onChange={(e) =>
                  patch({ cpuCores: e.target.value ? parseFloat(e.target.value) : undefined })
                }
              />
            </label>
            <label className="nd-label">
              RAM (GB)
              <input
                type="number"
                className="nd-input nd-input--sm"
                min={0}
                step={0.5}
                placeholder="e.g. 8"
                value={cfg.ramGb ?? ''}
                onChange={(e) =>
                  patch({ ramGb: e.target.value ? parseFloat(e.target.value) : undefined })
                }
              />
            </label>
            <label className="nd-label">
              Disk (GB)
              <input
                type="number"
                className="nd-input nd-input--sm"
                min={0}
                placeholder="e.g. 100"
                value={cfg.diskGb ?? ''}
                onChange={(e) =>
                  patch({ diskGb: e.target.value ? parseFloat(e.target.value) : undefined })
                }
              />
            </label>
          </div>
        </section>
      )}

      {/* ── Notes ────────────────────────────────────────────────── */}
      <section className="nd-section">
        <h3 className="nd-section-title">Notes</h3>
        <textarea
          className="nd-textarea"
          rows={4}
          placeholder="Architecture decisions, caveats, links to docs…"
          value={cfg.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value || undefined })}
        />
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Container Editor (inline expanded panel)
   ════════════════════════════════════════════════════════════════ */
const RESTART_POLICIES = ['always', 'unless-stopped', 'on-failure', 'no'] as const;

function ContainerEditor({
  container,
  onSave,
  onCancel,
}: {
  container: DockerContainer;
  onSave: (c: DockerContainer) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DockerContainer>(container);

  function patch(partial: Partial<DockerContainer>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  /* ── Port bindings ─────────────────────────────────────────── */
  function addPort() {
    patch({ ports: [...draft.ports, { hostPort: 0, containerPort: 0, protocol: 'tcp' }] });
  }
  function updatePort(idx: number, field: keyof PortBinding, val: string | number) {
    const next = draft.ports.map((p, i) =>
      i === idx ? { ...p, [field]: typeof val === 'string' ? val : Number(val) } : p
    );
    patch({ ports: next });
  }
  function removePort(idx: number) {
    patch({ ports: draft.ports.filter((_, i) => i !== idx) });
  }

  /* ── Environment vars ──────────────────────────────────────── */
  function addEnv() {
    patch({ env: [...draft.env, { key: '', value: '' }] });
  }
  function updateEnv(idx: number, field: keyof EnvVar, val: string | boolean) {
    const next = draft.env.map((e, i) => (i === idx ? { ...e, [field]: val } : e));
    patch({ env: next });
  }
  function removeEnv(idx: number) {
    patch({ env: draft.env.filter((_, i) => i !== idx) });
  }

  /* ── Volumes ───────────────────────────────────────────────── */
  function addVolume() {
    const vol: VolumeMount = {
      id: nextVolumeId(),
      name: '',
      containerPath: '',
      readOnly: false,
      type: 'volume',
    };
    patch({ volumes: [...draft.volumes, vol] });
  }
  function updateVolume(idx: number, field: keyof VolumeMount, val: string | boolean | number) {
    const next = draft.volumes.map((v, i) => (i === idx ? { ...v, [field]: val } : v));
    patch({ volumes: next });
  }
  function removeVolume(idx: number) {
    patch({ volumes: draft.volumes.filter((_, i) => i !== idx) });
  }

  /* ── Resources ─────────────────────────────────────────────── */
  function patchRes(partial: Partial<ResourceLimits>) {
    patch({ resources: { ...draft.resources, ...partial } });
  }

  /* ── Health check ──────────────────────────────────────────── */
  const hc = draft.healthCheck;
  function setHc(partial: Partial<HealthCheck>) {
    patch({
      healthCheck: {
        type: 'http',
        intervalSeconds: 30,
        timeoutSeconds: 5,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
        ...hc,
        ...partial,
      },
    });
  }
  function toggleHc(enabled: boolean) {
    patch({
      healthCheck: enabled
        ? { type: 'http', path: '/health', port: 8080, intervalSeconds: 30, timeoutSeconds: 5, healthyThreshold: 2, unhealthyThreshold: 3 }
        : undefined,
    });
  }

  return (
    <div className="nd-container-editor">
      {/* Header */}
      <div className="nd-ce-header">
        <span className="nd-ce-title">
          {container.id.startsWith('c') && container.name === '' ? 'New Container' : container.name || 'Container'}
        </span>
        <div className="nd-ce-actions">
          <button className="nd-btn nd-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="nd-btn nd-btn--primary" onClick={() => onSave(draft)}>Save</button>
        </div>
      </div>

      <div className="nd-ce-body">
        {/* ── Identity ──────────────────────────────────────────── */}
        <div className="nd-ce-section">
          <div className="nd-field-row">
            <label className="nd-label">
              Container Name
              <input
                className="nd-input"
                placeholder="e.g. api, nginx, worker"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
          </div>
          <div className="nd-field-row nd-field-row--2">
            <label className="nd-label">
              Image
              <input
                className="nd-input"
                placeholder="e.g. node, nginx, postgres"
                value={draft.image}
                onChange={(e) => patch({ image: e.target.value })}
              />
            </label>
            <label className="nd-label">
              Tag
              <input
                className="nd-input"
                placeholder="latest"
                value={draft.tag}
                onChange={(e) => patch({ tag: e.target.value })}
              />
            </label>
          </div>
          <label className="nd-label">
            Restart Policy
            <select
              className="nd-select"
              value={draft.restartPolicy}
              onChange={(e) => patch({ restartPolicy: e.target.value as typeof RESTART_POLICIES[number] })}
            >
              {RESTART_POLICIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        {/* ── Port Bindings ─────────────────────────────────────── */}
        <div className="nd-ce-section">
          <div className="nd-ce-section-head">
            <span>Port Bindings</span>
            <button className="nd-mini-btn" onClick={addPort}>+ Add</button>
          </div>
          {draft.ports.length === 0 && <p className="nd-empty-hint">No ports exposed.</p>}
          {draft.ports.map((p, i) => (
            <div key={i} className="nd-row-item">
              <input
                type="number"
                className="nd-input nd-input--xs"
                placeholder="Host"
                value={p.hostPort || ''}
                onChange={(e) => updatePort(i, 'hostPort', e.target.value)}
              />
              <span className="nd-row-sep">:</span>
              <input
                type="number"
                className="nd-input nd-input--xs"
                placeholder="Container"
                value={p.containerPort || ''}
                onChange={(e) => updatePort(i, 'containerPort', e.target.value)}
              />
              <select
                className="nd-select nd-select--xs"
                value={p.protocol}
                onChange={(e) => updatePort(i, 'protocol', e.target.value)}
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
              <button className="nd-row-del" onClick={() => removePort(i)}>✕</button>
            </div>
          ))}
        </div>

        {/* ── Environment Variables ─────────────────────────────── */}
        <div className="nd-ce-section">
          <div className="nd-ce-section-head">
            <span>Environment Variables</span>
            <button className="nd-mini-btn" onClick={addEnv}>+ Add</button>
          </div>
          {draft.env.length === 0 && <p className="nd-empty-hint">No env vars set.</p>}
          {draft.env.map((ev, i) => (
            <div key={i} className="nd-row-item">
              <input
                className="nd-input nd-input--flex"
                placeholder="KEY"
                value={ev.key}
                onChange={(e) => updateEnv(i, 'key', e.target.value)}
              />
              <span className="nd-row-sep">=</span>
              <input
                className={`nd-input nd-input--flex${ev.secret ? ' nd-input--secret' : ''}`}
                placeholder="value"
                type={ev.secret ? 'password' : 'text'}
                value={ev.value}
                onChange={(e) => updateEnv(i, 'value', e.target.value)}
              />
              <button
                className={`nd-secret-toggle${ev.secret ? ' active' : ''}`}
                title="Mark as secret"
                onClick={() => updateEnv(i, 'secret', !ev.secret)}
              >
                🔒
              </button>
              <button className="nd-row-del" onClick={() => removeEnv(i)}>✕</button>
            </div>
          ))}
        </div>

        {/* ── Volumes ───────────────────────────────────────────── */}
        <div className="nd-ce-section">
          <div className="nd-ce-section-head">
            <span>Volume Mounts</span>
            <button className="nd-mini-btn" onClick={addVolume}>+ Add</button>
          </div>
          {draft.volumes.length === 0 && <p className="nd-empty-hint">No volumes mounted.</p>}
          {draft.volumes.map((v, i) => (
            <div key={v.id} className="nd-row-item nd-row-item--volume">
              <select
                className="nd-select nd-select--xs"
                value={v.type}
                onChange={(e) => updateVolume(i, 'type', e.target.value)}
              >
                <option value="volume">volume</option>
                <option value="bind">bind</option>
                <option value="tmpfs">tmpfs</option>
              </select>
              <input
                className="nd-input nd-input--flex"
                placeholder={v.type === 'bind' ? '/host/path' : 'volume-name'}
                value={v.name}
                onChange={(e) => updateVolume(i, 'name', e.target.value)}
              />
              <span className="nd-row-sep">→</span>
              <input
                className="nd-input nd-input--flex"
                placeholder="/container/path"
                value={v.containerPath}
                onChange={(e) => updateVolume(i, 'containerPath', e.target.value)}
              />
              <label className="nd-ro-toggle" title="Read-only">
                <input
                  type="checkbox"
                  checked={v.readOnly}
                  onChange={(e) => updateVolume(i, 'readOnly', e.target.checked)}
                />
                ro
              </label>
              <button className="nd-row-del" onClick={() => removeVolume(i)}>✕</button>
            </div>
          ))}
        </div>

        {/* ── Resource Limits ───────────────────────────────────── */}
        <div className="nd-ce-section">
          <div className="nd-ce-section-head"><span>Resource Limits</span></div>
          <div className="nd-field-row nd-field-row--2">
            <label className="nd-label">
              CPU (millicores)
              <input
                type="number"
                className="nd-input nd-input--sm"
                placeholder="e.g. 500 = 0.5 vCPU"
                min={0}
                value={draft.resources.cpuMillicores ?? ''}
                onChange={(e) =>
                  patchRes({ cpuMillicores: e.target.value ? parseInt(e.target.value) : undefined })
                }
              />
            </label>
            <label className="nd-label">
              Memory (MB)
              <input
                type="number"
                className="nd-input nd-input--sm"
                placeholder="e.g. 512"
                min={0}
                value={draft.resources.memoryMb ?? ''}
                onChange={(e) =>
                  patchRes({ memoryMb: e.target.value ? parseInt(e.target.value) : undefined })
                }
              />
            </label>
          </div>
        </div>

        {/* ── Health Check ──────────────────────────────────────── */}
        <div className="nd-ce-section">
          <div className="nd-ce-section-head">
            <span>Health Check</span>
            <label className="nd-toggle-label">
              <input
                type="checkbox"
                checked={Boolean(hc)}
                onChange={(e) => toggleHc(e.target.checked)}
              />
              Enabled
            </label>
          </div>
          {hc && (
            <div className="nd-hc-grid">
              <label className="nd-label">
                Type
                <select className="nd-select" value={hc.type} onChange={(e) => setHc({ type: e.target.value as HealthCheck['type'] })}>
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                  <option value="exec">Exec</option>
                </select>
              </label>
              {hc.type === 'http' && (
                <label className="nd-label">
                  Path
                  <input className="nd-input" placeholder="/health" value={hc.path ?? ''} onChange={(e) => setHc({ path: e.target.value })} />
                </label>
              )}
              {hc.type !== 'exec' && (
                <label className="nd-label">
                  Port
                  <input type="number" className="nd-input nd-input--sm" value={hc.port ?? ''} onChange={(e) => setHc({ port: e.target.value ? parseInt(e.target.value) : undefined })} />
                </label>
              )}
              {hc.type === 'exec' && (
                <label className="nd-label">
                  Command
                  <input className="nd-input" placeholder='e.g. ["CMD","curl","-f","http://localhost"]' value={hc.command ?? ''} onChange={(e) => setHc({ command: e.target.value })} />
                </label>
              )}
              <label className="nd-label">
                Interval (s)
                <input type="number" className="nd-input nd-input--sm" min={1} value={hc.intervalSeconds} onChange={(e) => setHc({ intervalSeconds: parseInt(e.target.value) || 30 })} />
              </label>
              <label className="nd-label">
                Timeout (s)
                <input type="number" className="nd-input nd-input--sm" min={1} value={hc.timeoutSeconds} onChange={(e) => setHc({ timeoutSeconds: parseInt(e.target.value) || 5 })} />
              </label>
              <label className="nd-label">
                Healthy after
                <input type="number" className="nd-input nd-input--sm" min={1} value={hc.healthyThreshold} onChange={(e) => setHc({ healthyThreshold: parseInt(e.target.value) || 2 })} />
              </label>
              <label className="nd-label">
                Unhealthy after
                <input type="number" className="nd-input nd-input--sm" min={1} value={hc.unhealthyThreshold} onChange={(e) => setHc({ unhealthyThreshold: parseInt(e.target.value) || 3 })} />
              </label>
            </div>
          )}
        </div>

        {/* ── Notes ─────────────────────────────────────────────── */}
        <div className="nd-ce-section">
          <div className="nd-ce-section-head"><span>Notes</span></div>
          <textarea
            className="nd-textarea"
            rows={3}
            placeholder="Container-specific notes…"
            value={draft.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Containers Tab
   ════════════════════════════════════════════════════════════════ */
function ContainersTab({
  node,
  onChange,
}: {
  node: CyNode;
  onChange: (updated: CyNode) => void;
}) {
  const containers = node.config.containers ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<DockerContainer | null>(null);

  function setContainers(next: DockerContainer[]) {
    onChange({ ...node, config: { ...node.config, containers: next } });
  }

  function startNew() {
    const c: DockerContainer = {
      id: nextContainerId(),
      name: '',
      image: '',
      tag: 'latest',
      ports: [],
      env: [],
      volumes: [],
      resources: {},
      restartPolicy: 'unless-stopped',
    };
    setNewDraft(c);
    setEditingId(c.id);
  }

  function saveContainer(c: DockerContainer) {
    if (containers.find((x) => x.id === c.id)) {
      setContainers(containers.map((x) => (x.id === c.id ? c : x)));
    } else {
      setContainers([...containers, c]);
    }
    setEditingId(null);
    setNewDraft(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setNewDraft(null);
  }

  function deleteContainer(id: string) {
    setContainers(containers.filter((c) => c.id !== id));
    if (editingId === id) { setEditingId(null); setNewDraft(null); }
  }

  const allContainers = newDraft
    ? [...containers.filter((c) => c.id !== editingId), newDraft]
    : containers;

  return (
    <div className="nd-tab-content">
      <div className="nd-list-header">
        <h3 className="nd-section-title" style={{ margin: 0 }}>
          Docker Containers
          <span className="nd-count-badge">{containers.length}</span>
        </h3>
        <button className="nd-btn nd-btn--primary" onClick={startNew} disabled={editingId !== null}>
          + New Container
        </button>
      </div>

      {allContainers.length === 0 && (
        <div className="nd-empty-state">
          <span className="nd-empty-icon">📦</span>
          <p>No containers defined yet.</p>
          <p className="nd-empty-hint">Click "New Container" to add one.</p>
        </div>
      )}

      {allContainers.map((c) =>
        c.id === editingId ? (
          <ContainerEditor
            key={c.id}
            container={c}
            onSave={saveContainer}
            onCancel={cancelEdit}
          />
        ) : (
          <div key={c.id} className="nd-container-row">
            <div className="nd-cr-icon">📦</div>
            <div className="nd-cr-info">
              <span className="nd-cr-name">{c.name || <em>unnamed</em>}</span>
              <span className="nd-cr-image">
                {c.image ? `${c.image}:${c.tag}` : <em>no image set</em>}
              </span>
              {c.ports.length > 0 && (
                <span className="nd-cr-ports">
                  {c.ports.map((p) => `${p.hostPort}:${p.containerPort}/${p.protocol}`).join('  ')}
                </span>
              )}
            </div>
            <div className="nd-cr-chips">
              {c.healthCheck && <span className="nd-chip nd-chip--health">health ✓</span>}
              {c.resources.cpuMillicores && (
                <span className="nd-chip">{c.resources.cpuMillicores}m CPU</span>
              )}
              {c.resources.memoryMb && (
                <span className="nd-chip">{c.resources.memoryMb} MB</span>
              )}
            </div>
            <div className="nd-cr-actions">
              <button
                className="nd-btn nd-btn--ghost nd-btn--sm"
                onClick={() => setEditingId(c.id)}
                disabled={editingId !== null}
              >
                Edit
              </button>
              <button
                className="nd-btn nd-btn--danger nd-btn--sm"
                onClick={() => deleteContainer(c.id)}
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Ports Tab  (host-level port exposure)
   ════════════════════════════════════════════════════════════════ */
function PortsTab({
  node,
  onChange,
}: {
  node: CyNode;
  onChange: (updated: CyNode) => void;
}) {
  const ports = node.config.hostPorts ?? [];

  function setPorts(next: HostPort[]) {
    onChange({ ...node, config: { ...node.config, hostPorts: next } });
  }

  function addPort() {
    setPorts([...ports, { id: nextHostPortId(), port: 80, protocol: 'tcp', service: '' }]);
  }

  function updatePort(idx: number, field: keyof HostPort, val: string | number) {
    setPorts(ports.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  }

  function removePort(idx: number) {
    setPorts(ports.filter((_, i) => i !== idx));
  }

  return (
    <div className="nd-tab-content">
      <div className="nd-list-header">
        <h3 className="nd-section-title" style={{ margin: 0 }}>
          Exposed Host Ports
          <span className="nd-count-badge">{ports.length}</span>
        </h3>
        <button className="nd-btn nd-btn--primary" onClick={addPort}>+ Add Port</button>
      </div>

      {ports.length === 0 ? (
        <div className="nd-empty-state">
          <span className="nd-empty-icon">🔌</span>
          <p>No ports defined.</p>
          <p className="nd-empty-hint">Add ports that this node exposes to the rest of the system.</p>
        </div>
      ) : (
        <div className="nd-table-wrap">
          <table className="nd-table">
            <thead>
              <tr>
                <th>Port</th>
                <th>Protocol</th>
                <th>Service</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ports.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="number"
                      className="nd-input nd-input--xs"
                      min={1}
                      max={65535}
                      value={p.port}
                      onChange={(e) => updatePort(i, 'port', parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <select
                      className="nd-select nd-select--xs"
                      value={p.protocol}
                      onChange={(e) => updatePort(i, 'protocol', e.target.value)}
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="nd-input"
                      placeholder="HTTP, Postgres, gRPC…"
                      value={p.service}
                      onChange={(e) => updatePort(i, 'service', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="nd-input"
                      placeholder="Optional note"
                      value={p.description ?? ''}
                      onChange={(e) => updatePort(i, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="nd-row-del" onClick={() => removePort(i)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Env Vars Tab
   ════════════════════════════════════════════════════════════════ */
function EnvVarsTab({
  node,
  onChange,
}: {
  node: CyNode;
  onChange: (updated: CyNode) => void;
}) {
  const vars = node.config.globalEnv ?? [];

  function setVars(next: EnvVar[]) {
    onChange({ ...node, config: { ...node.config, globalEnv: next } });
  }

  function addVar() {
    setVars([...vars, { key: '', value: '' }]);
  }

  function updateVar(idx: number, field: keyof EnvVar, val: string | boolean) {
    setVars(vars.map((v, i) => (i === idx ? { ...v, [field]: val } : v)));
  }

  function removeVar(idx: number) {
    setVars(vars.filter((_, i) => i !== idx));
  }

  return (
    <div className="nd-tab-content">
      <div className="nd-list-header">
        <h3 className="nd-section-title" style={{ margin: 0 }}>
          Global Environment Variables
          <span className="nd-count-badge">{vars.length}</span>
        </h3>
        <button className="nd-btn nd-btn--primary" onClick={addVar}>+ Add Variable</button>
      </div>

      <p className="nd-hint-text">
        These env vars are injected at the node/VM level and are available to all containers.
      </p>

      {vars.length === 0 ? (
        <div className="nd-empty-state">
          <span className="nd-empty-icon">📋</span>
          <p>No environment variables set.</p>
        </div>
      ) : (
        <div className="nd-env-list">
          {vars.map((v, i) => (
            <div key={i} className="nd-row-item nd-env-row">
              <input
                className="nd-input nd-input--flex nd-input--mono"
                placeholder="VARIABLE_NAME"
                value={v.key}
                onChange={(e) => updateVar(i, 'key', e.target.value)}
              />
              <span className="nd-row-sep">=</span>
              <input
                className={`nd-input nd-input--flex${v.secret ? ' nd-input--secret' : ''}`}
                placeholder="value"
                type={v.secret ? 'password' : 'text'}
                value={v.value}
                onChange={(e) => updateVar(i, 'value', e.target.value)}
              />
              <button
                className={`nd-secret-toggle${v.secret ? ' active' : ''}`}
                title={v.secret ? 'Unmark secret' : 'Mark as secret'}
                onClick={() => updateVar(i, 'secret', !v.secret)}
              >
                🔒
              </button>
              <button className="nd-row-del" onClick={() => removeVar(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Firewall Tab
   ════════════════════════════════════════════════════════════════ */
const COMMON_PORTS: Record<string, string> = {
  '22': 'SSH',
  '80': 'HTTP',
  '443': 'HTTPS',
  '3306': 'MySQL',
  '5432': 'PostgreSQL',
  '6379': 'Redis',
  '27017': 'MongoDB',
};

function FirewallTab({
  node,
  onChange,
}: {
  node: CyNode;
  onChange: (updated: CyNode) => void;
}) {
  const rules = node.config.firewallRules ?? [];
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');

  function setRules(next: FirewallRule[]) {
    onChange({ ...node, config: { ...node.config, firewallRules: next } });
  }

  function addRule() {
    const rule: FirewallRule = {
      id: nextFirewallId(),
      direction,
      protocol: 'tcp',
      portRange: '80',
      cidr: '0.0.0.0/0',
      action: 'allow',
    };
    setRules([...rules, rule]);
  }

  function updateRule(id: string, field: keyof FirewallRule, val: string | number) {
    setRules(rules.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  }

  function removeRule(id: string) {
    setRules(rules.filter((r) => r.id !== id));
  }

  function addQuickRule(port: string, desc: string) {
    const rule: FirewallRule = {
      id: nextFirewallId(),
      direction: 'inbound',
      protocol: 'tcp',
      portRange: port,
      cidr: '0.0.0.0/0',
      action: 'allow',
      description: desc,
    };
    setRules([...rules, rule]);
  }

  const shown = rules.filter((r) => r.direction === direction);

  return (
    <div className="nd-tab-content">
      {/* Quick-add presets */}
      <div className="nd-fw-quick">
        <span className="nd-hint-text">Quick add:</span>
        {Object.entries(COMMON_PORTS).map(([port, name]) => (
          <button
            key={port}
            className="nd-chip nd-chip--btn"
            onClick={() => addQuickRule(port, name)}
          >
            {name} :{port}
          </button>
        ))}
      </div>

      <div className="nd-list-header">
        <div className="nd-fw-tabs">
          {(['inbound', 'outbound'] as const).map((d) => (
            <button
              key={d}
              className={`nd-fw-tab${direction === d ? ' active' : ''}`}
              onClick={() => setDirection(d)}
            >
              {d === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
              <span className="nd-count-badge">
                {rules.filter((r) => r.direction === d).length}
              </span>
            </button>
          ))}
        </div>
        <button className="nd-btn nd-btn--primary" onClick={addRule}>+ Add Rule</button>
      </div>

      {shown.length === 0 ? (
        <div className="nd-empty-state">
          <span className="nd-empty-icon">🛡</span>
          <p>No {direction} rules defined.</p>
        </div>
      ) : (
        <div className="nd-table-wrap">
          <table className="nd-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Protocol</th>
                <th>Port / Range</th>
                <th>CIDR</th>
                <th>Priority</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={r.action === 'deny' ? 'nd-tr--deny' : ''}>
                  <td>
                    <select
                      className={`nd-select nd-select--xs nd-action-sel nd-action-sel--${r.action}`}
                      value={r.action}
                      onChange={(e) => updateRule(r.id, 'action', e.target.value)}
                    >
                      <option value="allow">Allow</option>
                      <option value="deny">Deny</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="nd-select nd-select--xs"
                      value={r.protocol}
                      onChange={(e) => updateRule(r.id, 'protocol', e.target.value)}
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="icmp">ICMP</option>
                      <option value="all">All</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="nd-input nd-input--xs nd-input--mono"
                      placeholder="80 or 80-443 or *"
                      value={r.portRange}
                      onChange={(e) => updateRule(r.id, 'portRange', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="nd-input nd-input--sm nd-input--mono"
                      placeholder="0.0.0.0/0"
                      value={r.cidr}
                      onChange={(e) => updateRule(r.id, 'cidr', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="nd-input nd-input--xs"
                      placeholder="100"
                      min={1}
                      value={r.priority ?? ''}
                      onChange={(e) =>
                        updateRule(r.id, 'priority', e.target.value ? parseInt(e.target.value) : 100)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="nd-input"
                      placeholder="Optional note"
                      value={r.description ?? ''}
                      onChange={(e) => updateRule(r.id, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="nd-row-del" onClick={() => removeRule(r.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   NodeDetailPage – main entry
   ════════════════════════════════════════════════════════════════ */
export default function NodeDetailPage() {
  const { projectId, nodeId, requestId } = useParams<{
    projectId: string;
    nodeId: string;
    requestId?: string;
  }>();
  const navigate = useNavigate();
  const { getProject, updateNode } = useProjects();

  const project = getProject(projectId ?? '');
  const phase: Phase = requestId ? 'request' : 'base';

  /* ── find the node in the right canvas ─────────────────────── */
  const canvas = useMemo(() => {
    if (!project) return null;
    if (phase === 'base') return project.base;
    const req = findLeafById(project.requests, requestId ?? '');
    return req?.canvas ?? null;
  }, [project, phase, requestId]);

  const originalNode = canvas?.nodes.find((n) => n.id === nodeId) ?? null;

  /* ── local draft (auto-saves on every change) ───────────────── */
  const [localNode, setLocalNode] = useState<CyNode | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local node when the page first loads or nodeId changes
  useEffect(() => {
    setLocalNode(originalNode ? { ...originalNode } : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, requestId, projectId]);

  const [tab, setTab] = useState<Tab>('overview');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  /* ── persist with debounce ──────────────────────────────────── */
  const handleChange = useCallback(
    (updated: CyNode) => {
      setLocalNode(updated);
      setSaveStatus('unsaved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateNode(projectId ?? '', phase, requestId ?? '', updated);
        setSaveStatus('saved');
      }, 600);
    },
    [projectId, phase, requestId, updateNode]
  );

  // flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  /* ── back URL ───────────────────────────────────────────────── */
  const backUrl = requestId
    ? `/projects/${projectId}/requests/${requestId}`
    : `/projects/${projectId}`;

  if (!project) {
    return (
      <div className="nd-root nd-error">
        <p>Project not found.</p>
        <Link to="/projects">← Back to projects</Link>
      </div>
    );
  }

  if (!localNode) {
    return (
      <div className="nd-root nd-error">
        <p>Node "{nodeId}" not found in this canvas.</p>
        <Link to={backUrl}>← Back to editor</Link>
      </div>
    );
  }

  const spec = catalog[localNode.type];
  const availableTabs = tabsFor(localNode.type);

  // Ensure current tab is valid for this node type
  const activeTab = availableTabs.includes(tab) ? tab : availableTabs[0];

  return (
    <div className="nd-root">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="nd-topbar">
        <div className="nd-breadcrumb">
          <button className="nd-back-btn" onClick={() => navigate(backUrl)} title="Back to editor">
            ←
          </button>
          <Link to={backUrl} className="nd-bc-link">{project.name}</Link>
          <span className="nd-bc-sep">/</span>
          {requestId && (
            <>
              <Link to={backUrl} className="nd-bc-link">
                {findLeafById(project.requests, requestId)?.name ?? requestId}
              </Link>
              <span className="nd-bc-sep">/</span>
            </>
          )}
          <span className="nd-bc-current">{localNode.label}</span>
          {spec && (
            <span
              className="nd-type-pill"
              style={{ background: spec.color, color: spec.textColor }}
            >
              {spec.icon} {spec.label}
            </span>
          )}
        </div>

        <div className="nd-topbar-right">
          <span className={`nd-save-status nd-save-status--${saveStatus}`}>
            {saveStatus === 'saved' ? '✓ All changes saved' : saveStatus === 'saving' ? '⟳ Saving…' : '● Unsaved'}
          </span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="nd-tabbar">
        {availableTabs.map((t) => (
          <button
            key={t}
            className={`nd-tab-btn${activeTab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            <span className="nd-tab-icon">{TAB_ICONS[t]}</span>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="nd-body">
        {activeTab === 'overview' && (
          <OverviewTab node={localNode} onChange={handleChange} />
        )}
        {activeTab === 'containers' && (
          <ContainersTab node={localNode} onChange={handleChange} />
        )}
        {activeTab === 'ports' && (
          <PortsTab node={localNode} onChange={handleChange} />
        )}
        {activeTab === 'env' && (
          <EnvVarsTab node={localNode} onChange={handleChange} />
        )}
        {activeTab === 'firewall' && (
          <FirewallTab node={localNode} onChange={handleChange} />
        )}
      </div>
    </div>
  );
}
