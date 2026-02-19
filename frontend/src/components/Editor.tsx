/* ═══════════════════════════════════════════════════════════════
   Editor.tsx – CloudMon Editor Component
   Main canvas editor with cytoscape visualization.
   ═══════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

import {
  ALL_SERVICES,
  ServiceDefinition,
  InstanceType as InstanceDef,
  CATEGORY_COLORS,
} from '../serviceCatalog';
import { ServiceNodeData } from '../ServiceNode';
import { ConnectionKind } from '../AnimatedEdge';
import { EditorProps, CyNode, CyEdge } from '../types';
import { nextId } from '../utils/canvasUtils';
import { useConnectionHandles } from '../hooks/useConnectionHandles';
import Sidebar from '../Sidebar';
import Toolbar from '../Toolbar';
import ConnectionDialog from '../ConnectionDialog';
import InstancePicker from '../InstancePicker';
import AnalysisPanel, { AnalysisResult } from '../AnalysisPanel';

export function Editor({ phase, activeCanvas, onCanvasChange }: EditorProps) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const isUpdatingFromCy = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<CyNode[]>(activeCanvas.nodes);
  const [edges, setEdges] = useState<CyEdge[]>(activeCanvas.edges);

  /* sidebar state */
  const [connectionKind, setConnectionKind] = useState<ConnectionKind>('data');

  /* pending connection (waiting for dialog confirmation) */
  const [pendingConn, setPendingConn] = useState<{ source: string; target: string } | null>(null);

  /* instance picker state */
  const [pendingDrop, setPendingDrop] = useState<{
    service: ServiceDefinition;
    position: { x: number; y: number };
  } | null>(null);

  /* reconfigure existing node */
  const [reconfigNode, setReconfigNode] = useState<{
    nodeId: string;
    service: ServiceDefinition;
  } | null>(null);

  /* analysis */
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  /* context menu */
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
  } | null>(null);

  /* right sidebar - selected node */
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  /* left sidebar expanded state */
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  /* connection handles hook */
  const {
    connectionHandles,
    hoveredHandle,
    setHoveredHandle,
    dragState,
    handleHandlePointerDown,
    handleHandlePointerMove,
    handleHandlePointerUp,
  } = useConnectionHandles({
    cyRef,
    canvasRef,
    nodes,
    phase,
    onEdgeCreate: (source, target) => {
      const newEdge: CyEdge = {
        data: {
          id: `e_${source}_${target}_${Date.now()}`,
          source,
          target,
          kind: 'data',
          label: '',
          bandwidth: '',
        },
      };
      setEdges((eds) => [...eds, newEdge]);
    },
    onPendingConnection: (source, target) => {
      setPendingConn({ source, target });
    },
  });

  useEffect(() => {
    setNodes(activeCanvas.nodes);
    setEdges(activeCanvas.edges);
    setAnalysis(null);
  }, [activeCanvas.nodes, activeCanvas.edges, phase]);

  /* ── update cytoscape when nodes/edges change ─────────────────── */
  useEffect(() => {
    if (!cyRef.current || isUpdatingFromCy.current) {
      isUpdatingFromCy.current = false;
      return;
    }
    const cy = cyRef.current;
    cy.remove(cy.elements());
    
    const elements = [
      ...nodes.map(n => ({ data: n.data, position: n.position })),
      ...edges.map(e => ({ data: e.data }))
    ];
    
    cy.add(elements);
    onCanvasChange(nodes, edges);
  }, [nodes, edges, onCanvasChange]);

  /* ── connection handling ─────────────────────────────────────── */
  const confirmConnection = useCallback(
    (kind: ConnectionKind, label: string, bandwidth: string) => {
      if (!pendingConn) return;
      const newEdge: CyEdge = {
        data: {
          id: `e_${pendingConn.source}_${pendingConn.target}_${Date.now()}`,
          source: pendingConn.source,
          target: pendingConn.target,
          kind,
          label,
          bandwidth,
        },
      };
      setEdges((eds) => [...eds, newEdge]);
      setPendingConn(null);
    },
    [pendingConn]
  );

  /* ── helper: create a node from a service + optional instance ── */
  const createNode = useCallback(
    (svc: ServiceDefinition, position: { x: number; y: number }, inst: InstanceDef | null) => {
      const newNode: CyNode = {
        data: {
          id: nextId(),
          serviceId: svc.id,
          label: svc.label,
          icon: svc.icon,
          provider: svc.provider,
          category: svc.category,
          throughput: inst ? inst.throughput : svc.defaultThroughput,
          latency: inst ? inst.latency : svc.defaultLatency,
          instanceTypeId: inst?.id,
          instanceLabel: inst?.label,
          vcpus: inst?.vcpus,
          memoryGb: inst?.memoryGb,
          replicas: 1,
        },
        position,
      };
      isUpdatingFromCy.current = false;
      setNodes((nds) => [...nds, newNode]);
    },
    []
  );

  /* ── drag-and-drop from sidebar ─────────────────────────────── */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!cyRef.current) return;

      const serviceId = e.dataTransfer.getData('application/cloudmon-service');
      if (!serviceId) return;

      const svc = ALL_SERVICES.find((s) => s.id === serviceId);
      if (!svc) return;

      const container = e.currentTarget as HTMLElement;
      const bounds = container.getBoundingClientRect();
      const position = {
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      };

      if (svc.instanceTypes && svc.instanceTypes.length > 0) {
        setPendingDrop({ service: svc, position });
      } else {
        createNode(svc, position, null);
      }
    },
    [createNode]
  );

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, svc: ServiceDefinition) => {
      e.dataTransfer.setData('application/cloudmon-service', svc.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  /* ── instance picker callbacks ──────────────────────────────── */
  const confirmInstanceDrop = useCallback(
    (inst: InstanceDef | null) => {
      if (!pendingDrop) return;
      createNode(pendingDrop.service, pendingDrop.position, inst);
      setPendingDrop(null);
    },
    [pendingDrop, createNode]
  );

  const confirmReconfig = useCallback(
    (inst: InstanceDef | null) => {
      if (!reconfigNode) return;
      const svc = reconfigNode.service;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.data.id !== reconfigNode.nodeId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              throughput: inst ? inst.throughput : svc.defaultThroughput,
              latency: inst ? inst.latency : svc.defaultLatency,
              instanceTypeId: inst?.id,
              instanceLabel: inst?.label,
              vcpus: inst?.vcpus,
              memoryGb: inst?.memoryGb,
              replicas: n.data.replicas ?? 1,
            },
          };
        })
      );
      setReconfigNode(null);
    },
    [reconfigNode]
  );

  /* ── delete selected nodes/edges via Backspace/Delete ────────── */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (!cyRef.current) return;
        const selected = cyRef.current.$(':selected');
        const nodeIds = new Set<string>();
        const edgeIds = new Set<string>();
        
        selected.forEach((ele: any) => {
          if (ele.isNode()) {
            nodeIds.add(ele.id());
          } else if (ele.isEdge()) {
            edgeIds.add(ele.id());
          }
        });
        
        if (nodeIds.size > 0) {
          setNodes(nds => nds.filter(n => !nodeIds.has(n.data.id)));
        }
        if (edgeIds.size > 0) {
          setEdges(eds => eds.filter(e => !edgeIds.has(e.data.id)));
        }
      }
    },
    []
  );

  /* ── toolbar actions ────────────────────────────────────────── */
  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setAnalysis(null);
  }, []);

  const autoLayout = useCallback(() => {
    const cols = 4;
    const gapX = 220;
    const gapY = 200;
    setNodes((nds) =>
      nds.map((n, i) => ({
        ...n,
        position: {
          x: 40 + (i % cols) * gapX,
          y: 40 + Math.floor(i / cols) * gapY,
        },
      }))
    );
  }, []);

  const runAnalysis = useCallback(() => {
    const nodeMap = new Map(nodes.map((n) => [n.data.id, n]));
    const targetIds = new Set(edges.map((e) => e.data.target));
    const sourceNodes = nodes.filter((n) => !targetIds.has(n.data.id));

    const adj = new Map<string, string[]>();
    for (const e of edges) {
      const list = adj.get(e.data.source) || [];
      list.push(e.data.target);
      adj.set(e.data.source, list);
    }

    const flowPaths: { path: string[]; latency: number }[] = [];
    const visited = new Set<string>();

    function dfs(nodeId: string, path: string[], latency: number) {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const d = node.data;
      const name = d.instanceLabel ? `${d.label} (${d.instanceLabel})` : d.label;
      const newPath = [...path, name];
      const newLatency = latency + (d.latency || 0);
      const neighbours = adj.get(nodeId) || [];
      if (neighbours.length === 0) {
        flowPaths.push({ path: newPath, latency: newLatency });
      } else {
        for (const nb of neighbours) {
          if (!visited.has(nb)) {
            visited.add(nb);
            dfs(nb, newPath, newLatency);
            visited.delete(nb);
          }
        }
      }
    }

    for (const src of sourceNodes.length ? sourceNodes : nodes.slice(0, 1)) {
      visited.add(src.data.id);
      dfs(src.data.id, [], 0);
      visited.delete(src.data.id);
    }

    let minTp = Infinity;
    let bottleneck: { nodeId: string; label: string; reason: string } | null = null;
    for (const n of nodes) {
      const d = n.data;
      if (d.throughput < minTp) {
        minTp = d.throughput;
        const name = d.instanceLabel ? `${d.label} (${d.instanceLabel})` : d.label;
        bottleneck = {
          nodeId: n.data.id,
          label: name,
          reason: `Lowest throughput in cluster (${d.throughput.toLocaleString()} req/s)`,
        };
      }
    }

    const totalThroughput = nodes.reduce(
      (s, n) => Math.min(s, n.data.throughput),
      Infinity
    );

    const maxPathLatency = flowPaths.reduce((m, fp) => Math.max(m, fp.latency), 0);

    setAnalysis({
      nodes: nodes.length,
      edges: edges.length,
      totalThroughput: totalThroughput === Infinity ? 0 : totalThroughput,
      totalLatency: maxPathLatency,
      bottlenecks: bottleneck ? [bottleneck] : [],
      flowPaths: flowPaths.slice(0, 10),
    });
  }, [nodes, edges]);

  /* ── cytoscape initialization ───────────────────────────────── */
  const handleCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy;
    
    // Context menu on nodes
    cy.on('cxttap', 'node', (evt) => {
      evt.preventDefault?.();
      const nodeId = evt.target.id();
      setContextMenu({
        x: evt.position.x + window.scrollX,
        y: evt.position.y + window.scrollY,
        nodeId,
      });
    });
    
    // Context menu on edges
    cy.on('cxttap', 'edge', (evt) => {
      evt.preventDefault?.();
      const edgeId = evt.target.id();
      setContextMenu({
        x: evt.position.x + window.scrollX,
        y: evt.position.y + window.scrollY,
        edgeId,
      });
    });
    
    // Close context menu on tap
    cy.on('tap', () => {
      setContextMenu(null);
    });
    
    // Double-click to reconfigure nodes
    cy.on('dbltap', 'node', (evt) => {
      const cyNode = evt.target;
      const nodeId = cyNode.id();
      const serviceId = cyNode.data('serviceId');
      
      const svc = ALL_SERVICES.find((s) => s.id === serviceId);
      if (svc && svc.instanceTypes && svc.instanceTypes.length > 0) {
        setReconfigNode({ nodeId, service: svc });
      }
    });
    
    // Select nodes for right sidebar
    cy.on('select', 'node', (evt) => {
      setSelectedNodeId(evt.target.id());
    });
    
    cy.on('unselect', (evt) => {
      if (!evt.target.isEdge?.()) {
        setSelectedNodeId(null);
      }
    });
    
    // Track position changes
    cy.on('position', 'node', (evt) => {
      const nodeId = evt.target.id();
      const pos = evt.target.position();
      isUpdatingFromCy.current = true;
      setNodes(nds => nds.map(n => 
        n.data.id === nodeId ? { ...n, position: { x: pos.x, y: pos.y } } : n
      ));
    });
  }, []);

  // Delete node from context menu
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.data.id !== nodeId));
    setEdges(eds => eds.filter(e => e.data.source !== nodeId && e.data.target !== nodeId));
    setContextMenu(null);
    setSelectedNodeId(null);
  }, []);

  // Delete edge from context menu
  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.data.id !== edgeId));
    setContextMenu(null);
  }, []);

  // Update selected node properties
  const updateSelectedNode = useCallback((updates: Partial<ServiceNodeData>) => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.map(n => 
      n.data.id === selectedNodeId 
        ? { ...n, data: { ...n.data, ...updates } }
        : n
    ));
  }, [selectedNodeId]);

  /* ── cytoscape stylesheet ───────────────────────────────────── */
  const cytoscapeStyle = useMemo(() => [
    {
      selector: 'node',
      style: {
        'background-color': (ele: any) => {
          const cat = ele.data('category');
          return cat && CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] 
            ? CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] 
            : '#94a3b8';
        },
        'label': (ele: any) => {
          const label = ele.data('label');
          const instanceLabel = ele.data('instanceLabel');
          return instanceLabel ? `${label}\n${instanceLabel}` : label;
        },
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#1e293b',
        'font-size': '12px',
        'text-wrap': 'wrap',
        'text-max-width': '140px',
        'width': 140,
        'height': 80,
        'shape': 'roundrectangle',
        'border-width': 2,
        'border-color': '#e2e8f0',
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#0f766e',
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': (ele: any) => {
          const kind = ele.data('kind');
          if (kind === 'control') return '#f59e0b';
          if (kind === 'event') return '#8b5cf6';
          return '#64748b';
        },
        'target-arrow-color': (ele: any) => {
          const kind = ele.data('kind');
          if (kind === 'control') return '#f59e0b';
          if (kind === 'event') return '#8b5cf6';
          return '#64748b';
        },
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': (ele: any) => ele.data('label') || '',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 3,
        'line-color': '#0f766e',
        'target-arrow-color': '#0f766e',
      }
    }
  ], []);

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="editor-shell" onKeyDown={onKeyDown} tabIndex={0}>
      <Sidebar
        onDragStart={onDragStart}
        connectionKind={connectionKind}
        onConnectionKindChange={setConnectionKind}
        showConnectionPicker={phase === 'request'}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      <div 
        ref={canvasRef}
        className="reactflow-wrapper" 
        onDrop={onDrop} 
        onDragOver={onDragOver}
        onPointerMove={dragState?.active ? handleHandlePointerMove : undefined}
        onPointerUp={dragState?.active ? handleHandlePointerUp : undefined}
      >
        <Toolbar
          nodeCount={nodes.length}
          edgeCount={edges.length}
          onClear={clearCanvas}
          onAutoLayout={autoLayout}
          onAnalyze={runAnalysis}
        />

        <CytoscapeComponent
          elements={[]}
          style={{ width: '100%', height: '100%' }}
          stylesheet={cytoscapeStyle}
          cy={handleCyInit}
          boxSelectionEnabled={true}
          wheelSensitivity={0.1}
          zoomingEnabled={true}
          panningEnabled={true}
        />

        {/* Connection handles overlay */}
        {connectionHandles.map((handle) => (
          <div
            key={`${handle.nodeId}-${handle.position}`}
            className={`node-handle ${handle.position} ${
              hoveredHandle?.nodeId === handle.nodeId && 
              hoveredHandle?.position === handle.position ? 'active' : ''
            } ${dragState?.active ? 'visible' : ''}`}
            style={{
              position: 'absolute',
              left: `${handle.x - 5}px`,
              top: `${handle.y - 5}px`,
              pointerEvents: dragState?.active ? 'none' : 'auto',
            }}
            onPointerEnter={() => setHoveredHandle({ nodeId: handle.nodeId, position: handle.position })}
            onPointerLeave={() => setHoveredHandle(null)}
            onPointerDown={(e) => handleHandlePointerDown(e, handle.nodeId, handle.position)}
          />
        ))}

        {/* Drag preview line */}
        {dragState?.active && canvasRef.current && cyRef.current && (() => {
          const bounds = canvasRef.current.getBoundingClientRect();
          const startX = dragState.startX - bounds.left;
          const startY = dragState.startY - bounds.top;
          
          let endX = dragState.currentX - bounds.left;
          let endY = dragState.currentY - bounds.top;
          
          // Snap to target node center if hovering
          if (dragState.targetNodeId) {
            const targetNode = cyRef.current.getElementById(dragState.targetNodeId);
            if (targetNode && targetNode.length > 0) {
              const pos = targetNode.renderedPosition();
              endX = pos.x;
              endY = pos.y;
            }
          }
          
          return (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 100,
              }}
            >
              <defs>
                <marker
                  id="arrowhead-preview"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill={dragState.targetNodeId ? '#0f766e' : '#94a3b8'} />
                </marker>
              </defs>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={dragState.targetNodeId ? '#0f766e' : '#94a3b8'}
                strokeWidth="2"
                strokeDasharray={dragState.targetNodeId ? '0' : '5,5'}
                markerEnd="url(#arrowhead-preview)"
              />
              {dragState.targetNodeId && (
                <circle
                  cx={endX}
                  cy={endY}
                  r="30"
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2"
                  opacity="0.3"
                />
              )}
            </svg>
          );
        })()}

        <AnalysisPanel result={analysis} onClose={() => setAnalysis(null)} />

        {/* Right floating sidebar */}
        {selectedNodeId && (
          <div className="editor-right-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-section-title">Selected Service</div>
              {nodes.find(n => n.data.id === selectedNodeId) && (
                <div>
                  <div className="property-field">
                    <label className="property-label">Service</label>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                      {nodes.find(n => n.data.id === selectedNodeId)?.data.label}
                    </div>
                  </div>
                  <div className="property-field">
                    <label className="property-label">Throughput (req/s)</label>
                    <input
                      type="number"
                      className="property-input"
                      value={nodes.find(n => n.data.id === selectedNodeId)?.data.throughput || 0}
                      onChange={(e) => updateSelectedNode({ throughput: Number(e.target.value) })}
                    />
                  </div>
                  <div className="property-field">
                    <label className="property-label">Latency (ms)</label>
                    <input
                      type="number"
                      className="property-input"
                      value={nodes.find(n => n.data.id === selectedNodeId)?.data.latency || 0}
                      onChange={(e) => updateSelectedNode({ latency: Number(e.target.value) })}
                    />
                  </div>
                  <div className="property-field">
                    <label className="property-label">Replicas</label>
                    <input
                      type="number"
                      className="property-input"
                      min="1"
                      value={nodes.find(n => n.data.id === selectedNodeId)?.data.replicas || 1}
                      onChange={(e) => updateSelectedNode({ replicas: Number(e.target.value) })}
                    />
                  </div>
                  <button 
                    className="action-button danger"
                    onClick={() => deleteNode(selectedNodeId)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Context menu */}
        {contextMenu && (
          <div 
            className="context-menu"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            {contextMenu.nodeId && (
              <>
                <button 
                  className="context-menu-item"
                  onClick={() => {
                    setSelectedNodeId(contextMenu.nodeId!);
                    setContextMenu(null);
                  }}
                >
                  Properties
                </button>
                <button 
                  className="context-menu-item"
                  onClick={() => {
                    if (contextMenu.nodeId) {
                      const node = nodes.find(n => n.data.id === contextMenu.nodeId);
                      if (node) {
                        const svc = ALL_SERVICES.find(s => s.id === node.data.serviceId);
                        if (svc && svc.instanceTypes && svc.instanceTypes.length > 0) {
                          setReconfigNode({ nodeId: contextMenu.nodeId, service: svc });
                        }
                      }
                    }
                    setContextMenu(null);
                  }}
                >
                  Change Instance
                </button>
                <div className="context-menu-divider"></div>
                <button 
                  className="context-menu-item danger"
                  onClick={() => deleteNode(contextMenu.nodeId!)}
                >
                  Delete
                </button>
              </>
            )}
            {contextMenu.edgeId && (
              <>
                <button 
                  className="context-menu-item"
                  onClick={() => {
                    if (contextMenu.edgeId) {
                      const edge = edges.find(e => e.data.id === contextMenu.edgeId);
                      if (edge) {
                        setPendingConn({ source: edge.data.source, target: edge.data.target });
                        deleteEdge(contextMenu.edgeId);
                      }
                    }
                  }}
                >
                  Edit
                </button>
                <div className="context-menu-divider"></div>
                <button 
                  className="context-menu-item danger"
                  onClick={() => {
                    if (contextMenu.edgeId) {
                      deleteEdge(contextMenu.edgeId);
                    }
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {pendingConn && (
        <ConnectionDialog
          defaultKind={connectionKind}
          onConfirm={confirmConnection}
          onCancel={() => setPendingConn(null)}
        />
      )}

      {pendingDrop && (
        <InstancePicker
          service={pendingDrop.service}
          onConfirm={confirmInstanceDrop}
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {reconfigNode && (
        <InstancePicker
          service={reconfigNode.service}
          onConfirm={confirmReconfig}
          onCancel={() => setReconfigNode(null)}
        />
      )}
    </div>
  );
}
