export type SubjectType = {
  _id: number;
  name: string;
  color: string;
};

export type LessonType = {
  _id: number;
  title: string;
  content: string;
  note: string;
  order: number;
};

export type PublisherType = {
  _id: number;
  name: string;
};

export type CourseType = {
  _id: number;
  title: string;
  publisher: PublisherType;
  grade: string;
  subject: SubjectType;
  lessons: LessonType[];
};

export type CoursesData = {
  courses: CourseType[];
};

const FORM_MODES = [
  'course-list',
  'course-new',
  'course-edit',
  'lesson-new',
  'lesson-edit',
] as const;

export type FormModeType = (typeof FORM_MODES)[number];

export function isValidFormMode(value: string): value is FormModeType {
  return (FORM_MODES as readonly string[]).includes(value);
}