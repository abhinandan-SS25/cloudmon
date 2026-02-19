/* ═══════════════════════════════════════════════════════════════
   App.tsx – CloudMon Application
   Landing, project list, and editor views with link-style nav.
   ═══════════════════════════════════════════════════════════════ */
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import './App.css';

import { Phase, View, Project, CyNode, CyEdge, CanvasState, RequestFile } from './types';
import { createProject, nextRequestId, emptyCanvas, cloneNodes, cloneEdges } from './utils/canvasUtils';
import { Editor } from './components/Editor';

function LandingPage({ onStart, onProjects }: { onStart: () => void; onProjects: () => void }) {
  return (
    <div className="page landing">
      <div className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">CloudMon</span>
          <h1>Design architecture, then map requests.</h1>
          <p>
            Build a base architecture first, then create request flows as separate
            files. Keep platform services like Kafka and Snowflake alongside cloud
            infrastructure.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onStart}>
              Create a project
            </button>
            <button className="btn-secondary" onClick={onProjects}>
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
            <p>Duplicate, rename, and evolve flows without losing your base.</p>
          </div>
          <div className="panel-card">
            <h3>Platforms included</h3>
            <p>Kafka, RabbitMQ, Snowflake, and more in a dedicated panel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsPage({
  projects,
  onOpen,
  onCreate,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Projects</h2>
          <p>Pick a project to design architecture or request flows.</p>
        </div>
        <button className="btn-primary" onClick={onCreate}>
          New Project
        </button>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-card-body">
              <h3>{project.name}</h3>
              <span>{project.requests.length} request files</span>
            </div>
            <button className="btn-secondary" onClick={() => onOpen(project.id)}>
              Open project
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Root App ─────────────────────────────────────────────────── */
function App() {
  const initialProjectRef = useRef<Project | null>(null);
  if (!initialProjectRef.current) {
    initialProjectRef.current = createProject('Project 1');
  }

  const [projects, setProjects] = useState<Project[]>([initialProjectRef.current]);
  const [activeProjectId, setActiveProjectId] = useState<string>(
    initialProjectRef.current.id
  );
  const [activeRequestId, setActiveRequestId] = useState<string>(
    initialProjectRef.current.activeRequestId || ''
  );
  const [phase, setPhase] = useState<Phase>('base');
  const [view, setView] = useState<View>('landing');

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const activeRequest = useMemo(() => {
    if (!activeProject) return undefined;
    return (
      activeProject.requests.find((r: RequestFile) => r.id === activeRequestId) ||
      activeProject.requests[0]
    );
  }, [activeProject, activeRequestId]);

  const activeCanvas = useMemo(() => {
    if (!activeProject) return emptyCanvas();
    if (phase === 'base') return activeProject.base;
    return activeRequest?.canvas || emptyCanvas();
  }, [activeProject, activeRequest, phase]);

  const saveCanvas = useCallback(
    (nodes: CyNode[], edges: CyEdge[]) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== activeProjectId) return project;
          if (phase === 'base') {
            return { ...project, base: { nodes, edges } };
          }
          const reqId = activeRequestId || project.activeRequestId;
          if (!reqId) return project;
          return {
            ...project,
            activeRequestId: reqId,
            requests: project.requests.map((req) =>
              req.id === reqId ? { ...req, canvas: { nodes, edges } } : req
            ),
          };
        })
      );
    },
    [activeProjectId, phase, activeRequestId]
  );

  const createNewProject = useCallback(() => {
    const project = createProject(`Project ${projects.length + 1}`);
    setProjects((prev) => prev.concat(project));
    setActiveProjectId(project.id);
    setActiveRequestId(project.activeRequestId || '');
    setPhase('base');
    setView('project');
  }, [projects.length]);

  const openProject = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id);
      if (!project) return;
      setActiveProjectId(id);
      setActiveRequestId(project.activeRequestId || project.requests[0]?.id || '');
      setPhase('base');
      setView('project');
    },
    [projects]
  );

  const openRequest = useCallback(
    (projectId: string, requestId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      const request = project.requests.find((r) => r.id === requestId);
      if (!request) return;
      setActiveProjectId(projectId);
      setActiveRequestId(requestId);
      setPhase('request');
      setView('request');
    },
    [projects]
  );

  const renameProject = useCallback(
    (name: string) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProjectId ? { ...p, name } : p))
      );
    },
    [activeProjectId]
  );

  const addRequest = useCallback(() => {
    if (!activeProject) return;
    const requestId = nextRequestId();
    const nextRequest: RequestFile = {
      id: requestId,
      name: `Request ${activeProject.requests.length + 1}`,
      canvas: emptyCanvas(),
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              requests: p.requests.concat(nextRequest),
              activeRequestId: requestId,
            }
          : p
      )
    );
    setActiveRequestId(requestId);
    setPhase('request');
    setView('request');
  }, [activeProject]);

  const renameRequest = useCallback(
    (name: string) => {
      if (!activeProject || !activeRequest) return;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? {
                ...p,
                requests: p.requests.map((req) =>
                  req.id === activeRequest.id ? { ...req, name } : req
                ),
              }
            : p
        )
      );
    },
    [activeProject, activeRequest]
  );

  const duplicateRequest = useCallback(() => {
    if (!activeProject || !activeRequest) return;
    const requestId = nextRequestId();
    const nextRequest: RequestFile = {
      id: requestId,
      name: `${activeRequest.name} Copy`,
      canvas: {
        nodes: cloneNodes(activeRequest.canvas.nodes),
        edges: cloneEdges(activeRequest.canvas.edges),
      },
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              requests: p.requests.concat(nextRequest),
              activeRequestId: requestId,
            }
          : p
      )
    );
    setActiveRequestId(requestId);
    setPhase('request');
    setView('request');
  }, [activeProject, activeRequest]);

  const copyBaseToRequest = useCallback(() => {
    if (!activeProject || !activeRequest) return;
    const baseCanvas = {
      nodes: cloneNodes(activeProject.base.nodes),
      edges: cloneEdges(activeProject.base.edges),
    };
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        return {
          ...p,
          requests: p.requests.map((req) =>
            req.id === activeRequest.id ? { ...req, canvas: baseCanvas } : req
          ),
        };
      })
    );
  }, [activeProject, activeRequest]);

  const backToProjects = useCallback(() => {
    setView('projects');
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <div className="logo">CloudMon</div>
        <nav className="app-nav">
          <button
            className={`nav-link ${view === 'landing' ? 'active' : ''}`}
            onClick={() => setView('landing')}
          >
            Home
          </button>
          <button
            className={`nav-link ${view === 'projects' ? 'active' : ''}`}
            onClick={() => setView('projects')}
          >
            Projects
          </button>
        </nav>
        <div className="header-actions">
          <button className="btn-primary" onClick={createNewProject}>
            New Project
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'landing' && (
          <LandingPage
            onStart={createNewProject}
            onProjects={() => setView('projects')}
          />
        )}

        {view === 'projects' && (
          <ProjectsPage
            projects={projects}
            onOpen={openProject}
            onCreate={createNewProject}
          />
        )}

        {(view === 'project' || view === 'request') && activeProject && (
          <div className="page editor-page">
            {/* Top Navigation Bar */}
            <div className="editor-nav-bar">
              <div className="nav-tabs">
                <button
                  className={`nav-tab ${phase === 'base' ? 'active' : ''}`}
                  onClick={() => {
                    setPhase('base');
                    setView('project');
                  }}
                >
                  Base Architecture
                </button>

                {activeProject.requests.map((req: RequestFile) => (
                  <button
                    key={req.id}
                    className={`nav-tab ${req.id === activeRequest?.id ? 'active' : ''}`}
                    onClick={() => openRequest(activeProject.id, req.id)}
                  >
                    {req.name}
                  </button>
                ))}

                <button className="nav-tab-add" onClick={addRequest}>
                  + New Request
                </button>
              </div>
              {phase === 'request' && activeRequest && (
                <div className="request-info">
                  <input
                    className="request-name-input"
                    value={activeRequest.name}
                    onChange={(e) => renameRequest(e.target.value)}
                    placeholder="Request name"
                  />
                  <div className="request-actions">
                    <button className="btn-secondary" onClick={duplicateRequest}>
                      Duplicate
                    </button>
                    <button className="btn-secondary" onClick={copyBaseToRequest}>
                      Copy Base
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Editor phase={phase} activeCanvas={activeCanvas} onCanvasChange={saveCanvas} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

