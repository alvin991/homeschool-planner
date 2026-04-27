'use client';

import { type RefObject, useRef } from 'react';
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
  /** Second quick press on the same row opens edit mode (handled in LessonsList). */
  onRequestEdit?: (id: string) => void | Promise<void>;
  /** Shared across nested renderers so double-tap works at any depth. */
  doubleClickArmRef?: RefObject<{
    id: string;
    t: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>;
  pressedId?: string | null;
  onPressChange?: (id: string | null) => void;
}

export function TreeRenderer({
  items,
  depth = 0,
  insertBeforeId,
  selectedId,
  onSelect,
  onRequestEdit,
  doubleClickArmRef: doubleClickArmRefProp,
  pressedId,
  onPressChange,
}: TreeRendererProps) {
  const ids = flattenTree(items).map(item => item.id);
  const pointerRef = useRef<{ id?: string; x: number; y: number; moved: boolean } | null>(null);
  const localDoubleClickArmRef = useRef<{
    id: string;
    t: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const doubleClickArmRef = doubleClickArmRefProp ?? localDoubleClickArmRef;
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
            void (async () => {
              try {
                if (p && p.id === item.id && !p.moved) {
                  const now = Date.now();
                  const arm = doubleClickArmRef.current;
                  const secondTapForEdit =
                    onRequestEdit &&
                    arm &&
                    arm.id === item.id &&
                    now - arm.t < 400;

                  if (secondTapForEdit) {
                    clearTimeout(arm.timer);
                    doubleClickArmRef.current = null;
                    await onRequestEdit(item.id);
                  } else {
                    const next = selectedId === item.id ? null : item.id;
                    if (doubleClickArmRef.current?.timer) {
                      clearTimeout(doubleClickArmRef.current.timer);
                    }
                    if (next === item.id && onRequestEdit) {
                      const timer = setTimeout(() => {
                        doubleClickArmRef.current = null;
                      }, 400);
                      doubleClickArmRef.current = { id: item.id, t: now, timer };
                    } else {
                      doubleClickArmRef.current = null;
                    }
                    onSelect?.(next);
                  }
                }
              } finally {
                pointerRef.current = null;
                onPressChange?.(null);
              }
            })();
          }}
          onPointerCancel={() => {
            pointerRef.current = null;
            onPressChange?.(null);
          }}
        >
          {/* Numbers stay in one column; only the row card picks up tree depth. */}
          <div className="flex items-center gap-2 min-w-0">
            {item.outlinePosition != null && (
              <span
                className="tabular-nums text-gray-500 text-sm shrink-0 inline-block min-w-[1.75rem] text-right"
                aria-hidden
              >
                {item.outlinePosition}.
              </span>
            )}
            <div
              className="min-w-0 flex-1"
              style={{ marginLeft: `${depth * 1.5}rem` }}
            >
              <TreeItemComponent
                item={item}
                depth={0}
                showInsertBefore={insertBeforeId === item.id}
                selected={selectedId === item.id}
                pressed={pressedId === item.id}
              />
            </div>
          </div>

          {item.type === 'folder' && item.children && item.children.length > 0 && (
            <TreeRenderer
              items={item.children}
              depth={depth + 1}
              insertBeforeId={insertBeforeId}
              selectedId={selectedId}
              onSelect={onSelect}
              onRequestEdit={onRequestEdit}
              doubleClickArmRef={doubleClickArmRef}
              pressedId={pressedId}       // fixed: was missing in recursive call
              onPressChange={onPressChange} // fixed: was missing in recursive call
            />
          )}
        </div>
      ))}
    </SortableContext>
  );
}