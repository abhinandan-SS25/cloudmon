/* ═══════════════════════════════════════════════════════════════
   FloatingNav.tsx
   Top-left floating pill navigation for Landing & Projects pages.
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';

export function FloatingNav() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { createNewProject } = useProjects();

  const isHome     = location.pathname === '/';
  const isProjects = location.pathname.startsWith('/projects') && location.pathname === '/projects';

  function handleNew() {
    const p = createNewProject();
    navigate(`/projects/${p.id}`);
  }

  return (
    <div className="fnav-root">
      {/* Brand */}
      <Link to="/" className="fnav-brand">CloudMon</Link>

      <div className="fnav-divider" />

      {/* Nav links */}
      <Link className={`fnav-link${isHome ? ' fnav-link--active' : ''}`} to="/">
        Home
      </Link>
      <Link className={`fnav-link${isProjects ? ' fnav-link--active' : ''}`} to="/projects">
        Projects
      </Link>

      <div className="fnav-divider" />

      {/* Action */}
      <button className="fnav-new-btn" onClick={handleNew}>
        + New Project
      </button>
    </div>
  );
}
