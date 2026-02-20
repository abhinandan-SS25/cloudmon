/* ═══════════════════════════════════════════════════════════════
   PaletteRibbon.tsx – Ribbon-style component palette in the header
   Categories are tabs; clicking a tab reveals a draggable item row.
   ═══════════════════════════════════════════════════════════════ */
import React, { useState } from 'react';
import catalog, { PALETTE_SECTIONS } from '../data/componentCatalog';

export function PaletteRibbon() {
  const [activeTab, setActiveTab] = useState<string>(PALETTE_SECTIONS[0].title);

  const activeSection = PALETTE_SECTIONS.find((s) => s.title === activeTab) ?? null;

  function handleDragStart(key: string, e: React.DragEvent) {
    e.dataTransfer.setData('componentType', key);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div className="ribbon">
      {/* ── Category tabs ── */}
      <div className="ribbon-tabs">
        {PALETTE_SECTIONS.map((section) => (
          <button
            key={section.title}
            className={`ribbon-tab ${activeTab === section.title ? 'active' : ''}`}
            onClick={() => setActiveTab(section.title)}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* ── Items row ── */}
      {activeSection && (
        <div className="ribbon-items">
          {activeSection.keys.map((key) => {
            const spec = catalog[key];
            if (!spec) return null;
            return (
              <div
                key={key}
                className="ribbon-item"
                draggable
                onDragStart={(e) => handleDragStart(key, e)}
                title={spec.description}
              >
                <span
                  className="ribbon-item-icon"
                  style={{ background: spec.color, color: spec.textColor }}
                >
                  {spec.icon}
                </span>
                <span className="ribbon-item-label">{spec.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
