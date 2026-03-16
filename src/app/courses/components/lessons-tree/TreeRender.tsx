'use client';

import { useRef, useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TreeData } from './types';
import { TreeItemComponent } from './TreeItemComponent';
import { flattenTree } from './treeUtils';

interface TreeRendererProps {
  items: TreeData;
  depth?: number;
  insertBeforeId?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  pressedId?: string | null;
  onPressChange?: (id: string | null) => void;
}

export function TreeRenderer({ items, depth = 0, insertBeforeId, selectedId, onSelect, pressedId, onPressChange }: TreeRendererProps) {
  // Get all IDs for SortableContext (including nested items)
  const ids = flattenTree(items).map(item => item.id);

  // Track pointer-down state to distinguish clicks from drags
  const pointerRef = useRef<{ id?: string; x: number; y: number; moved: boolean } | null>(null);

  const THRESHOLD = 6; // pixels

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {items.map(item => (
        <div
          key={item.id}
          data-id={item.id}
          onPointerDown={(e) => {
            // Only let the nearest wrapper (the actual item clicked) handle the event.
            const nearest = (e.target as Element).closest('[data-id]');
            if (nearest && nearest !== e.currentTarget) return;
            e.stopPropagation();
            console.log('Pointer down on item:', item.id, 'at', e.clientX, e.clientY);
            pointerRef.current = { id: item.id, x: e.clientX, y: e.clientY, moved: false };
            onPressChange?.(item.id);
            // Immediately select this item on pointer down to unselect others
            onSelect?.(item.id);
          }}
          onPointerMove={(e) => {
            // Only handle move for the nearest wrapper
            const nearest = (e.target as Element).closest('[data-id]');
            if (nearest && nearest !== e.currentTarget) return;
            e.stopPropagation();
            const p = pointerRef.current;
            if (!p || p.id !== item.id) return;
            if (Math.abs(e.clientX - p.x) > THRESHOLD || Math.abs(e.clientY - p.y) > THRESHOLD) {
              p.moved = true;
              onPressChange?.(null);
            }
          }}
          onPointerUp={(e) => {
            // Only handle up for the nearest wrapper
            const nearest = (e.target as Element).closest('[data-id]');
            if (nearest && nearest !== e.currentTarget) return;
            e.stopPropagation();
            console.log('Pointer up on item:', item.id, 'at', e.clientX, e.clientY);
            const p = pointerRef.current;
            if (p && p.id === item.id && !p.moved) {
              onSelect?.(item.id);
            }
            pointerRef.current = null;
            onPressChange?.(null);
          }}
          onPointerCancel={() => {
            pointerRef.current = null;
            onPressChange?.(null);
          }}
        >
          <TreeItemComponent
            item={item}
            depth={depth}
            showInsertBefore={insertBeforeId === item.id}
            selected={selectedId === item.id}
            pressed={pressedId === item.id}
          />

          {/* Recursively render children if it's a folder */}
          {item.type === 'folder' && item.children && item.children.length > 0 && (
            <TreeRenderer
              items={item.children}
              depth={depth + 1}
              insertBeforeId={insertBeforeId}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          )}
        </div>
      ))}
    </SortableContext>
  );
}