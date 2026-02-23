/* ═══════════════════════════════════════════════════════════════
   canvasUtils.ts – Canvas state helpers
   ═══════════════════════════════════════════════════════════════ */
import { CanvasState, CyEdge, CyNode, NodeConfig, Project, RequestFile, RequestTreeItem } from '../types';
import catalog from '../data/componentCatalog';

/* ── ID generators ───────────────────────────────────────────── */
let _nodeCounter = 1;
let _edgeCounter = 1;
let _projectCounter = 1;
let _requestCounter = 1;
let _folderCounter = 1;

export function nextNodeId(): string    { return `n${_nodeCounter++}`; }
export function nextEdgeId(): string    { return `e${_edgeCounter++}`; }
export function nextProjectId(): string { return `p${_projectCounter++}`; }
export function nextRequestId(): string { return `r${_requestCounter++}`; }
export function nextFolderId(): string  { return `f${_folderCounter++}`; }

/* ── Default node size ───────────────────────────────────────── */
/* Match the .node-card CSS: width:240px, padding:14px + icon-area:56px = 84px height */
export const NODE_W = 110;
export const NODE_H = 110;

/* ── Empty canvas ────────────────────────────────────────────── */
export function emptyCanvas(): CanvasState {
  return { nodes: [], edges: [] };
}

/* ── Clone helpers ───────────────────────────────────────────── */
export function cloneNodes(nodes: CyNode[]): CyNode[] {
  return nodes.map((n) => ({ ...n, config: { ...n.config } }));
}
export function cloneEdges(edges: CyEdge[]): CyEdge[] {
  return edges.map((e) => ({ ...e }));
}

/* ── Build a new node from a catalog type ────────────────────── */
export function buildNode(
  type: string,
  x: number,
  y: number,
  overrides: Partial<CyNode> = {}
): CyNode {
  const spec = catalog[type];
  const defaultConfig: NodeConfig = { instances: 1, deployment: 'local' };
  return {
    id: nextNodeId(),
    type,
    label: spec ? spec.label : type,
    x,
    y,
    width: NODE_W,
    height: NODE_H,
    config: defaultConfig,
    ...overrides,
  };
}

/* ── Build an edge ───────────────────────────────────────────── */
export function buildEdge(
  source: string,
  target: string,
  overrides: Partial<CyEdge> = {}
): CyEdge {
  return {
    id: nextEdgeId(),
    source,
    target,
    ...overrides,
  };
}

/* ── Create project (empty – no default requests) ─────────────── */
export function createProject(name: string): Project {
  return {
    id: nextProjectId(),
    name,
    createdAt: new Date().toISOString(),
    base: emptyCanvas(),
    requests: [],
    cloudProvider: 'aws',
  };
}

/* ── Find node center (canvas coordinates) ───────────────────── */
export function nodeCenter(node: CyNode): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

/* ── Compute bezier control points for an edge ───────────────── */
export function edgePath(src: CyNode, tgt: CyNode): string {
  const s = nodeCenter(src);
  const t = nodeCenter(tgt);
  const dx = t.x - s.x;
  const cx1 = s.x + dx * 0.4;
  const cy1 = s.y;
  const cx2 = t.x - dx * 0.4;
  const cy2 = t.y;
  return `M ${s.x} ${s.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${t.x} ${t.y}`;
}

/* ── Add a node, avoiding grid overlaps ──────────────────────── */
export function placeNode(
  existingNodes: CyNode[],
  type: string,
  preferX: number,
  preferY: number
): CyNode {
  const GAP = 20;
  let x = preferX;
  let y = preferY;
  const overlaps = (px: number, py: number) =>
    existingNodes.some(
      (n) => Math.abs(n.x - px) < NODE_W + GAP && Math.abs(n.y - py) < NODE_H + GAP
    );
  let attempts = 0;
  while (attempts < 20 && overlaps(x, y)) {
    x += NODE_W + GAP;
    if (x > preferX + 5 * (NODE_W + GAP)) {
      x = preferX;
      y += NODE_H + GAP;
    }
    attempts++;
  }
  return buildNode(type, x, y);
}
/* ═══════════════════════════════════════════════════════════════
   File-tree utilities (nested request folders)
   ═══════════════════════════════════════════════════════════════ */

/** Flatten all RequestFile leaves from anywhere in the tree. */
export function flatRequestLeaves(items: RequestTreeItem[]): RequestFile[] {
  const out: RequestFile[] = [];
  for (const item of items) {
    if (item.kind === 'folder') out.push(...flatRequestLeaves(item.children));
    else out.push(item);
  }
  return out;
}

/** Find a leaf RequestFile by id anywhere in the tree. */
export function findLeafById(
  items: RequestTreeItem[],
  id: string
): RequestFile | null {
  for (const item of items) {
    if (item.kind === 'folder') {
      const found = findLeafById(item.children, id);
      if (found) return found;
    } else if (item.id === id) {
      return item;
    }
  }
  return null;
}

/**
 * Add an item to the tree.
 * If parentFolderId is given, inserts inside that folder;
 * otherwise appends at the root level.
 */
export function addItemToTree(
  items: RequestTreeItem[],
  item: RequestTreeItem,
  parentFolderId?: string
): RequestTreeItem[] {
  if (!parentFolderId) return [...items, item];
  return items.map((i) => {
    if (i.kind !== 'folder') return i;
    if (i.id === parentFolderId) return { ...i, children: [...i.children, item] };
    return { ...i, children: addItemToTree(i.children, item, parentFolderId) };
  });
}

/** Remove any item (folder or leaf) by id. */
export function removeFromTree(
  items: RequestTreeItem[],
  id: string
): RequestTreeItem[] {
  return items
    .filter((i) => i.id !== id)
    .map((i) =>
      i.kind === 'folder' ? { ...i, children: removeFromTree(i.children, id) } : i
    );
}

/** Toggle a folder's expanded flag. */
export function toggleFolderInTree(
  items: RequestTreeItem[],
  folderId: string
): RequestTreeItem[] {
  return items.map((i) => {
    if (i.kind !== 'folder') return i;
    if (i.id === folderId) return { ...i, expanded: !i.expanded };
    return { ...i, children: toggleFolderInTree(i.children, folderId) };
  });
}

/** Rename any item (folder or leaf) by id. */
export function renameInTree(
  items: RequestTreeItem[],
  id: string,
  name: string
): RequestTreeItem[] {
  return items.map((i) => {
    if (i.id === id) return { ...i, name };
    if (i.kind === 'folder') return { ...i, children: renameInTree(i.children, id, name) };
    return i;
  });
}

/** Apply an updater function to a RequestFile leaf. */
export function updateLeafInTree(
  items: RequestTreeItem[],
  id: string,
  updater: (req: RequestFile) => RequestFile
): RequestTreeItem[] {
  return items.map((i) => {
    if (i.kind === 'folder') return { ...i, children: updateLeafInTree(i.children, id, updater) };
    if (i.id === id) return updater(i);
    return i;
  });
}
/* ──  Find all paths from source to target node ─────────────── */
export function findPaths(
  nodes: CyNode[],
  edges: CyEdge[],
  sourceId: string,
  targetId: string
): string[][] {
  const adjList: Record<string, string[]> = {};
  for (const n of nodes) adjList[n.id] = [];
  for (const e of edges) {
    if (adjList[e.source]) adjList[e.source].push(e.target);
  }

  const paths: string[][] = [];
  const dfs = (current: string, path: string[], visited: Set<string>) => {
    if (current === targetId) {
      paths.push([...path]);
      return;
    }
    for (const next of adjList[current] || []) {
      if (!visited.has(next)) {
        visited.add(next);
        dfs(next, [...path, next], visited);
        visited.delete(next);
      }
    }
  };
  dfs(sourceId, [sourceId], new Set([sourceId]));
  return paths;
}

/* ── Topological sort (Kahn's algorithm) ─────────────────────── */
export function topoSort(nodes: CyNode[], edges: CyEdge[]): string[] {
  const inDeg: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  for (const n of nodes) { inDeg[n.id] = 0; adj[n.id] = []; }
  for (const e of edges) {
    adj[e.source].push(e.target);
    inDeg[e.target] = (inDeg[e.target] || 0) + 1;
  }
  const queue = nodes.filter((n) => inDeg[n.id] === 0).map((n) => n.id);
  const result: string[] = [];
  while (queue.length) {
    const curr = queue.shift()!;
    result.push(curr);
    for (const next of adj[curr]) {
      inDeg[next]--;
      if (inDeg[next] === 0) queue.push(next);
    }
  }
  return result;
}
