// app/about/page.tsx

// import DragNdropMain from "../components/testing/DragNdropMain";

// export default function AboutPage() {
//   return (
//     <div>
//       <DragNdropMain />
//     </div>
//   );
// }

'use client'; // Next.js App Router

import { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { TreeRenderer } from './TreeRender';
import { TreeData } from './types';
import { moveItem } from './treeUtils';
import { initialLessons } from './sampleData';

export default function LessonsPage() {
  const [lessons, setLessons] = useState<TreeData>(initialLessons);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // If no valid drop target or dropped on itself, do nothing
    if (!over || active.id === over.id) {
      return;
    }

    // Move item in tree
    const updated = moveItem(lessons, String(active.id), String(over.id));
    setLessons(updated);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>📚 My Lessons</h1>
      
      <DndContext onDragEnd={handleDragEnd}>
        <TreeRenderer items={lessons} />
      </DndContext>

      {/* Debug: Show current tree structure */}
      <details style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9' }}>
        <summary>View Tree Structure (Debug)</summary>
        <pre>{JSON.stringify(lessons, null, 2)}</pre>
      </details>
    </div>
  );
}