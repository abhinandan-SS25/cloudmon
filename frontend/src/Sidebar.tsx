/* ──────────────────────────────────────────────────────────────
   Sidebar.tsx
   Minimal edge sidebar with provider icon tabs (expanded mode shows full catalog)
   ────────────────────────────────────────────────────────────── */
import React, { useState, useMemo } from 'react';
import {
  CloudProvider,
  SERVICE_CATALOG,
  ServiceDefinition,
  PROVIDER_COLORS,
  CATEGORY_LABELS,
  ServiceCategory,
} from './serviceCatalog';
import { ConnectionKind } from './AnimatedEdge';

export interface SidebarProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, service: ServiceDefinition) => void;
  connectionKind: ConnectionKind;
  onConnectionKindChange: (kind: ConnectionKind) => void;
  showConnectionPicker?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

const PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'azure', 'platform'];
const PROVIDER_LABELS: Record<CloudProvider, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  platform: 'Platforms',
};

const PROVIDER_ICONS: Record<CloudProvider, string> = {
  aws: '☁️',
  gcp: '🔷',
  azure: 'Ⓜ️',
  platform: '📦',
};

const CONNECTION_KINDS: { value: ConnectionKind; label: string; desc: string }[] = [
  { value: 'data',        label: '📊 Data',        desc: 'Database / API data flow' },
  { value: 'network',     label: '🌐 Network',     desc: 'VPC / subnet traffic' },
  { value: 'replication', label: '🔄 Replication',  desc: 'Data sync / replication' },
  { value: 'event',       label: '⚡ Event',        desc: 'Pub/sub, queue, events' },
];

export default function Sidebar({
  onDragStart,
  connectionKind,
  onConnectionKindChange,
  showConnectionPicker = true,
  expanded = false,
  onToggle,
}: SidebarProps) {
  const [activeProvider, setActiveProvider] = useState<CloudProvider>('aws');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const services = useMemo(() => {
    const list = SERVICE_CATALOG[activeProvider];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [activeProvider, search]);

  /* group by category */
  const grouped = useMemo(() => {
    const map = new Map<ServiceCategory, ServiceDefinition[]>();
    for (const s of services) {
      const arr = map.get(s.category) || [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return map;
  }, [services]);

  const toggleCategory = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
      {/* ── TOGGLE BUTTON ──────────────── */}
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '✕' : '☰'}
        </button>
      </div>

      {/* ── PROVIDER ICON TABS (always visible) ──────────────── */}
      <div className="provider-tabs">
        {PROVIDERS.map((p) => (
          <button
            key={p}
            className={`provider-tab ${p} ${activeProvider === p ? 'active' : ''}`}
            title={PROVIDER_LABELS[p]}
            onClick={() => setActiveProvider(p)}
            style={{
              color: activeProvider === p ? PROVIDER_COLORS[p] : 'var(--text-dim)',
            }}
          >
            {PROVIDER_ICONS[p]}
          </button>
        ))}
      </div>

      {/* ── SEARCH (expanded only) ─────────────────────── */}
      <input
        className="sidebar-search"
        type="text"
        placeholder="Search services…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ── SERVICE LIST ───────────────── */}
      <div className="service-list">
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="category-group">
            <div
              className="category-header"
              onClick={() => toggleCategory(category)}
            >
              <span>{CATEGORY_LABELS[category] || category}</span>
              <span className="chevron">
                {collapsed[category] ? '▸' : '▾'}
              </span>
            </div>
            {!collapsed[category] &&
              items.map((svc) => (
                <div
                  key={svc.id}
                  className="dndnode"
                  style={{ borderLeftColor: PROVIDER_COLORS[svc.provider] }}
                  onDragStart={(e) => onDragStart(e, svc)}
                  draggable
                >
                  <span className="dndnode-icon">{svc.icon}</span>
                  <span className="dndnode-label">{svc.label}</span>
                </div>
              ))}
          </div>
        ))}
        {grouped.size === 0 && (
          <p className="no-results">No matching services</p>
        )}
      </div>

      {/* ── CONNECTION TYPE PICKER ─────── */}
      {showConnectionPicker && (
        <div className="connection-picker">
          <h4>Connection Type</h4>
          {CONNECTION_KINDS.map((ck) => (
            <label key={ck.value} className="conn-radio" title={ck.desc}>
              <input
                type="radio"
                name="connectionKind"
                value={ck.value}
                checked={connectionKind === ck.value}
                onChange={() => onConnectionKindChange(ck.value)}
              />
              {ck.label}
            </label>
          ))}
        </div>
      )}
    </aside>
  );
}
