import React from 'react';
import catalog from '../../data/componentCatalog';
import type { CyNode } from '../../types';

export const SERVER_CARD_W = 160;
export const SERVER_CARD_H = 220;

/* ── Status colour map ──────────────────────────────────────── */
type Status = 'online' | 'warning' | 'offline';

const STATUS: Record<Status, { dot: string; pillBg: string; text: string; screen: string }> = {
  online:  { dot: '#10B981', pillBg: '#d1fae5', text: '#065f46', screen: '#34D399' },
  warning: { dot: '#F59E0B', pillBg: '#fef3c7', text: '#92400e', screen: '#FBBF24' },
  offline: { dot: '#EF4444', pillBg: '#fee2e2', text: '#991b1b', screen: '#F87171' },
};

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/* ══════════════════════════════════════════════════════════════
   ServerRackGlyph – 240×240 coordinate space
   ══════════════════════════════════════════════════════════════ */
export function ServerRackGlyph({
  name   = 'SRV-01',
  status = 'online' as Status,
}: {
  name?:   string;
  status?: Status;
}) {
  const c = STATUS[status] ?? STATUS.offline;
  return (
    <g>
      <rect x="56"  y="30" width="16" height="180" rx="2" fill="#334155" />
      <rect x="168" y="30" width="16" height="180" rx="2" fill="#334155" />

      <rect x="20" y="20"  width="200" height="50" rx="12" fill="#94A3B8" />
      <circle cx="45" cy="45"  r="7" fill="#F8FAFC" opacity="0.9" />
      <circle cx="70" cy="45"  r="7" fill={c.dot}   opacity="0.4" />

      <rect x="20" y="90"  width="200" height="50" rx="12" fill="#94A3B8" />
      <circle cx="45" cy="115" r="7" fill="#F8FAFC" opacity="0.9" />
      <circle cx="70" cy="115" r="7" fill={c.dot}   opacity="0.6" />

      <rect x="20" y="160" width="200" height="50" rx="12" fill="#64748B" />
      <circle cx="45" cy="185" r="7" fill="#F8FAFC" opacity="0.9" />
      <circle cx="70" cy="185" r="7" fill={c.dot}   opacity="1"   />

      <rect x="95" y="170" width="110" height="30" rx="6" fill="#0F172A" />
      <rect x="95" y="170" width="110" height="30" rx="6" fill="#ffffff" opacity="0.05" />
      <text
        x="150" y="190"
        textAnchor="middle" dominantBaseline="central"
        fill={c.screen} fontFamily="monospace" fontSize="14" fontWeight="bold" letterSpacing="1"
      >
        {name}
      </text>
    </g>
  );
}

/* ── Standalone icon ─────────────────────────────────────────── */
export const ServerRackIcon = ({
  name      = 'SRV-01',
  status    = 'online' as Status,
  className = 'w-32 h-32',
}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" className={className}>
    <ServerRackGlyph name={name} status={status} />
  </svg>
);

/* ══════════════════════════════════════════════════════════════
   CanvasServerCard
   Matches the reference design:
     ┌─────────────────────────────┐
     │ ● ONLINE       ☰ Web Server │  header (36px)
     │                             │
     │     [server rack glyph]     │  body   (124px)
     │                             │
     │  ┌─────────────────────┐   │
     │  │ ⬡  192.168.1.10     │   │  footer (52px)
     │  └─────────────────────┘   │
     └─────────────────────────────┘
   Draws within [0,0]→[node.width, node.height]. No outer rect.
   ══════════════════════════════════════════════════════════════ */
export function CanvasServerCard({ node }: { node: CyNode }) {
  const W = node.width;
  const H = node.height;
  const R = 14;                // card corner radius

  /* ── Derived data ─────────────────────────────────────────── */
  const status: Status =
    node.active === false ? 'offline'
    : node.active === true ? 'online'
    : 'online';

  const spec       = catalog[node.type];
  const typeLabel  = trunc(spec?.label ?? node.type, 10);
  const sc         = STATUS[status];

  /* Footer shows: instanceType > region > deployment mode */
  const footerText =
    node.config.instanceType ? node.config.instanceType.toUpperCase()
    : node.config.region     ? node.config.region
    : node.config.deployment === 'cloud' ? 'CLOUD' : 'LOCAL';

  /* ── Layout ───────────────────────────────────────────────── */
  const HDR_H    = 36;                       // header height
  const FTR_H    = 52;                       // footer zone height (incl. padding)
  const BODY_Y   = HDR_H;
  const BODY_H   = H - HDR_H - FTR_H;       // body area for glyph

  /* Glyph: centred square inside body */
  const GLYPH_SIZE = Math.min(BODY_H - 6, W - 24);
  const GLYPH_X    = (W - GLYPH_SIZE) / 2;
  const GLYPH_Y    = BODY_Y + (BODY_H - GLYPH_SIZE) / 2;

  /* Footer inner card */
  const FC_X  = 8;
  const FC_Y  = H - FTR_H + 6;
  const FC_W  = W - 16;
  const FC_H  = FTR_H - 12;
  const FC_R  = 10;

  /* Status label text */
  const statusLabel = status.toUpperCase();

  return (
    <g>
      {/* ── Drop shadow ──────────────────────────────────────── */}
      <rect x={3} y={4} width={W} height={H} rx={R} fill="rgba(15,23,42,0.09)" />

      {/* ── Card background ───────────────────────────────────── */}
      <rect x={0} y={0} width={W} height={H} rx={R} fill="#ffffff" />

      {/* ── Footer zone background ────────────────────────────── */}
      {/* rounded bottom-only by clipping with a rect bottom half */}
      <rect x={0} y={H - FTR_H} width={W} height={FTR_H} fill="#f8fafc" />
      {/* re-apply bottom corners */}
      <rect x={0} y={H - R} width={W} height={R} fill="#f8fafc" />
      <rect x={0} y={H - FTR_H} width={W} height={FTR_H} rx={0} fill="none" />

      {/* ── Card border ───────────────────────────────────────── */}
      <rect x={0} y={0} width={W} height={H} rx={R} fill="none" stroke="#e2e8f0" strokeWidth={1.5} />

      {/* ── Header / body separator ───────────────────────────── */}
      <line x1={0} y1={HDR_H} x2={W} y2={HDR_H} stroke="#e2e8f0" strokeWidth={1} />
      {/* ── Footer separator ──────────────────────────────────── */}
      <line x1={0} y1={H - FTR_H} x2={W} y2={H - FTR_H} stroke="#e2e8f0" strokeWidth={1} />

      {/* ══ HEADER ══════════════════════════════════════════════ */}

      

      {/* Type badge */}
      <rect x={W - 70} y={7} width={63} height={22} rx={6} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1} />
      {/* Server-stack icon: two small rack units */}
      <rect x={W - 64} y={11} width={13} height={4}   rx={1.5} fill="#94a3b8" />
      <rect x={W - 64} y={17} width={13} height={4}   rx={1.5} fill="#94a3b8" />
      <circle cx={W - 67 + 16} cy={13} r={1.5} fill="#64748b" />
      <circle cx={W - 67 + 16} cy={19} r={1.5} fill="#64748b" />
      {/* Type label */}
      <text
        x={W - 48} y={18.5}
        fontSize={7.5} fontWeight={700} fill="#475569"
        textAnchor="start" dominantBaseline="middle"
        letterSpacing="0.3"
      >
        {typeLabel}
      </text>

      {/* ══ BODY — Server rack glyph ════════════════════════════ */}
      <svg
        x={GLYPH_X} y={GLYPH_Y}
        width={GLYPH_SIZE} height={GLYPH_SIZE}
        viewBox="0 0 240 240"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
      >
        <ServerRackGlyph name={trunc(node.label, 8)} status={status} />
      </svg>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}

      {/* Inner card */}
      <rect x={FC_X} y={FC_Y} width={FC_W} height={FC_H} rx={FC_R} fill="#ffffff" stroke="#e2e8f0" strokeWidth={1} />

      {/* Network / hierarchy icon */}
      {/* Top node */}
      <rect x={FC_X + 10} y={FC_Y + 8}  width={10} height={8}  rx={2} fill="#94a3b8" />
      {/* Vertical stem */}
      <line x1={FC_X + 15} y1={FC_Y + 16} x2={FC_X + 15} y2={FC_Y + 20} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Horizontal bar */}
      <line x1={FC_X + 10} y1={FC_Y + 20} x2={FC_X + 20} y2={FC_Y + 20} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Left branch */}
      <line x1={FC_X + 10} y1={FC_Y + 20} x2={FC_X + 10} y2={FC_Y + 24} stroke="#94a3b8" strokeWidth={1.5} />
      <rect x={FC_X + 6}  y={FC_Y + 24} width={8} height={6}  rx={1.5} fill="#94a3b8" />
      {/* Right branch */}
      <line x1={FC_X + 20} y1={FC_Y + 20} x2={FC_X + 20} y2={FC_Y + 24} stroke="#94a3b8" strokeWidth={1.5} />
      <rect x={FC_X + 16} y={FC_Y + 24} width={8} height={6}  rx={1.5} fill="#94a3b8" />

      {/* Footer info text */}
      <text
        x={FC_X + 32} y={FC_Y + FC_H / 2}
        fontSize={10} fontWeight={800} fill="#334155"
        fontFamily="monospace"
        textAnchor="start" dominantBaseline="middle"
        letterSpacing="0.5"
      >
        {trunc(footerText, Math.floor((FC_W - 36) / 6.8))}
      </text>
    </g>
  );
}
