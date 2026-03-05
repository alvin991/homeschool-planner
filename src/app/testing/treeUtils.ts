import { TreeData, TreeItem } from './types';

// Flatten tree into a single array (for SortableContext)
export function flattenTree(items: TreeData, depth = 0): Array<{ id: string; depth: number }> {
  const flattened: Array<{ id: string; depth: number }> = [];

  items.forEach(item => {
    flattened.push({ id: item.id, depth });
    if (item.children && item.children.length > 0) {
      flattened.push(...flattenTree(item.children, depth + 1));
    }
  });

  return flattened;
}

// Find item by ID in nested tree
export function findItem(items: TreeData, id: string): TreeItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItem(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Find parent of item
export function findParent(
  items: TreeData,
  id: string
): { parent: TreeItem; index: number } | null {
  for (const item of items) {
    if (item.children) {
      const index = item.children.findIndex(child => child.id === id);
      if (index !== -1) {
        return { parent: item, index };
      }
      const found = findParent(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Move item within tree (same parent or different parent)
export function moveItem(
  items: TreeData,
  draggedId: string,
  overId: string
): TreeData {
  const draggedItem = findItem(items, draggedId);
  if (!draggedItem) return items;

  // Remove from old location
  const newItems = JSON.parse(JSON.stringify(items)); // Deep clone
  const draggedParent = findParent(newItems, draggedId);
  if (draggedParent) {
    draggedParent.parent.children?.splice(draggedParent.index, 1);
  } else {
    // Item is at root level
    const index = newItems.findIndex((item: TreeItem) => item.id === draggedId);
    if (index !== -1) newItems.splice(index, 1);
  }

  // Find where to insert
  const overItem = findItem(newItems, overId);
  if (overItem?.type === 'folder') {
    // Drop into folder
    if (!overItem.children) overItem.children = [];
    overItem.children.push(draggedItem);
  } else {
    // Drop next to item
    const overParent = findParent(newItems, overId);
    if (overParent) {
      const insertIndex = overParent.index + 1;
      overParent.parent.children?.splice(insertIndex, 0, draggedItem);
    } else {
      // Over item is at root
      const index = newItems.findIndex((item: TreeItem) => item.id === overId);
      newItems.splice(index + 1, 0, draggedItem);
    }
  }

  return newItems;
}