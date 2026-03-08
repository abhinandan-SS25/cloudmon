/* ═══════════════════════════════════════════════════════════════
   CanvasNode.tsx
   Positioned SVG wrapper for an HTML NodeCard.

   Coordinate split:
     Parent <g> → translate(node.x, node.y)  (absolute canvas pos)
     foreignObject → renders NodeCard at (0,0) in local space

   Connection handles are HTML <div>s rendered inside NodeCard's
   .icon-wrapper (absolutely positioned on each edge). They appear
   only when showHandles=true, and fire onConnect on mousedown.
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import type { CyNode } from '../../types';
import { NodeCard } from '../NodeCard';

/* ── Handle appearance ───────────────────────────────────────── */
/* Handles are HTML divs inside NodeCard's .icon-wrapper — see  */
/* App.css .conn-handle classes for their styles.               */

/* ── Props ───────────────────────────────────────────────────── */
export interface CanvasNodeProps {
  node: CyNode;
  selected: boolean;
  isBottleneck: boolean;
  /** Show the four connection-handle dots */
  showHandles: boolean;
  onDragStart:  (e: React.MouseEvent) => void;
  onConnect:    (e: React.MouseEvent) => void;
  onContextMenu:(e: React.MouseEvent) => void;
  onInspect?:   () => void;
  onConfigure?: () => void;
  onUpdate?:    (updated: import('../../types').CyNode) => void;
}

/* ── Component ───────────────────────────────────────────────── */
export function CanvasNode({
  node,
  selected,
  isBottleneck,
  showHandles,
  onDragStart,
  onConnect,
  onContextMenu,
  onInspect,
  onConfigure,
  onUpdate,
}: CanvasNodeProps) {
  const W = node.width;
  const H = node.height;

  return (
    <g transform={`translate(${node.x},${node.y})`}>
      {/* ── HTML card via foreignObject ────────────────────── */}
      <foreignObject
        x={0}
        y={0}
        width={W}
        height={H}
        className="canvas-node-fo"
        onContextMenu={onContextMenu}
        overflow="visible"
        style={{ overflow: 'visible' }}
      >
        <div
          /* @ts-ignore */
          xmlns="http://www.w3.org/1999/xhtml"
          style={{ width: '100%', height: '100%', overflow: 'visible', position: 'relative' }}
          className='center'
        >
          <NodeCard
            node={node}
            selected={selected}
            isBottleneck={isBottleneck}
            showHandles={showHandles}
            onMouseDown={onDragStart}
            onConnect={onConnect as any}
            onInspect={onInspect}
            onConfigure={onConfigure}
            onUpdate={onUpdate}
          />
        </div>
      </foreignObject>
    </g>
  );
}
