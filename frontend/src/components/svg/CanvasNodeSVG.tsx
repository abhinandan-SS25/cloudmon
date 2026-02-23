/* ═══════════════════════════════════════════════════════════════
   CanvasNodeSVG.tsx
   Pure-SVG node card for the canvas. No foreignObject.
   Each catalog category gets its own header decoration motif.

   Coordinate origin (0,0) = top-left of card.
   The parent <g> handles the translate(x,y) positioning.
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import catalog from '../../data/componentCatalog';
import type { CyNode } from '../../types';
import NODE_REGISTRY from './nodeRegistry';

/* ── Default sizes (exported so canvasUtils can reference them) ── */
export const CARD_W      = 60;
export const CARD_H      = 120;
export const HEADER_H    = 28;
export const CARD_RADIUS = 12;

/* ── Header path: rounded top + straight bottom ─────────────── */
const headerPath = (w: number, h: number, r: number) =>
  `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w},${h} L 0,${h} L 0,${r} Q 0,0 ${r},0 Z`;

/* ── Card background path: full rounded rect ─────────────────── */
const cardPath = (w: number, h: number, r: number) =>
  `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w},${h - r} Q ${w},${h} ${w - r},${h} L ${r},${h} Q 0,${h} 0,${h - r} L 0,${r} Q 0,0 ${r},0 Z`;

/* ── Truncate text to fit ──────────────────────────────────────── */
function trunc(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/* ══════════════════════════════════════════════════════════════
   Category decoration motifs – drawn in the right 44 × 18 px
   area of the header (ox=92, oy=3, available: 44w × 18h)
   ══════════════════════════════════════════════════════════════ */
function Decoration({ category, textColor }: { category: string; textColor: string }) {
  const c = textColor;
  // All shapes drawn locally; parent <g> applies the translate
  switch (category) {

    /* Server rack – 3 horizontal bars ─────────────────────── */
    case 'compute':
      return (
        <g transform="translate(92,4)" opacity={0.55}>
          <rect x={0} y={0}  width={42} height={3} rx={1} fill={c} />
          <rect x={0} y={7}  width={42} height={3} rx={1} fill={c} />
          <rect x={0} y={14} width={42} height={3} rx={1} fill={c} />
          {/* LED dots */}
          <circle cx={3} cy={1.5} r={1.5} fill={c} opacity={1} />
          <circle cx={3} cy={8.5} r={1.5} fill={c} opacity={0.7} />
          <circle cx={3} cy={15.5} r={1.5} fill={c} opacity={0.4} />
        </g>
      );

    /* Database cylinder ────────────────────────────────────── */
    case 'data':
      return (
        <g transform="translate(102,3)" opacity={0.55}>
          {/* Cylinder body sides */}
          <line x1={0} y1={5}  x2={0}  y2={14} stroke={c} strokeWidth={1.5} />
          <line x1={22} y1={5} x2={22} y2={14} stroke={c} strokeWidth={1.5} />
          {/* Top cap */}
          <ellipse cx={11} cy={5}  rx={11} ry={4} fill="none" stroke={c} strokeWidth={1.5} />
          {/* Bottom cap */}
          <ellipse cx={11} cy={14} rx={11} ry={4} fill="none" stroke={c} strokeWidth={1.5} />
        </g>
      );

    /* Network routing graph ─────────────────────────────────── */
    case 'network':
      return (
        <g transform="translate(92,3)" opacity={0.6}>
          {/* Nodes */}
          <circle cx={6}  cy={9}  r={3.5} fill={c} />
          <circle cx={22} cy={2}  r={3.5} fill={c} />
          <circle cx={22} cy={16} r={3.5} fill={c} />
          <circle cx={38} cy={9}  r={3.5} fill={c} />
          {/* Edges */}
          <line x1={9}  y1={8}  x2={19} y2={3}  stroke={c} strokeWidth={1.2} />
          <line x1={9}  y1={10} x2={19} y2={15} stroke={c} strokeWidth={1.2} />
          <line x1={25} y1={3}  x2={35} y2={8}  stroke={c} strokeWidth={1.2} />
          <line x1={25} y1={15} x2={35} y2={10} stroke={c} strokeWidth={1.2} />
        </g>
      );

    /* Message queue – boxes + arrow ────────────────────────── */
    case 'messaging':
      return (
        <g transform="translate(95,5)" opacity={0.6}>
          <rect x={0}  y={2} width={9} height={9} rx={2} fill={c} />
          <rect x={13} y={2} width={9} height={9} rx={2} fill={c} />
          {/* Arrow */}
          <polyline
            points="25,6.5 33,6.5 30,4 33,6.5 30,9"
            fill="none"
            stroke={c}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      );

    /* Storage – stacked discs ──────────────────────────────── */
    case 'storage':
      return (
        <g transform="translate(103,3)" opacity={0.55}>
          <ellipse cx={11} cy={3}  rx={11} ry={3}  fill={c} opacity={0.45} />
          <ellipse cx={11} cy={9}  rx={11} ry={3}  fill={c} opacity={0.65} />
          <ellipse cx={11} cy={15} rx={11} ry={3}  fill={c} opacity={0.85} />
          {/* Side lines connecting discs */}
          <line x1={0}  y1={3}  x2={0}  y2={15} stroke={c} strokeWidth={1.2} />
          <line x1={22} y1={3}  x2={22} y2={15} stroke={c} strokeWidth={1.2} />
        </g>
      );

    /* Observability – sparkline ────────────────────────────── */
    case 'observability':
      return (
        <g transform="translate(92,4)" opacity={0.65}>
          <polyline
            points="0,14 7,10 12,16 18,5 24,8 30,2 36,6 42,3"
            fill="none"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    /* Platform / infra – hexagon ───────────────────────────── */
    case 'platform':
      return (
        <g transform="translate(107,2)" opacity={0.55}>
          {/* Two nested hexagons */}
          <polygon
            points="14,0 26,7 26,21 14,28 2,21 2,7"
            fill="none"
            stroke={c}
            strokeWidth={1.6}
          />
          <polygon
            points="14,6 20,10 20,18 14,22 8,18 8,10"
            fill={c}
            opacity={0.25}
          />
        </g>
      );

    /* Client / browser – chrome bar ────────────────────────── */
    case 'client':
      return (
        <g transform="translate(92,3)" opacity={0.6}>
          <rect x={0} y={0} width={44} height={16} rx={3} fill="none" stroke={c} strokeWidth={1.3} />
          {/* 3 traffic-light dots */}
          <circle cx={5}  cy={5} r={2} fill={c} opacity={0.5} />
          <circle cx={11} cy={5} r={2} fill={c} opacity={0.7} />
          <circle cx={17} cy={5} r={2} fill={c} />
          {/* Fake address bar */}
          <rect x={21} y={2.5} width={20} height={5} rx={2.5} fill={c} opacity={0.25} />
          {/* Fake content line */}
          <rect x={3}  y={10} width={38} height={2.5} rx={1} fill={c} opacity={0.35} />
        </g>
      );

    default:
      return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════ */
export interface CanvasNodeSVGProps {
  node:          CyNode;
  selected:      boolean;
  isBottleneck:  boolean;
  onMouseDown:   (e: React.MouseEvent<SVGGElement>) => void;
  onContextMenu: (e: React.MouseEvent<SVGGElement>) => void;
}

export default function CanvasNodeSVG({
  node,
  selected,
  isBottleneck,
  onMouseDown,
  onContextMenu,
}: CanvasNodeSVGProps) {
  const spec      = catalog[node.type];
  const hdrColor  = spec?.color      ?? '#e5e7eb';
  const textColor = spec?.textColor  ?? '#374151';
  const category  = spec?.category   ?? 'compute';
  const instances = node.config.instances ?? 1;

  /* Use actual node dimensions so handles, edges and layout stay in sync */
  const W = node.width;
  const H = node.height;

  const label     = trunc(node.label, 18);

  /* Border colour & style based on state */
  const borderColor = isBottleneck
    ? '#d97706'
    : selected
    ? '#15803d'          /* var(--accent) forest green */
    : 'rgba(0,0,0,0.13)';
  const borderWidth  = selected || isBottleneck ? 2.5 : 1.5;
  const borderDash   = isBottleneck ? '5 3' : undefined;

  /* ── Custom SVG path ──────────────────────────────────────── */
  const CustomRenderer = NODE_REGISTRY[node.type];
  if (CustomRenderer) {
    return (
      <g
        transform={`translate(${node.x},${node.y})`}
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
        style={{ cursor: 'grab' }}
      >
        {/* Selected glow behind the artwork */}
        {selected && (
          <path
            d={cardPath(W + 6, H + 6, CARD_RADIUS + 3)}
            fill="rgba(21,128,61,0.07)"
            transform="translate(-3,-3)"
          />
        )}

        {/* The custom SVG component */}
        <CustomRenderer node={node} />

        {/* Instances badge */}
        {instances > 1 && (
          <g transform={`translate(${W - 26},${H - 14})`}>
            <rect x={0} y={0} width={24} height={12} rx={6} fill="rgba(0,0,0,0.55)" />
            <text
              x={12} y={6}
              fontSize={8} fontWeight={700}
              fill="#fff"
              textAnchor="middle" dominantBaseline="middle"
            >
              ×{instances}
            </text>
          </g>
        )}

        {/* Bottleneck badge */}
        {isBottleneck && (
          <g transform={`translate(${W / 2 - 28},${H - 14})`}>
            <rect x={0} y={0} width={56} height={12} rx={6} fill="#fef3c7" />
            <text
              x={28} y={6}
              fontSize={7.5} fontWeight={700}
              fill="#92400e"
              textAnchor="middle" dominantBaseline="middle"
            >
              ⚠ bottleneck
            </text>
          </g>
        )}

        {/* State border overlay (no fill – just ring) */}
        <path
          d={cardPath(W, H, CARD_RADIUS)}
          fill="none"
          stroke={borderColor}
          strokeWidth={borderWidth}
          strokeDasharray={borderDash}
        />
      </g>
    );
  }

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{ cursor: 'grab' }}
    >
      {/* ── Drop shadow ──────────────────────────────────────── */}
      <path
        d={cardPath(W, H, CARD_RADIUS)}
        fill="rgba(15,52,110,0.08)"
        transform="translate(2,3)"
      />

      {/* ── Card body ─────────────────────────────────────────── */}
      <path d={cardPath(W, H, CARD_RADIUS)} fill="#fefcf8" />

      {/* ── Coloured header strip ─────────────────────────────── */}
      <path
        d={headerPath(W, HEADER_H, CARD_RADIUS)}
        fill={hdrColor}
      />

      {/* ── Header icon ───────────────────────────────────────── */}
      <text
        x={10}
        y={HEADER_H / 2 + 1}
        fontSize={13}
        textAnchor="start"
        dominantBaseline="middle"
      >
        {spec?.icon ?? '?'}
      </text>

      {/* ── Header category label ─────────────────────────────── */}
      <text
        x={28}
        y={HEADER_H / 2 + 1}
        fontSize={7.5}
        fontWeight={700}
        fill={textColor}
        opacity={0.7}
        textAnchor="start"
        dominantBaseline="middle"
        style={{ textTransform: 'uppercase', letterSpacing: '0.9px' }}
      >
        {category.toUpperCase()}
      </text>

      {/* ── Category decoration ───────────────────────────────── */}
      <Decoration category={category} textColor={textColor} />

      {/* ── Header / body separator ───────────────────────────── */}
      <line
        x1={0} y1={HEADER_H}
        x2={W} y2={HEADER_H}
        stroke="rgba(0,0,0,0.07)"
        strokeWidth={1}
      />

      {/* ── Node label ────────────────────────────────────────── */}
      <text
        x={W / 2}
        y={HEADER_H + (H - HEADER_H) / 2}
        fontSize={11}
        fontWeight={600}
        fill="#1a1209"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>

      {/* ── Instances badge ───────────────────────────────────── */}
      {instances > 1 && (
        <g transform={`translate(${W - 26},${H - 14})`}>
          <rect x={0} y={0} width={24} height={12} rx={6} fill={hdrColor} />
          <text
            x={12} y={6}
            fontSize={8} fontWeight={700}
            fill={textColor}
            textAnchor="middle" dominantBaseline="middle"
          >
            ×{instances}
          </text>
        </g>
      )}

      {/* ── Bottleneck badge ──────────────────────────────────── */}
      {isBottleneck && (
        <g transform={`translate(${W / 2 - 28},${H - 14})`}>
          <rect x={0} y={0} width={56} height={12} rx={6} fill="#fef3c7" />
          <text
            x={28} y={6}
            fontSize={7.5} fontWeight={700}
            fill="#92400e"
            textAnchor="middle" dominantBaseline="middle"
          >
            ⚠ bottleneck
          </text>
        </g>
      )}

      {/* ── Border overlay (state ring) ───────────────────────── */}
      <path
        d={cardPath(W, H, CARD_RADIUS)}
        fill="none"
        stroke={borderColor}
        strokeWidth={borderWidth}
        strokeDasharray={borderDash}
      />

      {/* ── Selected glow ring ────────────────────────────────── */}
      {selected && (
        <path
          d={cardPath(W + 6, H + 6, CARD_RADIUS + 3)}
          fill="none"
          stroke="#15803d"
          strokeWidth={1.2}
          opacity={0.25}
          transform="translate(-3,-3)"
        />
      )}
    </g>
  );
}
