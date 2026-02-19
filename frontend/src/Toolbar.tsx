/* ──────────────────────────────────────────────────────────────
   Toolbar.tsx
   Top toolbar with cluster actions: clear canvas, run analysis,
   auto-layout, and cluster info display.
   ────────────────────────────────────────────────────────────── */
import React from 'react';

export interface ToolbarProps {
  nodeCount: number;
  edgeCount: number;
  onClear: () => void;
  onAutoLayout: () => void;
  onAnalyze: () => void;
}

export default function Toolbar({
  nodeCount,
  edgeCount,
  onClear,
  onAutoLayout,
  onAnalyze,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-stat">
          Nodes: <strong>{nodeCount}</strong>
        </span>
        <span className="toolbar-stat">
          Connections: <strong>{edgeCount}</strong>
        </span>
      </div>
      <div className="toolbar-right">
        <button className="tb-btn" onClick={onAutoLayout} title="Auto-arrange nodes">
          📐 Layout
        </button>
        <button className="tb-btn tb-btn-primary" onClick={onAnalyze} title="Analyze cluster">
          🔍 Analyze
        </button>
        <button className="tb-btn tb-btn-danger" onClick={onClear} title="Clear canvas">
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}
