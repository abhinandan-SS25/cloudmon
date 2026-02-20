/* ═══════════════════════════════════════════════════════════════
   ProjectEditorPage.tsx – Editor + Stage Shelf
   Route: /projects/:projectId
         /projects/:projectId/requests/:requestId
   ═══════════════════════════════════════════════════════════════ */
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  const [stageOpen, setStageOpen] = useState(true);

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
            {/* Header row */}
            <div className="stage-shelf-header">
              <input
                type="text"
                className="stage-shelf-search"
                placeholder="Search…"
                value={canvasSearch}
                onChange={(e) => setCanvasSearch(e.target.value)}
              />
              <button
                className="stage-shelf-add"
                title="New Request"
                onClick={() => handleAddRequest()}
              >+</button>
              <button
                className="stage-shelf-add"
                title="New Folder"
                onClick={() => handleAddFolder()}
              >📁</button>
              <button
                className="stage-shelf-close"
                title="Collapse"
                onClick={() => setStageOpen(false)}
              >╌</button>
            </div>

            {/* File-system tree */}
            <div className="fs-tree">
              {/* Root: Base Architecture */}
              {(!canvasSearch ||
                'base architecture'.includes(canvasSearch.toLowerCase())) && (
                <div
                  className={`fs-row fs-root${phase === 'base' ? ' active' : ''}`}
                  style={{ paddingLeft: '8px' }}
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  <span className="fs-chevron">▾</span>
                  <span className="fs-icon">🏗</span>
                  <span className="fs-name">Base Architecture</span>
                  <span className="fs-meta">
                    {project.base.nodes.length}n·{project.base.edges.length}e
                  </span>
                </div>
              )}

              {/* Children: flat search OR full tree */}
              {filteredLeaves ? (
                filteredLeaves.map((req) => (
                  <div
                    key={req.id}
                    className={`fs-row${req.id === requestId && phase === 'request' ? ' active' : ''}`}
                    style={{ paddingLeft: '22px' }}
                    onClick={() => handleOpenRequest(req.id)}
                  >
                    <span className="fs-chevron" />
                    <span className="fs-icon">📄</span>
                    <input
                      className="fs-name-input"
                      value={req.name}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRename(req.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="fs-meta">
                      {req.canvas.nodes.length}n·{req.canvas.edges.length}e
                    </span>
                    <div className="fs-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="fs-action-btn danger"
                        onClick={() => handleDelete(req.id)}
                      >✕</button>
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
                />
              )}
            </div>

            {/* Action strip for active request */}
            {phase === 'request' && activeRequest && (
              <div className="stage-shelf-actions">
                <button className="btn-secondary" onClick={handleDuplicate}>
                  Duplicate
                </button>
                <button className="btn-secondary" onClick={handleResetToBase}>
                  Reset to Base
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
