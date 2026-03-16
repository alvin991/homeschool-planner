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
