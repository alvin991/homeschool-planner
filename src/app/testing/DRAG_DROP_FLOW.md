
This doc traces **every user action** and which handlers run, in order. Use it to bugfix and enhance the tree.

---

## 1. CLICK (no drag)

**User:** Press down on an item, then release without moving the pointer more than 6px.

### 1.1 Pointer down

| Where | Handler | What happens |
|-------|---------|--------------|
| **TreeRender.tsx** (wrapper `div` around each item) | `onPointerDown` | • Only runs if the clicked element is this row (not a child row).<br>• Saves `pointerRef.current = { id, x, y, moved: false }`.<br>• Calls `onPressChange(item.id)` → page sets **pressedId** = this item (blue “pressed” ring).<br>• Calls **onSelect(item.id)** → page sets **selectedId** = this item (blue “selected” ring). |

So on pointer down you always get: **pressedId** and **selectedId** set to the clicked item.

### 1.2 Pointer move (optional, small)

If the user moves a little but stays within 6px:

| Where | Handler | What happens |
|-------|---------|--------------|
| **TreeRender.tsx** | `onPointerMove` | • Only runs for the same item we pressed on (`p.id === item.id`).<br>• If movement ≤ 6px: does nothing (no `p.moved = true`). |

So **pointerRef.current.moved** stays `false` → we still treat it as a click.

### 1.3 Pointer up

| Where | Handler | What happens |
|-------|---------|--------------|
| **TreeRender.tsx** | `onPointerUp` | • If `p && p.id === item.id && !p.moved` → calls **onSelect(item.id)** again (your toggle: same item → **selectedId** becomes `null`; other item → **selectedId** = that id).<br>• Clears **pointerRef.current** and **pressedId** (`onPressChange(null)`). |

**Result:** One item is selected (blue border), or if you clicked the same item again it’s deselected. **Lessons tree data is unchanged.**

---

## 2. DRAG (reorder or drop into folder)

**User:** Press down on an item, move pointer more than 6px, then release over another row (or folder).

---

### 2.1 Pointer down (same as click)

Same as **§1.1**: **pressedId** and **selectedId** set to the item you pressed. **pointerRef** stores `{ id, x, y, moved: false }`.

---

### 2.2 Pointer move past threshold (> 6px)

| Where | Handler | What happens |
|-------|---------|--------------|
| **TreeRender.tsx** | `onPointerMove` | • For the item we pressed on: if `|clientX - p.x|` or `|clientY - p.y|` > 6, sets **p.moved = true** and **onPressChange(null)** → **pressedId** cleared (no more “pressed” ring). |

Around the same time, **@dnd-kit** detects a drag and starts its own internal drag session. It doesn’t fire your `handleDragStart` until the drag is actually started (sensor confirms drag).

---

### 2.3 Drag start (dnd-kit)

| Where | Handler | What happens |
|-------|---------|--------------|
| **page.tsx** | `DndContext onDragStart={handleDragStart}` | **useTreeDrag.handleDragStart** runs.<br>• `setActiveId(String(active.id))` → **activeId** = the dragged item’s id. |

**TreeItemComponent** uses `useSortable({ id: item.id })` and `useDndContext()`. When **activeId** matches an item:

- That item’s row gets **opacity 0.5** and a **transform** (dnd-kit moves it visually).
- **DragOverlay** (in page.tsx) renders a copy of that item (and its children if it’s a folder) under the cursor.

So: **activeId** drives “who is being dragged” and the overlay.

---

### 2.4 Drag over (many times while moving)

Every time the pointer moves over a **different** droppable row, dnd-kit fires drag over.

| Where | Handler | What happens |
|-------|---------|--------------|
| **page.tsx** | `DndContext onDragOver={handleDragOver}` | **useTreeDrag.handleDragOver** runs.<br>• Reads **over** = the sortable id under the pointer.<br>• Finds **target** = `findItem(lessons, over.id)` (lesson or folder). |

Then it decides **insertBeforeId**:

- **If target is a lesson:**  
  `setInsertBeforeId(over.id)` → show the **blue “insert before” line** on that lesson.
- **If target is a folder:**  
  Uses pointer Y vs folder row’s rect:
  - **Pointer in top half of folder row:** `setInsertBeforeId(null)` → **drop-into-folder** (folder gets blue tint, no line).
  - **Pointer in bottom half:** `setInsertBeforeId(over.id)` → **insert before** that folder (blue line on folder).

**TreeItemComponent** gets `showInsertBefore={insertBeforeId === item.id}` and `useDndContext().over`:

- If **showInsertBefore** → draws the 4px blue line at top of the row.
- If over a folder and **!showInsertBefore** → **isOverFolder** true → folder row gets blue background (drop-into style).

So: **insertBeforeId** drives where the “insert line” appears; when it’s null over a folder, we show “drop into folder” style.

---

### 2.5 Drop / Drag end

When the user releases the pointer, dnd-kit fires drag end.

| Where | Handler | What happens |
|-------|---------|--------------|
| **page.tsx** | `DndContext onDragEnd={handleDragEnd}` | **useTreeDrag.handleDragEnd** runs.<br>• **Always:** `setActiveId(null)` and `setInsertBeforeId(null)` (overlay and insert line disappear).<br>• If no **over** or **active.id === over.id** → return (no tree change).<br>• Else: **targetId** = `insertBeforeId ?? over.id`, **insertBefore** = `Boolean(insertBeforeId)`, then **setLessons(prev => moveItem(prev, active.id, targetId, { insertBefore }))** and return. |

**treeUtils.moveItem** (see treeUtils.ts):

1. Deep-clones the tree.
2. **Removes** the dragged node (and its whole subtree) from its current parent (or root).
3. **Inserts** that node:
   - If **insertBefore** is true → insert **before** the node with **targetId** (same parent or root).
   - If **insertBefore** is false and target is a folder → **append** to that folder’s **children**.

**Result:** Tree state **lessons** is updated; the item has moved. **activeId** and **insertBeforeId** are cleared.

---

## 3. Quick reference: state and who sets it

| State | Lives in | Set by |
|-------|----------|--------|
| **lessons** | page.tsx | setLessons (add buttons, moveItem on drag end) |
| **selectedId** | page.tsx | handleOnSelect (pointer down + pointer up when !moved) |
| **pressedId** | page.tsx | onPressChange from TreeRender (pointer down = id, move past threshold / pointer up = null) |
| **activeId** | useTreeDrag | handleDragStart = id, handleDragEnd = null |
| **insertBeforeId** | useTreeDrag | handleDragOver (which row gets the line / drop-into), handleDragEnd = null |

---

## 4. Where to look when something breaks

- **Click not selecting / not deselecting** → TreeRender.tsx pointer down/up and `onSelect`; page.tsx `handleOnSelect` (toggle).
- **Drag not starting** → TreeRender threshold (6px), or dnd-kit sensor; TreeItemComponent `{...listeners}` on the row.
- **Wrong drop position (e.g. into folder vs before)** → useTreeDrag.handleDragOver (insertBeforeId and 50% folder rule); handleDragEnd (insertBefore flag passed to moveItem).
- **Tree not updating after drop** → useTreeDrag.handleDragEnd and treeUtils.moveItem (clone, remove, insert).
- **Highlight line or folder highlight wrong** → TreeItemComponent (showInsertBefore, isOverFolder) and insertBeforeId from useTreeDrag.

This is the full flow by action and listener.
