/* ═══════════════════════════════════════════════════════════════
   ProjectEditorPage.tsx – Editor + Stage Shelf
   Route: /projects/:projectId
         /projects/:projectId/requests/:requestId
   ═══════════════════════════════════════════════════════════════ */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaFolderPlus, FaFolderOpen } from "react-icons/fa";
import { Home, ChevronRight } from 'lucide-react';
import { Editor } from '../components/Editor';
import { FileTree } from '../components/FileTree';
import { useProjects } from '../context/ProjectsContext';
import {
  CloudProvider,
  CyEdge,
  CyNode,
  Phase,
} from '../types';
import {
  emptyCanvas,
  findLeafById,
  flatRequestLeaves,
} from '../utils/canvasUtils';

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
};

type ContextMenuState = {
  x: number;
  y: number;
  flip: boolean;
  targetId: string;
  targetKind: 'folder' | 'request';
} | null;

// rough height: folders have 3 items (~130px), requests have 1 (~50px)
function ctxPos(e: React.MouseEvent, kind: 'folder' | 'request') {
  const h = kind === 'folder' ? 134 : 52;
  const flip = e.clientY + h > window.innerHeight - 8;
  return { x: Math.min(e.clientX, window.innerWidth - 196), y: e.clientY, flip };
}

export default function ProjectEditorPage() {
  const { projectId, requestId } = useParams<{
    projectId: string;
    requestId?: string;
  }>();
  const navigate = useNavigate();

  const {
    getProject,
    saveCanvas,
    addRequest,
    addFolder,
    renameTreeItem,
    deleteTreeItem,
    toggleTreeFolder,
    duplicateRequest,
    resetToBase,
    setCloudProvider,
  } = useProjects();

  const [canvasSearch, setCanvasSearch] = useState('');
  const [stageOpen, setStageOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  // Close context menu on any global click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const project = getProject(projectId ?? '');
  const phase: Phase = requestId ? 'request' : 'base';

  const activeRequest = useMemo(
    () =>
      project && requestId
        ? findLeafById(project.requests, requestId) ?? undefined
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, requestId]
  );

  const activeCanvas = useMemo(() => {
    if (!project) return emptyCanvas();
    if (phase === 'base') return project.base;
    return activeRequest?.canvas ?? emptyCanvas();
  }, [project, activeRequest, phase]);

  /* ── Canvas save ────────────────────────────────────────────── */
  const handleCanvasChange = useCallback(
    (nodes: CyNode[], edges: CyEdge[]) => {
      if (!projectId) return;
      saveCanvas(projectId, phase, requestId ?? '', nodes, edges);
    },
    [projectId, phase, requestId, saveCanvas]
  );

  /* ── Request operations ─────────────────────────────────────── */
  const handleAddRequest = useCallback(
    (parentFolderId?: string) => {
      if (!projectId) return;
      const newId = addRequest(projectId, parentFolderId);
      if (newId) navigate(`/projects/${projectId}/requests/${newId}`);
    },
    [projectId, addRequest, navigate]
  );

  const handleAddFolder = useCallback(
    (parentFolderId?: string) => {
      if (!projectId) return;
      addFolder(projectId, parentFolderId);
    },
    [projectId, addFolder]
  );

  const handleOpenRequest = useCallback(
    (id: string) => {
      navigate(`/projects/${projectId}/requests/${id}`);
    },
    [projectId, navigate]
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      if (!projectId) return;
      renameTreeItem(projectId, id, name);
    },
    [projectId, renameTreeItem]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!projectId) return;
      deleteTreeItem(projectId, id);
      // if we deleted the active request, go back to base
      if (id === requestId) {
        navigate(`/projects/${projectId}`);
      }
    },
    [projectId, requestId, deleteTreeItem, navigate]
  );

  const handleToggleFolder = useCallback(
    (folderId: string) => {
      if (!projectId) return;
      toggleTreeFolder(projectId, folderId);
    },
    [projectId, toggleTreeFolder]
  );

  const handleDuplicate = useCallback(() => {
    if (!projectId || !requestId) return;
    const newId = duplicateRequest(projectId, requestId);
    if (newId) navigate(`/projects/${projectId}/requests/${newId}`);
  }, [projectId, requestId, duplicateRequest, navigate]);

  const handleResetToBase = useCallback(() => {
    if (!projectId || !requestId) return;
    resetToBase(projectId, requestId);
  }, [projectId, requestId, resetToBase]);

  const handleSetCloudProvider = useCallback(
    (provider: CloudProvider) => {
      if (!projectId) return;
      setCloudProvider(projectId, provider);
    },
    [projectId, setCloudProvider]
  );

  /* ── Search filter ──────────────────────────────────────────── */
  const filteredLeaves = useMemo(
    () =>
      canvasSearch && project
        ? flatRequestLeaves(project.requests).filter((r) =>
            r.name.toLowerCase().includes(canvasSearch.toLowerCase())
          )
        : null,
    [canvasSearch, project]
  );

  if (!project) {
    return (
      <div className="page">
        <p>Project not found.</p>
      </div>
    );
  }

  return (
    <div className="page editor-page">
      <Editor
        key={phase === 'base' ? 'base' : (activeRequest?.id ?? 'base')}
        phase={phase}
        activeCanvas={activeCanvas}
        onCanvasChange={handleCanvasChange}
      />

      {/* ── Stage Shelf ─────────────────────────────────────────── */}
      <div className={`stage-shelf ${stageOpen ? 'open' : ''}`}>

        {/* Collapsed peek stack */}
        {!stageOpen && (
          <div className="stage-shelf-stack" onClick={() => setStageOpen(true)}>
            <div className="stage-stack-ghost stage-stack-ghost--2" />
            <div className="stage-stack-ghost stage-stack-ghost--1" />
            <div className="stage-stack-top">
              <button
                className="stack-home-btn"
                title="Home"
                onClick={(e) => { e.stopPropagation(); navigate('/'); }}
              >
                <Home size={13} />
              </button>
              <div className="stack-divider" />
              <span className="stage-active-dot" />
              <span className="stage-stack-label">
                {phase === 'base'
                  ? 'Base Architecture'
                  : (activeRequest?.name ?? 'Base Architecture')}
              </span>
              <span className="stage-stack-count">
                {1 + flatRequestLeaves(project.requests).length}
              </span>
            </div>
          </div>
        )}

        {/* Expanded panel */}
        {stageOpen && (
          <div className="stage-shelf-panel">

            {/* ── Title bar ─────────────────────────────────── */}
            <div className="shelf-title-bar">
              <button
                className="shelf-home-btn"
                onClick={() => navigate('/')}
                title="Home"
              >
                <Home size={13} />
              </button>
              <div className="shelf-breadcrumb">
                <span className="shelf-crumb" onClick={() => navigate('/projects')}>Projects</span>
                <ChevronRight size={10} className="shelf-crumb-sep" />
                <span
                  className={`shelf-crumb${!requestId ? ' shelf-crumb--active' : ''}`}
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  {project.name}
                </span>
                {requestId && activeRequest && (
                  <>
                    <ChevronRight size={10} className="shelf-crumb-sep" />
                    <span className="shelf-crumb shelf-crumb--active">{activeRequest.name}</span>
                  </>
                )}
              </div>
              <button
                className="shelf-title-close"
                title="Collapse"
                onClick={() => setStageOpen(false)}
              >×</button>
            </div>

            {/* ── Add strip ──────────────────────────────────── */}
            <div className="shelf-add-strip">
              <button className="shelf-add-btn" onClick={() => handleAddRequest()}>
                <span className="shelf-add-icon">＋</span> New Request
              </button>
              <button className="shelf-add-btn shelf-add-btn--folder" onClick={() => handleAddFolder()}>
                <span className="shelf-add-icon"><FaFolderPlus /></span> Folder
              </button>
            </div>

            {/* ── Search ──────────────────────────────────────── */}
            <div className="shelf-search-wrap">
              <input
                type="text"
                className="shelf-search"
                placeholder="Filter files…"
                value={canvasSearch}
                onChange={(e) => setCanvasSearch(e.target.value)}
              />
            </div>

            {/* ── File tree ───────────────────────────────────── */}
            <div className="fs-tree" onClick={() => setContextMenu(null)}>

              {/* Root: Base Architecture */}
              {(!canvasSearch ||
                'base architecture'.includes(canvasSearch.toLowerCase())) && (
                <div
                  className={`fs-row fs-root${phase === 'base' ? ' active' : ''}`}
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  <span className="fs-chevron">▾</span>
                  <span className="fs-icon">🏗</span>
                  <span className="fs-name">Base Architecture</span>
                  <span className="fs-badge">{project.base.nodes.length}</span>
                </div>
              )}

              {/* Children: flat search OR full tree */}
              {filteredLeaves ? (
                filteredLeaves.map((req) => (
                  <div
                    key={req.id}
                    className={`fs-row fs-file-row${req.id === requestId && phase === 'request' ? ' active' : ''}`}
                    style={{ paddingLeft: '22px' }}
                    onClick={() => handleOpenRequest(req.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ ...ctxPos(e, 'request'), targetId: req.id, targetKind: 'request' });
                    }}
                  >
                    <span className="fs-chevron" />
                    <span className="fs-icon fs-file-icon">📄</span>
                    <input
                      className="fs-name-input"
                      value={req.name}
                      onChange={(e) => { e.stopPropagation(); handleRename(req.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="fs-badge">{req.canvas.nodes.length}</span>
                    <div className="fs-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="fs-action-btn danger" onClick={() => handleDelete(req.id)}>✕</button>
                    </div>
                  </div>
                ))
              ) : (
                <FileTree
                  items={project.requests}
                  depth={1}
                  activeRequestId={requestId ?? ''}
                  phase={phase}
                  onOpen={handleOpenRequest}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onToggle={handleToggleFolder}
                  onAddRequest={handleAddRequest}
                  onAddFolder={handleAddFolder}
                  onContextMenu={(e, id, kind) => {
                    e.preventDefault();
                    setContextMenu({ ...ctxPos(e, kind), targetId: id, targetKind: kind });
                  }}
                />
              )}
            </div>

            {/* ── Active request actions ────────────────────────── */}
            {phase === 'request' && activeRequest && (
              <div className="stage-shelf-actions">
                <button className="btn-secondary" onClick={handleDuplicate}>Duplicate</button>
                <button className="btn-secondary" onClick={handleResetToBase}>Reset to Base</button>
              </div>
            )}
          </div>
        )}

        {/* ── Context menu ────────────────────────────────────── */}
        {contextMenu && (
          <div
            className="explorer-ctx-menu"
            style={{
              left: contextMenu.x,
              ...(contextMenu.flip
                ? { bottom: window.innerHeight - contextMenu.y + 4 }
                : { top: contextMenu.y }),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.targetKind === 'folder' && (
              <>
                <button
                  className="ctx-item"
                  onClick={() => { handleAddRequest(contextMenu.targetId); setContextMenu(null); }}
                >
                  <span className="ctx-icon">＋</span> New Request
                </button>
                <button
                  className="ctx-item"
                  onClick={() => { handleAddFolder(contextMenu.targetId); setContextMenu(null); }}
                >
                  <span className="ctx-icon"><FaFolderPlus /></span> New Subfolder
                </button>
                <div className="ctx-sep" />
              </>
            )}
            <button
              className="ctx-item ctx-item--danger"
              onClick={() => { handleDelete(contextMenu.targetId); setContextMenu(null); }}
            >
              <span className="ctx-icon">🗑</span> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
