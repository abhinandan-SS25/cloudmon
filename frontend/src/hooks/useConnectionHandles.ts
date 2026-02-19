/* ═══════════════════════════════════════════════════════════════
   useConnectionHandles.ts – Connection Handle Hook
   Manages connection handles, drag-to-connect, and snap-to-node.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState, RefObject } from 'react';
import cytoscape from 'cytoscape';
import { ConnectionHandle, DragState, CyNode, CyEdge, Phase } from '../types';

interface UseConnectionHandlesProps {
  cyRef: RefObject<cytoscape.Core | null>;
  canvasRef: RefObject<HTMLDivElement | null>;
  nodes: CyNode[];
  phase: Phase;
  onEdgeCreate: (source: string, target: string) => void;
  onPendingConnection: (source: string, target: string) => void;
}

export const useConnectionHandles = ({
  cyRef,
  canvasRef,
  nodes,
  phase,
  onEdgeCreate,
  onPendingConnection,
}: UseConnectionHandlesProps) => {
  const [connectionHandles, setConnectionHandles] = useState<ConnectionHandle[]>([]);
  const [hoveredHandle, setHoveredHandle] = useState<{ nodeId: string; position: string } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  /* ── update connection handle positions ──────────────────────── */
  useEffect(() => {
    if (!cyRef.current || !canvasRef.current) return;
    
    const updateHandles = () => {
      const cy = cyRef.current;
      if (!cy || !canvasRef.current) return;
      
      const handles: ConnectionHandle[] = [];
      
      // Get the Cytoscape container's position relative to our reference container
      const cyContainer = cy.container();
      if (!cyContainer) return;
      
      const containerBounds = canvasRef.current.getBoundingClientRect();
      const cyBounds = cyContainer.getBoundingClientRect();
      
      // Calculate offset of cy canvas within our wrapper
      const offsetX = cyBounds.left - containerBounds.left;
      const offsetY = cyBounds.top - containerBounds.top;
      
      nodes.forEach((node) => {
        const cyNode = cy.getElementById(node.data.id);
        if (!cyNode || cyNode.length === 0) return;
        
        // Get actual rendered bounding box
        const bb = cyNode.renderedBoundingBox();
        
        // Calculate center and edge positions from bounding box
        const centerX = (bb.x1 + bb.x2) / 2;
        const centerY = (bb.y1 + bb.y2) / 2;
        
        // Add offset to position handles correctly within wrapper
        handles.push(
          { nodeId: node.data.id, position: 'top', x: centerX + offsetX, y: bb.y1 + offsetY },
          { nodeId: node.data.id, position: 'bottom', x: centerX + offsetX, y: bb.y2 + offsetY },
          { nodeId: node.data.id, position: 'left', x: bb.x1 + offsetX, y: centerY + offsetY },
          { nodeId: node.data.id, position: 'right', x: bb.x2 + offsetX, y: centerY + offsetY }
        );
      });
      
      setConnectionHandles(handles);
    };
    
    updateHandles();
    
    const cy = cyRef.current;
    cy.on('render', updateHandles);
    cy.on('zoom', updateHandles);
    cy.on('pan', updateHandles);
    
    return () => {
      cy.off('render', updateHandles);
      cy.off('zoom', updateHandles);
      cy.off('pan', updateHandles);
    };
  }, [cyRef, canvasRef, nodes]);

  /* ── find node at pointer position ───────────────────────────── */
  const findNodeAtPoint = useCallback((x: number, y: number): string | null => {
    if (!cyRef.current || !canvasRef.current) return null;
    
    const cy = cyRef.current;
    const container = canvasRef.current;
    const bounds = container.getBoundingClientRect();
    
    // Convert screen coordinates to rendered coordinates
    const renderedX = x - bounds.left;
    const renderedY = y - bounds.top;
    
    // Find node at position with expanded hitbox for snapping
    const snapRadius = 60; // Snap when within 60px of node center
    
    for (const node of nodes) {
      const cyNode = cy.getElementById(node.data.id);
      if (!cyNode || cyNode.length === 0) continue;
      
      const pos = cyNode.renderedPosition();
      const dx = renderedX - pos.x;
      const dy = renderedY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < snapRadius) {
        return node.data.id;
      }
    }
    
    return null;
  }, [cyRef, canvasRef, nodes]);

  /* ── handle pointer events ───────────────────────────────────── */
  const handleHandlePointerDown = useCallback((
    e: React.PointerEvent,
    nodeId: string,
    handlePosition: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Get the handle's screen position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const handleX = rect.left + rect.width / 2;
    const handleY = rect.top + rect.height / 2;
    
    setDragState({
      active: true,
      sourceNodeId: nodeId,
      sourceHandle: handlePosition,
      startX: handleX,
      startY: handleY,
      currentX: e.clientX,
      currentY: e.clientY,
      targetNodeId: null,
    });
  }, []);

  const handleHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState?.active) return;
    
    const targetNodeId = findNodeAtPoint(e.clientX, e.clientY);
    
    setDragState({
      ...dragState,
      currentX: e.clientX,
      currentY: e.clientY,
      targetNodeId: targetNodeId !== dragState.sourceNodeId ? targetNodeId : null,
    });
  }, [dragState, findNodeAtPoint]);

  const handleHandlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState?.active) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    // Create edge if we have a valid target
    if (dragState.targetNodeId && dragState.targetNodeId !== dragState.sourceNodeId) {
      if (phase === 'request') {
        onPendingConnection(dragState.sourceNodeId, dragState.targetNodeId);
      } else {
        onEdgeCreate(dragState.sourceNodeId, dragState.targetNodeId);
      }
    }
    
    setDragState(null);
  }, [dragState, phase, onEdgeCreate, onPendingConnection]);

  return {
    connectionHandles,
    hoveredHandle,
    setHoveredHandle,
    dragState,
    handleHandlePointerDown,
    handleHandlePointerMove,
    handleHandlePointerUp,
  };
};
