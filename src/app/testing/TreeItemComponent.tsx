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

  const style: CSSProperties = {
    ...(transformString ? { transform: transformString } : {}),
    transition: 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), border 150ms ease, box-shadow 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 24}px`,
    padding: '8px 12px',
    marginBottom: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    borderRadius: '4px',
    cursor: 'grab',
    userSelect: 'none',
  };

  const selectedStyle: CSSProperties = {
    outline: '2px solid #3b82f6',
    outlineOffset: '-2px',
    boxShadow: '0 0 0 4px rgba(59,130,246,0.06)',
    zIndex: 1,
  };

  const pressedStyle: CSSProperties = {
    outline: '2px solid #1e40af',
    outlineOffset: '-2px',
    cursor: 'grabbing',
    zIndex: 1,
  };

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
        style={{ ...style, ...folderOverlayStyle, ...(pressed ? pressedStyle : selected ? selectedStyle : {}) }}
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