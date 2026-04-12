export type SubjectType = {
  _id: string;
  name: string;
  color: string;
};

export type LessonType = {
  _id: string;
  title: string;
  content: string;
  note: string;
  order: number;
};

/** One node in `Course.lessonTree` (embedded outline). */
export type CourseTreeNodeType = {
  _id: string;
  kind: 'lesson' | 'folder';
  title: string;
  order: number;
  content?: string;
  note?: string;
  children?: CourseTreeNodeType[];
};

export type PublisherType = {
  _id: string;
  name: string;
};

export type CourseType = {
  _id: string;
  title: string;
  publisher: PublisherType;
  grade: string;
  subject: SubjectType;
  /** Nested lessons and folders (persisted on the course document). */
  lessonTree: CourseTreeNodeType[];
  /** Leaf lesson count (from GraphQL when requested). */
  lessonCount?: number;
};

export type CoursesData = {
  courses: CourseType[];
};

const FORM_MODES = [
  'course-list',
  'course-new',
  'course-edit',
  'lesson-new',
  'lesson-view',
  'lesson-edit',
  'folder-new',
  'folder-view',
  'folder-edit',
] as const;

export type FormModeType = (typeof FORM_MODES)[number];

export function isValidFormMode(value: string): value is FormModeType {
  return (FORM_MODES as readonly string[]).includes(value);
}