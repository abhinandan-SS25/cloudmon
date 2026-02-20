/* ═══════════════════════════════════════════════════════════════
   App.tsx – CloudMon Application Shell
   Provides routing, shared header, and project context.
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

import { ProjectsProvider, useProjects } from './context/ProjectsContext';
import LandingPage from './pages/LandingPage';
import ProjectEditorPage from './pages/ProjectEditorPage';
import ProjectsPage from './pages/ProjectsPage';

/* ── Header ───────────────────────────────────────────────────── */
function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createNewProject } = useProjects();

  function handleNewProject() {
    const project = createNewProject();
    navigate(`/projects/${project.id}`);
  }

  const isLanding = location.pathname === '/';
  const isProjects =
    location.pathname === '/projects' || location.pathname === '/projects/';

  return (
    <header className="app-header">
      <div className="logo">
        <Link to="/" className="logo-link">CloudMon</Link>
      </div>
      <nav className="app-nav">
        <Link className={`nav-link ${isLanding ? 'active' : ''}`} to="/">
          Home
        </Link>
        <Link className={`nav-link ${isProjects ? 'active' : ''}`} to="/projects">
          Projects
        </Link>
      </nav>
      <div className="header-actions">
        <button className="btn-primary" onClick={handleNewProject}>
          New Project
        </button>
      </div>
    </header>
  );
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

