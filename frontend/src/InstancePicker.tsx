/* ──────────────────────────────────────────────────────────────
   InstancePicker.tsx
   Modal shown when dropping a service that has instance/tier
   variants.  Groups by family, shows vCPU / memory / throughput.
   ────────────────────────────────────────────────────────────── */
import React, { useMemo, useState } from 'react';
import { InstanceType, ServiceDefinition } from './serviceCatalog';

export interface InstancePickerProps {
  service: ServiceDefinition;
  onConfirm: (instance: InstanceType | null) => void;
  onCancel: () => void;
}

export default function InstancePicker({
  service,
  onConfirm,
  onCancel,
}: InstancePickerProps) {
  const instances = useMemo(() => service.instanceTypes || [], [service]);
  const [selected, setSelected] = useState<InstanceType | null>(
    (service.instanceTypes && service.instanceTypes[0]) ?? null
  );
  const [filterFamily, setFilterFamily] = useState<string>('all');

  const families = useMemo(() => {
    const set = new Set(instances.map((i) => i.family || 'Other'));
    return ['all', ...Array.from(set)];
  }, [instances]);

  const filtered = useMemo(
    () =>
      filterFamily === 'all'
        ? instances
        : instances.filter((i) => (i.family || 'Other') === filterFamily),
    [instances, filterFamily]
  );

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog instance-picker-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>
          Configure {service.label}
          <span className="dialog-subtitle">{service.provider.toUpperCase()}</span>
        </h3>

        {/* family filter */}
        <div className="family-filter">
          {families.map((f) => (
            <button
              key={f}
              className={`family-btn ${filterFamily === f ? 'active' : ''}`}
              onClick={() => setFilterFamily(f)}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* instance table */}
        <div className="instance-table-wrap">
          <table className="instance-table">
            <thead>
              <tr>
                <th></th>
                <th>Instance</th>
                <th>vCPUs</th>
                <th>Memory</th>
                <th>Throughput</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst) => (
                <tr
                  key={inst.id}
                  className={selected?.id === inst.id ? 'selected-row' : ''}
                  onClick={() => setSelected(inst)}
                >
                  <td>
                    <input
                      type="radio"
                      name="instance"
                      checked={selected?.id === inst.id}
                      onChange={() => setSelected(inst)}
                    />
                  </td>
                  <td className="inst-label">{inst.label}</td>
                  <td>{inst.vcpus || '–'}</td>
                  <td>{inst.memoryGb} GB</td>
                  <td>{inst.throughput.toLocaleString()} req/s</td>
                  <td>{inst.latency} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* selected summary */}
        {selected && (
          <div className="instance-summary">
            <strong>{selected.label}</strong>
            {selected.family && <span className="summary-family">{selected.family}</span>}
            — {selected.vcpus} vCPUs, {selected.memoryGb} GB RAM, {selected.throughput.toLocaleString()} req/s
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-secondary" onClick={() => onConfirm(null)}>
            Use Default
          </button>
          <button
            className="btn-primary"
            disabled={!selected}
            onClick={() => onConfirm(selected)}
          >
            Select {selected?.label ?? ''}
          </button>
        </div>
      </div>
    </div>
  );
}
