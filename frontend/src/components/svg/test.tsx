import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- TypeScript Interfaces ---

export interface NodeConfig {
  ip?: string;
  instances?: number;
  [key: string]: any;
}

export interface AppNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config: NodeConfig;
  isBottleneck: boolean;
}

export interface AppEdge {
  source: string;
  target: string;
}

export interface CatalogSpec {
  icon: React.ReactNode;
  color: string;       // Used for the top accent bar
  iconBg: string;      // Used for the prominent icon background
  textColor: string;   // Used for category text and icon stroke
  category: string;
}

// --- Minimalistic Custom SVG Icons ---

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

// --- Configuration & Mock Data ---

const CATALOG: Record<string, CatalogSpec> = {
  server: {
    icon: <ServerIcon size={32} />, // Increased icon size heavily
    color: '#3b82f6',     
    iconBg: '#eff6ff',    
    textColor: '#2563eb', 
    category: 'Compute',
  },
  database: {
    icon: <DatabaseIcon size={32} />,
    color: '#ec4899',     
    iconBg: '#fdf2f8',    
    textColor: '#db2777', 
    category: 'Storage',
  },
  loadbalancer: {
    icon: <LoadBalancerIcon size={32} />,
    color: '#10b981',     
    iconBg: '#ecfdf5',    
    textColor: '#059669', 
    category: 'Network',
  },
  cache: {
    icon: <CacheIcon size={32} />,
    color: '#f59e0b',     
    iconBg: '#fffbeb',    
    textColor: '#d97706', 
    category: 'Memory',
  },
};

const INITIAL_NODES: AppNode[] = [
  {
    id: 'lb-1',
    type: 'loadbalancer',
    label: 'Main Ingress ALB',
    x: 350,
    y: 100,
    config: { ip: '10.0.1.42', instances: 1 },
    isBottleneck: false,
  },
  {
    id: 'web-1',
    type: 'server',
    label: 'API Gateway Nodes',
    x: 350,
    y: 250,
    config: { ip: '10.0.2.10-15', instances: 5 },
    isBottleneck: true,
  },
  {
    id: 'db-1',
    type: 'database',
    label: 'Primary PostgreSQL',
    x: 200,
    y: 400,
    config: { ip: '10.0.3.50', instances: 1 },
    isBottleneck: false,
  },
  {
    id: 'cache-1',
    type: 'cache',
    label: 'Redis Cluster',
    x: 500,
    y: 400,
    config: { ip: '10.0.3.88', instances: 3 },
    isBottleneck: false,
  },
];

const EDGES: AppEdge[] = [
  { source: 'lb-1', target: 'web-1' },
  { source: 'web-1', target: 'db-1' },
  { source: 'web-1', target: 'cache-1' },
];

// --- Standard CSS Styles ---

const STYLES = `
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background-color: #f8fafc;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .toolbar {
    background-color: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
  }
  .toolbar h1 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }
  .canvas-area {
    flex-grow: 1;
    position: relative;
    cursor: grab;
  }
  .canvas-area:active {
    cursor: grabbing;
  }
  .canvas-svg {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    touch-action: none;
    will-change: transform;
  }

  /* Topology Node Layout */
  .node-card {
    position: relative;
    width: 110px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: grab;
    user-select: none;
    overflow: visible;
  }
  
  /* Large Art Block */
  .icon-wrapper {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    border: 2px solid transparent;
  }
  .node-card:hover:not(.selected) .icon-wrapper {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  .node-card.selected .icon-wrapper {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
  }
  .node-card.bottleneck .icon-wrapper {
    border-color: #ef4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4);
  }

  /* Miniature Badges attached to Art */
  .badge-alert {
    position: absolute;
    top: -6px;
    left: -6px;
    background-color: #ef4444;
    color: #ffffff;
    font-size: 12px;
    font-weight: 900;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  .badge-instances {
    position: absolute;
    top: -6px;
    right: -6px;
    background-color: #1e293b;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 5px;
    border-radius: 10px;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  /* Ultra-tight Stacked Text Area */
  .text-area {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
  }
  .category-text {
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1;
    margin-bottom: 2px;
    background: rgba(255, 255, 255, 0.7); /* subtle blur against grid */
    padding: 0 4px;
    border-radius: 4px;
  }
  .label-text {
    font-size: 11.5px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.1;
    margin-bottom: 3px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-shadow: 0 1px 0 #ffffff, 0 -1px 0 #ffffff, 1px 0 0 #ffffff, -1px 0 0 #ffffff;
  }
  .ip-text {
    font-size: 9px;
    font-weight: 600;
    color: #475569;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background-color: #e2e8f0;
    padding: 2px 5px;
    border-radius: 4px;
    line-height: 1;
  }
  .foreign-object-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

// --- NodeCard Component ---

interface NodeCardProps {
  node: AppNode;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function NodeCard({ node, selected, onMouseDown }: NodeCardProps) {
  const spec = CATALOG[node.type] || {
    icon: <ServerIcon size={32} />, color: '#64748b', category: 'Unknown'
  };
  const instances = node.config.instances || 1;
  const ipAddress = node.config.ip || 'Unassigned IP';
  const isBottleneck = node.isBottleneck;

  let cardClasses = "node-card";
  if (selected) cardClasses += " selected";
  if (isBottleneck) cardClasses += " bottleneck";

  return (
    <div className={cardClasses} onMouseDown={onMouseDown}>
      {/* The big art block */}
      <div className="icon-wrapper" style={{ backgroundColor: spec.color }}>
        {isBottleneck && <div className="badge-alert" title="Bottleneck">!</div>}
        {instances > 1 && <div className="badge-instances">×{instances}</div>}
        {spec.icon}
      </div>

      {/* The tightly packed text below the icon */}
      <div className="text-area">
        <div className="category-text" style={{ color: spec.color }}>
          {spec.category}
        </div>
        <div className="label-text" title={node.label}>
          {node.label}
        </div>
        <div className="ip-text">
          {ipAddress}
        </div>
      </div>
    </div>
  );
}

// --- Main Application / Canvas ---

export default function App() {
  const [nodes, setNodes] = useState<AppNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Canvas Transform State (Zoom and Pan)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle Zooming via Scroll Wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(Math.max(0.2, prev.scale * scaleAdjust), 3),
    }));
  }, []);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (svgElement) {
      svgElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => svgElement.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Global Pointer Events for Dragging/Panning
  const handlePointerDown = (e: React.PointerEvent) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if ((e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setSelectedNodeId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    } else if (draggedNode) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNode
            ? { ...n, x: n.x + dx / transform.scale, y: n.y + dy / transform.scale }
            : n
        )
      );
    }

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggedNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggedNode(nodeId);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  // Helper to get center of a node for edges
  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x + 55, // Half of new 110px width
      y: node.y + 28, // Center of the 56px icon block
    };
  };

  return (
    <div className="app-container">
      <style>{STYLES}</style>
      {/* Toolbar */}
      <div className="toolbar">
        <div>
          <h1>
            <LayersIcon size={18} /> Architecture Canvas
          </h1>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div 
        className="canvas-area"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          ref={svgRef}
          className="canvas-svg"
        >
          {/* Grid Background */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={`scale(${transform.scale}) translate(${transform.x / transform.scale}, ${transform.y / transform.scale})`}>
              <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            
            {/* Edges */}
            <g className="edges">
              {EDGES.map((edge, idx) => {
                const source = getNodeCenter(edge.source);
                const target = getNodeCenter(edge.target);
                
                const isVertical = Math.abs(target.y - source.y) > Math.abs(target.x - source.x);
                const cpOffset = 60;
                let pathD = '';
                
                if (isVertical) {
                  pathD = `M ${source.x} ${source.y} C ${source.x} ${source.y + cpOffset}, ${target.x} ${target.y - cpOffset}, ${target.x} ${target.y}`;
                } else {
                  pathD = `M ${source.x} ${source.y} C ${source.x + cpOffset} ${source.y}, ${target.x - cpOffset} ${target.y}, ${target.x} ${target.y}`;
                }

                return (
                  <path
                    key={idx}
                    d={pathD}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
            </g>

            {/* Nodes */}
            {nodes.map((node) => {
              // Adjust foreignObject dimensions to fit vertical layout
              const padding = 16; 
              const foWidth = 110 + padding * 2;
              const foHeight = 110 + padding * 2; 

              return (
                <foreignObject
                  key={node.id}
                  x={node.x - padding}
                  y={node.y - padding}
                  width={foWidth}
                  height={foHeight}
                  style={{ overflow: 'visible' }} 
                >
                  <div className="foreign-object-wrapper">
                    <NodeCard
                      node={node}
                      selected={selectedNodeId === node.id}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    />
                  </div>
                </foreignObject>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}