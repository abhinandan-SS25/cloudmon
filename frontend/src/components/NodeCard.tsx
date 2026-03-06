/* ═══════════════════════════════════════════════════════════════
   NodeCard.tsx
   HTML card rendered inside an SVG foreignObject.
   Import CanvasNode (svg/CanvasNode.tsx) to embed this on the canvas
   with correct positioning and edge-connection handles.
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import type { CyNode } from '../types';

/* ── Inline SVG icons ─────────────────────────────────────────── */
const ServerIcon = ({ size = 40, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="6" rx="2" />
    <rect x="3" y="13" width="18" height="6" rx="2" />
    <circle cx="7" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="7" cy="16" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const DatabaseIcon = ({ size = 40, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 6c0 1.657 3.582 3 8 3s8-1.343 8-3-3.582-3-8-3-8 1.343-8 3z" />
    <path d="M4 6v12c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
    <path d="M4 12c0 1.657 3.582 3 8 3s8-1.343 8-3" />
  </svg>
);

const LoadBalancerIcon = ({ size = 40, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="15" y="15" width="6" height="6" rx="1.5" />
    <rect x="3" y="15" width="6" height="6" rx="1.5" />
    <rect x="9" y="3" width="6" height="6" rx="1.5" />
    <path d="M12 9v2" />
    <path d="M12 11H6v4" />
    <path d="M12 11h6v4" />
  </svg>
);

const CacheIcon = ({ size = 40, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 9h6" />
    <path d="M9 15h6" />
  </svg>
);

const AlertIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const NetworkIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M12 8v4" />
    <path d="M12 12H5v4" />
    <path d="M12 12h7v4" />
  </svg>
);

/* ── Type catalog ─────────────────────────────────────────────── */
export interface CatalogSpec {
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  textColor: string;
  category: string;
}

export const NODE_CATALOG: Record<string, CatalogSpec> = {
  web_server:      { icon: <ServerIcon size={40} />,       color: '#3b82f6', iconBg: '#eff6ff', textColor: '#2563eb', category: 'Compute'  },
  app_server:      { icon: <ServerIcon size={40} />,       color: '#6366f1', iconBg: '#eef2ff', textColor: '#4338ca', category: 'Compute'  },
  monolithic_api:  { icon: <ServerIcon size={40} />,       color: '#8b5cf6', iconBg: '#f5f3ff', textColor: '#7c3aed', category: 'API'      },
  microservice:    { icon: <NetworkIcon size={40} />,      color: '#06b6d4', iconBg: '#ecfeff', textColor: '#0891b2', category: 'Service'  },
  serverless:      { icon: <LayersIcon size={40} />,       color: '#f59e0b', iconBg: '#fffbeb', textColor: '#d97706', category: 'FaaS'     },
  container:       { icon: <CacheIcon size={40} />,        color: '#10b981', iconBg: '#ecfdf5', textColor: '#059669', category: 'Container'},
  kubernetes:      { icon: <NetworkIcon size={40} />,      color: '#0ea5e9', iconBg: '#f0f9ff', textColor: '#0404c7', category: 'Orchestr' },
  graphql:         { icon: <LoadBalancerIcon size={40} />, color: '#e11d48', iconBg: '#fff1f2', textColor: '#be123c', category: 'API'      },
  database:        { icon: <DatabaseIcon size={40} />,     color: '#ec4899', iconBg: '#fdf2f8', textColor: '#db2777', category: 'Storage'  },
  loadbalancer:    { icon: <LoadBalancerIcon size={40} />, color: '#10b981', iconBg: '#ecfdf5', textColor: '#059669', category: 'Network'  },
  cache:           { icon: <CacheIcon size={40} />,        color: '#f59e0b', iconBg: '#fffbeb', textColor: '#d97706', category: 'Memory'   },
};

const FALLBACK_SPEC: CatalogSpec = {
  icon: <ServerIcon size={40} />, color: '#64748b', iconBg: '#f8fafc', textColor: '#475569', category: 'Node',
};

/* ── Props ────────────────────────────────────────────────────── */
export interface NodeCardProps {
  node: CyNode;
  selected: boolean;
  isBottleneck: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/* ── Component ────────────────────────────────────────────────── */
export function NodeCard({ node, selected, isBottleneck, onMouseDown }: NodeCardProps) {
  const spec = NODE_CATALOG[node.type] || {
    icon: <ServerIcon size={32} />, color: '#64748b', category: 'Unknown'
  };
  const instances = node.config.instances || 1;
  const ipAddress = node.config.ip || 'Unassigned IP';
  const containerCount = node.config.containers?.length ?? 0;
  const firewallCount = node.config.firewallRules?.length ?? 0;

  return (
    <div 
      className={`node-card ${selected ? 'selected' : ''}`} 
      onMouseDown={onMouseDown} 
      style={{ '--theme-color': spec.color, '--theme-bg': spec.iconBg } as React.CSSProperties}
    >
        <div className="category-text">
          {spec.category}
        </div>
      {/* Icon Area without the connection handles */}
      <div className="icon-wrapper">
        {isBottleneck && <div className="badge-alert" title="Warning: Bottleneck" />}
        {instances > 1 && <div className="badge-instances">x{instances}</div>}
        {containerCount > 0 && (
          <div className="badge-containers" title={`${containerCount} container${containerCount !== 1 ? 's' : ''}`}>
            📦{containerCount}
          </div>
        )}
        
        {spec.icon}
      </div>

      {/* Structured Text Area */}
      <div className="text-area">
        <div className="label-text" title={node.label}>
          {node.label}
        </div>
        <div className="ip-text">
          {/* Automatically handles formatting like the "Unassigned IP" pill */}
          {ipAddress.replace(' ', '\n')} 
        </div>
        {firewallCount > 0 && (
          <div className="node-fw-badge" title={`${firewallCount} firewall rule${firewallCount !== 1 ? 's' : ''}`}>
            🛡 {firewallCount}
          </div>
        )}
      </div>
    </div>
  );
}