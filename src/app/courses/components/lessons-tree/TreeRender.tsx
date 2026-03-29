'use client';

import { useRef } from 'react';
import { SortableContext } from '@dnd-kit/sortable';
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
  const ids = flattenTree(items).map(item => item.id);
  const pointerRef = useRef<{ id?: string; x: number; y: number; moved: boolean } | null>(null);
  const THRESHOLD = 6;

  return (
    <SortableContext items={ids} strategy={() => null}>
      {items.map(item => (
        <div
          key={item.id}
          data-id={item.id}
          onPointerDown={(e) => {
            const nearest = (e.target as Element).closest('[data-id]');
            if (nearest && nearest !== e.currentTarget) return;
            e.stopPropagation();
          
            // if the click started on the drag handle, don't track it for selection
            const onHandle = (e.target as Element).closest('[data-drag-handle]');
            if (onHandle) return;
          
            pointerRef.current = { id: item.id, x: e.clientX, y: e.clientY, moved: false };
            onPressChange?.(item.id);
          }}
          onPointerMove={(e) => {
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
            const nearest = (e.target as Element).closest('[data-id]');
            if (nearest && nearest !== e.currentTarget) return;
            e.stopPropagation();
            const p = pointerRef.current;
            if (p && p.id === item.id && !p.moved) {
              // toggle: click selected item to deselect, click unselected item to select
              onSelect?.(selectedId === item.id ? null : item.id);
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

          {item.type === 'folder' && item.children && item.children.length > 0 && (
            <TreeRenderer
              items={item.children}
              depth={depth + 1}
              insertBeforeId={insertBeforeId}
              selectedId={selectedId}
              onSelect={onSelect}
              pressedId={pressedId}       // fixed: was missing in recursive call
              onPressChange={onPressChange} // fixed: was missing in recursive call
            />
          )}
        </div>
      ))}
    </SortableContext>
  );
}