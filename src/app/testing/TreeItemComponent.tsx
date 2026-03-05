'use client'; // If using Next.js App Router

import { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TreeItem } from './types';

interface TreeItemComponentProps {
  item: TreeItem;
  depth: number;
}

export function TreeItemComponent({ item, depth }: TreeItemComponentProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: item.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${depth * 24}px`,
    padding: '8px 12px',
    marginBottom: '4px',
    backgroundColor: item.type === 'folder' ? '#f0f0f0' : '#ffffff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'grab',
    userSelect: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span style={{ marginRight: '8px' }}>
        {item.type === 'folder' ? '📁' : '📄'}
      </span>
      <span>{item.title}</span>
    </div>
  );
}