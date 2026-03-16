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
  overId: string,
  options?: { insertBefore?: boolean }
): TreeData {
  // Deep clone the tree first and operate on the clone so we don't mutate state
  const newItems = JSON.parse(JSON.stringify(items)); // Deep clone

  // Find and remove the dragged item from the cloned tree, capturing the removed subtree
  const draggedParent = findParent(newItems, draggedId);
  let draggedItemClone: TreeItem | undefined;

  if (draggedParent) {
    const removed = draggedParent.parent.children?.splice(draggedParent.index, 1);
    if (removed && removed.length) draggedItemClone = removed[0];
  } else {
    // Item is at root level
    const index = newItems.findIndex((item: TreeItem) => item.id === draggedId);
    if (index !== -1) {
      const removed = newItems.splice(index, 1);
      if (removed && removed.length) draggedItemClone = removed[0];
    }
  }

  if (!draggedItemClone) {
    // nothing found to move
    return newItems;
  }

  // Find where to insert the cloned subtree
  const overItem = findItem(newItems, overId);
  const insertBefore = options?.insertBefore ?? false;

  if (overItem?.type === 'folder' && !insertBefore) {
    // Drop into folder
    if (!overItem.children) overItem.children = [];
    overItem.children.push(draggedItemClone);
  } else {
    // Insert BEFORE the over item (highlight line is top of item)
    const overParent = findParent(newItems, overId);
    if (overParent) {
      const insertIndex = overParent.index; // insert before
      overParent.parent.children?.splice(insertIndex, 0, draggedItemClone);
    } else {
      // Over item is at root - insert before root item
      const index = newItems.findIndex((item: TreeItem) => item.id === overId);
      newItems.splice(index, 0, draggedItemClone);
    }
  }

  return newItems;
}

export function addItemToFolder(
  items: TreeData,
  folderId: string,
  newItem: TreeItem
): TreeData {
  const updated = JSON.parse(JSON.stringify(items)); // Deep clone
  
  const folder = findItem(updated, folderId);
  if (folder && folder.type === 'folder') {
    if (!folder.children) folder.children = [];
    folder.children.push(newItem);
  }
  
  return updated;
}