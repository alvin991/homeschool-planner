export type TreeItem = {
  id: string;
  type: 'lesson' | 'folder';
  title: string;
  /** Stable 1-based label per row; preserved when reordering via drag-and-drop. */
  outlinePosition?: number;
  children?: TreeItem[];
};

export type TreeData = TreeItem[];