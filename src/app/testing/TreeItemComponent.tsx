'use client'; // If using Next.js App Router

import { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TreeItem } from './types';
import { useDndContext } from '@dnd-kit/core';

interface TreeItemComponentProps {
  item: TreeItem;
  depth: number;
  showInsertBefore?: boolean;
  selected?: boolean;
  pressed?: boolean;
}

export function TreeItemComponent({ item, depth, showInsertBefore, selected, pressed }: TreeItemComponentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: item.id,
  });
  const { active, over } = useDndContext();

  // Highlight potential drop targets
  const isOver = over && over.id === item.id;
  const isActive = active && active.id === item.id;
  // If `showInsertBefore` prop is provided, use it to decide insert-before highlight.
  // For folders, we normally show an overlap style; but if `showInsertBefore` is true
  // for a folder (pointer passed the threshold), show the highlight-line instead.
  const isOverFolder = isOver && item.type === 'folder' && !showInsertBefore;
  let showHighlight = false;
  if (item.type === 'folder') {
    showHighlight = Boolean(showInsertBefore);
  } else {
    showHighlight = Boolean(showInsertBefore) || Boolean(isOver);
  }

  // Only apply the transform for the actively dragged item so siblings don't shift
  const transformString = isDragging ? CSS.Transform.toString(transform) : undefined;

  // Keep transform and marginLeft inline (depth and dnd-kit transform are dynamic).
  const baseClass =
    'relative transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] mb-1 bg-white border border-gray-200 rounded box-border select-none px-3 py-2';

  const selectedClass = 'ring-2 ring-blue-500 ring-offset-1';
  const pressedClass = 'ring-2 ring-blue-600 ring-offset-1 cursor-grabbing';

  // Apply a visible "overlap" style when hovering over a folder (no highlight-line)
  const folderOverlayStyle: CSSProperties = isOverFolder
    ? {
        boxShadow: 'inset 0 0 0 2px rgba(59,130,246,0.12)',
        backgroundColor: '#eaf2ff',
        zIndex: 2,
      }
    : {};

  return (
    <div style={{ position: 'relative' }}>
      {/* Highlight line only for non-folder items; folders get an overlap style */}
      {showHighlight && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'dodgerblue',
          borderRadius: '4px 4px 0 0',
          zIndex: 3,
        }} />
      )}
      <div
        ref={setNodeRef}
        className={
          baseClass +
          (isOverFolder ? ' bg-blue-50 shadow-inner' : '') +
          (pressed ? ` ${pressedClass}` : selected ? ` ${selectedClass}` : '')
        }
        style={{ ...(transformString ? { transform: transformString } : {}), marginLeft: `${depth * 1.5}rem`, opacity: isDragging ? 0.5 : 1 }}
        {...attributes}
        {...listeners}
      >
        <span style={{ marginRight: '8px' }}>
          {item.type === 'folder' ? '📁' : '📄'}
        </span>
        <span>{item.title}</span>
        {/* selection/pressed visuals are styled via outline; debug badges removed */}
      </div>
    </div>
  );
}