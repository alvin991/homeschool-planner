"use client";
import { useDraggable } from "@dnd-kit/react";

export type itemType = {
    id: string;
    content: string;
};

function DraggableItem({ id, content }: itemType) {
  const { ref } = useDraggable({
    id: id,
  });

  return (
    <div ref={ref} className="p-4 mb-2 bg-gray-200 text-white rounded cursor-move">
      {content}
    </div>
  );
}

export default DraggableItem;