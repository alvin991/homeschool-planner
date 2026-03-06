'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TreeData } from './types';
import { TreeItemComponent } from './TreeItemComponent';
import { flattenTree } from './treeUtils';

interface TreeRendererProps {
  items: TreeData;
  depth?: number;
  insertBeforeId?: string | null;
}

export function TreeRenderer({ items, depth = 0, insertBeforeId }: TreeRendererProps) {
  // Get all IDs for SortableContext (including nested items)
  const ids = flattenTree(items).map(item => item.id);

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {items.map(item => (
        <div key={item.id} data-id={item.id}>
          <TreeItemComponent item={item} depth={depth} showInsertBefore={insertBeforeId === item.id} />
          
          {/* Recursively render children if it's a folder */}
          {item.type === 'folder' && item.children && item.children.length > 0 && (
            <TreeRenderer items={item.children} depth={depth + 1} insertBeforeId={insertBeforeId} />
          )}
        </div>
      ))}
    </SortableContext>
  );
}