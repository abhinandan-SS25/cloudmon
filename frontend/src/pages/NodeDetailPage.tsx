/* ═══════════════════════════════════════════════════════════════
   NodeDetailPage.tsx  – Visual "inside a server" editor
   ═══════════════════════════════════════════════════════════════ */
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import catalog from '../data/componentCatalog';
import {
  CyNode, DockerContainer, EnvVar, FirewallRule,
  HealthCheck, HostPort, Phase, PortBinding,
  ResourceLimits, VolumeMount,
} from '../types';
import {
  findLeafById, nextContainerId, nextFirewallId,
  nextHostPortId, nextVolumeId,
} from '../utils/canvasUtils';

/* ── Which types emit the "server interior" layout ─────────────── */
export const COMPUTE_TYPES = new Set([
  'web_server', 'app_server', 'microservice', 'container',
  'kubernetes', 'monolithic_api', 'graphql', 'serverless',
]);
const DATA_TYPES = new Set([
  'postgres', 'sql', 'dynamodb', 'non_relational', 'redis', 'memcached',
  'elasticsearch', 'cassandra', 'influxdb', 'neo4j',
]);
export const CONFIGURABLE_TYPES = new Set([...COMPUTE_TYPES, ...DATA_TYPES]);

/* ── Container color palette (by image prefix) ──────────────────  */
const IMAGE_COLORS: [RegExp, string, string][] = [
  [/nginx|caddy|traefik|apache/i,   '#16a34a', '#f0fdf4'],
  [/node|express|deno/i,            '#059669', '#ecfdf5'],
  [/python|flask|django|fastapi/i,  '#0ea5e9', '#f0f9ff'],
  [/java|spring|quark/i,            '#f59e0b', '#fffbeb'],
  [/go|golang/i,                    '#06b6d4', '#ecfeff'],
  [/redis/i,                        '#dc2626', '#fef2f2'],
  [/postgres|mysql|mongo|mariadb/i, '#7c3aed', '#f5f3ff'],
  [/php|laravel/i,                  '#8b5cf6', '#ede9fe'],
  [/rust/i,                         '#c2410c', '#fff7ed'],
  [/dotnet|aspnet/i,                '#1d4ed8', '#eff6ff'],
  [/kafka|rabbit/i,                 '#1f2937', '#f9fafb'],
];
function containerAccent(image: string): [string, string] {
  for (const [re, fg, bg] of IMAGE_COLORS) {
    if (re.test(image)) return [fg, bg];
  }
  return ['#5f7e8b', '#e6eff2'];
}

/* ── OS icon map ────────────────────────────────────────────────── */
const OS_ICONS: Record<string, string> = {
  'ubuntu': '🟠', 'debian': '🟥', 'alpine': '🔵',
  'centos': '🟣', 'rhel': '🔴', 'windows': '🪟',
  'amazon': '🟡', 'custom': '⚙',
};
function osIcon(os?: string): string {
  if (!os) return '🖥';
  const key = Object.keys(OS_ICONS).find(k => os.toLowerCase().includes(k));
  return key ? OS_ICONS[key] : '🖥';
}

/* ── Restart policy colors ──────────────────────────────────────── */
const RESTART_COLOR: Record<string, string> = {
  'always': '#16a34a', 'unless-stopped': '#0ea5e9',
  'on-failure': '#f59e0b', 'no': '#64748b',
};

/* ═══════════════════════════════════════════════════════════════
   ContainerDrawer – slide-over panel for full container config
   ═══════════════════════════════════════════════════════════════ */
const RESTART_POLICIES = ['always', 'unless-stopped', 'on-failure', 'no'] as const;

function ContainerDrawer({
  container,
  onSave,
  onDelete,
  onClose,
}: {
  container: DockerContainer;
  onSave: (c: DockerContainer) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DockerContainer>(container);
  const [section, setSection] = useState<'identity'|'ports'|'env'|'volumes'|'resources'|'health'>(
    'identity'
  );

  const patch = (p: Partial<DockerContainer>) => setDraft(prev => ({ ...prev, ...p }));
  const patchRes = (p: Partial<ResourceLimits>) =>
    setDraft(prev => ({ ...prev, resources: { ...prev.resources, ...p } }));

  /* ports */
  const addPort = () => patch({ ports: [...draft.ports, { hostPort: 80, containerPort: 80, protocol: 'tcp' as const }] });
  const updPort = (i: number, f: keyof PortBinding, v: string | number) =>
    patch({ ports: draft.ports.map((p, idx) => idx === i ? { ...p, [f]: typeof v === 'string' ? v : Number(v) } : p) });
  const delPort = (i: number) => patch({ ports: draft.ports.filter((_, idx) => idx !== i) });

  /* env */
  const addEnv = () => patch({ env: [...draft.env, { key: '', value: '' }] });
  const updEnv = (i: number, f: keyof EnvVar, v: string | boolean) =>
    patch({ env: draft.env.map((e, idx) => idx === i ? { ...e, [f]: v } : e) });
  const delEnv = (i: number) => patch({ env: draft.env.filter((_, idx) => idx !== i) });

  /* volumes */
  const addVol = () => patch({ volumes: [...draft.volumes, { id: nextVolumeId(), name: '', containerPath: '', readOnly: false, type: 'volume' as const }] });
  const updVol = (i: number, f: keyof VolumeMount, v: string | boolean | number) =>
    patch({ volumes: draft.volumes.map((v2, idx) => idx === i ? { ...v2, [f]: v } : v2) });
  const delVol = (i: number) => patch({ volumes: draft.volumes.filter((_, idx) => idx !== i) });

  /* health */
  const hc = draft.healthCheck;
  const setHc = (p: Partial<HealthCheck>) =>
    patch({ healthCheck: { type: 'http', intervalSeconds: 30, timeoutSeconds: 5, healthyThreshold: 2, unhealthyThreshold: 3, ...hc, ...p } });
  const toggleHc = (on: boolean) =>
    patch({ healthCheck: on ? { type: 'http', path: '/health', port: 8080, intervalSeconds: 30, timeoutSeconds: 5, healthyThreshold: 2, unhealthyThreshold: 3 } : undefined });

  const DRAWER_SECTIONS = [
    { id: 'identity',  icon: '🪪', label: 'Identity' },
    { id: 'ports',     icon: '🔌', label: `Ports (${draft.ports.length})` },
    { id: 'env',       icon: '📋', label: `Env (${draft.env.length})` },
    { id: 'volumes',   icon: '💾', label: `Volumes (${draft.volumes.length})` },
    { id: 'resources', icon: '📊', label: 'Resources' },
    { id: 'health',    icon: '💊', label: 'Health' },
  ] as const;

  const [accent, accentBg] = containerAccent(draft.image);

  return (
    <div className="srv-drawer-backdrop" onClick={onClose}>
      <div className="srv-drawer" onClick={e => e.stopPropagation()}>

        {/* ── Drawer header ──────────────────────────────────────── */}
        <div className="srv-drawer-head" style={{ borderTopColor: accent }}>
          <div className="srv-drawer-head-left">
            <div
              className="srv-drawer-img-icon"
              style={{ background: accentBg, color: accent }}
            >
              {draft.image ? draft.image.slice(0, 2).toUpperCase() : '?'}
            </div>
            <div>
              <input
                className="srv-drawer-name-input"
                placeholder="container-name"
                value={draft.name}
                onChange={e => patch({ name: e.target.value })}
              />
              <div className="srv-drawer-image-row">
                <input
                  className="srv-drawer-image-input"
                  placeholder="image"
                  value={draft.image}
                  onChange={e => patch({ image: e.target.value })}
                />
                <span className="srv-drawer-colon">:</span>
                <input
                  className="srv-drawer-tag-input"
                  placeholder="latest"
                  value={draft.tag}
                  onChange={e => patch({ tag: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="srv-drawer-head-right">
            <select
              className="srv-restart-select"
              value={draft.restartPolicy}
              style={{ color: RESTART_COLOR[draft.restartPolicy] }}
              onChange={e => patch({ restartPolicy: e.target.value as typeof RESTART_POLICIES[number] })}
            >
              {RESTART_POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="srv-drawer-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Section nav pills ─────────────────────────────────── */}
        <div className="srv-drawer-nav">
          {DRAWER_SECTIONS.map(s => (
            <button
              key={s.id}
              className={`srv-drawer-nav-pill${section === s.id ? ' active' : ''}`}
              onClick={() => setSection(s.id as typeof section)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* ── Section bodies ────────────────────────────────────── */}
        <div className="srv-drawer-body">

          {section === 'identity' && (
            <div className="srv-drawer-section">
              <div className="srv-drawer-hint">
                This container runs inside <strong>{draft.name || 'this node'}</strong>. Configure the image, restart behaviour, and notes.
              </div>
              <label className="srv-field-label">Container Name</label>
              <input className="srv-field-input" placeholder="api, worker, sidecar…" value={draft.name} onChange={e => patch({ name: e.target.value })} />
              <div className="srv-field-row">
                <div>
                  <label className="srv-field-label">Image</label>
                  <input className="srv-field-input" placeholder="nginx" value={draft.image} onChange={e => patch({ image: e.target.value })} />
                </div>
                <div>
                  <label className="srv-field-label">Tag</label>
                  <input className="srv-field-input" placeholder="latest" value={draft.tag} onChange={e => patch({ tag: e.target.value })} />
                </div>
              </div>
              <label className="srv-field-label">Restart Policy</label>
              <div className="srv-restart-grid">
                {RESTART_POLICIES.map(p => (
                  <button
                    key={p}
                    className={`srv-restart-choice${draft.restartPolicy === p ? ' selected' : ''}`}
                    style={draft.restartPolicy === p ? { borderColor: RESTART_COLOR[p], color: RESTART_COLOR[p], background: RESTART_COLOR[p] + '18' } : {}}
                    onClick={() => patch({ restartPolicy: p })}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <label className="srv-field-label">Notes</label>
              <textarea className="srv-field-textarea" rows={3} placeholder="Purpose, caveats, docs link…" value={draft.notes ?? ''} onChange={e => patch({ notes: e.target.value || undefined })} />
            </div>
          )}

          {section === 'ports' && (
            <div className="srv-drawer-section">
              <div className="srv-ports-header">
                <span className="srv-section-sub">Port Bindings</span>
                <button className="srv-mini-add" onClick={addPort}>+ Add</button>
              </div>
              {draft.ports.length === 0 && (
                <div className="srv-empty-hint">No port bindings yet. Add one to expose this container to the host.</div>
              )}
              {draft.ports.map((p, i) => (
                <div key={i} className="srv-port-row">
                  <div className="srv-port-bubble srv-port-bubble--host">
                    <span className="srv-port-label">HOST</span>
                    <input
                      type="number" className="srv-port-input" min={1} max={65535}
                      value={p.hostPort || ''} placeholder="8080"
                      onChange={e => updPort(i, 'hostPort', e.target.value)}
                    />
                  </div>
                  <div className="srv-port-arrow">
                    <svg width="28" height="14" viewBox="0 0 28 14">
                      <line x1="0" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5"/>
                      <polygon points="22,3 28,7 22,11" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="srv-port-bubble srv-port-bubble--container">
                    <span className="srv-port-label">CTR</span>
                    <input
                      type="number" className="srv-port-input" min={1} max={65535}
                      value={p.containerPort || ''} placeholder="80"
                      onChange={e => updPort(i, 'containerPort', e.target.value)}
                    />
                  </div>
                  <select className="srv-proto-select" value={p.protocol} onChange={e => updPort(i, 'protocol', e.target.value)}>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                  <button className="srv-row-del" onClick={() => delPort(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {section === 'env' && (
            <div className="srv-drawer-section">
              <div className="srv-ports-header">
                <span className="srv-section-sub">Environment Variables</span>
                <button className="srv-mini-add" onClick={addEnv}>+ Add</button>
              </div>
              {draft.env.length === 0 && (
                <div className="srv-empty-hint">No env vars set.</div>
              )}
              {draft.env.map((ev, i) => (
                <div key={i} className="srv-env-row">
                  <input className="srv-env-key" placeholder="KEY" value={ev.key} onChange={e => updEnv(i, 'key', e.target.value)} />
                  <span className="srv-env-eq">=</span>
                  <input
                    className={`srv-env-val${ev.secret ? ' secret' : ''}`}
                    type={ev.secret ? 'password' : 'text'}
                    placeholder="value"
                    value={ev.value}
                    onChange={e => updEnv(i, 'value', e.target.value)}
                  />
                  <button
                    className={`srv-secret-btn${ev.secret ? ' on' : ''}`}
                    title="Toggle secret"
                    onClick={() => updEnv(i, 'secret', !ev.secret)}
                  >🔒</button>
                  <button className="srv-row-del" onClick={() => delEnv(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {section === 'volumes' && (
            <div className="srv-drawer-section">
              <div className="srv-ports-header">
                <span className="srv-section-sub">Volume Mounts</span>
                <button className="srv-mini-add" onClick={addVol}>+ Add</button>
              </div>
              {draft.volumes.length === 0 && (
                <div className="srv-empty-hint">No volumes mounted.</div>
              )}
              {draft.volumes.map((v, i) => (
                <div key={v.id} className="srv-vol-row">
                  <select className="srv-vol-type" value={v.type} onChange={e => updVol(i, 'type', e.target.value)}>
                    <option value="volume">named</option>
                    <option value="bind">bind</option>
                    <option value="tmpfs">tmpfs</option>
                  </select>
                  <input
                    className="srv-vol-src"
                    placeholder={v.type === 'bind' ? '/host/path' : 'vol-name'}
                    value={v.name}
                    onChange={e => updVol(i, 'name', e.target.value)}
                  />
                  <span className="srv-vol-arrow">→</span>
                  <input className="srv-vol-dst" placeholder="/app/data" value={v.containerPath} onChange={e => updVol(i, 'containerPath', e.target.value)} />
                  <label className="srv-ro-check"><input type="checkbox" checked={v.readOnly} onChange={e => updVol(i, 'readOnly', e.target.checked)} />ro</label>
                  <button className="srv-row-del" onClick={() => delVol(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {section === 'resources' && (
            <div className="srv-drawer-section">
              <div className="srv-res-grid">
                <div className="srv-res-card">
                  <div className="srv-res-icon">⚡</div>
                  <label className="srv-field-label">CPU Limit</label>
                  <input
                    type="number" className="srv-field-input srv-field-input--center" min={0} step={100}
                    placeholder="500 = 0.5 vCPU"
                    value={draft.resources.cpuMillicores ?? ''}
                    onChange={e => patchRes({ cpuMillicores: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                  <div className="srv-res-unit">millicores</div>
                  {draft.resources.cpuMillicores !== undefined && (
                    <div className="srv-res-bar-wrap">
                      <div className="srv-res-bar srv-res-bar--cpu" style={{ width: `${Math.min(100, draft.resources.cpuMillicores / 40)}%` }} />
                    </div>
                  )}
                </div>
                <div className="srv-res-card">
                  <div className="srv-res-icon">🧠</div>
                  <label className="srv-field-label">Memory Limit</label>
                  <input
                    type="number" className="srv-field-input srv-field-input--center" min={0} step={128}
                    placeholder="512"
                    value={draft.resources.memoryMb ?? ''}
                    onChange={e => patchRes({ memoryMb: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                  <div className="srv-res-unit">megabytes</div>
                  {draft.resources.memoryMb !== undefined && (
                    <div className="srv-res-bar-wrap">
                      <div className="srv-res-bar srv-res-bar--mem" style={{ width: `${Math.min(100, draft.resources.memoryMb / 81.92)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'health' && (
            <div className="srv-drawer-section">
              <div className="srv-health-toggle">
                <span className="srv-section-sub">Health Check</span>
                <label className="srv-toggle">
                  <input type="checkbox" checked={Boolean(hc)} onChange={e => toggleHc(e.target.checked)} />
                  <span className="srv-toggle-track"><span className="srv-toggle-thumb" /></span>
                </label>
              </div>
              {!hc && <div className="srv-empty-hint">Enable health checks to probe this container's readiness.</div>}
              {hc && (
                <>
                  <div className="srv-health-type-row">
                    {(['http', 'tcp', 'exec'] as const).map(t => (
                      <button
                        key={t}
                        className={`srv-htype-btn${hc.type === t ? ' active' : ''}`}
                        onClick={() => setHc({ type: t })}
                      >
                        {t === 'http' ? '🌐 HTTP' : t === 'tcp' ? '🔌 TCP' : '⌨ Exec'}
                      </button>
                    ))}
                  </div>
                  {hc.type === 'http' && (
                    <div className="srv-field-row">
                      <div style={{ flex: 2 }}><label className="srv-field-label">Path</label><input className="srv-field-input" placeholder="/health" value={hc.path ?? ''} onChange={e => setHc({ path: e.target.value })} /></div>
                      <div><label className="srv-field-label">Port</label><input type="number" className="srv-field-input" value={hc.port ?? ''} onChange={e => setHc({ port: e.target.value ? parseInt(e.target.value) : undefined })} /></div>
                    </div>
                  )}
                  {hc.type === 'tcp' && (
                    <div><label className="srv-field-label">Port</label><input type="number" className="srv-field-input" value={hc.port ?? ''} onChange={e => setHc({ port: e.target.value ? parseInt(e.target.value) : undefined })} /></div>
                  )}
                  {hc.type === 'exec' && (
                    <div><label className="srv-field-label">Command</label><input className="srv-field-input srv-mono" placeholder='CMD healthcheck.sh' value={hc.command ?? ''} onChange={e => setHc({ command: e.target.value })} /></div>
                  )}
                  <div className="srv-hc-timings">
                    <div className="srv-hc-timing-cell">
                      <div className="srv-hc-timing-val">{hc.intervalSeconds}s</div>
                      <input type="range" min={5} max={120} step={5} value={hc.intervalSeconds} onChange={e => setHc({ intervalSeconds: parseInt(e.target.value) })} />
                      <div className="srv-hc-timing-lbl">interval</div>
                    </div>
                    <div className="srv-hc-timing-cell">
                      <div className="srv-hc-timing-val">{hc.timeoutSeconds}s</div>
                      <input type="range" min={1} max={60} step={1} value={hc.timeoutSeconds} onChange={e => setHc({ timeoutSeconds: parseInt(e.target.value) })} />
                      <div className="srv-hc-timing-lbl">timeout</div>
                    </div>
                    <div className="srv-hc-timing-cell">
                      <div className="srv-hc-timing-val">{hc.healthyThreshold}✓</div>
                      <input type="range" min={1} max={10} step={1} value={hc.healthyThreshold} onChange={e => setHc({ healthyThreshold: parseInt(e.target.value) })} />
                      <div className="srv-hc-timing-lbl">healthy</div>
                    </div>
                    <div className="srv-hc-timing-cell">
                      <div className="srv-hc-timing-val">{hc.unhealthyThreshold}✗</div>
                      <input type="range" min={1} max={10} step={1} value={hc.unhealthyThreshold} onChange={e => setHc({ unhealthyThreshold: parseInt(e.target.value) })} />
                      <div className="srv-hc-timing-lbl">unhealthy</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="srv-drawer-footer">
          <button className="srv-foot-del" onClick={onDelete}>🗑 Delete</button>
          <div className="srv-foot-right">
            <button className="srv-foot-cancel" onClick={onClose}>Cancel</button>
            <button className="srv-foot-save" onClick={() => onSave(draft)}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ContainerCard – draggable bay card
   ═══════════════════════════════════════════════════════════════ */
function ContainerCard({
  container,
  index,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  container: DockerContainer;
  index: number;
  total: number;
  onEdit: () => void;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: () => void;
  isDragOver: boolean;
}) {
  const [accent, accentBg] = containerAccent(container.image);
  const hasHealth = Boolean(container.healthCheck);

  return (
    <div
      className={`srv-bay-card${isDragOver ? ' drag-over' : ''}`}
      style={{ '--card-accent': accent, '--card-accent-bg': accentBg } as React.CSSProperties}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={onDrop}
      onClick={onEdit}
    >
      <div className="srv-bay-card-stripe" />

      <div className="srv-bay-drag-handle" onClick={e => e.stopPropagation()}>
        <span /><span /><span />
      </div>

      <div className="srv-bay-img-icon" style={{ background: accentBg, color: accent }}>
        {container.image ? container.image.slice(0, 2).toUpperCase() : '??'}
      </div>

      <div className="srv-bay-info">
        <div className="srv-bay-name">{container.name || <em>unnamed</em>}</div>
        {container.image && (
          <div className="srv-bay-image">{container.image}:{container.tag}</div>
        )}
        {container.ports.length > 0 && (
          <div className="srv-bay-ports">
            {container.ports.slice(0, 4).map((p, i) => (
              <span key={i} className="srv-bay-port-pill">
                {p.hostPort}→{p.containerPort}
              </span>
            ))}
            {container.ports.length > 4 && (
              <span className="srv-bay-port-pill srv-bay-port-pill--more">+{container.ports.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <div className="srv-bay-badges">
        {hasHealth && <span className="srv-bay-badge srv-bay-badge--health" title="Health check">♥</span>}
        {container.env.length > 0 && <span className="srv-bay-badge" title={`${container.env.length} env vars`}>{container.env.length}e</span>}
        {container.volumes.length > 0 && <span className="srv-bay-badge" title={`${container.volumes.length} volumes`}>{container.volumes.length}v</span>}
        <span className="srv-bay-restart-dot" style={{ background: RESTART_COLOR[container.restartPolicy] }} title={`restart: ${container.restartPolicy}`} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ContainerBay
   ═══════════════════════════════════════════════════════════════ */
function ContainerBay({ node, onChange }: { node: CyNode; onChange: (n: CyNode) => void }) {
  const containers = node.config.containers ?? [];
  const [editId, setEditId] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const setContainers = (next: DockerContainer[]) =>
    onChange({ ...node, config: { ...node.config, containers: next } });

  const handleDrop = (toIdx: number) => {
    if (dragFrom === null || dragFrom === toIdx) { setDragFrom(null); setDragOver(null); return; }
    const next = [...containers];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(toIdx, 0, moved);
    setContainers(next);
    setDragFrom(null);
    setDragOver(null);
  };

  const addNew = () => {
    const c: DockerContainer = {
      id: nextContainerId(), name: '', image: '', tag: 'latest',
      ports: [], env: [], volumes: [], resources: {}, restartPolicy: 'unless-stopped',
    };
    setContainers([...containers, c]);
    setEditId(c.id);
  };

  const saveContainer = (c: DockerContainer) => {
    setContainers(containers.find(x => x.id === c.id) ? containers.map(x => x.id === c.id ? c : x) : [...containers, c]);
    setEditId(null);
  };

  const editingContainer = editId ? (containers.find(c => c.id === editId) ?? null) : null;

  return (
    <div className="srv-bay-section">
      <div className="srv-section-header">
        <div className="srv-section-header-left">
          <span className="srv-section-icon">📦</span>
          <h3 className="srv-section-title">Container Bay</h3>
          <span className="srv-count-chip">{containers.length}</span>
        </div>
        <button className="srv-add-btn" onClick={addNew}>+ New Container</button>
      </div>

      <div className="srv-bay-grid">
        {containers.map((c, i) => (
          <ContainerCard
            key={c.id}
            container={c}
            index={i}
            total={containers.length}
            onEdit={() => setEditId(c.id)}
            onDragStart={setDragFrom}
            onDragOver={setDragOver}
            onDrop={() => handleDrop(i)}
            isDragOver={dragOver === i}
          />
        ))}
        <button className="srv-bay-card srv-bay-card--new" onClick={addNew}>
          <div className="srv-bay-new-icon">＋</div>
          <div className="srv-bay-new-label">Add Container</div>
        </button>
      </div>

      {editingContainer && (
        <ContainerDrawer
          container={editingContainer}
          onSave={saveContainer}
          onDelete={() => { setContainers(containers.filter(c => c.id !== editId)); setEditId(null); }}
          onClose={() => setEditId(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HardwarePanel
   ═══════════════════════════════════════════════════════════════ */
function HardwarePanel({ node, onChange }: { node: CyNode; onChange: (n: CyNode) => void }) {
  const spec = catalog[node.type];
  const cfg = node.config;
  const patch = (p: Partial<typeof cfg>) => onChange({ ...node, config: { ...cfg, ...p } });

  const cpuCores = cfg.cpuCores ?? 0;
  const ramGb    = cfg.ramGb   ?? 0;
  const diskGb   = cfg.diskGb  ?? 0;
  const cores = cpuCores > 0 ? Array.from({ length: Math.max(1, Math.min(64, Math.round(cpuCores))) }) : [];

  return (
    <div className="srv-hw-panel">
      <div className="srv-hw-identity">
        <div className="srv-hw-type-badge" style={{ background: spec?.color ?? '#e2e8f0', color: spec?.textColor ?? '#334155' }}>
          <span className="srv-hw-type-icon">{spec?.icon ?? '⚙'}</span>
          <span className="srv-hw-type-label">{spec?.label ?? node.type}</span>
        </div>

        <input
          className="srv-hw-name-input"
          value={node.label}
          onChange={e => onChange({ ...node, label: e.target.value })}
          placeholder="Node label"
        />

        <div className="srv-hw-meta-row">
          <div className="srv-hw-meta-item">
            <span className="srv-hw-meta-icon">🌐</span>
            <input className="srv-hw-meta-input" placeholder="0.0.0.0" value={cfg.ip ?? ''} onChange={e => patch({ ip: e.target.value || undefined })} />
          </div>
          <div className="srv-hw-meta-item">
            <span className="srv-hw-meta-icon">{osIcon(cfg.osType)}</span>
            <select className="srv-hw-meta-select" value={cfg.osType ?? ''} onChange={e => patch({ osType: e.target.value || undefined })}>
              <option value="">OS / Runtime</option>
              {['ubuntu-22.04','ubuntu-20.04','debian-12','alpine-3.18','centos-9','amazon-linux-2023','windows-server-2022','custom'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="srv-hw-meta-item">
            <span className="srv-hw-meta-icon">⚡</span>
            <input type="number" min={1} max={999} className="srv-hw-meta-input srv-hw-meta-input--num" value={cfg.instances} onChange={e => patch({ instances: Math.max(1, parseInt(e.target.value) || 1) })} />
            <span className="srv-hw-meta-unit">instances</span>
          </div>
        </div>
      </div>

      <div className="srv-hw-meters">
        {/* CPU */}
        <div className="srv-hw-meter srv-hw-meter--cpu">
          <div className="srv-hw-meter-head">
            <span className="srv-hw-meter-icon">⚡</span>
            <span className="srv-hw-meter-label">CPU</span>
            <input type="number" min={0} max={256} step={0.25} className="srv-hw-meter-input" placeholder="cores" value={cfg.cpuCores ?? ''} onChange={e => patch({ cpuCores: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <span className="srv-hw-meter-unit">vCPU</span>
          </div>
          {cores.length > 0 ? (
            <div className="srv-cpu-grid">
              {cores.map((_, i) => <div key={i} className="srv-cpu-core" style={{ animationDelay: `${i * 0.05}s` }} />)}
            </div>
          ) : <div className="srv-hw-placeholder">— not set —</div>}
        </div>

        {/* RAM */}
        <div className="srv-hw-meter srv-hw-meter--ram">
          <div className="srv-hw-meter-head">
            <span className="srv-hw-meter-icon">🧠</span>
            <span className="srv-hw-meter-label">RAM</span>
            <input type="number" min={0} step={0.5} className="srv-hw-meter-input" placeholder="GB" value={cfg.ramGb ?? ''} onChange={e => patch({ ramGb: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <span className="srv-hw-meter-unit">GB</span>
          </div>
          {ramGb > 0 ? (
            <div className="srv-ram-bar-outer">
              {Array.from({ length: Math.min(32, Math.ceil(ramGb)) }).map((_, i) => (
                <div key={i} className="srv-ram-segment" style={{ opacity: i < ramGb ? 1 : 0.15, animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          ) : <div className="srv-hw-placeholder">— not set —</div>}
        </div>

        {/* Disk */}
        <div className="srv-hw-meter srv-hw-meter--disk">
          <div className="srv-hw-meter-head">
            <span className="srv-hw-meter-icon">💾</span>
            <span className="srv-hw-meter-label">Disk</span>
            <input type="number" min={0} step={10} className="srv-hw-meter-input" placeholder="GB" value={cfg.diskGb ?? ''} onChange={e => patch({ diskGb: e.target.value ? parseFloat(e.target.value) : undefined })} />
            <span className="srv-hw-meter-unit">GB</span>
          </div>
          {diskGb > 0 ? (
            <div className="srv-disk-visual">
              <div className="srv-disk-cylinder">
                <div className="srv-disk-fill" style={{ height: `${Math.min(100, (diskGb / 2000) * 100)}%` }} />
              </div>
              <span className="srv-disk-label">{diskGb} GB</span>
            </div>
          ) : <div className="srv-hw-placeholder">— not set —</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PortsPanel
   ═══════════════════════════════════════════════════════════════ */
const WELL_KNOWN: Record<number, string> = {
  22: 'SSH', 80: 'HTTP', 443: 'HTTPS', 3000: 'App', 3306: 'MySQL',
  5432: 'PG', 6379: 'Redis', 8080: 'HTTP-Alt', 27017: 'Mongo', 9200: 'ES',
};
const PORT_COLORS = ['#0ea5e9','#7c3aed','#16a34a','#f59e0b','#e11d48','#06b6d4','#8b5cf6','#d97706'];

function PortsPanel({ node, onChange }: { node: CyNode; onChange: (n: CyNode) => void }) {
  const ports = node.config.hostPorts ?? [];
  const setPorts = (next: HostPort[]) => onChange({ ...node, config: { ...node.config, hostPorts: next } });

  const add = () => setPorts([...ports, { id: nextHostPortId(), port: 80, protocol: 'tcp', service: '' }]);
  const upd = (id: string, f: keyof HostPort, v: string | number) =>
    setPorts(ports.map(p => p.id === id ? { ...p, [f]: v } : p));
  const del = (id: string) => setPorts(ports.filter(p => p.id !== id));

  return (
    <div className="srv-panel">
      <div className="srv-section-header">
        <div className="srv-section-header-left">
          <span className="srv-section-icon">🔌</span>
          <h3 className="srv-section-title">Exposed Ports</h3>
          <span className="srv-count-chip">{ports.length}</span>
        </div>
        <button className="srv-add-btn" onClick={add}>+ Add Port</button>
      </div>

      {ports.length === 0 ? (
        <div className="srv-port-empty">No host ports defined.</div>
      ) : (
        <div className="srv-ports-rack">
          {ports.map((p, i) => (
            <div key={p.id} className="srv-ports-jack" style={{ '--jack-color': PORT_COLORS[i % PORT_COLORS.length] } as React.CSSProperties}>
              <div className="srv-jack-hole" />
              <input type="number" className="srv-jack-port" min={1} max={65535} value={p.port} onChange={e => upd(p.id, 'port', parseInt(e.target.value) || 80)} />
              <input className="srv-jack-service" placeholder={WELL_KNOWN[p.port] ?? 'Service'} value={p.service} onChange={e => upd(p.id, 'service', e.target.value)} />
              <select className="srv-jack-proto" value={p.protocol} onChange={e => upd(p.id, 'protocol', e.target.value)}>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
              <button className="srv-jack-del" onClick={() => del(p.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FirewallPanel
   ═══════════════════════════════════════════════════════════════ */
const QUICK_RULES = [
  { label: 'SSH', port: '22' }, { label: 'HTTP', port: '80' },
  { label: 'HTTPS', port: '443' }, { label: 'PG', port: '5432' },
  { label: 'MySQL', port: '3306' }, { label: 'Redis', port: '6379' },
];

function FirewallPanel({ node, onChange }: { node: CyNode; onChange: (n: CyNode) => void }) {
  const rules = node.config.firewallRules ?? [];
  const [dir, setDir] = useState<'inbound'|'outbound'>('inbound');

  const setRules = (next: FirewallRule[]) => onChange({ ...node, config: { ...node.config, firewallRules: next } });
  const add = () => setRules([...rules, { id: nextFirewallId(), direction: dir, protocol: 'tcp', portRange: '80', cidr: '0.0.0.0/0', action: 'allow' }]);
  const upd = (id: string, f: keyof FirewallRule, v: string | number) =>
    setRules(rules.map(r => r.id === id ? { ...r, [f]: v } : r));
  const del = (id: string) => setRules(rules.filter(r => r.id !== id));
  const addQuick = (port: string, label: string) =>
    setRules([...rules, { id: nextFirewallId(), direction: 'inbound', protocol: 'tcp', portRange: port, cidr: '0.0.0.0/0', action: 'allow', description: label }]);

  const shown = rules.filter(r => r.direction === dir);

  return (
    <div className="srv-panel">
      <div className="srv-section-header">
        <div className="srv-section-header-left">
          <span className="srv-section-icon">🛡</span>
          <h3 className="srv-section-title">Firewall</h3>
          <span className="srv-count-chip">{rules.length}</span>
        </div>
      </div>

      <div className="srv-fw-quick">
        <span className="srv-fw-quick-label">Quick allow:</span>
        {QUICK_RULES.map(q => (
          <button key={q.port} className="srv-fw-quick-pill" onClick={() => addQuick(q.port, q.label)}>
            {q.label} :{q.port}
          </button>
        ))}
      </div>

      <div className="srv-fw-dir-row">
        <button className={`srv-fw-dir-btn${dir === 'inbound' ? ' active' : ''}`} onClick={() => setDir('inbound')}>
          ↓ Inbound <span className="srv-fw-count">{rules.filter(r => r.direction === 'inbound').length}</span>
        </button>
        <button className={`srv-fw-dir-btn${dir === 'outbound' ? ' active' : ''}`} onClick={() => setDir('outbound')}>
          ↑ Outbound <span className="srv-fw-count">{rules.filter(r => r.direction === 'outbound').length}</span>
        </button>
        <button className="srv-add-btn" style={{ marginLeft: 'auto' }} onClick={add}>+ Add Rule</button>
      </div>

      {shown.length === 0 ? (
        <div className="srv-port-empty">No {dir} rules.</div>
      ) : (
        <div className="srv-fw-rules-list">
          {shown.map(r => (
            <div key={r.id} className={`srv-fw-rule${r.action === 'deny' ? ' srv-fw-rule--deny' : ''}`}>
              <button className={`srv-fw-action-badge srv-fw-action-badge--${r.action}`} onClick={() => upd(r.id, 'action', r.action === 'allow' ? 'deny' : 'allow')}>
                {r.action === 'allow' ? '✓ ALLOW' : '✕ DENY'}
              </button>
              <select className="srv-fw-select" value={r.protocol} onChange={e => upd(r.id, 'protocol', e.target.value)}>
                <option value="tcp">TCP</option><option value="udp">UDP</option>
                <option value="icmp">ICMP</option><option value="all">ALL</option>
              </select>
              <div className="srv-fw-port-wrap">
                <span className="srv-fw-port-label">:</span>
                <input className="srv-fw-port-input srv-mono" placeholder="80 or 80-443" value={r.portRange} onChange={e => upd(r.id, 'portRange', e.target.value)} />
              </div>
              <input className="srv-fw-cidr srv-mono" placeholder="0.0.0.0/0" value={r.cidr} onChange={e => upd(r.id, 'cidr', e.target.value)} />
              <input className="srv-fw-note" placeholder="note…" value={r.description ?? ''} onChange={e => upd(r.id, 'description', e.target.value)} />
              <button className="srv-row-del" onClick={() => del(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EnvPanel
   ═══════════════════════════════════════════════════════════════ */
function EnvPanel({ node, onChange }: { node: CyNode; onChange: (n: CyNode) => void }) {
  const vars = node.config.globalEnv ?? [];
  const setVars = (next: EnvVar[]) => onChange({ ...node, config: { ...node.config, globalEnv: next } });

  const add = () => setVars([...vars, { key: '', value: '' }]);
  const upd = (i: number, f: keyof EnvVar, v: string | boolean) =>
    setVars(vars.map((x, idx) => idx === i ? { ...x, [f]: v } : x));
  const del = (i: number) => setVars(vars.filter((_, idx) => idx !== i));

  return (
    <div className="srv-panel">
      <div className="srv-section-header">
        <div className="srv-section-header-left">
          <span className="srv-section-icon">📋</span>
          <h3 className="srv-section-title">Global Env</h3>
          <span className="srv-count-chip">{vars.length}</span>
        </div>
        <button className="srv-add-btn" onClick={add}>+ Add</button>
      </div>
      {vars.length === 0 ? (
        <div className="srv-port-empty">No global env vars.</div>
      ) : (
        <div className="srv-env-table">
          <div className="srv-env-thead"><span>KEY</span><span>VALUE</span><span /></div>
          {vars.map((v, i) => (
            <div key={i} className="srv-env-row">
              <input className="srv-env-key srv-mono" placeholder="VARIABLE_NAME" value={v.key} onChange={e => upd(i, 'key', e.target.value)} />
              <input className={`srv-env-val${v.secret ? ' secret' : ''}`} type={v.secret ? 'password' : 'text'} placeholder="value" value={v.value} onChange={e => upd(i, 'value', e.target.value)} />
              <div className="srv-env-actions">
                <button className={`srv-secret-btn${v.secret ? ' on' : ''}`} onClick={() => upd(i, 'secret', !v.secret)}>🔒</button>
                <button className="srv-row-del" onClick={() => del(i)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PerformancePanel
   ═══════════════════════════════════════════════════════════════ */
function PerformancePanel({ node, onChange }: { node: CyNode; onChange: (n: CyNode) => void }) {
  const spec = catalog[node.type];
  const cfg = node.config;
  const patch = (p: Partial<typeof cfg>) => onChange({ ...node, config: { ...cfg, ...p } });

  const latency    = cfg.customLatencyMs    ?? spec?.latencyMs.avg   ?? 0;
  const throughput = cfg.customThroughputRps ?? spec?.throughputRps   ?? 0;
  const cost       = cfg.customCostPerHour   ?? spec?.costPerHour     ?? 0;
  const fmt = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(1)+'K' : n.toFixed(0);

  return (
    <div className="srv-panel">
      <div className="srv-section-header">
        <div className="srv-section-header-left">
          <span className="srv-section-icon">📊</span>
          <h3 className="srv-section-title">Performance &amp; Cost</h3>
        </div>
      </div>
      <div className="srv-perf-grid">
        <div className={`srv-perf-card${cfg.customLatencyMs !== undefined ? ' custom' : ''}`}>
          <div className="srv-perf-card-icon">⏱</div>
          <div className="srv-perf-card-label">Avg Latency</div>
          <div className="srv-perf-card-value">{latency}<span className="srv-perf-unit">ms</span></div>
          <input type="number" min={0} className="srv-perf-override" placeholder={`${spec?.latencyMs.avg ?? 0} (catalog)`} value={cfg.customLatencyMs ?? ''} onChange={e => patch({ customLatencyMs: e.target.value ? parseFloat(e.target.value) : undefined })} />
          {cfg.customLatencyMs !== undefined && <button className="srv-perf-reset" onClick={() => patch({ customLatencyMs: undefined })}>reset</button>}
        </div>
        <div className={`srv-perf-card${cfg.customThroughputRps !== undefined ? ' custom' : ''}`}>
          <div className="srv-perf-card-icon">⚡</div>
          <div className="srv-perf-card-label">Throughput</div>
          <div className="srv-perf-card-value">{fmt(throughput)}<span className="srv-perf-unit">rps</span></div>
          <input type="number" min={0} className="srv-perf-override" placeholder={`${spec?.throughputRps ?? 0} (catalog)`} value={cfg.customThroughputRps ?? ''} onChange={e => patch({ customThroughputRps: e.target.value ? parseFloat(e.target.value) : undefined })} />
          {cfg.customThroughputRps !== undefined && <button className="srv-perf-reset" onClick={() => patch({ customThroughputRps: undefined })}>reset</button>}
        </div>
        <div className={`srv-perf-card${cfg.customCostPerHour !== undefined ? ' custom' : ''}`}>
          <div className="srv-perf-card-icon">💰</div>
          <div className="srv-perf-card-label">Cost / hr</div>
          <div className="srv-perf-card-value">${cost.toFixed(3)}</div>
          <input type="number" min={0} step={0.001} className="srv-perf-override" placeholder={`${spec?.costPerHour ?? 0} (catalog)`} value={cfg.customCostPerHour ?? ''} onChange={e => patch({ customCostPerHour: e.target.value ? parseFloat(e.target.value) : undefined })} />
          {cfg.customCostPerHour !== undefined && <button className="srv-perf-reset" onClick={() => patch({ customCostPerHour: undefined })}>reset</button>}
        </div>
      </div>
      {spec && (
        <div className="srv-spec-row">
          <span>{spec.description}</span>
          {spec.horizontallyScalable
            ? <span className="srv-spec-tag srv-spec-tag--green">Horizontally scalable</span>
            : <span className="srv-spec-tag srv-spec-tag--red">Not horizontally scalable</span>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NotesPanel
   ═══════════════════════════════════════════════════════════════ */
function NotesPanel({ node, onChange }: { node: CyNode; onChange: (n: CyNode) => void }) {
  return (
    <div className="srv-panel srv-panel--notes">
      <div className="srv-section-header">
        <div className="srv-section-header-left">
          <span className="srv-section-icon">📝</span>
          <h3 className="srv-section-title">Notes</h3>
        </div>
      </div>
      <textarea
        className="srv-notes-area"
        rows={4}
        placeholder="Architecture decisions, caveats, links to runbooks…"
        value={node.config.notes ?? ''}
        onChange={e => onChange({ ...node, config: { ...node.config, notes: e.target.value || undefined } })}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NodeDetailPage – root
   ═══════════════════════════════════════════════════════════════ */
export default function NodeDetailPage() {
  const { projectId, nodeId, requestId } = useParams<{ projectId: string; nodeId: string; requestId?: string }>();
  const navigate = useNavigate();
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
  const [saveStatus, setSaveStatus] = useState<'saved'|'saving'|'unsaved'>('saved');
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

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const backUrl = requestId ? `/projects/${projectId}/requests/${requestId}` : `/projects/${projectId}`;
  const isCompute = COMPUTE_TYPES.has(localNode?.type ?? '');
  const isData    = DATA_TYPES.has(localNode?.type ?? '');

  if (!project || !localNode) {
    return (
      <div className="srv-root srv-error">
        <p>{!project ? 'Project not found.' : `Node "${nodeId}" not found.`}</p>
        <Link to={project ? backUrl : '/projects'}>← Go back</Link>
      </div>
    );
  }

  const reqName = requestId ? findLeafById(project.requests, requestId)?.name : null;

  return (
    <div className="srv-root">
      <div className="srv-topbar">
        <div className="srv-breadcrumb">
          <button className="srv-back-btn" onClick={() => navigate(backUrl)}>←</button>
          <Link to={backUrl} className="srv-bc-link">{project.name}</Link>
          {reqName && (<><span className="srv-bc-sep">/</span><Link to={backUrl} className="srv-bc-link">{reqName}</Link></>)}
          <span className="srv-bc-sep">/</span>
          <span className="srv-bc-current">{localNode.label}</span>
        </div>
        <span className={`srv-save-pill srv-save-pill--${saveStatus}`}>
          {saveStatus === 'saved' ? '✓ saved' : saveStatus === 'saving' ? '…' : '● unsaved'}
        </span>
      </div>

      <div className="srv-body">
        <HardwarePanel node={localNode} onChange={handleChange} />
        {isCompute && <ContainerBay node={localNode} onChange={handleChange} />}

        <div className="srv-two-col">
          <div className="srv-col-main">
            <PortsPanel node={localNode} onChange={handleChange} />
            <PerformancePanel node={localNode} onChange={handleChange} />
          </div>
          <div className="srv-col-side">
            {(isCompute || isData) && <EnvPanel node={localNode} onChange={handleChange} />}
            <FirewallPanel node={localNode} onChange={handleChange} />
            <NotesPanel node={localNode} onChange={handleChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
