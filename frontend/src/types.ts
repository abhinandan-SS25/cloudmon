/* ═══════════════════════════════════════════════════════════════
   types.ts – CloudMon Type Definitions
   Common interfaces and types used across the application.
   ═══════════════════════════════════════════════════════════════ */

import { ServiceNodeData } from './ServiceNode';
import { ConnectionKind } from './AnimatedEdge';

export type Phase = 'base' | 'request';
export type View = 'landing' | 'projects' | 'project' | 'request';

export interface CyNode {
  data: {
    id: string;
  } & ServiceNodeData;
  position: { x: number; y: number };
  selected?: boolean;
}

export interface CyEdge {
  data: {
    id: string;
    source: string;
    target: string;
    kind: ConnectionKind;
    label: string;
    bandwidth: string;
  };
  selected?: boolean;
}

export interface CanvasState {
  nodes: CyNode[];
  edges: CyEdge[];
}

export interface RequestFile {
  id: string;
  name: string;
  canvas: CanvasState;
}

export interface Project {
  id: string;
  name: string;
  base: CanvasState;
  requests: RequestFile[];
  activeRequestId: string | null;
}

export interface ConnectionHandle {
  nodeId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
}

export interface DragState {
  active: boolean;
  sourceNodeId: string;
  sourceHandle: 'top' | 'bottom' | 'left' | 'right';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetNodeId: string | null;
}

export interface EditorProps {
  phase: Phase;
  activeCanvas: CanvasState;
  onCanvasChange: (nodes: CyNode[], edges: CyEdge[]) => void;
}
