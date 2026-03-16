import CoursesHeader from "./CoursesHeader";
import CourseCard from "./CourseCard";
import type { CourseType } from '@/app/courses/types';

type CoursesListProps = {
  courses: CourseType[];
  handleCourseClick: (course: CourseType) => void;
};

function CoursesList({ courses, handleCourseClick }: CoursesListProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Course List</h1>
      <CoursesHeader />
      {courses &&
        courses.length > 0 &&
        courses.map((course) => (
          <div
            key={course._id}
            className="mb-4"
            onClick={() => handleCourseClick(course)}
          >
            <CourseCard course={course} />
          </div>
        ))}
    </div>
  );
}

export default CoursesList;