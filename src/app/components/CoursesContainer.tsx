import Lesson from "@/models/Lesson";
import CoursesHeader from "./CoursesHeader";
import CoursesList from "./CoursesList";
import CourseOverview from "./CourseCard";
import CourseCard from "./CourseCard";

export type subjectType = {
  name: string;
  color: string;
};

export type LessonType = {
  id: number;
  title: string;
  content: string;
  note: string;
  order: number;
};

export type CourseType = {
  id: number;
  title: string;
  publisher: string;
  frGrade: string;
  toGrade: string;
  subject: subjectType;
  lessons: LessonType[]; // Define a Lesson type as well if needed
};

function CoursesContainer() {
  const courses: CourseType[] = [
    { id: 1, title: "English 6", publisher: "BJU Press", frGrade: "1st", toGrade: "1st", subject: {name: "English", color: "red"}, lessons: [{ id: 1, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 2, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 3, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 4, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 2, title: "English 7", publisher: "BJU Press", frGrade: "2nd", toGrade: "2nd", subject: {name: "English", color: "red"}, lessons: [{ id: 5, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 6, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 7, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 8, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 3, title: "English 8", publisher: "BJU Press", frGrade: "3rd", toGrade: "3rd", subject: {name: "English", color: "red"}, lessons: [{ id: 9, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 10, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 11, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 12, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 4, title: "English 9", publisher: "BJU Press", frGrade: "4th", toGrade: "4th", subject: {name: "English", color: "red"}, lessons: [{ id: 13, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 14, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 15, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 16, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 5, title: "English 10", publisher: "BJU Press", frGrade: "5th", toGrade: "5th", subject: {name: "English", color: "red"}, lessons: [{ id: 17, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 18, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 19, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 20, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 6, title: "English 11", publisher: "BJU Press", frGrade: "6th", toGrade: "6th", subject: {name: "English", color: "red"}, lessons: [{ id: 21, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 22, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 23, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 24, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 7, title: "English 12", publisher: "BJU Press", frGrade: "7th", toGrade: "7th", subject: {name: "English", color: "red"}, lessons: [{ id: 25, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 26, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 27, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 28, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 8, title: "Math 6", publisher: "BJU Press", frGrade: "1st", toGrade: "1st", subject: {name: "Math", color: "blue"}, lessons: [{ id: 29, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 30, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 31, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 32, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 9, title: "Math 7", publisher: "BJU Press", frGrade: "2nd", toGrade: "2nd", subject: {name: "Math", color: "blue"}, lessons: [{ id: 33, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 34, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 35, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 36, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 10, title: "Math 8", publisher: "BJU Press", frGrade: "3rd", toGrade: "3rd", subject: {name: "Math", color: "blue"}, lessons: [{ id: 37, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 38, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 39, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 40, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 11, title: "Math 9", publisher: "BJU Press", frGrade: "4th", toGrade: "4th", subject: {name: "Math", color: "blue"}, lessons: [{ id: 41, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 42, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 43, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 44, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 12, title: "Math 10", publisher: "BJU Press", frGrade: "5th", toGrade: "5th", subject: {name: "Math", color: "blue"}, lessons: [{ id: 45, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 46, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 47, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 48, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 13, title: "Math 11", publisher: "BJU Press", frGrade: "6th", toGrade: "6th", subject: {name: "Math", color: "blue"}, lessons: [{ id: 49, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 50, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 51, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 52, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 14, title: "Math 12", publisher: "BJU Press", frGrade: "7th", toGrade: "7th", subject: {name: "Math", color: "blue"}, lessons: [{ id: 53, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 54, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 55, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 56, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 15, title: "Science 6", publisher: "BJU Press", frGrade: "1st", toGrade: "1st", subject: {name: "Science", color: "yellow"}, lessons: [{ id: 57, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 58, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 59, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 60, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 16, title: "Science 7", publisher: "BJU Press", frGrade: "2nd", toGrade: "2nd", subject: {name: "Science", color: "yellow"}, lessons: [{ id: 61, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 62, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 63, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 64, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 17, title: "Science 8", publisher: "BJU Press", frGrade: "3rd", toGrade: "3rd", subject: {name: "Science", color: "yellow"}, lessons: [{ id: 65, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 66, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 67, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 68, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 18, title: "Science 9", publisher: "BJU Press", frGrade: "4th", toGrade: "4th", subject: {name: "Science", color: "yellow"}, lessons: [{ id: 69, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 70, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 71, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 72, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 19, title: "Science 10", publisher: "BJU Press", frGrade: "5th", toGrade: "5th", subject: {name: "Science", color: "yellow"}, lessons: [{ id: 73, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 74, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 75, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 76, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 20, title: "Science 11", publisher: "BJU Press", frGrade: "6th", toGrade: "6th", subject: {name: "Science", color: "yellow"}, lessons: [{ id: 77, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 78, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 79, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 80, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
    { id: 21, title: "Science 12", publisher: "BJU Press", frGrade: "7th", toGrade: "7th", subject: {name: "Science", color: "yellow"}, lessons: [{ id: 81, title: "Lesson 1", content: "Content 1", note: "Note 1", order: 1 }, { id: 82, title: "Lesson 2", content: "Content 2", note: "Note 2", order: 2 }, { id: 83, title: "Lesson 3", content: "Content 3", note: "Note 3", order: 3 }, { id: 84, title: "Lesson 4", content: "Content 4", note: "Note 4", order: 4 }] },
  ];
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Course List</h1>
      {/* Course list content will go here */}
      <CoursesHeader />
      {/* <CoursesList courses={courses} /> */}
      { courses && courses.length > 0 && courses.map(course => (
        <div key={course.id} className="mb-4">
          <CourseCard course={course} />
        </div>
      ))}

    </div>
  );
}

export default CoursesContainer;