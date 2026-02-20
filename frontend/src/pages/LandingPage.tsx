/* ═══════════════════════════════════════════════════════════════
   LandingPage.tsx
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { createNewProject } = useProjects();

  function handleStart() {
    const project = createNewProject();
    navigate(`/projects/${project.id}`);
  }

  return (
    <div className="page landing">
      <div className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">CloudMon</span>
          <h1>Design architecture, then map requests.</h1>
          <p>
            Build a base architecture first, then create request flows as nested files.
            Compare AWS, GCP and Azure costs side-by-side as you design.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={handleStart}>
              Create a project
            </button>
            <button className="btn-secondary" onClick={() => navigate('/projects')}>
              Browse projects
            </button>
          </div>
        </div>
        <div className="hero-panel">
          <div className="panel-card">
            <h3>Architecture first</h3>
            <p>Sketch components and their connections without extra data detail.</p>
          </div>
          <div className="panel-card">
            <h3>Request-by-request</h3>
            <p>
              Every request starts from your base architecture. Evolve flows
              request-by-request.
            </p>
          </div>
          <div className="panel-card">
            <h3>Cloud cost comparison</h3>
            <p>See AWS, GCP and Azure costs side-by-side in the analysis panel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
