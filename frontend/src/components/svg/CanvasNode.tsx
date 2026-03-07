/* ═══════════════════════════════════════════════════════════════
   CanvasNode.tsx
   Positioned, interactive SVG wrapper for an HTML NodeCard.

   Coordinate split:
     Parent <g> → translate(node.x, node.y)  (absolute canvas pos)
     foreignObject → renders NodeCard at (0,0) in local space
     Handle circles → local coords, one at each edge midpoint:
       top    (W/2 , 0  )
       bottom (W/2 , H  )
       left   (0   , H/2)
       right  (W   , H/2)

   This makes the component self-contained: move node.x/node.y
   and everything (card + handles) moves together.
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import type { CyNode } from '../../types';
import { NodeCard } from '../NodeCard';

/* ── Handle appearance ───────────────────────────────────────── */
const HANDLE_R = 7;

/* ── Edge midpoints in local (0,0) space ────────────────────── */
/* Circles are offset outward by HANDLE_R so they sit fully     */
/* outside the card border and never overlap card content.      */
function localHandles(W: number, H: number) {
  return [
    { key: 'top',    cx: W / 2 - 4,        cy: 0 - 6     },
    { key: 'bottom', cx: W / 2 - 4,        cy: H + 8  },
    { key: 'left',   cx: 0 - 4,    cy: H / 2        },
    { key: 'right',  cx: W - 4, cy: H / 2         },
  ];
}

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
        >
          <NodeCard
            node={node}
            selected={selected}
            isBottleneck={isBottleneck}
            onMouseDown={onDragStart}
            onInspect={onInspect}
            onConfigure={onConfigure}
          />
        </div>
      </foreignObject>

      {/* ── Connection handles at the four edge midpoints ─── */}
      {localHandles(W, H).map(({ key, cx, cy }) => (
        <rect
          key={key}
          x={cx}
          y={cy}
          width={7}
          height={7}
          className={`conn-handle${showHandles ? ' conn-handle--visible' : ''}`}
          onMouseDown={onConnect}
        />
      ))}
    </g>
  );
}
