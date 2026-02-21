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
import ProjectEditorPage from './pages/ProjectEditorPage';
import ProjectsPage from './pages/ProjectsPage';
import catalog, { PALETTE_SECTIONS } from './data/componentCatalog';

/* ─────────────────────────────────────────────────────────────
   EditorHeader – shown only when inside a project editor.
   Logo → home, one dropdown per section category, Manage menu.
   ───────────────────────────────────────────────────────────── */

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
  const { createNewProject } = useProjects();

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

      {/* One dropdown per section */}
      {PALETTE_SECTIONS.map((section) => {
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
      })}

      <div className="editor-header-spacer" />

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
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ProjectsProvider>
  );
}

export default App;

