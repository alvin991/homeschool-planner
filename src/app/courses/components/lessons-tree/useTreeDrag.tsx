import { useState } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { TreeData } from './types';
import { moveItem, findItem } from './treeUtils';

export function useTreeDrag(
  lessons: TreeData,
  setLessons: (updater: TreeData | ((prev: TreeData) => TreeData)) => void
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [insertBeforeId, setInsertBeforeId] = useState<string | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Always clear preview state to avoid stale highlights
    setActiveId(null);
    setInsertBeforeId(null);

    // If no valid drop target or dropped on itself, do nothing
    if (!over || active.id === over.id) {
      return;
    }

    setLessons(prev => {
      // If `insertBeforeId` was set by onDragOver, use that as the target and
      // indicate insertBefore=true so we don't drop INTO a folder.
      const targetId = insertBeforeId ?? String(over.id);
      const insertBefore = Boolean(insertBeforeId);
      const updated = moveItem(prev, String(active.id), targetId, { insertBefore });
      console.log('DragEnd - moved', String(active.id), 'over', String(over.id));
      console.log('prev tree:', JSON.stringify(prev, null, 2));
      console.log('updated tree:', JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
  };

  const handleDragOver = (event: any) => {
    const { over } = event;

    if (!over) {
      setInsertBeforeId(null);
      return;
    }

    // Find the target item in the current tree
    const target = findItem(lessons, String(over.id));
    if (!target) {
      setInsertBeforeId(null);
      return;
    }

    // Prefer the current pointer coordinates (live position) over the initial activatorEvent
    const clientY = event.pointerCoordinates?.y ?? event.activatorEvent?.clientY ?? null;

    // If target is a folder, only show insert-before when pointer is strictly inside
    // the folder rect and past the 50% vertical threshold. This avoids spurious
    // highlights (e.g. when hovering the first folder at root).
    if (target.type === 'folder') {
      // If we don't have pointer coordinates, don't assume insert-before
      if (clientY == null) {
        setInsertBeforeId(null);
        return;
      }

      const el = document.querySelector(`[data-id="${over.id}"]`) as HTMLElement | null;
      if (!el) {
        setInsertBeforeId(null);
        return;
      }

      const rect = el.getBoundingClientRect();
      const localY = clientY - rect.top;

      // Only consider pointer when it's inside the element bounds
      if (localY <= 0 || localY >= rect.height) {
        setInsertBeforeId(null);
        return;
      }

      const passed = localY > rect.height * 0.5;
      setInsertBeforeId(passed ? String(over.id) : null);
      return;
    }

    // For non-folder items, always show insert-before (highlight-line)
    setInsertBeforeId(String(over.id));
  };

  return {
    activeId,
    insertBeforeId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

export default useTreeDrag;
