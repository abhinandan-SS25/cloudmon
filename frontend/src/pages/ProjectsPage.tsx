/* ═══════════════════════════════════════════════════════════════
   ProjectsPage.tsx
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import { FloatingNav } from '../components/FloatingNav';
import { flatRequestLeaves } from '../utils/canvasUtils';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, createNewProject } = useProjects();

  function handleCreate() {
    const project = createNewProject();
    navigate(`/projects/${project.id}`);
  }

  return (
    <div className="page">
      <FloatingNav />
      <div className="page-header">
        <div>
          <h2>Projects</h2>
          <p>Pick a project to design architecture or request flows.</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          New Project
        </button>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-card-body">
              <h3>{project.name}</h3>
              <span>{flatRequestLeaves(project.requests).length} request files</span>
            </div>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              Open project
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
