/* ──────────────────────────────────────────────────────────────
   ConnectionDialog.tsx
   Modal shown after two nodes are connected so the user can
   pick connection kind, label, and bandwidth.
   ────────────────────────────────────────────────────────────── */
import React, { useState } from 'react';
import { ConnectionKind } from './AnimatedEdge';

export interface ConnectionDialogProps {
  defaultKind: ConnectionKind;
  onConfirm: (kind: ConnectionKind, label: string, bandwidth: string) => void;
  onCancel: () => void;
}

const KINDS: ConnectionKind[] = ['data', 'network', 'replication', 'event'];

export default function ConnectionDialog({
  defaultKind,
  onConfirm,
  onCancel,
}: ConnectionDialogProps) {
  const [kind, setKind] = useState<ConnectionKind>(defaultKind);
  const [label, setLabel] = useState('');
  const [bandwidth, setBandwidth] = useState('');

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Configure Connection</h3>

        <label className="dialog-field">
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as ConnectionKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="dialog-field">
          Label
          <input
            type="text"
            placeholder="e.g. API calls, SQL queries…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        <label className="dialog-field">
          Bandwidth / rate
          <input
            type="text"
            placeholder="e.g. 1 Gbps, 5000 req/s"
            value={bandwidth}
            onChange={(e) => setBandwidth(e.target.value)}
          />
        </label>

        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(kind, label || kind, bandwidth)}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
