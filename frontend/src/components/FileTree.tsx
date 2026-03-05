/* ═══════════════════════════════════════════════════════════════
   FileTree.tsx – Filesystem-style request tree
   ═══════════════════════════════════════════════════════════════ */
import React from 'react';
import { Phase, RequestTreeItem } from '../types';
import { FaFolder, FaFolderOpen } from "react-icons/fa";
import { FiFilePlus } from "react-icons/fi";

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
  onContextMenu?: (e: React.MouseEvent, id: string, kind: 'folder' | 'request') => void;
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
  onContextMenu,
}: FileTreeProps) {
  const indent = 6 + depth * 16;

  return (
    <>
      {items.map((item) => {
        if (item.kind === 'folder') {
          return (
            <div key={item.id} className="fs-folder-group">
              {/* Folder row */}
              <div
                className="fs-row fs-folder-row"
                style={{ paddingLeft: `${indent}px` }}
                onClick={() => onToggle(item.id)}
                onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, item.id, 'folder'); }}
              >
                <span className={`fs-chevron${item.expanded ? ' expanded' : ''}`}>›</span>
                <span className="fs-icon fs-folder-icon">{item.expanded ? <FaFolder /> : <FaFolderOpen />}</span>
                <input
                  className="fs-name-input"
                  value={item.name}
                  onChange={(e) => onRename(item.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="fs-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="fs-action-btn" title="New Request" onClick={() => onAddRequest(item.id)}>＋</button>
                  <button className="fs-action-btn" title="New Subfolder" onClick={() => onAddFolder(item.id)}>⊞</button>
                  <button className="fs-action-btn danger" title="Delete" onClick={() => onDelete(item.id)}>✕</button>
                </div>
              </div>

              {/* Children with indent guide */}
              {item.expanded && (
                <div
                  className="fs-children"
                  style={{ borderLeft: '1.5px solid var(--border)', marginLeft: `${indent + 12}px` }}
                >
                  <FileTree
                    items={item.children}
                    depth={0}
                    activeRequestId={activeRequestId}
                    phase={phase}
                    onOpen={onOpen}
                    onRename={onRename}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onAddRequest={onAddRequest}
                    onAddFolder={onAddFolder}
                    onContextMenu={onContextMenu}
                  />
                </div>
              )}
            </div>
          );
        }

        // Leaf request file
        const isActive = item.id === activeRequestId && phase === 'request';
        return (
          <div
            key={item.id}
            className={`fs-row fs-file-row${isActive ? ' active' : ''}`}
            style={{ paddingLeft: `${indent}px` }}
            onClick={() => onOpen(item.id)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, item.id, 'request'); }}
          >
            <span className="fs-chevron" />
            <span className="fs-icon fs-file-icon"><FiFilePlus /></span>
            <input
              className="fs-name-input"
              value={item.name}
              onChange={(e) => {
                e.stopPropagation();
                onRename(item.id, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="fs-badge">{item.canvas.nodes.length}</span>
            <div className="fs-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="fs-action-btn danger"
                title="Delete"
                onClick={() => onDelete(item.id)}
              >✕</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

