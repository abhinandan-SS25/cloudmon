/* ═══════════════════════════════════════════════════════════════
   ProjectsContext.tsx – Global project state and operations
   ═══════════════════════════════════════════════════════════════ */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import {
  CloudProvider,
  CyEdge,
  CyNode,
  Phase,
  Project,
  RequestFile,
  RequestFolder,
} from '../types';
import {
  addItemToTree,
  cloneEdges,
  cloneNodes,
  createProject,
  findLeafById,
  nextFolderId,
  nextRequestId,
  removeFromTree,
  renameInTree,
  toggleFolderInTree,
  updateLeafInTree,
} from '../utils/canvasUtils';

/* ── Context value shape ──────────────────────────────────────── */
interface ProjectsContextValue {
  projects: Project[];
  /** Creates a new project, adds it to state, and returns it. */
  createNewProject: () => Project;
  saveCanvas: (
    projectId: string,
    phase: Phase,
    requestId: string,
    nodes: CyNode[],
    edges: CyEdge[]
  ) => void;
  /** Creates a new request (cloned from base), returns the new request id. */
  addRequest: (projectId: string, parentFolderId?: string) => string;
  addFolder: (projectId: string, parentFolderId?: string) => void;
  renameTreeItem: (projectId: string, id: string, name: string) => void;
  deleteTreeItem: (projectId: string, id: string) => void;
  toggleTreeFolder: (projectId: string, folderId: string) => void;
  /** Duplicates a request, returns the new request id (or null on failure). */
  duplicateRequest: (projectId: string, requestId: string) => string | null;
  resetToBase: (projectId: string, requestId: string) => void;
  setCloudProvider: (projectId: string, provider: CloudProvider) => void;
  getProject: (projectId: string) => Project | undefined;
  /**
   * Replace a single node (matched by id) in the base canvas or a request canvas.
   * Use this from NodeDetailPage to persist internal sub-component changes.
   */
  updateNode: (projectId: string, phase: Phase, requestId: string, node: CyNode) => void;
}

/* ── Context ──────────────────────────────────────────────────── */
const ProjectsContext = createContext<ProjectsContextValue | null>(null);

/* ── Provider ─────────────────────────────────────────────────── */
export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const initialProjectRef = useRef<Project | null>(null);
  if (!initialProjectRef.current) {
    initialProjectRef.current = createProject('Project 1');
  }

  const [projects, setProjects] = useState<Project[]>([initialProjectRef.current!]);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const createNewProject = useCallback(() => {
    const project = createProject(`Project ${projects.length + 1}`);
    setProjects((prev) => [...prev, project]);
    return project;
  }, [projects.length]);

  const saveCanvas = useCallback(
    (projectId: string, phase: Phase, requestId: string, nodes: CyNode[], edges: CyEdge[]) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          if (phase === 'base') return { ...project, base: { nodes, edges } };
          if (!requestId) return project;
          return {
            ...project,
            requests: updateLeafInTree(project.requests, requestId, (r) => ({
              ...r,
              canvas: { nodes, edges },
            })),
          };
        })
      );
    },
    []
  );

  const addRequest = useCallback(
    (projectId: string, parentFolderId?: string): string => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return '';
      const requestId = nextRequestId();
      const newRequest: RequestFile = {
        kind: 'request',
        id: requestId,
        name: 'New Request',
        canvas: {
          nodes: cloneNodes(project.base.nodes),
          edges: cloneEdges(project.base.edges),
        },
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, requests: addItemToTree(p.requests, newRequest, parentFolderId) }
            : p
        )
      );
      return requestId;
    },
    [projects]
  );

  const addFolder = useCallback(
    (projectId: string, parentFolderId?: string) => {
      const folder: RequestFolder = {
        kind: 'folder',
        id: nextFolderId(),
        name: 'New Folder',
        children: [],
        expanded: true,
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, requests: addItemToTree(p.requests, folder, parentFolderId) }
            : p
        )
      );
    },
    []
  );

  const renameTreeItem = useCallback(
    (projectId: string, id: string, name: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, requests: renameInTree(p.requests, id, name) } : p
        )
      );
    },
    []
  );

  const deleteTreeItem = useCallback(
    (projectId: string, id: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, requests: removeFromTree(p.requests, id) } : p
        )
      );
    },
    []
  );

  const toggleTreeFolder = useCallback(
    (projectId: string, folderId: string) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, requests: toggleFolderInTree(p.requests, folderId) }
            : p
        )
      );
    },
    []
  );

  const duplicateRequest = useCallback(
    (projectId: string, requestId: string): string | null => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return null;
      const source = findLeafById(project.requests, requestId);
      if (!source) return null;
      const newRequestId = nextRequestId();
      const dup: RequestFile = {
        kind: 'request',
        id: newRequestId,
        name: `${source.name} Copy`,
        canvas: {
          nodes: cloneNodes(source.canvas.nodes),
          edges: cloneEdges(source.canvas.edges),
        },
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, requests: addItemToTree(p.requests, dup) }
            : p
        )
      );
      return newRequestId;
    },
    [projects]
  );

  const resetToBase = useCallback(
    (projectId: string, requestId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      const baseCanvas = {
        nodes: cloneNodes(project.base.nodes),
        edges: cloneEdges(project.base.edges),
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                requests: updateLeafInTree(p.requests, requestId, (r) => ({
                  ...r,
                  canvas: baseCanvas,
                })),
              }
        )
      );
    },
    [projects]
  );

  const setCloudProvider = useCallback(
    (projectId: string, provider: CloudProvider) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, cloudProvider: provider } : p))
      );
    },
    []
  );

  const updateNode = useCallback(
    (projectId: string, phase: Phase, requestId: string, node: CyNode) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          if (phase === 'base') {
            return {
              ...project,
              base: {
                ...project.base,
                nodes: project.base.nodes.map((n) => (n.id === node.id ? node : n)),
              },
            };
          }
          if (!requestId) return project;
          return {
            ...project,
            requests: updateLeafInTree(project.requests, requestId, (r) => ({
              ...r,
              canvas: {
                ...r.canvas,
                nodes: r.canvas.nodes.map((n) => (n.id === node.id ? node : n)),
              },
            })),
          };
        })
      );
    },
    []
  );

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      createNewProject,
      saveCanvas,
      addRequest,
      addFolder,
      renameTreeItem,
      deleteTreeItem,
      toggleTreeFolder,
      duplicateRequest,
      resetToBase,
      setCloudProvider,
      getProject,
      updateNode,
    }),
    [
      projects,
      createNewProject,
      saveCanvas,
      addRequest,
      addFolder,
      renameTreeItem,
      deleteTreeItem,
      toggleTreeFolder,
      duplicateRequest,
      resetToBase,
      setCloudProvider,
      getProject,
      updateNode,
    ]
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

/* ── Hook ─────────────────────────────────────────────────────── */
export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used inside ProjectsProvider');
  return ctx;
}
