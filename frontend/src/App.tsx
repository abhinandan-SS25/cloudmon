/* ═══════════════════════════════════════════════════════════════
   App.tsx – CloudMon Application Shell
   Provides routing, shared header, and project context.
   ═══════════════════════════════════════════════════════════════ */
import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

// @ts-ignore
import './App.css';

import { ProjectsProvider, useProjects } from './context/ProjectsContext';
import LandingPage from './pages/LandingPage';
import NodeDetailPage from './pages/NodeDetailPage';
import ProjectEditorPage from './pages/ProjectEditorPage';
import ProjectsPage from './pages/ProjectsPage';
import catalog, { PALETTE_SECTIONS } from './data/componentCatalog';

/* ─────────────────────────────────────────────────────────────
   EditorHeader – shown only when inside a project editor.
   Logo → home, one dropdown per section category, Manage menu.
   ───────────────────────────────────────────────────────────── */

/* ── Type helpers for palette sections ─────────────────────────── */
interface DragItem { key: string; name: string; emoji: string; desc: string; }
interface ClickItem { name: string; emoji: string; desc: string; extra: Record<string, unknown>; }
interface DragSection  { title: string; color: string; clickOnly?: false; items: DragItem[]; }
interface ClickSection { title: string; color: string; clickOnly: true; event: string; items: ClickItem[]; }
type PaletteSection = DragSection | ClickSection;

/** Node-page service palette — organised by technology stack */
const NODE_PALETTE_SECTIONS: PaletteSection[] = [
  {
    title: 'Docker',
    color: '#0099e6',
    items: [
      { key: 'docker',  name: 'Container',     emoji: '🐳', desc: 'Generic Docker container' },
      { key: 'docker',  name: 'Web Server',     emoji: '🌐', desc: 'nginx / apache front-end' },
      { key: 'docker',  name: 'App Server',     emoji: '⚙️', desc: 'Backend application process' },
      { key: 'docker',  name: 'Build Stage',    emoji: '🏗️', desc: 'Multi-stage build container' },
      { key: 'sidecar', name: 'Compose Stack',  emoji: '📋', desc: 'docker-compose service group' },
      { key: 'docker',  name: 'Docker Network', emoji: '🔗', desc: 'Custom bridge / overlay network' },
    ],
  },
  {
    title: 'Kubernetes',
    color: '#326CE5',
    items: [
      { key: 'k8s_pod',    name: 'Pod',         emoji: '⬡',  desc: 'Smallest deployable K8s unit' },
      { key: 'k8s_deploy', name: 'Deployment',  emoji: '🚀', desc: 'Managed stateless workload' },
      { key: 'k8s_deploy', name: 'StatefulSet', emoji: '🗄️',  desc: 'Ordered, stable pod identity' },
      { key: 'k8s_deploy', name: 'DaemonSet',   emoji: '🔄', desc: 'One pod per node' },
      { key: 'k8s_deploy', name: 'ReplicaSet',  emoji: '📦', desc: 'Maintain replica count' },
      { key: 'lb',         name: 'K8s Service', emoji: '🔀', desc: 'ClusterIP / NodePort / LB' },
      { key: 'lb',         name: 'Ingress',     emoji: '↖️',  desc: 'HTTP routing rules' },
      { key: 'sidecar',    name: 'ConfigMap',   emoji: '🔧', desc: 'Non-secret configuration data' },
      { key: 'sidecar',    name: 'Secret',      emoji: '🔐', desc: 'Encrypted config / credentials' },
      { key: 'lb',         name: 'Namespace',   emoji: '🗂️',  desc: 'Logical cluster partition' },
    ],
  },
  {
    title: 'Scheduling',
    color: '#7c3aed',
    items: [
      { key: 'k8s_cronjob', name: 'CronJob',          emoji: '⏰', desc: 'Cron-based periodic job' },
      { key: 'k8s_cronjob', name: 'One-Shot Job',      emoji: '▶️',  desc: 'Run once to completion' },
      { key: 'k8s_cronjob', name: 'Background Worker', emoji: '⚙️', desc: 'Long-running async worker' },
      { key: 'queue',       name: 'Rate Limiter',      emoji: '🚦', desc: 'Token-bucket rate control' },
      { key: 'k8s_cronjob', name: 'Retry Queue',       emoji: '🔁', desc: 'Dead-letter retry processor' },
      { key: 'k8s_cronjob', name: 'Scheduled Report',  emoji: '📊', desc: 'Nightly / weekly report job' },
    ],
  },
  {
    title: 'Networking',
    color: '#059669',
    items: [
      { key: 'lb',      name: 'Load Balancer',   emoji: '⚖️',  desc: 'Distribute traffic across pods' },
      { key: 'lb',      name: 'API Gateway',     emoji: '🌐', desc: 'Managed API entry point' },
      { key: 'sidecar', name: 'Reverse Proxy',   emoji: '🔄', desc: 'nginx/Caddy upstream proxy' },
      { key: 'sidecar', name: 'Service Mesh',    emoji: '🕸️',  desc: 'Istio / Linkerd sidecar' },
      { key: 'sidecar', name: 'Envoy Proxy',     emoji: '🛰️',  desc: 'High-perf L7 proxy' },
      { key: 'sidecar', name: 'WAF',             emoji: '🛡️',  desc: 'Web application firewall' },
      { key: 'lb',      name: 'TLS Terminator',  emoji: '🔒', desc: 'SSL offload at edge' },
      { key: 'sidecar', name: 'Circuit Breaker', emoji: '⚡', desc: 'Resilience / fallback pattern' },
      { key: 'lb',      name: 'CDN Edge',        emoji: '🌍', desc: 'Content delivery / caching' },
    ],
  },
  {
    title: 'Messaging',
    color: '#e53e3e',
    items: [
      { key: 'queue', name: 'Queue Worker',     emoji: '📨', desc: 'FIFO task consumer' },
      { key: 'queue', name: 'Event Bus',        emoji: '🔔', desc: 'CloudEvents / NATS backbone' },
      { key: 'queue', name: 'Pub/Sub Service',  emoji: '📢', desc: 'Fan-out topic subscription' },
      { key: 'queue', name: 'Message Broker',   emoji: '🔀', desc: 'RabbitMQ / ActiveMQ broker' },
      { key: 'queue', name: 'Stream Processor', emoji: '📊', desc: 'Kafka / Kinesis pipeline' },
      { key: 'queue', name: 'Dead Letter Queue',emoji: '💀', desc: 'Failed message holding area' },
      { key: 'queue', name: 'Webhook Relay',    emoji: '🪝', desc: 'Inbound webhook fan-out' },
    ],
  },
  /* ── Click-to-add (not draggable) – dispatched via window CustomEvent ── */
  {
    title: 'Storage',
    color: '#b45309',
    clickOnly: true,
    event: 'cloudmon:add-storage',
    items: [
      { name: 'SSD Block Vol.',   emoji: '💾', desc: '100 GB persistent SSD volume',     extra: { name: 'SSD Block Volume',       type: 'volume', sizeGb: 100  } },
      { name: 'NFS Mount',        emoji: '🗂️', desc: 'Shared network file system (500 GB)', extra: { name: 'NFS Mount',              type: 'bind',   sizeGb: 500  } },
      { name: 'RAM Disk',         emoji: '⚡',  desc: 'tmpfs in-memory volume (4 GB)',     extra: { name: 'RAM Disk (tmpfs)',        type: 'tmpfs',  sizeGb: 4    } },
      { name: 'Object Store',     emoji: '🪣',  desc: 'S3-compatible blob bucket (1 TB)',  extra: { name: 'Object Store',           type: 'volume', sizeGb: 1000 } },
      { name: 'Ephemeral Vol.',   emoji: '📦',  desc: 'Temporary, lost on restart',       extra: { name: 'Ephemeral Volume',       type: 'volume', sizeGb: 20   } },
      { name: 'PV Claim',         emoji: '🗄️', desc: 'K8s Persistent Volume Claim (200 GB)',extra:{ name: 'PV Claim',               type: 'volume', sizeGb: 200  } },
      { name: 'Config Volume',    emoji: '🔧',  desc: 'Read-only mounted config (1 GB)',   extra: { name: 'Config Volume',          type: 'bind',   sizeGb: 1    } },
      { name: 'Shared Scratch',   emoji: '🔄',  desc: 'Multi-pod shared scratch space',    extra: { name: 'Shared Scratch',         type: 'volume', sizeGb: 50   } },
    ],
  } as ClickSection,
  {
    title: 'Firewall',
    color: '#dc2626',
    clickOnly: true,
    event: 'cloudmon:add-firewall',
    items: [
      { name: 'Allow HTTP',       emoji: '🌐', desc: 'Inbound TCP 80',               extra: { direction:'inbound',  protocol:'tcp', portRange:'80',      cidr:'0.0.0.0/0',  action:'allow' } },
      { name: 'Allow HTTPS',      emoji: '🔒', desc: 'Inbound TCP 443',              extra: { direction:'inbound',  protocol:'tcp', portRange:'443',     cidr:'0.0.0.0/0',  action:'allow' } },
      { name: 'Allow SSH',        emoji: '🔑', desc: 'Inbound TCP 22',               extra: { direction:'inbound',  protocol:'tcp', portRange:'22',      cidr:'0.0.0.0/0',  action:'allow' } },
      { name: 'PostgreSQL',       emoji: '🐘', desc: 'Inbound TCP 5432 (VPC only)',  extra: { direction:'inbound',  protocol:'tcp', portRange:'5432',    cidr:'10.0.0.0/8', action:'allow' } },
      { name: 'Redis',            emoji: '🔴', desc: 'Inbound TCP 6379 (VPC only)',  extra: { direction:'inbound',  protocol:'tcp', portRange:'6379',    cidr:'10.0.0.0/8', action:'allow' } },
      { name: 'All Outbound',     emoji: '↗️',  desc: 'Allow all egress traffic',     extra: { direction:'outbound', protocol:'any', portRange:'0-65535', cidr:'0.0.0.0/0',  action:'allow' } },
      { name: 'Block All In',     emoji: '🚫', desc: 'Default-deny inbound',         extra: { direction:'inbound',  protocol:'any', portRange:'0-65535', cidr:'0.0.0.0/0',  action:'deny'  } },
      { name: 'gRPC (50051)',     emoji: '🔌', desc: 'Inbound TCP 50051 (VPC)',      extra: { direction:'inbound',  protocol:'tcp', portRange:'50051',   cidr:'10.0.0.0/8', action:'allow' } },
      { name: 'Kafka (9092)',     emoji: '📥', desc: 'Inbound TCP 9092 (VPC)',       extra: { direction:'inbound',  protocol:'tcp', portRange:'9092',    cidr:'10.0.0.0/8', action:'allow' } },
      { name: 'Custom Rule',      emoji: '🔧', desc: 'Define your own rule',          extra: { direction:'inbound',  protocol:'tcp', portRange:'8080',    cidr:'0.0.0.0/0',  action:'allow' } },
    ],
  } as ClickSection,
];

/** Flat search index built once from the catalog. */
const SEARCH_INDEX: Array<{ key: string; sectionTitle: string }> =
  PALETTE_SECTIONS.flatMap((s) =>
    s.keys.map((key) => ({ key, sectionTitle: s.title }))
  );

function searchComponents(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return SEARCH_INDEX.filter(({ key }) => {
    const spec = catalog[key];
    if (!spec) return false;
    return (
      spec.label.toLowerCase().includes(q) ||
      spec.type.toLowerCase().includes(q) ||
      spec.description.toLowerCase().includes(q) ||
      spec.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

function EditorHeader() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { createNewProject } = useProjects();

  /* Detect if on a Node Detail page */
  const isNodeDetail = /\/nodes\//.test(location.pathname);

  /* Which dropdown is open: section title | 'manage' | null */
  const [open, setOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const headerRef  = useRef<HTMLElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(null);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function toggle(key: string) {
    setSearchQuery('');
    setOpen((prev) => (prev === key ? null : key));
  }

  function handleSearchFocus() {
    setOpen(null); // close any category dropdown when search is active
  }

  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setSearchQuery(''); searchRef.current?.blur(); }
  }

  function handleDragStart(key: string, e: React.DragEvent) {
    e.dataTransfer.setData('componentType', key);
    e.dataTransfer.effectAllowed = 'copy';
    setSearchQuery('');
  }

  function handleNewProject() {
    setOpen(null);
    const p = createNewProject();
    navigate(`/projects/${p.id}`);
  }

  const searchResults = searchComponents(searchQuery);
  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <header className="app-header app-header--editor" ref={headerRef}>
      {/* Brand */}
      <Link to="/" className="editor-logo" onClick={() => setOpen(null)}>
        CloudMon
      </Link>

      <div className="editor-header-divider" />

      {/* Manage dropdown */}
      <div className="hdr-menu hdr-menu--manage">
        <button
          className={`hdr-menu-trigger hdr-manage-trigger${open === 'manage' ? ' open' : ''}`}
          onClick={() => toggle('manage')}
        >
          Manage
          <span className="hdr-caret">{open === 'manage' ? '▴' : '▾'}</span>
        </button>

        {open === 'manage' && (
          <div className="hdr-manage-panel">
            <button className="hdr-manage-item" onClick={handleNewProject}>
              <span className="hdr-manage-icon">＋</span>
              New project
            </button>
            <button className="hdr-manage-item" onClick={() => { setOpen(null); navigate('/projects'); }}>
              <span className="hdr-manage-icon">🗂</span>
              Browse projects
            </button>
            <div className="hdr-manage-sep" />
            <button className="hdr-manage-item" onClick={() => { setOpen(null); navigate('/'); }}>
              <span className="hdr-manage-icon">🏠</span>
              Home
            </button>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="hdr-search-wrap">
        <span className="hdr-search-icon">⌕</span>
        <input
          ref={searchRef}
          className="hdr-search-input"
          type="text"
          placeholder="Search components…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleSearchFocus}
          onKeyDown={handleSearchKey}
          spellCheck={false}
        />
        {searchQuery && (
          <button className="hdr-search-clear" onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}>
            ✕
          </button>
        )}

        {showSearchResults && (
          <div className="hdr-search-panel">
            {searchResults.length === 0 ? (
              <div className="hdr-search-empty">No components match "{searchQuery}"</div>
            ) : (
              <div className="hdr-search-results">
                {searchResults.map(({ key, sectionTitle }) => {
                  const spec = catalog[key];
                  if (!spec) return null;
                  return (
                    <div
                      key={key}
                      className="hdr-search-item"
                      draggable
                      onDragStart={(e) => handleDragStart(key, e)}
                      title={spec.description}
                    >
                      <span
                        className="hdr-comp-icon"
                        style={{ background: spec.color, color: spec.textColor }}
                      >
                        {spec.icon}
                      </span>
                      <div className="hdr-search-item-text">
                        <span className="hdr-search-item-label">{spec.label}</span>
                        <span className="hdr-search-item-section">{sectionTitle}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-category palette on NodeDetail route; normal component palette otherwise */}
      {isNodeDetail ? (
        NODE_PALETTE_SECTIONS.map(section => {
          const isOpen = open === section.title;
          return (
            <div key={section.title} className="hdr-menu">
              <button
                className={`hdr-menu-trigger${isOpen ? ' open' : ''}`}
                style={{ borderBottom: isOpen ? `2px solid ${section.color}` : undefined }}
                onClick={() => toggle(section.title)}
              >
                {section.title}
                <span className="hdr-caret">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div className="hdr-comp-panel node-palette">
                  {section.items.map(item => {
                    const isClick = section.clickOnly === true;
                    return (
                      <div
                        key={item.name}
                        className={`hdr-comp-item${isClick ? ' hdr-comp-item--action' : ''}`}
                        draggable={!isClick}
                        onDragStart={isClick ? undefined : e => {
                          // Keep the panel mounted during drag — close on dragEnd instead
                          e.dataTransfer.setData('itemKind', (item as DragItem).key);
                          e.dataTransfer.setData('itemName', item.name);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onDragEnd={isClick ? undefined : () => setOpen(null)}
                        onClick={isClick ? () => {
                          window.dispatchEvent(new CustomEvent(
                            (section as ClickSection).event,
                            { detail: (item as ClickItem).extra },
                          ));
                          setOpen(null);
                        } : undefined}
                        title={item.desc}
                      >
                        <span
                          className="hdr-comp-icon"
                          style={{ background: `${section.color}18`, color: section.color, fontSize: '1.1rem' }}
                        >{item.emoji}</span>
                        <span className="hdr-comp-label">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      ) : (
        PALETTE_SECTIONS.map((section) => {
          const isOpen = open === section.title;
          return (
            <div key={section.title} className="hdr-menu">
              <button
                className={`hdr-menu-trigger${isOpen ? ' open' : ''}`}
                onClick={() => toggle(section.title)}
              >
                {section.title}
                <span className="hdr-caret">{isOpen ? '▴' : '▾'}</span>
              </button>

              {isOpen && (
                <div className="hdr-comp-panel center">
                  {section.keys.map((key) => {
                    const spec = catalog[key];
                    if (!spec) return null;
                    return (
                      <div
                        key={key}
                        className="hdr-comp-item"
                        draggable
                        onDragStart={(e) => handleDragStart(key, e)}
                        title={spec.description}
                      >
                        <span
                          className="hdr-comp-icon"
                          style={{ background: spec.color, color: spec.textColor }}
                        >
                          {spec.icon}
                        </span>
                        <span className="hdr-comp-label">{spec.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   DefaultHeader – shown on landing / projects pages.
   ───────────────────────────────────────────────────────────── */
function DefaultHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createNewProject } = useProjects();
  const isLanding  = location.pathname === '/';
  const isProjects = location.pathname === '/projects' || location.pathname === '/projects/';

  function handleNewProject() {
    const p = createNewProject();
    navigate(`/projects/${p.id}`);
  }

  return (
    <header className="app-header">
      <div className="logo">
        <Link to="/" className="logo-link">CloudMon</Link>
      </div>
      <nav className="app-nav">
        <Link className={`nav-link${isLanding  ? ' active' : ''}`} to="/">Home</Link>
        <Link className={`nav-link${isProjects ? ' active' : ''}`} to="/projects">Projects</Link>
      </nav>
      <div className="header-actions">
        <button className="btn-primary" onClick={handleNewProject}>+ New Project</button>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   AppHeader – picks which header to render based on route.
   ───────────────────────────────────────────────────────────── */
function AppHeader() {
  const location = useLocation();
  const isEditor = /^\/projects\/[^/]+/.test(location.pathname);
  return isEditor ? <EditorHeader /> : <DefaultHeader />;
}

/* ── Root App ─────────────────────────────────────────────────── */
function App() {
  return (
    <ProjectsProvider>
      <div className="App">
        <AppHeader />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectEditorPage />} />
            <Route
              path="/projects/:projectId/requests/:requestId"
              element={<ProjectEditorPage />}
            />
            {/* Node detail deep-editor (base canvas) */}
            <Route
              path="/projects/:projectId/nodes/:nodeId"
              element={<NodeDetailPage />}
            />
            {/* Node detail deep-editor (request canvas) */}
            <Route
              path="/projects/:projectId/requests/:requestId/nodes/:nodeId"
              element={<NodeDetailPage />}
            />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ProjectsProvider>
  );
}

export default App;

