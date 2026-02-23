/* ═══════════════════════════════════════════════════════════════
   Editor.tsx – Infinite SVG canvas editor
   Features: pan/zoom, drag nodes, connect handles, right-click
   context menu, floating palette, node inspector, analysis panel.
   ═══════════════════════════════════════════════════════════════ */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import catalog from '../data/componentCatalog';
import { CLOUD_MAPPINGS } from '../data/cloudInstanceTypes';
import type { CloudServiceOption } from '../data/cloudInstanceTypes';
import { analyzeCanvas } from '../utils/analysisEngine';
import { buildEdge, buildNode, edgePath, NODE_H, NODE_W, nodeCenter } from '../utils/canvasUtils';
import {
  AnalysisResult,
  CanvasState,
  ContextMenuState,
  CyEdge,
  CyNode,
  Phase,
  ViewportState,
} from '../types';
import type {
  CloudProvider,
  DeploymentMode,
} from '../types';

/* ── Constants ────────────────────────────────────────────────── */
const MIN_SCALE = 0.15;
const MAX_SCALE = 3;
const HANDLE_R = 7;

/* ── Helpers ─────────────────────────────────────────────────── */
function screenToCanvas(
  screenX: number,
  screenY: number,
  vp: ViewportState,
  svgRect: DOMRect
): { x: number; y: number } {
  return {
    x: (screenX - svgRect.left - vp.x) / vp.scale,
    y: (screenY - svgRect.top - vp.y) / vp.scale,
  };
}

function handlePositions(node: CyNode) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  return {
    top:    { x: cx,              y: node.y },
    bottom: { x: cx,              y: node.y + node.height },
    left:   { x: node.x,          y: cy },
    right:  { x: node.x + node.width,  y: cy },
  };
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)    return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

/* ── Sub-components ───────────────────────────────────────────── */

/* Node card rendered inside SVG foreignObject */
/*function NodeCard({
  node,
  selected,
  isBottleneck,
  onMouseDown,
}: {
  node: CyNode;
  selected: boolean;
  isBottleneck: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const spec = catalog[node.type];
  const instances = node.config.instances;
  return (
    <div
      className={`canvas-node${selected ? ' selected' : ''}${isBottleneck ? ' bottleneck' : ''}`}
      onMouseDown={onMouseDown}
    >
      <div className="canvas-node-header" style={{ background: spec?.color ?? '#e5e7eb', color: spec?.textColor ?? '#111' }}>
        <span className="canvas-node-icon">{spec?.icon ?? '?'}</span>
        <span className="canvas-node-category">{spec?.category ?? 'unknown'}</span>
        {isBottleneck && <span className="bottleneck-badge">⚠ bottleneck</span>}
      </div>
      <div className="canvas-node-body">
        <div className="canvas-node-label">{node.label}</div>
        {instances > 1 && (
          <div className="canvas-node-instances">×{instances}</div>
        )}
      </div>
    </div>
  );
}*/


const ServerIcon = ({ size = 28, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="6" rx="2" />
    <rect x="3" y="13" width="18" height="6" rx="2" />
    <circle cx="7" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="7" cy="16" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const DatabaseIcon = ({ size = 28, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 6c0 1.657 3.582 3 8 3s8-1.343 8-3-3.582-3-8-3-8 1.343-8 3z" />
    <path d="M4 6v12c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
    <path d="M4 12c0 1.657 3.582 3 8 3s8-1.343 8-3" />
  </svg>
);

const LoadBalancerIcon = ({ size = 28, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="15" y="15" width="6" height="6" rx="1.5" />
    <rect x="3" y="15" width="6" height="6" rx="1.5" />
    <rect x="9" y="3" width="6" height="6" rx="1.5" />
    <path d="M12 9v2" />
    <path d="M12 11H6v4" />
    <path d="M12 11h6v4" />
  </svg>
);

const CacheIcon = ({ size = 28, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 9h6" />
    <path d="M9 15h6" />
  </svg>
);

// UI/Badge Icons
const AlertIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LayersIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);

const NetworkIcon = ({ size = 12, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M12 8v4" />
    <path d="M12 12H5v4" />
    <path d="M12 12h7v4" />
  </svg>
);


export interface CatalogSpec {
  icon: React.ReactNode;
  color: string;       // Used for the top accent bar
  iconBg: string;      // Used for the prominent icon background
  textColor: string;   // Used for category text and icon stroke
  category: string;
}

const CATALOG: Record<string, CatalogSpec> = {
  web_server: {
    icon: <ServerIcon size={28} />,
    color: '#3b82f6',     // blue-500
    iconBg: '#eff6ff',    // blue-50
    textColor: '#2563eb', // blue-600
    category: 'Compute',
  },
  database: {
    icon: <DatabaseIcon size={28} />,
    color: '#ec4899',     // pink-500
    iconBg: '#fdf2f8',    // pink-50
    textColor: '#db2777', // pink-600
    category: 'Storage',
  },
  loadbalancer: {
    icon: <LoadBalancerIcon size={28} />,
    color: '#10b981',     // emerald-500
    iconBg: '#ecfdf5',    // emerald-50
    textColor: '#059669', // emerald-600
    category: 'Network',
  },
  cache: {
    icon: <CacheIcon size={28} />,
    color: '#f59e0b',     // amber-500
    iconBg: '#fffbeb',    // amber-50
    textColor: '#d97706', // amber-600
    category: 'Memory',
  },
};

interface NodeCardProps {
  node: CyNode;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  isBottleneck: boolean
}

function NodeCard({ node, selected, isBottleneck, onMouseDown }: NodeCardProps) {
  // Fallback spec if type is unknown
  const spec = CATALOG[node.type] || {
    icon: <ServerIcon size={28} />, color: '#64748b', iconBg: '#f8fafc', textColor: '#475569', category: 'Unknown'
  };
  const instances = node.config.instances || 1;
  const ipAddress = node.config.ip || 'Unassigned IP';

  let cardClasses = "node-card";
  if (selected) cardClasses += " selected";
  if (isBottleneck) cardClasses += " bottleneck";

  return (
    <div className={cardClasses} onMouseDown={onMouseDown}>
      {/* Floating Badges */}
      {isBottleneck && (
        <div className="badge-alert">
          <AlertIcon size={12} /> Bottleneck
        </div>
      )}
      {instances > 1 && (
        <div className="badge-instances">
          <LayersIcon size={12} /> &times;{instances}
        </div>
      )}

      {/* Prominent Vector Icon Area (Replicating User Image) */}
      <div 
        className="icon-area"
        style={{ backgroundColor: spec.iconBg, color: spec.textColor }}
      >
        {spec.icon}
      </div>

      {/* Clean Text Details Area */}
      <div className="text-area">
        <div 
          className="category-text" 
          style={{ color: spec.textColor }}
        >
          {spec.category}
        </div>
        
        <div className="label-text" title={node.label}>
          {node.label}
        </div>
        
        <div className="ip-text">
          <NetworkIcon size={11} />
          <span>{ipAddress}</span>
        </div>
      </div>
    </div>
  );
}


/* ── Instance Picker (cloud deployment modal) ────────────────── */
function InstancePicker({
  node,
  onUpdate,
  onClose,
}: {
  node: CyNode;
  onUpdate: (updated: CyNode) => void;
  onClose: () => void;
}) {
  const spec = catalog[node.type];
  const mode: DeploymentMode = node.config.deployment ?? 'local';
  const cloudOptions: CloudServiceOption[] = CLOUD_MAPPINGS[node.type] ?? [];
  const hasCloud = cloudOptions.length > 0;
  const activeProvider = node.config.cloudProvider;
  const activeService = cloudOptions.find((o) => o.provider === activeProvider);
  const activeInstanceType = activeService?.instanceTypes.find(
    (t) => t.id === node.config.instanceType
  );

  const PROVIDER_COLORS: Record<string, string> = { aws: '#FF9900', gcp: '#4285F4', azure: '#0078D4' };
  const PROVIDER_LABELS: Record<string, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };

  const updateConfig = (patch: Partial<typeof node.config>) =>
    onUpdate({ ...node, config: { ...node.config, ...patch } });

  const setMode = (m: DeploymentMode) => {
    if (m === 'local') {
      updateConfig({ deployment: 'local', cloudProvider: undefined, instanceType: undefined, region: undefined, customCostPerHour: undefined });
    } else {
      const first = cloudOptions[0];
      const firstIt = first?.instanceTypes[0];
      updateConfig({
        deployment: 'cloud',
        cloudProvider: first?.provider as CloudProvider,
        instanceType: firstIt?.id,
        region: first?.regions[0],
        customCostPerHour: firstIt?.costPerHour,
      });
    }
  };

  const setProvider = (p: CloudProvider) => {
    const svc = cloudOptions.find((o) => o.provider === p);
    const firstIt = svc?.instanceTypes[0];
    updateConfig({
      cloudProvider: p,
      instanceType: firstIt?.id,
      region: svc?.regions[0],
      customCostPerHour: firstIt?.costPerHour,
    });
  };

  return (
    <div className="instance-picker">
      {/* Header */}
      <div className="instance-picker-header">
          <div className="ip-title-row">
            <span className="ip-icon" style={{ background: spec?.color, color: spec?.textColor }}>
              {spec?.icon ?? '?'}
            </span>
            <div>
              <div className="ip-node-label">{node.label}</div>
              <div className="ip-node-type">{spec?.label ?? node.type}</div>
            </div>
          </div>
          <button className="ip-close" onClick={onClose}>✕</button>
        </div>

        <div className="ip-body">

          {/* Mode toggle */}
          <div className="ip-section-label">Deployment Mode</div>
          <div className="deploy-mode-toggle">
            <button
              className={`deploy-mode-btn${mode === 'local' ? ' active' : ''}`}
              onClick={() => setMode('local')}
            >
              🖥 Local / Test
            </button>
            <button
              className={`deploy-mode-btn${mode === 'cloud' ? ' active' : ''}`}
              onClick={() => setMode('cloud')}
              disabled={!hasCloud}
              title={!hasCloud ? 'No cloud mappings for this component type' : undefined}
            >
              ☁ Cloud
            </button>
          </div>
          {!hasCloud && (
            <p className="ip-no-cloud">No cloud provider mappings available for this component type yet.</p>
          )}

          {mode === 'local' && (
            <>
              {/* Local Configuration / Override Specs */}
              <div className="ip-section-label">Override Default Specs</div>
              
              <div className="ip-section">
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
                  Custom Latency (ms)
                </label>
                <input
                  className="ip-select"
                  type="number" min={0}
                  placeholder={`Default: ${spec?.latencyMs.avg ?? 0} ms`}
                  value={node.config.customLatencyMs ?? ''}
                  onChange={(e) =>
                    updateConfig({ customLatencyMs: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                />
              </div>

              <div className="ip-section">
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
                  Custom Throughput (rps)
                </label>
                <input
                  className="ip-select"
                  type="number" min={0}
                  placeholder={`Default: ${formatNumber(spec?.throughputRps ?? 0)} rps`}
                  value={node.config.customThroughputRps ?? ''}
                  onChange={(e) =>
                    updateConfig({ customThroughputRps: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                />
              </div>

              <div className="ip-section">
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
                  Custom Cost ($/hr)
                </label>
                <input
                  className="ip-select"
                  type="number" min={0} step={0.001}
                  placeholder={`Default: $${spec?.costPerHour ?? 0}/hr`}
                  value={node.config.customCostPerHour ?? ''}
                  onChange={(e) =>
                    updateConfig({ customCostPerHour: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                />
              </div>
            </>
          )}

          {mode === 'cloud' && hasCloud && (
            <>
              {/* Provider tabs */}
              <div className="ip-section-label">Provider</div>
              <div className="deploy-provider-tabs">
                {cloudOptions.map((svc) => (
                  <button
                    key={svc.provider}
                    className={`deploy-provider-tab${activeProvider === svc.provider ? ' active' : ''}`}
                    style={{ '--provider-color': PROVIDER_COLORS[svc.provider] } as React.CSSProperties}
                    onClick={() => setProvider(svc.provider as CloudProvider)}
                  >
                    {PROVIDER_LABELS[svc.provider]}
                  </button>
                ))}
              </div>

              {activeService && (
                <>
                  {/* Service card */}
                  <div className="ip-service-card">
                    <span
                      className="ip-service-badge"
                      style={{ background: PROVIDER_COLORS[activeService.provider] }}
                    >
                      {PROVIDER_LABELS[activeService.provider]}
                    </span>
                    <div className="ip-service-info">
                      <span className="ip-service-name">{activeService.serviceName}</span>
                      <code className="ip-tf-resource">{activeService.terraformResource}</code>
                    </div>
                  </div>

                  {/* Instance / tier */}
                  {activeService.instanceTypes.length > 0 && (
                    <div className="ip-section">
                      <div className="ip-section-label">
                        Instance Type
                        {activeService.terraformInstanceField && (
                          <code className="ip-tf-field">{activeService.terraformInstanceField}</code>
                        )}
                      </div>
                      <select
                        className="ip-select"
                        value={node.config.instanceType ?? ''}
                        onChange={(e) => {
                          const it = activeService.instanceTypes.find((t) => t.id === e.target.value);
                          updateConfig({ instanceType: e.target.value, customCostPerHour: it?.costPerHour });
                        }}
                      >
                        {activeService.instanceTypes.map((it) => (
                          <option key={it.id} value={it.id}>{it.label}</option>
                        ))}
                      </select>

                      {activeInstanceType && (
                        <div className="deploy-spec-pills" style={{ marginTop: 8 }}>
                          {activeInstanceType.vcpu !== null && (
                            <span className="pill">{activeInstanceType.vcpu} vCPU</span>
                          )}
                          {activeInstanceType.memoryGb !== null && (
                            <span className="pill">{activeInstanceType.memoryGb} GB RAM</span>
                          )}
                          <span className="pill pill-cost">
                            ${activeInstanceType.costPerHour.toFixed(
                              activeInstanceType.costPerHour < 0.01 ? 5 : 3
                            )}/hr
                          </span>
                        </div>
                      )}
                      {activeInstanceType?.notes && (
                        <div className="deploy-instance-note">{activeInstanceType.notes}</div>
                      )}
                    </div>
                  )}

                  {/* Region */}
                  <div className="ip-section">
                    <div className="ip-section-label">Region</div>
                    <select
                      className="ip-select"
                      value={node.config.region ?? activeService.regions[0]}
                      onChange={(e) => updateConfig({ region: e.target.value })}
                    >
                      {activeService.regions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="ip-footer">
          <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Done
          </button>
        </div>
    </div>
  );
}

/* ── Node Inspector ───────────────────────────────────────────── */


function NodeInspector({
  node,
  analysis,
  onUpdate,
  onDelete,
  onClose,
  onOpenPicker,
}: {
  node: CyNode;
  analysis: AnalysisResult | null;
  onUpdate: (updated: CyNode) => void;
  onDelete: () => void;
  onClose: () => void;
  onOpenPicker: (id: string) => void;
}) {
  const spec = catalog[node.type];
  const isBottleneck = analysis?.bottleneckNodeId === node.id;
  const mode: DeploymentMode = node.config.deployment ?? 'local';
  const cloudOptions = CLOUD_MAPPINGS[node.type] ?? [];
  const hasCloud = cloudOptions.length > 0;
  const PROVIDER_COLORS: Record<string, string> = { aws: '#FF9900', gcp: '#4285F4', azure: '#0078D4' };
  const PROVIDER_LABELS: Record<string, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };

  const updateConfig = (patch: Partial<typeof node.config>) =>
    onUpdate({ ...node, config: { ...node.config, ...patch } });

  return (
    <div className="inspector">
      <div className="inspector-header">
        <div className="inspector-title-row">
          <span className="inspector-icon" style={{ background: spec?.color, color: spec?.textColor }}>
            {spec?.icon ?? '?'}
          </span>
          <div>
            <div className="inspector-label-small">{spec?.category}</div>
            <div className="inspector-type">{spec?.label}</div>
          </div>
        </div>
        <button className="inspector-close" onClick={onClose}>✕</button>
      </div>

      {isBottleneck && (
        <div className="inspector-warning">
          ⚠ Bottleneck – lowest throughput in the critical path
        </div>
      )}

      {/* Label */}
      <div className="inspector-field">
        <label>Label</label>
        <input value={node.label} onChange={(e) => onUpdate({ ...node, label: e.target.value })} />
      </div>

      {/* Instances */}
      <div className="inspector-field">
        <label>Instances</label>
        <input
          type="number" min={1} max={100}
          value={node.config.instances}
          onChange={(e) => updateConfig({ instances: Number(e.target.value) || 1 })}
        />
      </div>

      {/* ── Deployment ──────────────────────────────────────── */}
      <div className="inspector-section-title">Deployment</div>
      <div className="deploy-summary-row">
        <div
          className="deploy-summary-badge"
          style={
            mode === 'cloud' && node.config.cloudProvider
              ? { borderColor: PROVIDER_COLORS[node.config.cloudProvider], color: PROVIDER_COLORS[node.config.cloudProvider] }
              : undefined
          }
        >
          {mode === 'cloud'
            ? `☁ ${PROVIDER_LABELS[node.config.cloudProvider ?? ''] ?? 'Cloud'}${node.config.instanceType ? ` · ${node.config.instanceType}` : ''}`
            : '🖥 Local / Test'}
        </div>
        {mode === 'cloud' && node.config.region && (
          <span className="deploy-summary-region">{node.config.region}</span>
        )}
      </div>
      <button
        className="deploy-configure-btn"
        onClick={() => onOpenPicker(node.id)}
        title={mode === 'cloud' ? 'Configure cloud deployment' : 'Configure local settings'}
      >
        {mode === 'cloud' ? '☁ Configure Deployment…' : '⚙ Configure…'}
      </button>

      {/* ── Spec Reference ──────────────────────────────────── */}
      {spec && (
        <>
          <div className="inspector-section-title">Spec Reference</div>
          <div className="inspector-specs">
            <div className="inspector-spec-row"><span>Avg latency</span><strong>{spec.latencyMs.avg} ms</strong></div>
            <div className="inspector-spec-row"><span>p99 latency</span><strong>{spec.latencyMs.p99} ms</strong></div>
            <div className="inspector-spec-row"><span>Peak throughput</span><strong>{formatNumber(spec.throughputRps)} rps</strong></div>
            <div className="inspector-spec-row"><span>Cost/hr</span><strong>${spec.costPerHour.toFixed(3)}</strong></div>
            <div className="inspector-spec-row"><span>Scalable</span><strong>{spec.horizontallyScalable ? '✅ Yes' : '❌ No'}</strong></div>
          </div>
          <div className="inspector-description">{spec.description}</div>
        </>
      )}

      <button className="inspector-delete-btn" onClick={onDelete}>
        🗑 Delete Node
      </button>
    </div>
  );
}


/* ── Analysis Panel ───────────────────────────────────────────── */
function AnalysisPanel({
  result,
  onClose,
}: {
  result: AnalysisResult;
  onClose: () => void;
}) {
  return (
    <div className="analysis-overlay">
      <div className="analysis-panel">
        <div className="analysis-header">
          <h2>Architecture Analysis</h2>
          <button className="analysis-close" onClick={onClose}>✕</button>
        </div>

        {/* Key metrics */}
        <div className="analysis-metrics">
          <div className="metric-card metric-latency">
            <div className="metric-value">{result.totalLatencyMs} ms</div>
            <div className="metric-label">Avg Latency</div>
          </div>
          <div className="metric-card metric-p99">
            <div className="metric-value">{result.p99LatencyMs} ms</div>
            <div className="metric-label">p99 Latency</div>
          </div>
          <div className="metric-card metric-throughput">
            <div className="metric-value">{formatNumber(result.throughputRps)}</div>
            <div className="metric-label">Max RPS</div>
          </div>
          <div className="metric-card metric-users">
            <div className="metric-value">{formatNumber(result.maxConcurrentUsers)}</div>
            <div className="metric-label">Max Concurrent Users</div>
          </div>
          <div className="metric-card metric-cost">
            <div className="metric-value">${result.costPerHour.toFixed(2)}</div>
            <div className="metric-label">Cost / Hour</div>
          </div>
          <div className="metric-card metric-costmil">
            <div className="metric-value">${result.costPerMillionRequests.toFixed(3)}</div>
            <div className="metric-label">Cost / 1M Requests</div>
          </div>
        </div>

        {/* Critical path */}
        {result.criticalPath.length > 0 && (
          <div className="analysis-section">
            <h3>Critical Path</h3>
            <p className="analysis-dimtext">
              The slowest route through your architecture (determines max latency).
            </p>
            <div className="critical-path">
              {result.criticalPath.map((id, i) => (
                <React.Fragment key={id}>
                  <span className={`cp-node${result.bottleneckNodeId === id ? ' cp-bottleneck' : ''}`}>
                    {id}
                    {result.bottleneckNodeId === id && ' ⚠'}
                  </span>
                  {i < result.criticalPath.length - 1 && (
                    <span className="cp-arrow">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            {result.bottleneckLabel && (
              <div className="analysis-bottleneck-note">
                ⚠ Bottleneck: <strong>{result.bottleneckLabel}</strong>
              </div>
            )}
          </div>
        )}

        {/* Distribution Gain */}
        {result.distributionGain && (
          <div className="analysis-section analysis-distribution">
            <h3>🚀 Distribution Analysis – Monolith vs. Microservices</h3>
            <div className="dist-comparison">
              <div className="dist-col dist-current">
                <div className="dist-col-title">Current (Monolith)</div>
                <div className="dist-row"><span>Max Users</span><strong>{formatNumber(result.distributionGain.currentMaxUsers)}</strong></div>
                <div className="dist-row"><span>Avg Latency</span><strong>{result.distributionGain.currentLatencyMs} ms</strong></div>
                <div className="dist-row"><span>Cost/hr</span><strong>${result.distributionGain.currentCostPerHour.toFixed(2)}</strong></div>
              </div>
              <div className="dist-arrow">⟹</div>
              <div className="dist-col dist-distributed">
                <div className="dist-col-title">Distributed (Microservices + Kafka)</div>
                <div className="dist-row"><span>Max Users</span><strong>{formatNumber(result.distributionGain.distributedMaxUsers)}</strong></div>
                <div className="dist-row"><span>Avg Latency</span><strong>{result.distributionGain.distributedLatencyMs} ms</strong></div>
                <div className="dist-row"><span>Cost/hr</span><strong>${result.distributionGain.distributedCostPerHour.toFixed(2)}</strong></div>
              </div>
            </div>
            <p className="dist-recommendation">{result.distributionGain.recommendation}</p>
          </div>
        )}

        {/* Cloud Cost Comparison */}
        {(result.cloudCosts.aws.costPerHour > 0 || result.cloudCosts.gcp.costPerHour > 0) && (
          <div className="analysis-section">
            <h3>☁️ Cloud Cost Comparison</h3>
            <p className="analysis-dimtext">Estimated hourly cost for this architecture on each provider.</p>
            <div className="cloud-comparison">
              {(['aws', 'gcp', 'azure'] as const).map((p) => {
                const c = result.cloudCosts[p];
                const labels = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };
                const colors = { aws: '#FF9900', gcp: '#4285F4', azure: '#0078D4' };
                return (
                  <div key={p} className="cloud-col">
                    <div className="cloud-badge" style={{ background: colors[p] }}>{labels[p]}</div>
                    <div className="cloud-metric">
                      <span className="cloud-metric-value">${c.costPerHour.toFixed(2)}</span>
                      <span className="cloud-metric-label">/ hour</span>
                    </div>
                    <div className="cloud-metric">
                      <span className="cloud-metric-value">${c.costPerMillion.toFixed(3)}</span>
                      <span className="cloud-metric-label">/ 1M req</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="analysis-dimtext" style={{ marginTop: 8 }}>
              * Costs use catalog baselines (AWS) with GCP ≈ 12% and Azure ≈ 3% discounts applied.
              Override individual node costs in the inspector for precise estimates.
            </p>
          </div>
        )}

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div className="analysis-section">
            <h3>Suggestions</h3>
            <ul className="analysis-suggestions">
              {result.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Context Menu ─────────────────────────────────────────────── */
function ContextMenu({
  state,
  onClose,
  onDeleteNode,
  onDeleteEdge,
  onInspect,
  onConfigureCloud,
  onAddNode,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onInspect: (id: string) => void;
  onConfigureCloud: (id: string) => void;
  onAddNode: (x: number, y: number) => void;
}) {
  if (!state.visible) return null;
  return (
    <>
      <div className="ctx-backdrop" onClick={onClose} />
      <div className="ctx-menu" style={{ left: state.x, top: state.y }}>
        {state.targetType === 'node' && state.targetId && (
          <>
            <button
              className="ctx-item"
              onClick={() => { onInspect(state.targetId!); onClose(); }}
            >
              🔍 Inspect / Edit
            </button>
            <button
              className="ctx-item ctx-item-cloud"
              onClick={() => { onConfigureCloud(state.targetId!); onClose(); }}
            >
              ☁ Configure Deployment
            </button>
            <div className="ctx-divider" />
            <button
              className="ctx-item ctx-danger"
              onClick={() => { onDeleteNode(state.targetId!); onClose(); }}
            >
              🗑 Delete Node
            </button>
          </>
        )}
        {state.targetType === 'edge' && state.targetId && (
          <>
            <button
              className="ctx-item ctx-danger"
              onClick={() => { onDeleteEdge(state.targetId!); onClose(); }}
            >
              🗑 Delete Connection
            </button>
          </>
        )}
        {state.targetType === 'canvas' && (
          <>
            <button className="ctx-item" onClick={() => { onAddNode(state.x, state.y); onClose(); }}>
              ＋ Add Node Here
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Editor
   ═══════════════════════════════════════════════════════════════ */
interface EditorProps {
  phase: Phase;
  activeCanvas: CanvasState;
  onCanvasChange: (nodes: CyNode[], edges: CyEdge[]) => void;
}

export function Editor({ phase, activeCanvas, onCanvasChange }: EditorProps) {
  /* ── local canvas state ──────────────────────────────────── */
  const [nodes, setNodes] = useState<CyNode[]>(activeCanvas.nodes);
  const [edges, setEdges] = useState<CyEdge[]>(activeCanvas.edges);

  // sync when active canvas changes (phase switch / file switch)
  const prevCanvasRef = useRef(activeCanvas);
  useLayoutEffect(() => {
    if (prevCanvasRef.current !== activeCanvas) {
      prevCanvasRef.current = activeCanvas;
      setNodes(activeCanvas.nodes);
      setEdges(activeCanvas.edges);
    }
  }, [activeCanvas]);

  // persist up to parent
  const persist = useCallback(
    (n: CyNode[], e: CyEdge[]) => {
      onCanvasChange(n, e);
    },
    [onCanvasChange]
  );

  /* ── viewport state ──────────────────────────────────────── */
  const [viewport, setViewport] = useState<ViewportState>({ x: 80, y: 80, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);

  /* ── selection ───────────────────────────────────────────── */
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  /* ── pan state ───────────────────────────────────────────── */
  const panRef = useRef<{ active: boolean; startX: number; startY: number; vpX: number; vpY: number }>({
    active: false, startX: 0, startY: 0, vpX: 0, vpY: 0,
  });

  /* ── node drag ───────────────────────────────────────────── */
  const nodeDragRef = useRef<{ active: boolean; nodeId: string; startX: number; startY: number; nodeStartX: number; nodeStartY: number } | null>(null);

  /* ── connection drag ─────────────────────────────────────── */
  const [connectState, setConnectState] = useState<{
    active: boolean; sourceId: string; curX: number; curY: number;
  } | null>(null);

  /* ── context menu ────────────────────────────────────────── */
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, targetId: null, targetType: null,
  });

  /* ── analysis ────────────────────────────────────────────── */
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [instancePickerNodeId, setInstancePickerNodeId] = useState<string | null>(null);

  // recompute analysis whenever nodes/edges change
  const latestAnalysis = useMemo(() => analyzeCanvas({ nodes, edges }), [nodes, edges]);

  /* ── helper: SVG rect ────────────────────────────────────── */
  const getSvgRect = useCallback((): DOMRect => {
    return svgRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 800, 600);
  }, []);

  /* ── Keyboard shortcuts ──────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCtxMenu((c) => ({ ...c, visible: false }));
        setConnectState(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused()) {
        if (selectedNodeId) deleteNode(selectedNodeId);
        else if (selectedEdgeId) deleteEdge(selectedEdgeId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, selectedEdgeId]);

  function isInputFocused() {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  }

  /* ── Delete helpers ──────────────────────────────────────── */
  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      setEdges((prevE) => {
        const nextE = prevE.filter((e) => e.source !== id && e.target !== id);
        persist(next, nextE);
        return nextE;
      });
      return next;
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [persist, selectedNodeId]);

  const deleteEdge = useCallback((id: string) => {
    setEdges((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persist(nodes, next);
      return next;
    });
    if (selectedEdgeId === id) setSelectedEdgeId(null);
  }, [persist, nodes, selectedEdgeId]);

  /* ── Update node ─────────────────────────────────────────── */
  const updateNode = useCallback((updated: CyNode) => {
    setNodes((prev) => {
      const next = prev.map((n) => (n.id === updated.id ? updated : n));
      persist(next, edges);
      return next;
    });
  }, [persist, edges]);

  /* ── Drag-drop from ribbon palette ──────────────────────── */
  const handleCanvasDrop = useCallback(
    (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('componentType');
      if (!type) return;
      const { x, y } = screenToCanvas(e.clientX, e.clientY, viewport, getSvgRect());
      const node = buildNode(type, x - NODE_W / 2, y - NODE_H / 2);
      setNodes((prev) => {
        const next = [...prev, node];
        persist(next, edges);
        return next;
      });
      setSelectedNodeId(node.id);
    },
    [viewport, getSvgRect, persist, edges]
  );

  /* ── Wheel: zoom ─────────────────────────────────────────── */
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const rect = getSvgRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      setViewport((vp) => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * delta));
        const scaleDiff = newScale - vp.scale;
        return {
          scale: newScale,
          x: vp.x - (mouseX - vp.x) * (scaleDiff / vp.scale),
          y: vp.y - (mouseY - vp.y) * (scaleDiff / vp.scale),
        };
      });
    },
    [getSvgRect]
  );

  /* ── Mouse down on canvas background: start pan ─────────── */
  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      // Only pan if clicking on background (not a node / handle)
      if ((e.target as Element).closest('.canvas-node-fo')) return;
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, vpX: viewport.x, vpY: viewport.y };
    },
    [viewport]
  );

  /* ── Mouse move: handle pan + node drag + connection drag ── */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Pan
      if (panRef.current.active) {
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        setViewport((vp) => ({ ...vp, x: panRef.current.vpX + dx, y: panRef.current.vpY + dy }));
        return;
      }
      // Node drag
      if (nodeDragRef.current?.active) {
        const nd = nodeDragRef.current;
        const rect = getSvgRect();
        const cx = (e.clientX - rect.left - viewport.x) / viewport.scale;
        const cy = (e.clientY - rect.top - viewport.y) / viewport.scale;
        const dx = cx - nd.startX;
        const dy = cy - nd.startY;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nd.nodeId
              ? { ...n, x: nd.nodeStartX + dx, y: nd.nodeStartY + dy }
              : n
          )
        );
        return;
      }
      // Connection drag
      if (connectState?.active) {
        const rect = getSvgRect();
        setConnectState((cs) =>
          cs
            ? {
                ...cs,
                curX: (e.clientX - rect.left - viewport.x) / viewport.scale,
                curY: (e.clientY - rect.top - viewport.y) / viewport.scale,
              }
            : cs
        );
      }
    },
    [viewport, connectState, getSvgRect]
  );

  /* ── Mouse up ────────────────────────────────────────────── */
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      // Finish pan
      if (panRef.current.active) {
        panRef.current.active = false;
        return;
      }
      // Finish node drag → persist
      if (nodeDragRef.current?.active) {
        nodeDragRef.current.active = false;
        setNodes((prev) => {
          persist(prev, edges);
          return prev;
        });
        return;
      }
      // Finish connection drag
      if (connectState?.active) {
        // Check if dropped on a node
        const rect = getSvgRect();
        const cx = (e.clientX - rect.left - viewport.x) / viewport.scale;
        const cy = (e.clientY - rect.top - viewport.y) / viewport.scale;
        const targetNode = nodes.find(
          (n) =>
            cx >= n.x && cx <= n.x + n.width &&
            cy >= n.y && cy <= n.y + n.height &&
            n.id !== connectState.sourceId
        );
        if (targetNode) {
          const newEdge = buildEdge(connectState.sourceId, targetNode.id);
          setEdges((prev) => {
            // No duplicate edges
            const exists = prev.some(
              (e) => e.source === newEdge.source && e.target === newEdge.target
            );
            if (exists) return prev;
            const next = [...prev, newEdge];
            persist(nodes, next);
            return next;
          });
          setSelectedEdgeId(newEdge.id);
        }
        setConnectState(null);
      }
    },
    [connectState, getSvgRect, nodes, edges, viewport, persist]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  /* ── Node mouse down: start drag ─────────────────────────── */
  const startNodeDrag = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const rect = getSvgRect();
      const cx = (e.clientX - rect.left - viewport.x) / viewport.scale;
      const cy = (e.clientY - rect.top - viewport.y) / viewport.scale;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      nodeDragRef.current = {
        active: true,
        nodeId,
        startX: cx,
        startY: cy,
        nodeStartX: node.x,
        nodeStartY: node.y,
      };
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    },
    [getSvgRect, nodes, viewport]
  );

  /* ── Handle mouse down: start connection drag ────────────── */
  const startConnect = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = getSvgRect();
      const cx = (e.clientX - rect.left - viewport.x) / viewport.scale;
      const cy = (e.clientY - rect.top - viewport.y) / viewport.scale;
      setConnectState({ active: true, sourceId: nodeId, curX: cx, curY: cy });
    },
    [getSvgRect, viewport]
  );

  /* ── Right-click ─────────────────────────────────────────── */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, targetId: string | null, targetType: ContextMenuState['targetType']) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, targetId, targetType });
    },
    []
  );

  /* ── Reset view ──────────────────────────────────────────── */
  const resetView = useCallback(() => {
    if (nodes.length === 0) {
      setViewport({ x: 80, y: 80, scale: 1 });
      return;
    }
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    const rect = getSvgRect();
    const pad = 80;
    const scale = Math.min(
      (rect.width - pad * 2) / (maxX - minX || 1),
      (rect.height - pad * 2) / (maxY - minY || 1),
      1.2
    );
    setViewport({
      scale,
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
    });
  }, [nodes, getSvgRect]);

  /* ── Add node at screen position (from context menu) ─────── */
  const addNodeAt = useCallback(
    (screenX: number, screenY: number) => {
      // open a quick-pick by defaulting to 'app_server'
      const { x, y } = screenToCanvas(screenX, screenY, viewport, getSvgRect());
      const node = buildNode('app_server', x - NODE_W / 2, y - NODE_H / 2);
      setNodes((prev) => {
        const next = [...prev, node];
        persist(next, edges);
        return next;
      });
      setSelectedNodeId(node.id);
    },
    [viewport, getSvgRect, persist, edges]
  );

  /* ── Run analysis ─────────────────────────────────────────── */
  const runAnalysis = useCallback(() => {
    setAnalysisResult(latestAnalysis);
    setShowAnalysis(true);
  }, [latestAnalysis]);

  /* ── Render ──────────────────────────────────────────────── */
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="editor-root">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-phase-badge">
            {phase === 'base' ? '🏗 Base Architecture' : '📋 Request Flow'}
          </span>
        </div>
        <div className="toolbar-center">
          <div className="toolbar-node-count center">
            <div>
              <div>
              {nodes.length} 
              </div>
              <div className='toolbar-node-sub'>
                nodes
              </div>
            </div>
            ·
            <div>
              <div>
                {edges.length}
              </div>
              <div  className='toolbar-node-sub'>
                edges
              </div>
            </div>
          </div>
        </div>
        <div className='toolbar-center'>
          <button
            className="toolbar-btn toolbar-btn-analyze"
            onClick={runAnalysis}
            title="Analyse this canvas"
          >
            Analyse
          </button>
        </div>
      </div>

      <div className='view-shelf'>
        <button className="toolbar-btn" onClick={() => setViewport((v) => ({ ...v, scale: Math.max(v.scale / 1.2, MIN_SCALE) }))}>
          −
        </button>
        <span className="toolbar-zoom">{Math.round(viewport.scale * 100)}%</span>
        <button className="toolbar-btn" onClick={() => setViewport((v) => ({ ...v, scale: Math.min(v.scale * 1.2, MAX_SCALE) }))}>
          +
        </button>
        <button className="toolbar-btn" onClick={resetView} title="Fit to view">
            ⊞ Fit
        </button>
      </div>

      {/* ── Canvas area ─────────────────────────────────────── */}
      <div className="editor-canvas-wrap">
        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          className="editor-svg"
          onWheel={handleWheel}
          onMouseDown={handleSvgMouseDown}
          onDrop={handleCanvasDrop}
          onDragOver={(e) => e.preventDefault()}
          onContextMenu={(e) => handleContextMenu(e, null, 'canvas')}
          style={{ cursor: panRef.current.active ? 'grabbing' : 'default' }}
        >
          {/* Grid pattern */}
          <defs>
            <pattern id="grid" width={40 * viewport.scale} height={40 * viewport.scale} x={viewport.x % (40 * viewport.scale)} y={viewport.y % (40 * viewport.scale)} patternUnits="userSpaceOnUse">
              <path d={`M ${40 * viewport.scale} 0 L 0 0 0 ${40 * viewport.scale}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
            {/* Arrow marker */}
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
            </marker>
            <marker id="arrow-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#0f766e" />
            </marker>
            <marker id="arrow-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}>
            {/* Edges */}
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;
              const d = edgePath(src, tgt);
              const isSelected = edge.id === selectedEdgeId;
              const isActive = edge.active;
              const mid = nodeCenter(src);
              const midTgt = nodeCenter(tgt);
              const labelX = (mid.x + midTgt.x) / 2;
              const labelY = (mid.y + midTgt.y) / 2 - 10;
              const markerId = isSelected ? 'arrow-selected' : isActive ? 'arrow-active' : 'arrow';
              return (
                <g key={edge.id}>
                  {/* Hit area */}
                  <path
                    d={d}
                    stroke="transparent"
                    strokeWidth={20}
                    fill="none"
                    onClick={() => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
                    onContextMenu={(e) => handleContextMenu(e, edge.id, 'edge')}
                    style={{ cursor: 'pointer' }}
                  />
                  <path
                    d={d}
                    stroke={isSelected ? '#3b82f6' : isActive ? '#0f766e' : '#9ca3af'}
                    strokeWidth={isSelected ? 2.5 : 2}
                    strokeDasharray={isActive ? undefined : undefined}
                    fill="none"
                    markerEnd={`url(#${markerId})`}
                    pointerEvents="none"
                  />
                  {edge.label && (
                    <text x={labelX} y={labelY} textAnchor="middle" fontSize={11} fill="#6b7280" style={{ pointerEvents: 'none' }}>
                      {edge.label}
                    </text>
                  )}
                  {edge.protocol && (
                    <text x={labelX} y={labelY + (edge.label ? 14 : 0)} textAnchor="middle" fontSize={10} fill="#9ca3af" style={{ pointerEvents: 'none' }}>
                      {edge.protocol}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Live connection drag line */}
            {connectState?.active && (() => {
              const src = nodes.find((n) => n.id === connectState.sourceId);
              if (!src) return null;
              const c = nodeCenter(src);
              return (
                <line
                  x1={c.x} y1={c.y}
                  x2={connectState.curX} y2={connectState.curY}
                  stroke="#0f766e" strokeWidth={2} strokeDasharray="6 3"
                  markerEnd="url(#arrow-active)"
                  pointerEvents="none"
                />
              );
            })()}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isBottleneck = latestAnalysis?.bottleneckNodeId === node.id;
              const handles = handlePositions(node);
              const showHandles = isSelected || connectState?.active;

              return (
                <g key={node.id}>
                  {/* Node foreignObject – HTML inside SVG */}
                  <foreignObject
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    className="canvas-node-fo"
                    onContextMenu={(e) => handleContextMenu(e as unknown as React.MouseEvent, node.id, 'node')}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <NodeCard
                      node={node}
                      selected={isSelected}
                      isBottleneck={isBottleneck}
                      onMouseDown={(e) => startNodeDrag(node.id, e)}
                    />
                    </div>
                  </foreignObject>

                  {/* Connection handles */}
                  {Object.entries(handles).map(([pos, { x, y }]) => (
                    <circle
                      key={pos}
                      cx={x}
                      cy={y}
                      r={HANDLE_R}
                      className={`conn-handle ${showHandles ? 'conn-handle--visible' : ''}`}
                      onMouseDown={(e) => startConnect(node.id, e)}
                    />
                  ))}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Node Inspector floating right panel */}
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            analysis={latestAnalysis}
            onUpdate={updateNode}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
            onOpenPicker={(id) => setInstancePickerNodeId(id)}
          />
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        state={ctxMenu}
        onClose={() => setCtxMenu((c) => ({ ...c, visible: false }))}
        onDeleteNode={deleteNode}
        onDeleteEdge={deleteEdge}
        onInspect={(id) => setSelectedNodeId(id)}
        onConfigureCloud={(id) => setInstancePickerNodeId(id)}
        onAddNode={addNodeAt}
      />

      {/* Analysis Panel */}
      {showAnalysis && analysisResult && (
        <AnalysisPanel result={analysisResult} onClose={() => setShowAnalysis(false)} />
      )}

      {/* Instance Picker modal */}
      {instancePickerNodeId && (() => {
        const pickerNode = nodes.find((n) => n.id === instancePickerNodeId);
        if (!pickerNode) return null;
        return (
          <InstancePicker
            node={pickerNode}
            onUpdate={updateNode}
            onClose={() => setInstancePickerNodeId(null)}
          />
        );
      })()}
    </div>
  );
}
