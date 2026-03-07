// app/about/page.tsx

// import DragNdropMain from "../components/testing/DragNdropMain";

// export default function AboutPage() {
//   return (
//     <div>
//       <DragNdropMain />
//     </div>
//   );
// }

"use client"; // Next.js App Router

import { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { TreeRenderer } from './TreeRender';
import { TreeData, TreeItem } from './types';
import { moveItem } from './treeUtils';
import { findItem } from './treeUtils';
import { initialLessons } from './sampleData';
import useTreeDrag from './useTreeDrag';

export default function LessonsPage() {
  const [lessons, setLessons] = useState<TreeData>(initialLessons);
  const [newTitle, setNewTitle] = useState('');

  const { activeId, insertBeforeId, handleDragStart, handleDragOver, handleDragEnd } =
    useTreeDrag(lessons, setLessons);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const handleAddLesson = () => {
    if (!newTitle.trim()) return;
    const newLesson: TreeItem = {
      id: `lesson-${Date.now()}`,
      type: 'lesson',
      title: newTitle,
    };
    setLessons([...lessons, newLesson]);
    setNewTitle('');
  };

  const handleAddFolder = () => {
    if (!newTitle.trim()) return;
    const newFolder: TreeItem = {
      id: `folder-${Date.now()}`,
      type: 'folder',
      title: newTitle,
      children: [],
    };
    setLessons([...lessons, newFolder]);
    setNewTitle('');
  };

  // const addLessonToRoot = (title: string) => {
  //   const newLesson: TreeItem = {
  //     id: `lesson-${Date.now()}`, // Simple unique ID
  //     type: 'lesson',
  //     title,
  //   };
  //   setLessons([...lessons, newLesson]);
  // };

  const handleOnSelect = (id: string | null) => {
    setSelectedId(id);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>📚 My Lessons</h1>

      {/* Add New Item */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Enter lesson or folder name"
          onKeyPress={(e) => e.key === 'Enter' && handleAddLesson()}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleAddLesson} style={{ marginRight: '10px', padding: '8px 16px' }}>
          ➕ Add Lesson
        </button>
        <button onClick={handleAddFolder} style={{ padding: '8px 16px' }}>
          📁 Add Folder
        </button>
      </div>
      
      {/* Tree */}
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <TreeRenderer
          items={lessons}
          insertBeforeId={insertBeforeId}
          selectedId={selectedId}
          onSelect={handleOnSelect}
          pressedId={pressedId}
          onPressChange={setPressedId}
        />

        {/* Drag overlay to show dragged item (including children) */}
        <DragOverlay>
          {activeId ? (
            (() => {
              const activeItem = findItem(lessons, activeId);
              if (!activeItem) return null;
              const overlayStyle: React.CSSProperties = {
                padding: '8px 12px',
                background: '#fff',
                border: '2px solid #3b82f6',
                boxShadow: '0 6px 18px rgba(59,130,246,0.2)',
                borderRadius: 6,
                minWidth: 220,
                maxWidth: 360,
                zIndex: 9999,
              };

              const renderChildren = (item: TreeItem, depth = 0) => {
                const rowStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 0',
                  marginLeft: depth * 16,
                  fontSize: 13,
                  color: '#111827',
                };
                const icon = item.type === 'folder' ? '📁' : '📄';

                return (
                  <div key={item.id}>
                    <div style={rowStyle}>
                      <span style={{ width: 18, textAlign: 'center', marginRight: 8 }}>{icon}</span>
                      <span>{item.title}</span>
                    </div>
                    {item.children && item.children.map(child => renderChildren(child, depth + 1))}
                  </div>
                );
              };

              const titleIcon = activeItem.type === 'folder' ? '📁' : '📄';

              return (
                <div style={overlayStyle}>
                  <div style={{ fontWeight: 'bold', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 8 }}>{titleIcon}</span>
                    <span>{activeItem.title}</span>
                  </div>
                  {activeItem.children && activeItem.children.length > 0 && (
                    <div style={{ maxHeight: 240, overflow: 'auto' }}>
                      {activeItem.children.map(child => renderChildren(child, 1))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Debug: Show current tree structure */}
      <details style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9' }}>
        <summary>View Tree Structure (Debug)</summary>
        <pre>{JSON.stringify(lessons, null, 2)}</pre>
      </details>
    </div>
  );
}