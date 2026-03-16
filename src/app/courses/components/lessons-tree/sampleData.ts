export type TreeData = {
  id: string;
  type: 'lesson' | 'folder';
  title: string;
  children?: TreeData[];
};

export const initialLessons: TreeData[] = [
  {
    id: 'lesson-1',
    type: 'lesson',
    title: 'Introduction to React',
  },
  {
    id: 'folder-1',
    type: 'folder',
    title: 'Advanced Topics',
    children: [
      {
        id: 'lesson-2',
        type: 'lesson',
        title: 'State Management',
      },
      {
        id: 'lesson-3',
        type: 'lesson',
        title: 'Performance Optimization',
      },
      {
        id: 'folder-2',
        type: 'folder',
        title: 'Nested Folder',
        children: [
          {
            id: 'lesson-4',
            type: 'lesson',
            title: 'Deep Nesting Example',
          },
        ],
      },
    ],
  },
  {
    id: 'lesson-5',
    type: 'lesson',
    title: 'Deployment Guide',
  },
];