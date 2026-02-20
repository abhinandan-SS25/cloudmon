/* ═══════════════════════════════════════════════════════════════
   FileTree.tsx – Recursive request file-tree component
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { Phase, RequestTreeItem } from '../types';

export interface FileTreeProps {
  items: RequestTreeItem[];
  depth: number;
  activeRequestId: string;
  phase: Phase;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAddRequest: (parentFolderId?: string) => void;
  onAddFolder: (parentFolderId?: string) => void;
}

export function FileTree({
  items,
  depth,
  activeRequestId,
  phase,
  onOpen,
  onRename,
  onDelete,
  onToggle,
  onAddRequest,
  onAddFolder,
}: FileTreeProps) {
  return (
    <>
      {items.map((item) => {
        if (item.kind === 'folder') {
          return (
            <div
              key={item.id}
              className="tree-folder"
              style={{ '--tree-depth': depth } as React.CSSProperties}
            >
              <div className="tree-folder-header">
                <button className="tree-chevron" onClick={() => onToggle(item.id)}>
                  {item.expanded ? '▾' : '▸'}
                </button>
                <span className="tree-folder-icon">📁</span>
                <input
                  className="tree-name-input"
                  value={item.name}
                  onChange={(e) => onRename(item.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="tree-item-actions">
                  <button
                    title="Add request inside"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddRequest(item.id);
                    }}
                  >
                    +
                  </button>
                  <button
                    title="Add sub-folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddFolder(item.id);
                    }}
                  >
                    📁
                  </button>
                  <button
                    title="Delete folder"
                    className="tree-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {item.expanded && (
                <div className="tree-folder-children">
                  <FileTree
                    items={item.children}
                    depth={depth + 1}
                    activeRequestId={activeRequestId}
                    phase={phase}
                    onOpen={onOpen}
                    onRename={onRename}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onAddRequest={onAddRequest}
                    onAddFolder={onAddFolder}
                  />
                </div>
              )}
            </div>
          );
        }

        // leaf request
        const isActive = item.id === activeRequestId && phase === 'request';
        return (
          <div
            key={item.id}
            className={`stage-file-card ${isActive ? 'active' : ''}`}
            style={{ '--tree-depth': depth } as React.CSSProperties}
            onClick={() => onOpen(item.id)}
          >
            <div className="stage-file-tab" />
            <div className="stage-file-body">
              <span className="stage-file-icon">📋</span>
              <div className="stage-file-info">
                <input
                  className="stage-file-name-input"
                  value={item.name}
                  onChange={(e) => {
                    e.stopPropagation();
                    onRename(item.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="stage-file-meta">
                  {item.canvas.nodes.length}n · {item.canvas.edges.length}e
                </div>
              </div>
              <button
                className="tree-delete"
                title="Delete request"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
