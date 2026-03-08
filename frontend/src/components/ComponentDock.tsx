/* ═══════════════════════════════════════════════════════════════
   ComponentDock.tsx
   Floating bottom dock + popover tray for dragging components
   onto the canvas. No Tailwind — uses App.css `.dock-*` classes.
   ═══════════════════════════════════════════════════════════════ */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search, X, Home, ChevronRight,
  MonitorSmartphone, Network, Cpu, Database, HardDrive,
  ShieldCheck, Activity,
  Laptop, Smartphone, CloudLightning, Compass,
  Waypoints, SplitSquareHorizontal, Shield, Lock, Server, Box, Hexagon,
  Zap, LayoutTemplate, FastForward, Cloud, FolderOpen, Inbox, Workflow,
  FileText, GitBranch, Key,
} from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import { findLeafById } from '../utils/canvasUtils';

/* ── Icon map (needed for serialisation across drag) ────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  Laptop, Smartphone, CloudLightning, Compass, Waypoints, Network,
  SplitSquareHorizontal, Shield, Lock, Server, Cpu, Zap, Box, Hexagon,
  Database, LayoutTemplate, FastForward, Search, Cloud, HardDrive,
  FolderOpen, Inbox, Workflow, Activity, FileText, GitBranch, Key,
};

/* ── Catalog ─────────────────────────────────────────────────── */
interface DockItem {
  type: string;
  label: string;
  category: string;
  icon: string;
  color: string;
  textColor: string;
}

const CATALOG: Record<string, DockItem> = {
  /* CLIENT */
  client:         { type: 'client',         label: 'Web Client',      category: 'client',       icon: 'Laptop',               color: '#e0e7ff', textColor: '#3730a3' },
  mobile_client:  { type: 'mobile_client',  label: 'Mobile App',      category: 'client',       icon: 'Smartphone',           color: '#e0e7ff', textColor: '#3730a3' },
  /* NETWORK */
  cdn:            { type: 'cdn',            label: 'CDN',             category: 'network',      icon: 'CloudLightning',       color: '#fef3c7', textColor: '#92400e' },
  dns:            { type: 'dns',            label: 'DNS',             category: 'network',      icon: 'Compass',              color: '#fef3c7', textColor: '#92400e' },
  api_gateway:    { type: 'api_gateway',    label: 'API Gateway',     category: 'network',      icon: 'Waypoints',            color: '#fef3c7', textColor: '#92400e' },
  load_balancer:  { type: 'load_balancer',  label: 'Load Balancer',   category: 'network',      icon: 'SplitSquareHorizontal',color: '#fef3c7', textColor: '#92400e' },
  /* SECURITY */
  firewall:       { type: 'firewall',       label: 'WAF / Firewall',  category: 'security',     icon: 'Shield',               color: '#fee2e2', textColor: '#991b1b' },
  vpn:            { type: 'vpn',            label: 'VPN Gateway',     category: 'security',     icon: 'Lock',                 color: '#fee2e2', textColor: '#991b1b' },
  vault:          { type: 'vault',          label: 'Secret Vault',    category: 'security',     icon: 'Key',                  color: '#fee2e2', textColor: '#991b1b' },
  /* COMPUTE */
  web_server:     { type: 'web_server',     label: 'Web Server',      category: 'compute',      icon: 'Server',               color: '#d1fae5', textColor: '#065f46' },
  app_server:     { type: 'app_server',     label: 'App Server',      category: 'compute',      icon: 'Cpu',                  color: '#d1fae5', textColor: '#065f46' },
  serverless:     { type: 'serverless',     label: 'Serverless Func', category: 'compute',      icon: 'Zap',                  color: '#d1fae5', textColor: '#065f46' },
  container:      { type: 'container',      label: 'Container',       category: 'compute',      icon: 'Box',                  color: '#d1fae5', textColor: '#065f46' },
  kubernetes:     { type: 'kubernetes',     label: 'K8s Cluster',     category: 'compute',      icon: 'Hexagon',              color: '#d1fae5', textColor: '#065f46' },
  /* DATA */
  postgres:       { type: 'postgres',       label: 'PostgreSQL',      category: 'data',         icon: 'Database',             color: '#ede9fe', textColor: '#4c1d95' },
  sql:            { type: 'sql',            label: 'MySQL',           category: 'data',         icon: 'Database',             color: '#ede9fe', textColor: '#4c1d95' },
  dynamodb:       { type: 'dynamodb',       label: 'DynamoDB',        category: 'data',         icon: 'LayoutTemplate',       color: '#ede9fe', textColor: '#4c1d95' },
  non_relational: { type: 'non_relational', label: 'MongoDB',         category: 'data',         icon: 'LayoutTemplate',       color: '#ede9fe', textColor: '#4c1d95' },
  redis:          { type: 'redis',          label: 'Redis Cache',     category: 'data',         icon: 'FastForward',          color: '#ede9fe', textColor: '#4c1d95' },
  elasticsearch:  { type: 'elasticsearch',  label: 'Elasticsearch',   category: 'data',         icon: 'Search',               color: '#ede9fe', textColor: '#4c1d95' },
  /* STORAGE */
  object_storage: { type: 'object_storage', label: 'S3 / Object',    category: 'storage',      icon: 'Cloud',                color: '#fff7ed', textColor: '#7c2d12' },
  block_storage:  { type: 'block_storage',  label: 'EBS / Block',    category: 'storage',      icon: 'HardDrive',            color: '#fff7ed', textColor: '#7c2d12' },
  nfs:            { type: 'nfs',            label: 'NFS / Shared',   category: 'storage',      icon: 'FolderOpen',           color: '#fff7ed', textColor: '#7c2d12' },
  /* MESSAGING */
  message_queue:  { type: 'message_queue',  label: 'Message Queue',  category: 'messaging',    icon: 'Inbox',                color: '#ecfdf5', textColor: '#064e3b' },
  kafka:          { type: 'kafka',          label: 'Kafka Stream',   category: 'messaging',    icon: 'Workflow',             color: '#ecfdf5', textColor: '#064e3b' },
  /* OBSERVABILITY */
  monitoring:     { type: 'monitoring',     label: 'Metrics',        category: 'observability', icon: 'Activity',            color: '#f0fdf4', textColor: '#14532d' },
  logging:        { type: 'logging',        label: 'Logs',           category: 'observability', icon: 'FileText',            color: '#f0fdf4', textColor: '#14532d' },
  tracing:        { type: 'tracing',        label: 'Tracing',        category: 'observability', icon: 'GitBranch',           color: '#f0fdf4', textColor: '#14532d' },
};

/* ── Category metadata ───────────────────────────────────────── */
interface CatMeta { label: string; icon: React.ElementType; }
const CATEGORY_META: Record<string, CatMeta> = {
  client:        { label: 'Client',    icon: MonitorSmartphone },
  network:       { label: 'Network',   icon: Network           },
  security:      { label: 'Security',  icon: ShieldCheck       },
  compute:       { label: 'Compute',   icon: Cpu               },
  data:          { label: 'Database',  icon: Database          },
  storage:       { label: 'Storage',   icon: HardDrive         },
  messaging:     { label: 'Messaging', icon: Inbox             },
  observability: { label: 'Observe',   icon: Activity          },
};
const CATEGORY_ORDER = ['client','network','security','compute','data','storage','messaging','observability'];

/* ── DockItem draggable tile ─────────────────────────────────── */
function DockItemTile({ item }: { item: DockItem }) {
  const Icon = ICON_MAP[item.icon] ?? Box;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="dock-item"
    >
      <div
        className="dock-item-icon"
        style={{ background: item.color, color: item.textColor }}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <span className="dock-item-label">{item.label}</span>
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────── */
export interface ComponentDockProps {
  /** Called when user drops onto the canvas via the tray — optional
      if parent canvas handles drag events natively. */
  onClose?: () => void;
}

/* ── Main component ──────────────────────────────────────────── */
export function ComponentDock() {
  const [activeTray, setActiveTray] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  /* breadcrumb context */
  const navigate = useNavigate();
  const { projectId, requestId } = useParams<{ projectId?: string; requestId?: string }>();
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const projectName = project?.name ?? 'Untitled';
  const requestName = useMemo(() => {
    if (!project || !requestId) return null;
    return findLeafById(project.requests, requestId)?.name ?? null;
  }, [project, requestId]);

  /* focus search input when search tray opens */
  useEffect(() => {
    if (activeTray === 'search') {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [activeTray]);

  const filteredItems = useMemo<DockItem[]>(() => {
    if (activeTray === 'search') {
      const q = searchQuery.toLowerCase().trim();
      return Object.values(CATALOG).filter(
        (item) => q === '' || item.label.toLowerCase().includes(q) || item.type.includes(q)
      );
    }
    if (activeTray && CATEGORY_META[activeTray]) {
      return Object.values(CATALOG).filter((item) => item.category === activeTray);
    }
    return [];
  }, [activeTray, searchQuery]);

  const closeTray = () => {
    setActiveTray(null);
    setSearchQuery('');
  };

  const toggleTray = (key: string) => {
    if (activeTray === key) { closeTray(); }
    else { setActiveTray(key); if (key !== 'search') setSearchQuery(''); }
  };

  const trayOpen = activeTray !== null;
  const trayTitle = activeTray && CATEGORY_META[activeTray]
    ? `${CATEGORY_META[activeTray].label} Primitives`
    : 'Search Components';

  return (
    <div className="dock-root" onClick={(e) => e.stopPropagation()}>

      {/* ── Tray popover ──────────────────────────────────── */}
      <div className={`dock-tray${trayOpen ? ' dock-tray--open' : ''}`}>
        {/* Header */}
        <div className="dock-tray-header">
          {activeTray === 'search' ? (
            <div className="dock-tray-search-wrap">
              <Search size={14} className="dock-tray-search-icon" />
              <input
                ref={searchRef}
                className="dock-tray-search-input"
                type="text"
                placeholder="Search architecture components…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          ) : (
            <span className="dock-tray-title">
              {activeTray && CATEGORY_META[activeTray] && (
                React.createElement(CATEGORY_META[activeTray].icon, { size: 15, style: { color: 'var(--accent)', flexShrink: 0 } })
              )}
              {trayTitle}
            </span>
          )}
          <button className="dock-tray-close" onClick={closeTray}>
            <X size={15} />
          </button>
        </div>

        {/* Grid */}
        <div className="dock-tray-body">
          {filteredItems.length === 0 ? (
            <div className="dock-tray-empty">No components found.</div>
          ) : (
            <div className="dock-tray-grid">
              {filteredItems.map((item) => (
                <DockItemTile key={item.type} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom dock bar ───────────────────────────────── */}
      <div className="dock-bar">
        {/* Home button */}
        <button
          className="dock-btn dock-btn--home"
          onClick={() => navigate('/')}
          title="Go home"
        >
          <Home size={19} strokeWidth={2} />
          <span className="dock-btn-label">Home</span>
        </button>

        <div className="dock-divider" />

        {/* Breadcrumb: Projects > Name > Request */}
        <div className="dock-breadcrumb" title={requestName ? `${projectName} › ${requestName}` : projectName}>
          <span
            className="dock-crumb"
            onClick={() => navigate('/projects')}
          >
            Projects
          </span>
          <ChevronRight size={11} className="dock-crumb-sep" />
          <span
            className={`dock-crumb${!requestName ? ' dock-crumb--active' : ''}`}
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            {projectName}
          </span>
          {requestName && (
            <>
              <ChevronRight size={11} className="dock-crumb-sep" />
              <span className="dock-crumb dock-crumb--active">{requestName}</span>
            </>
          )}
        </div>

        <div className="dock-divider" />

        {/* Search */}
        <button
          className={`dock-btn${activeTray === 'search' ? ' dock-btn--active' : ''}`}
          onClick={() => toggleTray('search')}
          title="Search"
        >
          <Search size={19} strokeWidth={activeTray === 'search' ? 2.5 : 2} />
          <span className="dock-btn-label">Search</span>
        </button>

        <div className="dock-divider" />

        {/* Category buttons */}
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isActive = activeTray === cat;
          const Icon = meta.icon;
          return (
            <button
              key={cat}
              className={`dock-btn${isActive ? ' dock-btn--active' : ''}`}
              onClick={() => toggleTray(cat)}
              title={meta.label}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span className="dock-btn-label">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
