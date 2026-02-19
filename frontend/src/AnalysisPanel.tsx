/* ──────────────────────────────────────────────────────────────
   AnalysisPanel.tsx
   Shows analysis results: per-node throughput, bottlenecks,
   total latency, and a simple textual flow summary.
   ────────────────────────────────────────────────────────────── */
import React from 'react';

export interface AnalysisResult {
  nodes: number;
  edges: number;
  totalThroughput: number;
  totalLatency: number;
  bottlenecks: { nodeId: string; label: string; reason: string }[];
  flowPaths: { path: string[]; latency: number }[];
}

interface Props {
  result: AnalysisResult | null;
  onClose: () => void;
}

export default function AnalysisPanel({ result, onClose }: Props) {
  if (!result) return null;

  return (
    <div className="analysis-panel">
      <div className="analysis-header">
        <h3>Cluster Analysis</h3>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="analysis-grid">
        <div className="stat-card">
          <label>Nodes</label>
          <strong>{result.nodes}</strong>
        </div>
        <div className="stat-card">
          <label>Connections</label>
          <strong>{result.edges}</strong>
        </div>
        <div className="stat-card">
          <label>Total Throughput</label>
          <strong>{result.totalThroughput.toLocaleString()} req/s</strong>
        </div>
        <div className="stat-card">
          <label>Max Path Latency</label>
          <strong>{result.totalLatency} ms</strong>
        </div>
      </div>

      {result.bottlenecks.length > 0 && (
        <div className="bottleneck-section">
          <h4>⚠️ Bottlenecks</h4>
          <ul>
            {result.bottlenecks.map((b, i) => (
              <li key={i}>
                <strong>{b.label}</strong> — {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.flowPaths.length > 0 && (
        <div className="flow-paths-section">
          <h4>Data Flow Paths</h4>
          {result.flowPaths.map((fp, i) => (
            <div key={i} className="flow-path">
              <span className="path-chain">{fp.path.join(' → ')}</span>
              <span className="path-latency">{fp.latency} ms</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
