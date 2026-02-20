/* ═══════════════════════════════════════════════════════════════
   FileTree.tsx – Filesystem-style request tree
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
  const indent = 8 + depth * 14;

  return (
    <>
      {items.map((item) => {
        if (item.kind === 'folder') {
          return (
            <div key={item.id}>
              {/* Folder row */}
              <div
                className="fs-row"
                style={{ paddingLeft: `${indent}px` }}
                onClick={() => onToggle(item.id)}
              >
                <span className="fs-chevron">{item.expanded ? '▾' : '▸'}</span>
                <span className="fs-icon">📁</span>
                <input
                  className="fs-name-input"
                  value={item.name}
                  onChange={(e) => onRename(item.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="fs-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="fs-action-btn"
                    title="New request"
                    onClick={() => onAddRequest(item.id)}
                  >+</button>
                  <button
                    className="fs-action-btn"
                    title="New folder"
                    onClick={() => onAddFolder(item.id)}
                  >📁</button>
                  <button
                    className="fs-action-btn danger"
                    title="Delete folder"
                    onClick={() => onDelete(item.id)}
                  >✕</button>
                </div>
              </div>

              {/* Children */}
              {item.expanded && (
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
              )}
            </div>
          );
        }

        // Leaf request file
        const isActive = item.id === activeRequestId && phase === 'request';
        return (
          <div
            key={item.id}
            className={`fs-row${isActive ? ' active' : ''}`}
            style={{ paddingLeft: `${indent}px` }}
            onClick={() => onOpen(item.id)}
          >
            <span className="fs-chevron" />
            <span className="fs-icon">📄</span>
            <input
              className="fs-name-input"
              value={item.name}
              onChange={(e) => {
                e.stopPropagation();
                onRename(item.id, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="fs-meta">
              {item.canvas.nodes.length}n·{item.canvas.edges.length}e
            </span>
            <div className="fs-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="fs-action-btn danger"
                title="Delete request"
                onClick={() => onDelete(item.id)}
              >✕</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

