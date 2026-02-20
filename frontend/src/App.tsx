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
function EditorHeader() {
  const navigate  = useNavigate();
  const { createNewProject } = useProjects();

  /* Which dropdown is open: section title | 'manage' | null */
  const [open, setOpen] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function toggle(key: string) {
    setOpen((prev) => (prev === key ? null : key));
  }

  function handleDragStart(key: string, e: React.DragEvent) {
    e.dataTransfer.setData('componentType', key);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function handleNewProject() {
    setOpen(null);
    const p = createNewProject();
    navigate(`/projects/${p.id}`);
  }

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

