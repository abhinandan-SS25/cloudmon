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
import { useNavigate, useParams } from 'react-router-dom';
import catalog from '../data/componentCatalog';
import { CLOUD_MAPPINGS } from '../data/cloudInstanceTypes';
import type { CloudServiceOption } from '../data/cloudInstanceTypes';
import { analyzeCanvas } from '../utils/analysisEngine';
import { buildEdge, buildNode, edgePath, NODE_H, NODE_W, nodeCenter } from '../utils/canvasUtils';
import { CanvasNode } from './svg/CanvasNode';
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

/* ── Node types that support the deep internal-configuration editor */
/* Node-editor navigation is gated to types that actually have
   internal pods / VMs / containers to configure. */
const NODE_EDITOR_TYPES = new Set([
  'web_server', 'app_server', 'microservice', 'container', 'kubernetes',
]);

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

function formatNumber(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)    return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

/* ── Sub-components ───────────────────────────────────────────── */

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
        <div className="ip-hero">
          <div>
            <div className="ip-hero-kicker">Deployment Mode</div>
            <div className="ip-hero-title">Choose runtime for this node</div>
          </div>
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
        </div>
        {!hasCloud && (
          <p className="ip-no-cloud">No cloud provider mappings available for this component type yet.</p>
        )}

        {mode === 'local' && (
          <>
            {/* Local Configuration / Override Specs */}
            <div className="ip-section-label">Override Default Specs</div>

            <div className="ip-grid">
              <div className="ip-field">
                <label>Custom Latency (ms)</label>
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

              <div className="ip-field">
                <label>Custom Throughput (rps)</label>
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

              <div className="ip-field">
                <label>Custom Cost ($/hr)</label>
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
  onConfigureInternals,
}: {
  node: CyNode;
  analysis: AnalysisResult | null;
  onUpdate: (updated: CyNode) => void;
  onDelete: () => void;
  onClose: () => void;
  onOpenPicker: (id: string) => void;
  onConfigureInternals?: () => void;
}) {
  const spec = catalog[node.type];
  const isBottleneck = analysis?.bottleneckNodeId === node.id;
  const mode: DeploymentMode = node.config.deployment ?? 'local';
  const PROVIDER_COLORS: Record<string, string> = { aws: '#FF9900', gcp: '#4285F4', azure: '#0078D4' };
  const PROVIDER_LABELS: Record<string, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };
  const deploymentLabel =
    mode === 'cloud'
      ? `${PROVIDER_LABELS[node.config.cloudProvider ?? ''] ?? 'Cloud'}${node.config.instanceType ? ` · ${node.config.instanceType}` : ''}`
      : 'Local / Test';
  const effectiveCostPerHour = node.config.customCostPerHour ?? spec?.costPerHour ?? 0;
  const latencyMs = node.config.customLatencyMs ?? spec?.latencyMs.avg ?? 0;
  const throughput = node.config.customThroughputRps ?? spec?.throughputRps ?? 0;
  const totalThroughput = throughput * (node.config.instances || 1);

  return (
    <div className="inspector inspector--node">
      {/* ── Header ─────────────────────────────────────────── */}
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

      {/* ── Status chips ───────────────────────────────────── */}
      <div className="ni-chips">
        <span
          className="ni-chip ni-chip--deploy"
          style={
            mode === 'cloud' && node.config.cloudProvider
              ? { borderColor: PROVIDER_COLORS[node.config.cloudProvider], color: PROVIDER_COLORS[node.config.cloudProvider] }
              : undefined
          }
        >
          {mode === 'cloud' ? '☁' : '🖥'} {deploymentLabel}
        </span>
        <span className="ni-chip">{latencyMs} ms</span>
        <span className="ni-chip">{formatNumber(totalThroughput)} rps</span>
        <span className="ni-chip">${effectiveCostPerHour.toFixed(3)}/hr</span>
      </div>

      {/* ── Bottleneck warning ─────────────────────────────── */}
      {isBottleneck && (
        <div className="inspector-warning">
          ⚠ Bottleneck – lowest throughput in the critical path
        </div>
      )}

      {/* ── Spec sheet ─────────────────────────────────────── */}
      {spec && (
        <div className="ni-panel ni-spec-sheet">
          <div className="ni-panel-title">Default Specs</div>
          <div className="ni-spec-grid">
            <div className="ni-spec-row">
              <span className="ni-spec-lbl">Latency avg</span>
              <span className="ni-spec-val">{spec.latencyMs.avg} ms</span>
            </div>
            <div className="ni-spec-row">
              <span className="ni-spec-lbl">Latency p99</span>
              <span className="ni-spec-val">{spec.latencyMs.p99} ms</span>
            </div>
            <div className="ni-spec-row">
              <span className="ni-spec-lbl">Throughput</span>
              <span className="ni-spec-val">{formatNumber(spec.throughputRps)} rps</span>
            </div>
            <div className="ni-spec-row">
              <span className="ni-spec-lbl">Base cost</span>
              <span className="ni-spec-val">${spec.costPerHour.toFixed(3)}/hr</span>
            </div>
          </div>
          {(node.config.customLatencyMs !== undefined ||
            node.config.customThroughputRps !== undefined ||
            node.config.customCostPerHour !== undefined) && (
            <>
              <div className="ni-panel-title" style={{ marginTop: 10 }}>Overrides</div>
              <div className="ni-spec-grid ni-spec-grid--override">
                {node.config.customLatencyMs !== undefined && (
                  <div className="ni-spec-row">
                    <span className="ni-spec-lbl">Latency</span>
                    <span className="ni-spec-val ni-spec-val--ov">{node.config.customLatencyMs} ms</span>
                  </div>
                )}
                {node.config.customThroughputRps !== undefined && (
                  <div className="ni-spec-row">
                    <span className="ni-spec-lbl">Throughput</span>
                    <span className="ni-spec-val ni-spec-val--ov">{formatNumber(node.config.customThroughputRps)} rps</span>
                  </div>
                )}
                {node.config.customCostPerHour !== undefined && (
                  <div className="ni-spec-row">
                    <span className="ni-spec-lbl">Cost</span>
                    <span className="ni-spec-val ni-spec-val--ov">${node.config.customCostPerHour.toFixed(3)}/hr</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Quick edit ─────────────────────────────────────── */}
      <div className="ni-panel">
        <div className="ni-panel-title">Label</div>
        <div className="ni-fields">
          <div className="ni-field">
            <input
              placeholder="Node label"
              value={node.label}
              onChange={(e) => onUpdate({ ...node, label: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Open detailed editor ───────────────────────────── */}
      {onConfigureInternals && NODE_EDITOR_TYPES.has(node.type) && (
        <button
          className="inspector-configure-btn"
          onClick={onConfigureInternals}
          title="Open the node editor – configure services, firewall, storage, deployment"
        >
          ⊞ Open Node Editor →
        </button>
      )}

      <button className="inspector-delete-btn" onClick={onDelete}>
        🗑 Delete Node
      </button>
    </div>
  );
}

function ArchitectureOverviewPanel({
  result,
  nodeCount,
  edgeCount,
  onAnalyse,
}: {
  result: AnalysisResult;
  nodeCount: number;
  edgeCount: number;
  onAnalyse: () => void;
}) {
  const isHighLatency = result.totalLatencyMs > 500;
  const hasBottleneck = Boolean(result.bottleneckLabel);
  const isEmpty = nodeCount === 0;

  return (
    <div className="inspector ov-inspector">
      <div className="ov-panel">
        {/* Header card */}
        <div className="ov-card ov-card--header">
          <span className="ov-header-dot" />
          <div>
            <div className="ov-header-title">Workspace</div>
            <div className="ov-header-sub">Overview</div>
          </div>
          <div className="ov-header-chips">
            <span className="ov-chip">{nodeCount}</span>
            <span className="ov-chip-label">nodes</span>
            <span className="ov-chip">{edgeCount}</span>
            <span className="ov-chip-label">edges</span>
          </div>
        </div>

        {isEmpty ? (
          <div className="ov-empty">Add nodes to the canvas to start.</div>
        ) : (
          <>
            {/* Latency */}
            <div className={`ov-card ov-card--metric${isHighLatency ? ' ov-card--warn' : ''}`}>
              <div className="ov-metric-label">LATENCY</div>
              <div className="ov-metric-row">
                <span className="ov-metric-value">
                  {result.totalLatencyMs > 0 ? `${result.totalLatencyMs} ms` : '—'}
                </span>
                {isHighLatency && <span className="ov-warn-arrow">∧</span>}
              </div>
              <div className="ov-metric-sub2">p99 &nbsp;{result.p99LatencyMs} ms</div>
            </div>

            {/* Throughput */}
            <div className="ov-card ov-card--metric">
              <div className="ov-metric-label">THROUGHPUT</div>
              <div className="ov-metric-row">
                <span className="ov-metric-value">{formatNumber(result.throughputRps)}</span>
                <span className="ov-metric-sub">rps</span>
              </div>
              <div className="ov-metric-sub2">{formatNumber(result.maxConcurrentUsers)} max users</div>
            </div>

            {/* Bottleneck */}
            <div className={`ov-card ov-card--metric${hasBottleneck ? ' ov-card--alert' : ''}`}>
              <div className="ov-metric-label">BOTTLENECK</div>
              <div className="ov-metric-row">
                <span className="ov-metric-value ov-metric-value--md">
                  {result.bottleneckLabel ?? 'None detected'}
                </span>
                {hasBottleneck && <span className="ov-alert-dot" />}
              </div>
            </div>

            {/* Hourly cost */}
            <div className="ov-card ov-card--metric">
              <div className="ov-metric-label">HOURLY COST</div>
              <div className="ov-metric-row">
                <span className="ov-metric-value">
                  {result.costPerHour > 0 ? `$${result.costPerHour.toFixed(2)}` : '—'}
                </span>
                {result.costPerHour > 0 && <span className="ov-metric-sub">/ AWS</span>}
              </div>
              {result.costPerHour > 0 && (
                <div className="ov-metric-sub2">${result.costPerMillionRequests.toFixed(3)} / 1M req</div>
              )}
            </div>
          </>
        )}

        <button className="ov-analyse-btn" onClick={onAnalyse} disabled={isEmpty}>
          Run Analysis
        </button>
      </div>
    </div>
  );
}

/* ── Analysis Panel (placeholder – backend engine coming later) ── */
function AnalysisPanel({
  result,
  onClose,
}: {
  result: AnalysisResult;
  onClose: () => void;
}) {
  return (
    <div className="analysis-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="analysis-panel">
        <div className="analysis-header">
          <h2>Architecture Analysis</h2>
          <button className="analysis-close" onClick={onClose}>✕</button>
        </div>

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

        <div className="analysis-placeholder">
          <div className="analysis-placeholder-icon">🔧</div>
          <div className="analysis-placeholder-title">Deep analysis coming soon</div>
          <div className="analysis-placeholder-body">
            Critical path, suggestions, cloud cost comparison, and distribution
            gain analysis will be powered by the backend engine in a later iteration.
          </div>
        </div>
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
  onConfigureInternals,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onInspect: (id: string) => void;
  onConfigureCloud: (id: string) => void;
  onAddNode: (x: number, y: number) => void;
  onConfigureInternals?: (id: string) => void;
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
            {onConfigureInternals && (
              <button
                className="ctx-item"
                onClick={() => { onConfigureInternals!(state.targetId!); onClose(); }}
              >
                ⊞ Configure Internals →
              </button>
            )}
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
  /* ── routing (used to navigate to node detail pages) ────────── */
  const navigate = useNavigate();
  const { projectId, requestId } = useParams<{ projectId: string; requestId?: string }>();

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
  const [instancePickerNodeId, setInstancePickerNodeId] = useState<string | null>(null);

  /* ── Overview card idle fade (10 s of no canvas activity) ───── */
  const [overviewIdle, setOverviewIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resetIdleTimer = useCallback(() => {
    setOverviewIdle(false);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setOverviewIdle(true), 10_000);
  }, []);
  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
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

  const runAnalysis = useCallback(() => setShowAnalysis(true), []);

  /* ── Render ──────────────────────────────────────────────── */
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const hasPicker = Boolean(instancePickerNodeId);

  return (
    <div className={`editor-root${hasPicker ? ' has-picker' : ''}`}>
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="editor-toolbar">
        <span className="toolbar-phase-badge">
          {phase === 'base' ? '🏗 Base' : '📋 Request'}
        </span>
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
      <div className="editor-canvas-wrap" onMouseMove={resetIdleTimer}>
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
              <path d={`M ${40 * viewport.scale} 0 L 0 0 0 ${40 * viewport.scale}`} fill="none" stroke="rgba(71,95,148,0.1)" strokeWidth="0.5" />
            </pattern>
            {/* Arrow marker */}
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
            <marker id="arrow-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#0d9488" />
            </marker>
            <marker id="arrow-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#4f6ef7" />
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
                    stroke={isSelected ? '#4f6ef7' : isActive ? '#0d9488' : '#b0bad4'}
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
              const isSelected   = node.id === selectedNodeId;
              const isBottleneck = latestAnalysis?.bottleneckNodeId === node.id;
              const showHandles  = isSelected || Boolean(connectState?.active);

              return (
                <CanvasNode
                  key={node.id}
                  node={node}
                  selected={isSelected}
                  isBottleneck={isBottleneck}
                  showHandles={showHandles}
                  onDragStart={(e) => startNodeDrag(node.id, e)}
                  onConnect={(e) => startConnect(node.id, e)}
                  onContextMenu={(e) => handleContextMenu(e, node.id, 'node')}
                  onInspect={() => setSelectedNodeId(node.id)}
                  onUpdate={updateNode}
                  onConfigure={
                    projectId
                      ? () => {
                          const base = `/projects/${projectId}`;
                          const url = requestId
                            ? `${base}/requests/${requestId}/nodes/${node.id}`
                            : `${base}/nodes/${node.id}`;
                          navigate(url);
                        }
                      : undefined
                  }
                />
              );
            })}
          </g>
        </svg>

      </div>

      {/* ── Floating right panels ──────────────────────────────── */}
      <div className="editor-float-right">
        <div
          className={`editor-float-card editor-float-overview${selectedNode ? ' card-dimmed' : overviewIdle ? ' card-idle' : ''}`}
          onMouseEnter={resetIdleTimer}
        >
          <div className="efc-head">
            <span className="efc-title">Architecture</span>
            <div className="efc-chips">
              <span className="efc-chip">{nodes.length} nodes</span>
              <span className="efc-chip">{edges.length} edges</span>
            </div>
          </div>
          {nodes.length > 0 && (
            <div className="efc-metrics">
              <div className="efc-metric">
                <span className="efc-metric-val">
                  {latestAnalysis.totalLatencyMs > 0 ? `${latestAnalysis.totalLatencyMs} ms` : '—'}
                </span>
                <span className="efc-metric-lbl">latency</span>
              </div>
              <div className="efc-metric">
                <span className="efc-metric-val">{formatNumber(latestAnalysis.throughputRps)}</span>
                <span className="efc-metric-lbl">rps</span>
              </div>
              <div className="efc-metric">
                <span className={`efc-metric-val${latestAnalysis.totalLatencyMs > 500 ? ' warn' : ''}`}>
                  {latestAnalysis.costPerHour > 0 ? `$${latestAnalysis.costPerHour.toFixed(2)}` : '—'}
                </span>
                <span className="efc-metric-lbl">$/hr</span>
              </div>
            </div>
          )}
          {latestAnalysis.bottleneckLabel && (
            <div className="efc-bottleneck">⚠ {latestAnalysis.bottleneckLabel}</div>
          )}
          <button className="efc-analyse-btn" onClick={runAnalysis} disabled={nodes.length === 0}>
            ▶ Run Analysis
          </button>
        </div>

        {selectedNode && (
          <div className="editor-float-inspector">
            <NodeInspector
              node={selectedNode}
              analysis={latestAnalysis}
              onUpdate={updateNode}
              onDelete={() => deleteNode(selectedNode.id)}
              onClose={() => setSelectedNodeId(null)}
              onOpenPicker={(id) => setInstancePickerNodeId(id)}
              onConfigureInternals={
                NODE_EDITOR_TYPES.has(selectedNode.type) && projectId
                  ? () => {
                      const base = `/projects/${projectId}`;
                      const url = requestId
                        ? `${base}/requests/${requestId}/nodes/${selectedNode.id}`
                        : `${base}/nodes/${selectedNode.id}`;
                      navigate(url);
                    }
                  : undefined
              }
            />
          </div>
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
        onConfigureInternals={
          ctxMenu.targetType === 'node' && ctxMenu.targetId && projectId &&
          NODE_EDITOR_TYPES.has(nodes.find((n) => n.id === ctxMenu.targetId)?.type ?? '')
            ? (id) => {
                const base = `/projects/${projectId}`;
                const url = requestId
                  ? `${base}/requests/${requestId}/nodes/${id}`
                  : `${base}/nodes/${id}`;
                navigate(url);
              }
            : undefined
        }
      />

      {/* Analysis Panel */}
      {showAnalysis && (
        <AnalysisPanel result={latestAnalysis} onClose={() => setShowAnalysis(false)} />
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
