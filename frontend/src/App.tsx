/* ═══════════════════════════════════════════════════════════════
   App.tsx – CloudMon Application
   Landing ▸ Projects ▸ Editor + Stage Shelf (nested file tree)
   ═══════════════════════════════════════════════════════════════ */
import React, { useCallback, useRef, useState, useMemo } from 'react';
import './App.css';

import {
  CloudProvider,
  CyEdge,
  CyNode,
  Phase,
  Project,
  RequestFile,
  RequestFolder,
  RequestTreeItem,
  View,
} from './types';
import {
  addItemToTree,
  cloneEdges,
  cloneNodes,
  createProject,
  emptyCanvas,
  findLeafById,
  flatRequestLeaves,
  nextFolderId,
  nextRequestId,
  removeFromTree,
  renameInTree,
  toggleFolderInTree,
  updateLeafInTree,
} from './utils/canvasUtils';
import { Editor } from './components/Editor';

/* ══════════════════════════════════════════════════════════════
   Static pages
   ══════════════════════════════════════════════════════════════ */
function LandingPage({ onStart, onProjects }: { onStart: () => void; onProjects: () => void }) {
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
            <button className="btn-primary" onClick={onStart}>Create a project</button>
            <button className="btn-secondary" onClick={onProjects}>Browse projects</button>
          </div>
        </div>
        <div className="hero-panel">
          <div className="panel-card">
            <h3>Architecture first</h3>
            <p>Sketch components and their connections without extra data detail.</p>
          </div>
          <div className="panel-card">
            <h3>Request-by-request</h3>
            <p>Every request starts from your base architecture. Evolve flows request-by-request.</p>
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
        <button className="btn-primary" onClick={onCreate}>New Project</button>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-card-body">
              <h3>{project.name}</h3>
              <span>{flatRequestLeaves(project.requests).length} request files</span>
            </div>
            <button className="btn-secondary" onClick={() => onOpen(project.id)}>Open project</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   File-tree item (recursive)
   ══════════════════════════════════════════════════════════════ */
interface FileTreeProps {
  items: RequestTreeItem[];
  depth: number;
  activeRequestId: string;
  phase: Phase;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAddRequest: (parentFolderId?: string) => void;
  onAddFolder: (parentFolderId?: string) => void;
}

function FileTree({
  items, depth, activeRequestId, phase,
  onOpen, onRename, onDelete, onToggle, onAddRequest, onAddFolder,
}: FileTreeProps) {
  return (
    <>
      {items.map((item) => {
        if (item.kind === 'folder') {
          return (
            <div key={item.id} className="tree-folder" style={{ '--tree-depth': depth } as React.CSSProperties}>
              <div className="tree-folder-header">
                <button className="tree-chevron" onClick={() => onToggle(item.id)}>
                  {item.expanded ? '▾' : '▸'}
                </button>
                <span className="tree-folder-icon">📁</span>
                <input
                  className="tree-name-input"
                  value={item.name}
                  onChange={(e) => onRename(item.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="tree-item-actions">
                  <button title="Add request inside" onClick={(e) => { e.stopPropagation(); onAddRequest(item.id); }}>+</button>
                  <button title="Add sub-folder" onClick={(e) => { e.stopPropagation(); onAddFolder(item.id); }}>📁</button>
                  <button title="Delete folder" className="tree-delete" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>✕</button>
                </div>
              </div>
              {item.expanded && (
                <div className="tree-folder-children">
                  <FileTree
                    items={item.children}
                    depth={depth + 1}
                    activeRequestId={activeRequestId}
                    phase={phase}
                    onOpen={onOpen}
                    onRename={onRename}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onAddRequest={onAddRequest}
                    onAddFolder={onAddFolder}
                  />
                </div>
              )}
            </div>
          );
        }

        // leaf request
        const isActive = item.id === activeRequestId && phase === 'request';
        return (
          <div
            key={item.id}
            className={`stage-file-card ${isActive ? 'active' : ''}`}
            style={{ '--tree-depth': depth } as React.CSSProperties}
            onClick={() => onOpen(item.id)}
          >
            <div className="stage-file-tab" />
            <div className="stage-file-body">
              <span className="stage-file-icon">📋</span>
              <div className="stage-file-info">
                <input
                  className="stage-file-name-input"
                  value={item.name}
                  onChange={(e) => { e.stopPropagation(); onRename(item.id, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="stage-file-meta">
                  {item.canvas.nodes.length}n · {item.canvas.edges.length}e
                </div>
              </div>
              <button
                className="tree-delete"
                title="Delete request"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              >✕</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Root App
   ══════════════════════════════════════════════════════════════ */
function App() {
  const initialProjectRef = useRef<Project | null>(null);
  if (!initialProjectRef.current) {
    initialProjectRef.current = createProject('Project 1');
  }

  const [projects, setProjects] = useState<Project[]>([initialProjectRef.current!]);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialProjectRef.current!.id);
  const [activeRequestId, setActiveRequestId] = useState<string>('');
  const [phase, setPhase] = useState<Phase>('base');
  const [view, setView] = useState<View>('landing');
  const [canvasSearch, setCanvasSearch] = useState<string>('');
  const [stageOpen, setStageOpen] = useState<boolean>(true);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );

  const activeRequest = useMemo(
    () => (activeProject ? findLeafById(activeProject.requests, activeRequestId) ?? undefined : undefined),
    [activeProject, activeRequestId]
  );

  const activeCanvas = useMemo(() => {
    if (!activeProject) return emptyCanvas();
    if (phase === 'base') return activeProject.base;
    return activeRequest?.canvas ?? emptyCanvas();
  }, [activeProject, activeRequest, phase]);

  /* ── Canvas save ────────────────────────────────────────────── */
  const saveCanvas = useCallback(
    (nodes: CyNode[], edges: CyEdge[]) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== activeProjectId) return project;
          if (phase === 'base') return { ...project, base: { nodes, edges } };
          if (!activeRequestId) return project;
          return {
            ...project,
            requests: updateLeafInTree(project.requests, activeRequestId, (r) => ({
              ...r,
              canvas: { nodes, edges },
            })),
          };
        })
      );
    },
    [activeProjectId, phase, activeRequestId]
  );

  /* ── Project CRUD ───────────────────────────────────────────── */
  const createNewProject = useCallback(() => {
    const project = createProject(`Project ${projects.length + 1}`);
    setProjects((prev) => prev.concat(project));
    setActiveProjectId(project.id);
    setActiveRequestId('');
    setPhase('base');
    setView('project');
  }, [projects.length]);

  const openProject = useCallback(
    (id: string) => {
      setActiveProjectId(id);
      setActiveRequestId('');
      setPhase('base');
      setView('project');
    },
    []
  );

  /* ── Request operations ─────────────────────────────────────── */
  /**
   * New request – always starts as a copy of the current base architecture
   * so the user can just annotate / trim the flow without starting from scratch.
   */
  const addRequest = useCallback(
    (parentFolderId?: string) => {
      if (!activeProject) return;
      const requestId = nextRequestId();
      const newRequest: RequestFile = {
        kind: 'request',
        id: requestId,
        name: 'New Request',
        // inherit the base architecture so the user can highlight the relevant path
        canvas: {
          nodes: cloneNodes(activeProject.base.nodes),
          edges: cloneEdges(activeProject.base.edges),
        },
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? { ...p, requests: addItemToTree(p.requests, newRequest, parentFolderId), activeRequestId: requestId }
            : p
        )
      );
      setActiveRequestId(requestId);
      setPhase('request');
      setView('request');
    },
    [activeProject]
  );

  const addFolder = useCallback(
    (parentFolderId?: string) => {
      if (!activeProject) return;
      const folder: RequestFolder = {
        kind: 'folder',
        id: nextFolderId(),
        name: 'New Folder',
        children: [],
        expanded: true,
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? { ...p, requests: addItemToTree(p.requests, folder, parentFolderId) }
            : p
        )
      );
    },
    [activeProject]
  );

  const openRequest = useCallback(
    (requestId: string) => {
      setActiveRequestId(requestId);
      setPhase('request');
      setView('request');
    },
    []
  );

  const renameTreeItem = useCallback(
    (id: string, name: string) => {
      if (!activeProject) return;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id ? { ...p, requests: renameInTree(p.requests, id, name) } : p
        )
      );
    },
    [activeProject]
  );

  const deleteTreeItem = useCallback(
    (id: string) => {
      if (!activeProject) return;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id ? { ...p, requests: removeFromTree(p.requests, id) } : p
        )
      );
      // if we deleted the active request, go back to base
      if (id === activeRequestId) {
        setPhase('base');
        setView('project');
        setActiveRequestId('');
      }
    },
    [activeProject, activeRequestId]
  );

  const toggleTreeFolder = useCallback(
    (folderId: string) => {
      if (!activeProject) return;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? { ...p, requests: toggleFolderInTree(p.requests, folderId) }
            : p
        )
      );
    },
    [activeProject]
  );

  const duplicateRequest = useCallback(() => {
    if (!activeProject || !activeRequest) return;
    const requestId = nextRequestId();
    const dup: RequestFile = {
      kind: 'request',
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
          ? { ...p, requests: addItemToTree(p.requests, dup), activeRequestId: requestId }
          : p
      )
    );
    setActiveRequestId(requestId);
    setPhase('request');
    setView('request');
  }, [activeProject, activeRequest]);

  const resetToBase = useCallback(() => {
    if (!activeProject || !activeRequest) return;
    const baseCanvas = {
      nodes: cloneNodes(activeProject.base.nodes),
      edges: cloneEdges(activeProject.base.edges),
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== activeProject.id
          ? p
          : {
              ...p,
              requests: updateLeafInTree(p.requests, activeRequest.id, (r) => ({
                ...r,
                canvas: baseCanvas,
              })),
            }
      )
    );
  }, [activeProject, activeRequest]);

  /* ── Cloud provider ─────────────────────────────────────────── */
  const setCloudProvider = useCallback(
    (provider: CloudProvider) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProjectId ? { ...p, cloudProvider: provider } : p))
      );
    },
    [activeProjectId]
  );

  /* ── Filter helper (search) ─────────────────────────────────── */
  const filteredLeaves = useMemo(
    () =>
      canvasSearch
        ? flatRequestLeaves(activeProject?.requests ?? []).filter((r) =>
            r.name.toLowerCase().includes(canvasSearch.toLowerCase())
          )
        : null,
    [canvasSearch, activeProject?.requests]
  );

  /* ══════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════ */
  const PROVIDER_LABELS: Record<CloudProvider, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };

  return (
    <div className="App">
      <header className="app-header">
        <div className="logo">CloudMon</div>
        <nav className="app-nav">
          <button className={`nav-link ${view === 'landing' ? 'active' : ''}`} onClick={() => setView('landing')}>
            Home
          </button>
          <button className={`nav-link ${view === 'projects' ? 'active' : ''}`} onClick={() => setView('projects')}>
            Projects
          </button>
        </nav>
        <div className="header-actions">
          <button className="btn-primary" onClick={createNewProject}>New Project</button>
        </div>
      </header>

      <main className="app-main">
        {view === 'landing' && (
          <LandingPage onStart={createNewProject} onProjects={() => setView('projects')} />
        )}

        {view === 'projects' && (
          <ProjectsPage projects={projects} onOpen={openProject} onCreate={createNewProject} />
        )}

        {(view === 'project' || view === 'request') && activeProject && (
          <div className="page editor-page">
            <Editor
              key={phase === 'base' ? 'base' : (activeRequest?.id ?? 'base')}
              phase={phase}
              activeCanvas={activeCanvas}
              onCanvasChange={saveCanvas}
            />

            {/* ── Stage Shelf ─────────────────────────────────────── */}
            <div className={`stage-shelf ${stageOpen ? 'open' : ''}`}>

              {/* Collapsed peek stack */}
              {!stageOpen && (
                <div className="stage-shelf-stack" onClick={() => setStageOpen(true)}>
                  <div className="stage-stack-ghost stage-stack-ghost--2" />
                  <div className="stage-stack-ghost stage-stack-ghost--1" />
                  <div className="stage-stack-top">
                    <span className="stage-active-dot" />
                    <span className="stage-stack-label">
                      {phase === 'base' ? 'Base Architecture' : (activeRequest?.name ?? 'Base Architecture')}
                    </span>
                    <span className="stage-stack-count">
                      {1 + flatRequestLeaves(activeProject.requests).length}
                    </span>
                  </div>
                </div>
              )}

              {/* Expanded panel */}
              {stageOpen && (
                <div className="stage-shelf-panel">
                  {/* Header row */}
                  <div className="stage-shelf-header">
                    <input
                      type="text"
                      className="stage-shelf-search"
                      placeholder="Search..."
                      value={canvasSearch}
                      onChange={(e) => setCanvasSearch(e.target.value)}
                    />
                    <button className="stage-shelf-add" title="New Request" onClick={() => addRequest()}>+</button>
                    <button className="stage-shelf-add" title="New Folder" onClick={() => addFolder()}>📁</button>
                    <button className="stage-shelf-close" title="Collapse" onClick={() => setStageOpen(false)}>╌</button>
                  </div>

                  {/* Cloud provider selector */}
                  <div className="cloud-provider-selector">
                    {(['aws', 'gcp', 'azure'] as CloudProvider[]).map((p) => (
                      <button
                        key={p}
                        className={`cloud-tab cloud-tab-${p} ${activeProject.cloudProvider === p ? 'active' : ''}`}
                        onClick={() => setCloudProvider(p)}
                      >
                        {PROVIDER_LABELS[p]}
                      </button>
                    ))}
                  </div>

                  {/* File list */}
                  <div className="stage-shelf-list">
                    {/* Base Architecture – always first */}
                    {(!canvasSearch || 'base architecture'.includes(canvasSearch.toLowerCase())) && (
                      <div
                        className={`stage-file-card ${phase === 'base' ? 'active' : ''}`}
                        onClick={() => { setPhase('base'); setView('project'); }}
                      >
                        <div className="stage-file-tab" />
                        <div className="stage-file-body">
                          <span className="stage-file-icon">🏗️</span>
                          <div className="stage-file-info">
                            <div className="stage-file-name">Base Architecture</div>
                            <div className="stage-file-meta">
                              {activeProject.base.nodes.length}n · {activeProject.base.edges.length}e
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tree or flat search results */}
                    {filteredLeaves ? (
                      // Flat search mode
                      filteredLeaves.map((req) => (
                        <div
                          key={req.id}
                          className={`stage-file-card ${req.id === activeRequestId && phase === 'request' ? 'active' : ''}`}
                          onClick={() => openRequest(req.id)}
                        >
                          <div className="stage-file-tab" />
                          <div className="stage-file-body">
                            <span className="stage-file-icon">📋</span>
                            <div className="stage-file-info">
                              <input
                                className="stage-file-name-input"
                                value={req.name}
                                onChange={(e) => { e.stopPropagation(); renameTreeItem(req.id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="stage-file-meta">
                                {req.canvas.nodes.length}n · {req.canvas.edges.length}e
                              </div>
                            </div>
                            <button
                              className="tree-delete"
                              onClick={(e) => { e.stopPropagation(); deleteTreeItem(req.id); }}
                            >✕</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Full tree mode
                      <FileTree
                        items={activeProject.requests}
                        depth={0}
                        activeRequestId={activeRequestId}
                        phase={phase}
                        onOpen={openRequest}
                        onRename={renameTreeItem}
                        onDelete={deleteTreeItem}
                        onToggle={toggleTreeFolder}
                        onAddRequest={addRequest}
                        onAddFolder={addFolder}
                      />
                    )}
                  </div>

                  {/* Action strip for active request */}
                  {phase === 'request' && activeRequest && (
                    <div className="stage-shelf-actions">
                      <button className="btn-secondary" onClick={duplicateRequest}>Duplicate</button>
                      <button className="btn-secondary" onClick={resetToBase}>Reset to Base</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
