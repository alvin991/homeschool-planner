export type TreeItem = {
  id: string;
  type: 'lesson' | 'folder';
  title: string;
  children?: TreeItem[];
};

export type TreeData = TreeItem[];