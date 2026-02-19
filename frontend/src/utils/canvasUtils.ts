/* ═══════════════════════════════════════════════════════════════
   canvasUtils.ts – Canvas Helper Functions
   Utility functions for canvas operations and project management.
   ═══════════════════════════════════════════════════════════════ */

import { CyNode, CyEdge, CanvasState, Project } from '../types';

/* ── ID generators ────────────────────────────────────────────── */
let _id = 0;
export const nextId = () => `svc_${++_id}`;

let _projectId = 0;
export const nextProjectId = () => `proj_${++_projectId}`;

let _requestId = 0;
export const nextRequestId = () => `req_${++_requestId}`;

/* ── Canvas operations ────────────────────────────────────────── */
export const emptyCanvas = (): CanvasState => ({ nodes: [], edges: [] });

export const cloneNodes = (nodes: CyNode[]) =>
  nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } }));

export const cloneEdges = (edges: CyEdge[]) =>
  edges.map((e) => ({ ...e, data: { ...e.data } }));

/* ── Project management ───────────────────────────────────────── */
export const createProject = (name: string): Project => {
  return {
    id: nextProjectId(),
    name,
    base: emptyCanvas(),
    requests: [],
    activeRequestId: null,
  };
};
