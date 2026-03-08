/* ═══════════════════════════════════════════════════════════════
   NodeDetailDock.tsx
   Floating bottom dock for the Node Detail editor.
   Drag-to-canvas sections: Docker / K8s / Scheduling / Networking /
   Messaging.  Click-to-add sections: Storage / Firewall.
   Uses App.css `.dock-*` classes (same system as ComponentDock).
   ═══════════════════════════════════════════════════════════════ */
import React, { useState } from 'react';
import {
  X, Box, Hexagon, Clock, Network, Inbox,
  HardDrive, Shield, ArrowLeft,
  Globe, Cpu, Layers, LayoutList,
  TrendingUp, Server, RefreshCcw, Copy, Share2, LogIn, FileText, KeyRound,
  CalendarClock, Play, Settings2, Gauge, RotateCcw,
  ArrowLeftRight, Repeat2, GitFork, Zap, MapPin,
  Bell, Radio, GitMerge, BarChart2,
  FolderOpen, Cloud, Package, FileCode,
  ShieldCheck, Terminal, Database, ArrowUpRight, ShieldOff, Settings,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

/* ── Section data ────────────────────────────────────────────── */
interface DragItem  { name: string; icon: string; desc: string; key: string; }
interface ClickItem { name: string; icon: string; desc: string; extra: Record<string, unknown>; }
interface DragSection  { title: string; color: string; clickOnly?: false; items: DragItem[]; }
interface ClickSection { title: string; color: string; clickOnly: true; event: string; items: ClickItem[]; }
type Section = DragSection | ClickSection;

/* ── Full icon map for tray items ────────────────────────────── */
const ITEM_ICON_MAP: Record<string, React.ElementType> = {
  Box, Globe, Cpu, Layers, LayoutList, Network,
  Hexagon, TrendingUp, Server, RefreshCcw, Copy, Share2, LogIn, FileText, KeyRound,
  CalendarClock, Play, Settings2, Gauge, RotateCcw,
  ArrowLeftRight, Repeat2, GitFork, Zap, MapPin,
  Inbox, Bell, Radio, GitMerge, BarChart2,
  HardDrive, FolderOpen, Cloud, Package, FileCode,
  ShieldCheck, Terminal, Database, ArrowUpRight, ShieldOff, Settings,
};

const SECTIONS: Section[] = [
  {
    title: 'Docker', color: '#0099e6',
    items: [
      { key: 'docker',  name: 'Container',      icon: 'Box',        desc: 'Generic Docker container' },
      { key: 'docker',  name: 'Web Server',      icon: 'Globe',      desc: 'nginx / apache front-end' },
      { key: 'docker',  name: 'App Server',      icon: 'Cpu',        desc: 'Backend application process' },
      { key: 'docker',  name: 'Build Stage',     icon: 'Layers',     desc: 'Multi-stage build container' },
      { key: 'sidecar', name: 'Compose Stack',   icon: 'LayoutList', desc: 'docker-compose service group' },
      { key: 'docker',  name: 'Docker Network',  icon: 'Network',    desc: 'Custom bridge / overlay network' },
    ],
  },
  {
    title: 'Kubernetes', color: '#326CE5',
    items: [
      { key: 'k8s_pod',    name: 'Pod',         icon: 'Hexagon',     desc: 'Smallest deployable K8s unit' },
      { key: 'k8s_deploy', name: 'Deployment',  icon: 'TrendingUp',  desc: 'Managed stateless workload' },
      { key: 'k8s_deploy', name: 'StatefulSet', icon: 'Server',      desc: 'Ordered, stable pod identity' },
      { key: 'k8s_deploy', name: 'DaemonSet',   icon: 'RefreshCcw',  desc: 'One pod per node' },
      { key: 'k8s_deploy', name: 'ReplicaSet',  icon: 'Copy',        desc: 'Maintain replica count' },
      { key: 'lb',         name: 'K8s Service', icon: 'Share2',      desc: 'ClusterIP / NodePort / LB' },
      { key: 'lb',         name: 'Ingress',     icon: 'LogIn',       desc: 'HTTP routing rules' },
      { key: 'sidecar',    name: 'ConfigMap',   icon: 'FileText',    desc: 'Non-secret configuration data' },
      { key: 'sidecar',    name: 'Secret',      icon: 'KeyRound',    desc: 'Encrypted config / credentials' },
    ],
  },
  {
    title: 'Scheduling', color: '#7c3aed',
    items: [
      { key: 'k8s_cronjob', name: 'CronJob',          icon: 'CalendarClock', desc: 'Cron-based periodic job' },
      { key: 'k8s_cronjob', name: 'One-Shot Job',      icon: 'Play',          desc: 'Run once to completion' },
      { key: 'k8s_cronjob', name: 'Background Worker', icon: 'Settings2',     desc: 'Long-running async worker' },
      { key: 'queue',       name: 'Rate Limiter',      icon: 'Gauge',         desc: 'Token-bucket rate control' },
      { key: 'k8s_cronjob', name: 'Retry Queue',       icon: 'RotateCcw',     desc: 'Dead-letter retry processor' },
    ],
  },
  {
    title: 'Networking', color: '#059669',
    items: [
      { key: 'lb',      name: 'Load Balancer',  icon: 'ArrowLeftRight', desc: 'Distribute traffic across pods' },
      { key: 'lb',      name: 'API Gateway',    icon: 'Globe',          desc: 'Managed API entry point' },
      { key: 'sidecar', name: 'Reverse Proxy',  icon: 'Repeat2',        desc: 'nginx/Caddy upstream proxy' },
      { key: 'sidecar', name: 'Service Mesh',   icon: 'GitFork',        desc: 'Istio / Linkerd sidecar' },
      { key: 'sidecar', name: 'Circuit Breaker',icon: 'Zap',            desc: 'Resilience / fallback pattern' },
      { key: 'lb',      name: 'CDN Edge',       icon: 'MapPin',         desc: 'Content delivery / caching' },
    ],
  },
  {
    title: 'Messaging', color: '#e53e3e',
    items: [
      { key: 'queue', name: 'Queue Worker',     icon: 'Inbox',    desc: 'FIFO task consumer' },
      { key: 'queue', name: 'Event Bus',        icon: 'Bell',     desc: 'CloudEvents / NATS backbone' },
      { key: 'queue', name: 'Pub/Sub Service',  icon: 'Radio',    desc: 'Fan-out topic subscription' },
      { key: 'queue', name: 'Message Broker',   icon: 'GitMerge', desc: 'RabbitMQ / ActiveMQ broker' },
      { key: 'queue', name: 'Stream Processor', icon: 'BarChart2',desc: 'Kafka / Kinesis pipeline' },
    ],
  },
  {
    title: 'Storage', color: '#b45309', clickOnly: true, event: 'cloudmon:add-storage',
    items: [
      { name: 'SSD Block Vol.',  icon: 'HardDrive',  desc: '100 GB persistent SSD volume',       extra: { name: 'SSD Block Volume',  type: 'volume', sizeGb: 100  } },
      { name: 'NFS Mount',       icon: 'FolderOpen', desc: 'Shared network file system (500 GB)',extra: { name: 'NFS Mount',          type: 'bind',   sizeGb: 500  } },
      { name: 'RAM Disk',        icon: 'Zap',        desc: 'tmpfs in-memory volume (4 GB)',      extra: { name: 'RAM Disk (tmpfs)',   type: 'tmpfs',  sizeGb: 4    } },
      { name: 'Object Store',    icon: 'Cloud',      desc: 'S3-compatible blob bucket (1 TB)',   extra: { name: 'Object Store',      type: 'volume', sizeGb: 1000 } },
      { name: 'Ephemeral Vol.',  icon: 'Package',    desc: 'Temporary, lost on restart',         extra: { name: 'Ephemeral Volume',  type: 'volume', sizeGb: 20   } },
      { name: 'Config Volume',   icon: 'FileCode',   desc: 'Read-only mounted config (1 GB)',    extra: { name: 'Config Volume',     type: 'bind',   sizeGb: 1    } },
    ],
  } as ClickSection,
  {
    title: 'Firewall', color: '#dc2626', clickOnly: true, event: 'cloudmon:add-firewall',
    items: [
      { name: 'Allow HTTP',  icon: 'Globe',       desc: 'Inbound TCP 80',         extra: { direction:'inbound',  protocol:'tcp', portRange:'80',    cidr:'0.0.0.0/0',  action:'allow' } },
      { name: 'Allow HTTPS', icon: 'ShieldCheck', desc: 'Inbound TCP 443',        extra: { direction:'inbound',  protocol:'tcp', portRange:'443',   cidr:'0.0.0.0/0',  action:'allow' } },
      { name: 'Allow SSH',   icon: 'Terminal',    desc: 'Inbound TCP 22',         extra: { direction:'inbound',  protocol:'tcp', portRange:'22',    cidr:'0.0.0.0/0',  action:'allow' } },
      { name: 'PostgreSQL',  icon: 'Database',    desc: 'Inbound TCP 5432',       extra: { direction:'inbound',  protocol:'tcp', portRange:'5432',  cidr:'10.0.0.0/8', action:'allow' } },
      { name: 'Redis',       icon: 'Gauge',       desc: 'Inbound TCP 6379',       extra: { direction:'inbound',  protocol:'tcp', portRange:'6379',  cidr:'10.0.0.0/8', action:'allow' } },
      { name: 'All Outbound',icon: 'ArrowUpRight',desc: 'Allow all egress',       extra: { direction:'outbound', protocol:'any', portRange:'0-65535',cidr:'0.0.0.0/0', action:'allow' } },
      { name: 'Block All In',icon: 'ShieldOff',   desc: 'Default-deny inbound',   extra: { direction:'inbound',  protocol:'any', portRange:'0-65535',cidr:'0.0.0.0/0', action:'deny'  } },
      { name: 'Custom Rule', icon: 'Settings',    desc: 'Define your own rule',   extra: { direction:'inbound',  protocol:'tcp', portRange:'8080',  cidr:'0.0.0.0/0',  action:'allow' } },
    ],
  } as ClickSection,
];

const SECTION_ICONS: Record<string, React.ElementType> = {
  Docker: Box, Kubernetes: Hexagon, Scheduling: Clock,
  Networking: Network, Messaging: Inbox, Storage: HardDrive, Firewall: Shield,
};

/* ── Tray item ───────────────────────────────────────────────── */
function TrayItem({ item, section, onClose }: { item: DragItem | ClickItem; section: Section; onClose: () => void }) {
  const Icon = ITEM_ICON_MAP[item.icon] ?? Box;

  if (section.clickOnly) {
    const ci = item as ClickItem;
    const cs = section as ClickSection;
    return (
      <div
        className="dock-item"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          window.dispatchEvent(new CustomEvent(cs.event, { detail: ci.extra }));
          onClose();
        }}
        title={ci.desc}
      >
        <div className="dock-item-icon" style={{ background: `${section.color}18`, color: section.color }}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <span className="dock-item-label">{ci.name}</span>
      </div>
    );
  }

  const di = item as DragItem;
  return (
    <div
      className="dock-item"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('itemKind', di.key);
        e.dataTransfer.setData('itemName', di.name);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      title={di.desc}
    >
      <div className="dock-item-icon" style={{ background: `${section.color}18`, color: section.color }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <span className="dock-item-label">{di.name}</span>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function NodeDetailDock() {
  const [activeTray, setActiveTray] = useState<string | null>(null);
  const navigate = useNavigate();
  const { projectId, requestId } = useParams<{ projectId?: string; requestId?: string }>();

  const backUrl = requestId
    ? `/projects/${projectId}/requests/${requestId}`
    : `/projects/${projectId}`;

  const closeTray = () => setActiveTray(null);
  const toggleTray = (key: string) => setActiveTray((prev) => (prev === key ? null : key));

  const activeSection = SECTIONS.find((s) => s.title === activeTray) ?? null;

  return (
    <div className="dock-root" onClick={(e) => e.stopPropagation()}>

      {/* ── Tray popover ──────────────────────────────────── */}
      <div className={`dock-tray${activeSection ? ' dock-tray--open' : ''}`}>
        <div className="dock-tray-header">
          <span className="dock-tray-title">
            {activeSection && SECTION_ICONS[activeSection.title] &&
              React.createElement(SECTION_ICONS[activeSection.title], {
                size: 15, style: { color: activeSection.color, flexShrink: 0 },
              })
            }
            {activeSection?.title}
            {activeSection?.clickOnly && (
              <span style={{ fontSize: 10, color: 'var(--text-xs)', fontWeight: 400, marginLeft: 4 }}>
                click to add
              </span>
            )}
          </span>
          <button className="dock-tray-close" onClick={closeTray}><X size={15} /></button>
        </div>

        <div className="dock-tray-body">
          {activeSection && (
            <div className="dock-tray-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {activeSection.items.map((item) => (
                <TrayItem
                  key={item.name}
                  item={item}
                  section={activeSection}
                  onClose={closeTray}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Dock bar ──────────────────────────────────────── */}
      <div className="dock-bar">
        {/* Back button */}
        <button
          className="dock-btn"
          onClick={() => navigate(backUrl)}
          title="Back to editor"
        >
          <ArrowLeft size={19} strokeWidth={2} />
          <span className="dock-btn-label">Back</span>
        </button>

        <div className="dock-divider" />

        {/* Section buttons */}
        {SECTIONS.map((section) => {
          const isActive = activeTray === section.title;
          const Icon = SECTION_ICONS[section.title] ?? Box;
          return (
            <button
              key={section.title}
              className={`dock-btn${isActive ? ' dock-btn--active' : ''}`}
              style={isActive ? { color: section.color, background: `${section.color}15` } : undefined}
              onClick={() => toggleTray(section.title)}
              title={section.title}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span className="dock-btn-label">{section.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
